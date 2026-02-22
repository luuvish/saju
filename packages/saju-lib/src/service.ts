/**
 * @fileoverview 사주 계산 서비스 — 메인 엔트리 함수
 *
 * `calculate()` 함수가 SajuRequest를 받아 SajuResult를 반환하는
 * 통합 계산 파이프라인을 제공한다. 내부적으로 astro, bazi, lunar,
 * luck, timezone, location 모듈을 조합하여 사주팔자를 산출한다.
 */

import dayjs from 'dayjs';
// dayjs utc/timezone 플러그인은 timezone.ts에서 이미 등록됨

import * as astro from './astro.js';
import * as bazi from './bazi.js';
import { findStemInteractions, findBranchInteractions } from './interactions.js';
import * as location from './location.js';
import * as luck from './luck.js';
import * as lunar from './lunar.js';
import { findShinsal } from './shinsal.js';
import { assessStrength, determineYongshin } from './strength.js';
import type { StrengthResult } from './strength.js';
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

/** 입력 검증 실패 사유 코드 */
export type ValidationErrorCode =
  | 'TIME_FORMAT'
  | 'TIME_HOUR_RANGE'
  | 'TIME_MINUTE_RANGE'
  | 'TIME_SECOND_RANGE'
  | 'DATE_FORMAT'
  | 'DATE_MONTH_RANGE'
  | 'DATE_DAY_RANGE'
  | 'DATE_SOLAR_YEAR_RANGE'
  | 'DATE_LUNAR_YEAR_RANGE'
  | 'DATE_SOLAR_INVALID'
  | 'DATE_LUNAR_MONTH_RANGE'
  | 'DATE_LUNAR_DAY_RANGE'
  | 'DATE_LUNAR_LEAP_MISMATCH'
  | 'DATE_LUNAR_SOLAR_RANGE'
  | 'DATE_LUNAR_CONVERSION_FAILED'
  | 'LEAP_MONTH_WITH_SOLAR'
  | 'TIMEZONE_INVALID'
  | 'LMT_LONGITUDE_LOCATION_CONFLICT'
  | 'LMT_LOCATION_UNKNOWN'
  | 'LMT_LOCATION_REQUIRED'
  | 'LMT_LONGITUDE_RANGE'
  | 'MONTH_YEAR_RANGE'
  | 'YEAR_START_RANGE'
  | 'YEAR_LUCK_RANGE'
  | 'DAEWON_COUNT_MIN'
  | 'DAEWON_COUNT_MAX'
  | 'YEAR_COUNT_MIN'
  | 'YEAR_COUNT_MAX';

/** 입력 검증 실패를 나타내는 도메인 에러 */
export class SajuValidationError extends Error {
  readonly code: ValidationErrorCode;

  constructor(code: ValidationErrorCode, message: string) {
    super(message);
    this.name = 'SajuValidationError';
    this.code = code;
  }
}

/** unknown 에러가 SajuValidationError인지 판별한다. */
export function isSajuValidationError(err: unknown): err is SajuValidationError {
  if (!(err instanceof Error)) return false;
  const code = (err as { code?: unknown }).code;
  return err.name === 'SajuValidationError' && typeof code === 'string';
}

function raiseValidationError(code: ValidationErrorCode, message: string): never {
  throw new SajuValidationError(code, message);
}

const DAEWON_COUNT_MAX = 120;
const YEAR_COUNT_MAX = 120;
const SOLAR_YEAR_MIN = 1900;
const SOLAR_YEAR_MAX = 2100;
const LUNAR_YEAR_MIN = 1900;
const LUNAR_YEAR_MAX = 2099;

/**
 * 시간 문자열을 파싱한다.
 * @param input 'HH:MM' 또는 'HH:MM:SS' 형식
 * @returns 시, 분, 초 객체
 * @throws 형식이 잘못된 경우
 */
function parseTime(input: string): { hour: number; minute: number; second: number } {
  const match = input.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    raiseValidationError('TIME_FORMAT', 'time format must be HH:MM or HH:MM:SS');
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] !== undefined ? Number(match[3]) : 0;
  if (hour < 0 || hour > 23) {
    raiseValidationError('TIME_HOUR_RANGE', 'hour must be 0-23');
  }
  if (minute < 0 || minute > 59) {
    raiseValidationError('TIME_MINUTE_RANGE', 'minute must be 0-59');
  }
  if (second < 0 || second > 59) {
    raiseValidationError('TIME_SECOND_RANGE', 'second must be 0-59');
  }
  return { hour, minute, second };
}

