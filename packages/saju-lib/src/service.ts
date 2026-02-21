/**
 * @fileoverview 사주 계산 서비스 — 메인 엔트리 함수
 *
 * `calculate()` 함수가 SajuRequest를 받아 SajuResult를 반환하는
 * 통합 계산 파이프라인을 제공한다. 내부적으로 astro, bazi, lunar,
 * luck, timezone, location 모듈을 조합하여 사주팔자를 산출한다.
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

import * as astro from './astro.js';
import * as bazi from './bazi.js';
import * as location from './location.js';
import * as luck from './luck.js';
import * as lunar from './lunar.js';
import * as tz from './timezone.js';
import type {
  BranchInteraction,
  Direction,
  Gender,
  LmtInfo,
  LunarDate,
  Pillar,
  ShinsalEntry,
  SolarTerm,
  StemInteraction,
  YongshinResult,
} from './types.js';
import type { StrengthResult } from './bazi.js';
import type { DaewonItem, MonthlyLuck, YearLuck } from './luck.js';
import type { TimeZoneSpec } from './timezone.js';

/** 역법 유형: 양력(Solar) 또는 음력(Lunar) */
export type CalendarType = 'Solar' | 'Lunar';

/** 사주 계산 요청 파라미터 */
export interface SajuRequest {
  /** 생년월일 (YYYY-MM-DD) */
  date: string;
  /** 생시 (HH:MM 또는 HH:MM:SS) */
  time: string;
  /** 역법 유형 */
  calendar: CalendarType;
  /** 윤달 여부 (음력 입력 시에만 유효) */
  leapMonth: boolean;
  /** 성별 */
  gender: Gender;
  /** 시간대 (IANA명 또는 오프셋) */
  tz: string;
  /** 평태양시(LMT) 보정 사용 여부 */
  useLmt: boolean;
  /** LMT 보정용 경도 (직접 입력) */
  longitude: number | null;
  /** LMT 보정용 지역명 */
  location: string | null;
  /** 대운 개수 (기본 10) */
  daewonCount: number;
  /** 월운 대상 연도 (null이면 현재 연도) */
  monthYear: number | null;
  /** 세운 시작 연도 (null이면 월운 연도 -3) */
  yearStart: number | null;
  /** 세운 연도 수 */
  yearCount: number;
}

/** 사주 계산 결과 */
export interface SajuResult {
  // ── 입력 정보 ──
  inputDate: string;
  inputTime: string;
  calendarIsLunar: boolean;
  leapMonth: boolean;
  tzName: string;
  /** 음력 입력 시 변환된 양력 날짜 */
  convertedSolar: string | null;
  /** 양력 입력 시 변환된 음력 날짜 */
  convertedLunar: LunarDate | null;
  /** 평태양시 보정 정보 */
  lmtInfo: LmtInfo | null;
  gender: Gender;

  // ── 사주 네 기둥 ──
  yearPillar: Pillar;
  monthPillar: Pillar;
  dayPillar: Pillar;
  hourPillar: Pillar;

  // ── 분석 결과 ──
  /** 신강/신약 판정 */
  strength: StrengthResult;
  /** 용신 판정 */
  yongshin: YongshinResult;
  /** 천간 합/충 */
  stemInteractions: StemInteraction[];
  /** 지지 합/충/형/파/해 */
  branchInteractions: BranchInteraction[];
  /** 주요 신살 */
  shinsalEntries: ShinsalEntry[];

  // ── 운(運) ──
  /** 대운 방향 */
  daewonDirection: Direction;
  /** 대운 시작 시기 (개월) */
  daewonStartMonths: number;
  /** 대운 목록 */
  daewonItems: DaewonItem[];
  /** 세운(연운) 목록 */
  yearlyLuck: YearLuck[];
  /** 월운 데이터 */
  monthlyLuck: MonthlyLuck;

  // ── 메타 ──
  /** 시간대 명세 */
  tzSpec: TimeZoneSpec;
  /** 당해 절기 목록 */
  solarTerms: SolarTerm[];
}

/**
 * 시간 문자열을 파싱한다.
 * @param input 'HH:MM' 또는 'HH:MM:SS' 형식
 * @returns 시, 분, 초 객체
 * @throws 형식이 잘못된 경우
 */
