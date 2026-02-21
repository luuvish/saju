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
} from './types.js';
import type { StrengthResult } from './bazi.js';
import type { DaewonItem, MonthlyLuck, YearLuck } from './luck.js';
import type { TimeZoneSpec } from './timezone.js';

export type CalendarType = 'Solar' | 'Lunar';

export interface SajuRequest {
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM or HH:MM:SS
  calendar: CalendarType;
  leapMonth: boolean;
  gender: Gender;
  tz: string;
  useLmt: boolean;
  longitude: number | null;
  location: string | null;
  daewonCount: number;
  monthYear: number | null;
  yearStart: number | null;
  yearCount: number;
}

export interface SajuResult {
  inputDate: string;
  inputTime: string;
  calendarIsLunar: boolean;
  leapMonth: boolean;
  tzName: string;
  convertedSolar: string | null;
  convertedLunar: LunarDate | null;
  lmtInfo: LmtInfo | null;
  gender: Gender;

  yearPillar: Pillar;
  monthPillar: Pillar;
  dayPillar: Pillar;
  hourPillar: Pillar;

  strength: StrengthResult;
  stemInteractions: StemInteraction[];
  branchInteractions: BranchInteraction[];
  shinsalEntries: ShinsalEntry[];

  daewonDirection: Direction;
  daewonStartMonths: number;
  daewonItems: DaewonItem[];

  yearlyLuck: YearLuck[];
  monthlyLuck: MonthlyLuck;

  tzSpec: TimeZoneSpec;
  solarTerms: SolarTerm[];
}

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

export function calculate(req: SajuRequest): SajuResult {
  const time = parseTime(req.time);

  if (req.calendar === 'Solar' && req.leapMonth) {
    throw new Error('leap-month is only valid with calendar=lunar');
  }

  const dateParts = req.date.split('-').map(Number);
  const [inputYear, inputMonth, inputDay] = dateParts;

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

  const utcDt = finalLocalDt.utc();
  const birthJd = astro.jdFromDatetime(utcDt.toDate());

  const year = finalLocalDt.year();
  const termsPrev = astro.computeSolarTerms(year - 1);
  const termsCurr = astro.computeSolarTerms(year);
  const termsNext = astro.computeSolarTerms(year + 1);

  const lichunTerm = termsCurr.find((t) => t.def.key === 'lichun');
  if (!lichunTerm) throw new Error('failed to find lichun term');
  const lichunJd = lichunTerm.jd;
  const yearForPillar = birthJd >= lichunJd ? year : year - 1;
  const [yearStem, yearBranch] = bazi.yearPillar(yearForPillar);
  const yearPillar: Pillar = { stem: yearStem, branch: yearBranch };

  const monthBranch = bazi.monthBranchForBirth(birthJd, termsPrev, termsCurr);
  const monthStem = bazi.monthStemFromYear(yearStem, monthBranch);
  const monthPillar: Pillar = { stem: monthStem, branch: monthBranch };

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

  const hourBranch = bazi.hourBranchIndex(localHour, localMinute);
  const hourStem = bazi.hourStemFromDay(dayStem, hourBranch);
  const hourPillar: Pillar = { stem: hourStem, branch: hourBranch };

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

  const fourPillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const strength = bazi.assessStrength(dayStem, fourPillars);
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