/** 양력 날짜가 실제 달력 날짜인지 검증한다. */
function isValidSolarDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (year >= 0 && year < 100) d.setUTCFullYear(year);
  return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month && d.getUTCDate() === day;
}

/** lunar.ts에서 온 오류를 입력 검증 코드 에러로 변환한다. */
function mapLunarError(err: unknown): never {
  if (lunar.isLunarConversionError(err)) {
    switch (err.code) {
      case 'LUNAR_YEAR_RANGE':
        raiseValidationError('DATE_LUNAR_YEAR_RANGE', err.message);
      case 'LUNAR_MONTH_RANGE':
        raiseValidationError('DATE_LUNAR_MONTH_RANGE', err.message);
      case 'LUNAR_DAY_RANGE':
        raiseValidationError('DATE_LUNAR_DAY_RANGE', err.message);
      case 'LUNAR_LEAP_MISMATCH':
        raiseValidationError('DATE_LUNAR_LEAP_MISMATCH', err.message);
      case 'SOLAR_BEFORE_RANGE':
      case 'SOLAR_AFTER_RANGE':
        raiseValidationError('DATE_LUNAR_SOLAR_RANGE', err.message);
      case 'LUNAR_RESOLUTION_FAILED':
        raiseValidationError('DATE_LUNAR_CONVERSION_FAILED', err.message);
    }
  }
  const message = err instanceof Error ? err.message : String(err);
  raiseValidationError('DATE_LUNAR_CONVERSION_FAILED', message);
}

function isSolarToLunarRangeError(err: unknown): boolean {
  return lunar.isLunarConversionError(err)
    && (
      err.code === 'SOLAR_BEFORE_RANGE'
      || err.code === 'SOLAR_AFTER_RANGE'
      || err.code === 'LUNAR_YEAR_RANGE'
    );
}

// ── 내부 헬퍼 ──

/** 날짜 파싱 및 음양력 변환 결과 */
interface DateResolution {
  solarYear: number
  solarMonth: number
  solarDay: number
  convertedSolar: string | null
  convertedLunar: LunarDate | null
}

/** 1단계: 입력 날짜 파싱 및 음양력 변환 */
function resolveDate(req: SajuRequest): DateResolution {
  const dateMatch = req.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    raiseValidationError('DATE_FORMAT', 'date must be valid YYYY-MM-DD format');
  }
  const inputYear = Number(dateMatch[1]);
  const inputMonth = Number(dateMatch[2]);
  const inputDay = Number(dateMatch[3]);
  if (inputMonth < 1 || inputMonth > 12) {
    raiseValidationError('DATE_MONTH_RANGE', 'month must be 1-12');
  }
  if (inputDay < 1 || inputDay > 31) {
    raiseValidationError('DATE_DAY_RANGE', 'day must be 1-31');
  }

  if (req.calendar === 'Lunar' && (inputYear < LUNAR_YEAR_MIN || inputYear > LUNAR_YEAR_MAX)) {
    raiseValidationError('DATE_LUNAR_YEAR_RANGE', `음력 변환은 ${LUNAR_YEAR_MIN}-${LUNAR_YEAR_MAX}년 범위만 지원합니다`);
  }
  if (req.calendar === 'Solar' && (inputYear < SOLAR_YEAR_MIN || inputYear > SOLAR_YEAR_MAX)) {
    raiseValidationError('DATE_SOLAR_YEAR_RANGE', `양력 절기 계산은 ${SOLAR_YEAR_MIN}-${SOLAR_YEAR_MAX}년 범위만 지원합니다`);
  }
  if (req.calendar === 'Solar' && !isValidSolarDate(inputYear, inputMonth, inputDay)) {
    raiseValidationError('DATE_SOLAR_INVALID', 'solar date must be a valid calendar date');
  }

  if (req.calendar === 'Solar') {
    const sDate = new Date(Date.UTC(inputYear, inputMonth - 1, inputDay));
    if (inputYear >= 0 && inputYear < 100) sDate.setUTCFullYear(inputYear);
    let convertedLunar: LunarDate | null = null;
    try {
      convertedLunar = lunar.solarToLunar(sDate);
    } catch (err: unknown) {
      // 절기 계산 가능한 연도여도 음력 데이터 테이블 범위를 넘는 날짜가 있다.
      // 이 경우 계산은 진행하고 음력 표기만 생략한다.
      if (!isSolarToLunarRangeError(err)) mapLunarError(err);
    }
    return {
      solarYear: inputYear,
      solarMonth: inputMonth,
      solarDay: inputDay,
      convertedSolar: null,
      convertedLunar,
    };
  } else {
    let sDate: Date;
    try {
      sDate = lunar.lunarToSolar(inputYear, inputMonth, inputDay, req.leapMonth);
    } catch (err: unknown) {
      mapLunarError(err);
    }
    const solarYear = sDate.getUTCFullYear();
    const solarMonth = sDate.getUTCMonth() + 1;
    const solarDay = sDate.getUTCDate();
    const yy = String(solarYear).padStart(4, '0');
    const mm = String(solarMonth).padStart(2, '0');
    const dd = String(solarDay).padStart(2, '0');
    return {
      solarYear,
      solarMonth,
      solarDay,
      convertedSolar: `${yy}-${mm}-${dd}`,
      convertedLunar: null,
    };
  }
}