function parseTime(input: string): { hour: number; minute: number; second: number } {
  const parts = input.split(':');
  if (parts.length < 2 || parts.length > 3) {
    throw new Error('time format must be HH:MM or HH:MM:SS');
  }
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  const second = parts.length === 3 ? parseInt(parts[2], 10) : 0;
  if (isNaN(hour) || isNaN(minute) || isNaN(second)) {
    throw new Error('time format must be HH:MM or HH:MM:SS');
  }
  return { hour, minute, second };
}

/**
 * 사주팔자 통합 계산 함수.
 *
 * 계산 흐름:
 * 1. 입력 파싱 및 음양력 변환
 * 2. 시간대 적용 및 LMT 보정
 * 3. 절기 계산 → 연주/월주 결정
 * 4. 일진 계산 → 일주 결정 (23시 이후 익일 적용)
 * 5. 시주 결정
 * 6. 대운/세운/월운 산출
 * 7. 신강/신약, 용신, 합충형파해, 신살 분석
 *
 * @param req 계산 요청 파라미터
 * @returns 사주 계산 결과
 */
export function calculate(req: SajuRequest): SajuResult {
  const time = parseTime(req.time);

  if (req.calendar === 'Solar' && req.leapMonth) {
    throw new Error('leap-month is only valid with calendar=lunar');
  }

  const dateParts = req.date.split('-').map(Number);
  const [inputYear, inputMonth, inputDay] = dateParts;

  // ── 1단계: 음양력 변환 ──
  let convertedSolar: string | null = null;
  let convertedLunar: LunarDate | null = null;
  let solarYear: number;
  let solarMonth: number;
  let solarDay: number;

  if (req.calendar === 'Solar') {
    const sDate = new Date(Date.UTC(inputYear, inputMonth - 1, inputDay));
    if (inputYear >= 0 && inputYear < 100) sDate.setUTCFullYear(inputYear);
    convertedLunar = lunar.solarToLunar(sDate);
    solarYear = inputYear;
    solarMonth = inputMonth;
    solarDay = inputDay;
  } else {
    const sDate = lunar.lunarToSolar(inputYear, inputMonth, inputDay, req.leapMonth);
    solarYear = sDate.getUTCFullYear();
    solarMonth = sDate.getUTCMonth() + 1;
    solarDay = sDate.getUTCDate();
    const yy = String(solarYear).padStart(4, '0');
    const mm = String(solarMonth).padStart(2, '0');
    const dd = String(solarDay).padStart(2, '0');
    convertedSolar = `${yy}-${mm}-${dd}`;
  }

  // ── 2단계: 시간대 및 LMT 보정 ──
  const solarDateStr = `${String(solarYear).padStart(4, '0')}-${String(solarMonth).padStart(2, '0')}-${String(solarDay).padStart(2, '0')}`;
  const timeStr = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}:${String(time.second).padStart(2, '0')}`;

  const tzSpec = tz.parseTimezone(req.tz);
  const localDt = tz.localize(tzSpec, solarDateStr, timeStr);
  const offsetSeconds = localDt.utcOffset() * 60;

  let finalLocalDt = localDt;
  let lmtInfo: LmtInfo | null = null;

  if (req.useLmt) {
    if (req.longitude !== null && req.location !== null) {
      throw new Error('use either --longitude or --location (not both)');
    }
    let longitude: number;
    let locationLabel: string | null = null;

    if (req.longitude !== null) {
      longitude = req.longitude;
    } else if (req.location !== null) {
      const loc = location.resolveLocation(req.location);
      if (!loc) {
        throw new Error(`unknown location '${req.location}'; try one of: ${location.locationHint()}`);
      }
      longitude = loc.longitude;
      locationLabel = loc.display;
    } else {
      throw new Error('longitude or location is required for local mean time');
    }

    if (longitude < -180 || longitude > 180) {
      throw new Error('longitude must be between -180 and 180 degrees');
    }

    const [stdMeridian, correctionSecs] = location.lmtCorrection(longitude, offsetSeconds);
    finalLocalDt = localDt.add(correctionSecs, 'second');

    lmtInfo = {
      longitude,
      stdMeridian,
      correctionSeconds: correctionSecs,
      correctedLocal: finalLocalDt.format('YYYY-MM-DD HH:mm:ss'),
      locationLabel,
    };
  }

  // ── 3단계: 연주·월주 결정 (절기 기준) ──
  const utcDt = finalLocalDt.utc();
  const birthJd = astro.jdFromDatetime(utcDt.toDate());

  const year = finalLocalDt.year();
  const termsPrev = astro.computeSolarTerms(year - 1);
  const termsCurr = astro.computeSolarTerms(year);
  const termsNext = astro.computeSolarTerms(year + 1);

  // 입춘(立春) 기준 연주 결정: 입춘 이전이면 전년도
  const lichunTerm = termsCurr.find((t) => t.def.key === 'lichun');
  if (!lichunTerm) throw new Error('failed to find lichun term');
  const lichunJd = lichunTerm.jd;
  const yearForPillar = birthJd >= lichunJd ? year : year - 1;
  const [yearStem, yearBranch] = bazi.yearPillar(yearForPillar);
  const yearPillar: Pillar = { stem: yearStem, branch: yearBranch };

  // 절기 경계 기준 월주 결정
  const monthBranch = bazi.monthBranchForBirth(birthJd, termsPrev, termsCurr);
  const monthStem = bazi.monthStemFromYear(yearStem, monthBranch);
  const monthPillar: Pillar = { stem: monthStem, branch: monthBranch };

  // ── 4단계: 일주 결정 (23시 자시 경계 처리) ──
  const localHour = finalLocalDt.hour();
  const localMinute = finalLocalDt.minute();

  // 23:00 이후는 다음날의 일주를 사용 (야자시 조기자시 처리)
  let adjustedYear = finalLocalDt.year();
  let adjustedMonth = finalLocalDt.month() + 1;
  let adjustedDay = finalLocalDt.date();
  if (localHour >= 23) {
    const nextDay = finalLocalDt.add(1, 'day');
    adjustedYear = nextDay.year();
    adjustedMonth = nextDay.month() + 1;
    adjustedDay = nextDay.date();
  }

  const jdn = bazi.jdnFromDate(adjustedYear, adjustedMonth, adjustedDay);
  const [dayStem, dayBranch] = bazi.dayPillarFromJdn(jdn);
  const dayPillar: Pillar = { stem: dayStem, branch: dayBranch };

  // ── 5단계: 시주 결정 ──
  const hourBranch = bazi.hourBranchIndex(localHour, localMinute);
  const hourStem = bazi.hourStemFromDay(dayStem, hourBranch);
  const hourPillar: Pillar = { stem: hourStem, branch: hourBranch };

  // ── 6단계: 운(運) 계산 ──
  const direction = luck.daewonDirection(req.gender, yearStem);
  const startMonths = luck.daewonStartMonths(birthJd, termsPrev, termsCurr, termsNext, direction);
  if (startMonths === null) throw new Error('failed to find solar term for daewon start');

  const daewonPillars = luck.buildDaewonPillars(monthPillar, direction, req.daewonCount);
  const daewonItems = luck.buildDaewonItems(startMonths, daewonPillars);

  const nowLocal = tz.toLocal(tzSpec, dayjs.utc());
  const monthYr = req.monthYear ?? nowLocal.year();
  const yearStart = req.yearStart ?? monthYr - 3;
  if (req.yearCount === 0) throw new Error('year-count must be at least 1');

  const yearlyLuckResult = luck.yearlyLuck(yearStart, req.yearCount);
  const monthlyLuckResult = luck.monthlyLuck(monthYr);

  // ── 7단계: 분석 (강약, 용신, 합충, 신살) ──
  const fourPillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const strength = bazi.assessStrength(dayStem, fourPillars);
  const yongshinResult = bazi.determineYongshin(dayStem, strength.verdict);
  const stemInteractions = bazi.findStemInteractions(fourPillars);
  const branchInteractions = bazi.findBranchInteractions(fourPillars);
  const shinsalEntries = bazi.findShinsal(fourPillars);

  return {
    inputDate: req.date,
    inputTime: req.time,
    calendarIsLunar: req.calendar === 'Lunar',
    leapMonth: req.leapMonth,
    tzName: tz.tzName(tzSpec),
    convertedSolar,
    convertedLunar,
    lmtInfo,
    gender: req.gender,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    strength,
    yongshin: yongshinResult,
    stemInteractions,
    branchInteractions,
    shinsalEntries,
    daewonDirection: direction,
    daewonStartMonths: startMonths,
    daewonItems,
    yearlyLuck: yearlyLuckResult,
    monthlyLuck: monthlyLuckResult,
    tzSpec,
    solarTerms: termsCurr,
  };
}