/** 시간대/LMT 보정 결과 */
interface TimezoneResolution {
  finalLocalDt: dayjs.Dayjs
  lmtInfo: LmtInfo | null
  tzSpec: tz.TimeZoneSpec
}

interface InputResolution {
  dateRes: DateResolution
  tzRes: TimezoneResolution
  monthYear: number
  yearStart: number
}

/** 2단계: 시간대 적용 및 LMT 보정 */
function applyTimezone(
  solarYear: number,
  solarMonth: number,
  solarDay: number,
  time: { hour: number; minute: number; second: number },
  req: SajuRequest,
): TimezoneResolution {
  const solarDateStr = `${String(solarYear).padStart(4, '0')}-${String(solarMonth).padStart(2, '0')}-${String(solarDay).padStart(2, '0')}`;
  const timeStr = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}:${String(time.second).padStart(2, '0')}`;

  let tzSpec: tz.TimeZoneSpec;
  try {
    tzSpec = tz.parseTimezone(req.tz);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    raiseValidationError('TIMEZONE_INVALID', message);
  }
  const localDt = tz.localize(tzSpec, solarDateStr, timeStr);
  const offsetSeconds = localDt.utcOffset() * 60;

  let finalLocalDt = localDt;
  let lmtInfo: LmtInfo | null = null;

  if (req.useLmt) {
    if (req.longitude !== null && req.location !== null) {
      raiseValidationError('LMT_LONGITUDE_LOCATION_CONFLICT', 'use either --longitude or --location (not both)');
    }
    let longitude: number;
    let locationLabel: string | null = null;

    if (req.longitude !== null) {
      longitude = req.longitude;
    } else if (req.location !== null) {
      const loc = location.resolveLocation(req.location);
      if (!loc) {
        raiseValidationError('LMT_LOCATION_UNKNOWN', `unknown location '${req.location}'; try one of: ${location.locationHint()}`);
      }
      longitude = loc.longitude;
      locationLabel = loc.display;
    } else {
      raiseValidationError('LMT_LOCATION_REQUIRED', 'longitude or location is required for local mean time');
    }

    if (longitude < -180 || longitude > 180) {
      raiseValidationError('LMT_LONGITUDE_RANGE', 'longitude must be between -180 and 180 degrees');
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

  return { finalLocalDt, lmtInfo, tzSpec };
}

/** 계산 전 입력값을 파싱·검증하고 1~2단계 결과를 반환한다. */
function resolveInput(req: SajuRequest): InputResolution {
  const time = parseTime(req.time);

  if (req.calendar === 'Solar' && req.leapMonth) {
    raiseValidationError('LEAP_MONTH_WITH_SOLAR', 'leap-month is only valid with calendar=lunar');
  }

  const dateRes = resolveDate(req);
  const tzRes = applyTimezone(dateRes.solarYear, dateRes.solarMonth, dateRes.solarDay, time, req);
  if (
    req.monthYear !== null
    && (!Number.isInteger(req.monthYear) || req.monthYear < SOLAR_YEAR_MIN || req.monthYear > SOLAR_YEAR_MAX)
  ) {
    raiseValidationError(
      'MONTH_YEAR_RANGE',
      `month-year must be an integer between ${SOLAR_YEAR_MIN} and ${SOLAR_YEAR_MAX}`,
    );
  }
  if (
    req.yearStart !== null
    && (!Number.isInteger(req.yearStart) || req.yearStart < SOLAR_YEAR_MIN || req.yearStart > SOLAR_YEAR_MAX)
  ) {
    raiseValidationError(
      'YEAR_START_RANGE',
      `year-start must be an integer between ${SOLAR_YEAR_MIN} and ${SOLAR_YEAR_MAX}`,
    );
  }
  if (!Number.isInteger(req.daewonCount) || req.daewonCount < 1) {
    raiseValidationError('DAEWON_COUNT_MIN', 'daewon-count must be an integer >= 1');
  }
  if (req.daewonCount > DAEWON_COUNT_MAX) {
    raiseValidationError('DAEWON_COUNT_MAX', `daewon-count must be <= ${DAEWON_COUNT_MAX}`);
  }
  if (!Number.isInteger(req.yearCount) || req.yearCount < 1) {
    raiseValidationError('YEAR_COUNT_MIN', 'year-count must be an integer >= 1');
  }
  if (req.yearCount > YEAR_COUNT_MAX) {
    raiseValidationError('YEAR_COUNT_MAX', `year-count must be <= ${YEAR_COUNT_MAX}`);
  }

  const nowLocal = tz.toLocal(tzRes.tzSpec, dayjs.utc());
  const monthYr = req.monthYear ?? nowLocal.year();
  const yearStart = req.yearStart ?? monthYr - 3;
  const yearEnd = yearStart + req.yearCount - 1;
  if (yearStart < SOLAR_YEAR_MIN || yearEnd > SOLAR_YEAR_MAX) {
    raiseValidationError(
      'YEAR_LUCK_RANGE',
      `yearly luck range must stay between ${SOLAR_YEAR_MIN} and ${SOLAR_YEAR_MAX}`,
    );
  }
  return { dateRes, tzRes, monthYear: monthYr, yearStart };
}

/** 4기둥 산출 결과 */
interface PillarResolution {
  yearPillar: Pillar
  monthPillar: Pillar
  dayPillar: Pillar
  hourPillar: Pillar
  birthJd: number
  yearStem: number
  termsPrev: SolarTerm[]
  termsCurr: SolarTerm[]
  termsNext: SolarTerm[]
}

/** 3~5단계: 절기 기반 4기둥(연·월·일·시) 산출 */
function computePillars(finalLocalDt: dayjs.Dayjs): PillarResolution {
  const utcDt = finalLocalDt.utc();
  const birthJd = astro.jdFromDatetime(utcDt.toDate());

  const year = finalLocalDt.year();
  const termsPrev = luck.getCachedTerms(year - 1);
  const termsCurr = luck.getCachedTerms(year);
  const termsNext = luck.getCachedTerms(year + 1);

  // 입춘(立春) 기준 연주 결정
  const lichunTerm = termsCurr.find((t) => t.def.key === 'lichun');
  if (!lichunTerm) throw new Error('failed to find lichun term');
  const yearForPillar = birthJd >= lichunTerm.jd ? year : year - 1;
  const [yearStem, yearBranch] = bazi.yearPillar(yearForPillar);
  const yearPillar: Pillar = { stem: yearStem, branch: yearBranch };

  // 월주 결정
  const monthBranch = bazi.monthBranchForBirth(birthJd, termsPrev, termsCurr);
  const monthStem = bazi.monthStemFromYear(yearStem, monthBranch);
  const monthPillar: Pillar = { stem: monthStem, branch: monthBranch };

  // 일주 결정 (23시 자시 경계 처리)
  const localHour = finalLocalDt.hour();
  const localMinute = finalLocalDt.minute();

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

  // 시주 결정
  const hourBranch = bazi.hourBranchIndex(localHour, localMinute);
  const hourStem = bazi.hourStemFromDay(dayStem, hourBranch);
  const hourPillar: Pillar = { stem: hourStem, branch: hourBranch };

  return { yearPillar, monthPillar, dayPillar, hourPillar, birthJd, yearStem, termsPrev, termsCurr, termsNext };
}

/** 운(運) 계산 결과 */
interface LuckResolution {
  direction: Direction
  startMonths: number
  daewonItems: DaewonItem[]
  yearlyLuckResult: YearLuck[]
  monthlyLuckResult: luck.MonthlyLuck
}

/** 6단계: 대운/세운/월운 산출 */
function computeLuck(
  req: SajuRequest,
  gender: Gender,
  yearStem: number,
  monthPillar: Pillar,
  birthJd: number,
  termsPrev: SolarTerm[],
  termsCurr: SolarTerm[],
  termsNext: SolarTerm[],
  monthYear: number,
  yearStart: number,
): LuckResolution {
  const direction = luck.daewonDirection(gender, yearStem);
  const startMonths = luck.daewonStartMonths(birthJd, termsPrev, termsCurr, termsNext, direction);
  if (startMonths === null) throw new Error('failed to find solar term for daewon start');

  const daewonPillars = luck.buildDaewonPillars(monthPillar, direction, req.daewonCount);
  const daewonItems = luck.buildDaewonItems(startMonths, daewonPillars);
  const yearlyLuckResult = luck.yearlyLuck(yearStart, req.yearCount);
  const monthlyLuckResult = luck.monthlyLuck(monthYear);

  return { direction, startMonths, daewonItems, yearlyLuckResult, monthlyLuckResult };
}

/** 분석 결과 */
interface AnalysisResult {
  strength: StrengthResult
  yongshin: YongshinResult
  stemInteractions: StemInteraction[]
  branchInteractions: BranchInteraction[]
  shinsalEntries: ShinsalEntry[]
}

/** 7단계: 신강/신약, 용신, 합충형파해, 신살 분석 */
function analyze(fourPillars: Pillar[], dayStem: number): AnalysisResult {
  const strength = assessStrength(dayStem, fourPillars);
  const yongshin = determineYongshin(dayStem, strength.verdict);
  const stemInteractions = findStemInteractions(fourPillars);
  const branchInteractions = findBranchInteractions(fourPillars);
  const shinsalEntries = findShinsal(fourPillars);
  return { strength, yongshin, stemInteractions, branchInteractions, shinsalEntries };
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
  const input = resolveInput(req);

  // 3~5단계: 4기둥 산출
  const pillars = computePillars(input.tzRes.finalLocalDt);

  // 6단계: 운 계산
  const luckRes = computeLuck(
    req, req.gender, pillars.yearStem, pillars.monthPillar,
    pillars.birthJd, pillars.termsPrev, pillars.termsCurr, pillars.termsNext, input.monthYear, input.yearStart,
  );

  // 7단계: 분석
  const fourPillars = [pillars.yearPillar, pillars.monthPillar, pillars.dayPillar, pillars.hourPillar];
  const analysis = analyze(fourPillars, pillars.dayPillar.stem);

  return {
    inputDate: req.date,
    inputTime: req.time,
    calendarIsLunar: req.calendar === 'Lunar',
    leapMonth: req.leapMonth,
    tzName: tz.tzName(input.tzRes.tzSpec),
    convertedSolar: input.dateRes.convertedSolar,
    convertedLunar: input.dateRes.convertedLunar,
    lmtInfo: input.tzRes.lmtInfo,
    gender: req.gender,
    yearPillar: pillars.yearPillar,
    monthPillar: pillars.monthPillar,
    dayPillar: pillars.dayPillar,
    hourPillar: pillars.hourPillar,
    strength: analysis.strength,
    yongshin: analysis.yongshin,
    stemInteractions: analysis.stemInteractions,
    branchInteractions: analysis.branchInteractions,
    shinsalEntries: analysis.shinsalEntries,
    daewonDirection: luckRes.direction,
    daewonStartMonths: luckRes.startMonths,
    daewonItems: luckRes.daewonItems,
    yearlyLuck: luckRes.yearlyLuckResult,
    monthlyLuck: luckRes.monthlyLuckResult,
    tzSpec: input.tzRes.tzSpec,
    solarTerms: pillars.termsCurr,
  };
}

/**
 * 사주 계산 요청의 입력값 유효성만 사전 검증한다.
 * 성공 시 반환값은 없고, 오류 시 예외를 던진다.
 */
export function validateRequest(req: SajuRequest): void {
  resolveInput(req);
}
