import type { LunarDate } from './types.js';

const LUNAR_MIN_YEAR = 1900;
const LUNAR_MAX_YEAR = 2099;

const LUNAR_INFO: number[] = [
  // 1900-1909
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  // 1910-1919
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  // 1920-1929
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  // 1930-1939
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  // 1940-1949
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  // 1950-1959
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  // 1960-1969
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  // 1970-1979
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  // 1980-1989
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  // 1990-1999
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  // 2000-2009
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  // 2010-2019
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  // 2020-2029
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  // 2030-2039
  0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  // 2040-2049
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  // 2050-2059
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06aa0, 0x1a6c4, 0x0aae0,
  // 2060-2069
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  // 2070-2079
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  // 2080-2089
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  // 2090-2099
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
];

function remEuclid(a: number, b: number): number {
  return ((a % b) + b) % b;
}

function lunarInfo(year: number): number {
  return LUNAR_INFO[year - LUNAR_MIN_YEAR];
}

function lunarLeapMonth(year: number): number {
  return lunarInfo(year) & 0xf;
}

function lunarLeapDays(year: number): number {
  if (lunarLeapMonth(year) === 0) return 0;
  return (lunarInfo(year) & 0x10000) !== 0 ? 30 : 29;
}

function lunarMonthDays(year: number, month: number): number {
  return (lunarInfo(year) & (0x10000 >> month)) !== 0 ? 30 : 29;
}

function lunarYearDays(year: number): number {
  const info = lunarInfo(year);
  let sum = 348;
  let mask = 0x8000;
  while (mask > 0x8) {
    if ((info & mask) !== 0) {
      sum += 1;
    }
    mask >>= 1;
  }
  return sum + lunarLeapDays(year);
}

function daysBetween(d1: Date, d2: Date): number {
  const ms = d2.getTime() - d1.getTime();
  return Math.round(ms / 86400000);
}

function dateFromYmd(year: number, month: number, day: number): Date {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (year >= 0 && year < 100) d.setUTCFullYear(year);
  return d;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  isLeap: boolean,
): Date {
  if (year < LUNAR_MIN_YEAR || year > LUNAR_MAX_YEAR) {
    throw new Error(`lunar date range supported: ${LUNAR_MIN_YEAR}-${LUNAR_MAX_YEAR}`);
  }
  if (month === 0 || month > 12) {
    throw new Error('lunar month must be 1-12');
  }
  const leapMonth = lunarLeapMonth(year);
  if (isLeap && leapMonth !== month) {
    throw new Error('leap-month flag does not match the year\'s leap month');
  }
  const maxDay = isLeap ? lunarLeapDays(year) : lunarMonthDays(year, month);
  if (day === 0 || day > maxDay) {
    throw new Error(`lunar day must be 1-${maxDay}`);
  }

  let offset = 0;
  for (let y = LUNAR_MIN_YEAR; y < year; y++) {
    offset += lunarYearDays(y);
  }
  for (let m = 1; m < month; m++) {
    offset += lunarMonthDays(year, m);
    if (leapMonth === m) {
      offset += lunarLeapDays(year);
    }
  }
  if (isLeap) {
    offset += lunarMonthDays(year, month);
  }
  offset += day - 1;

  const base = dateFromYmd(LUNAR_MIN_YEAR, 1, 31);
  return addDays(base, offset);
}

export function solarToLunar(date: Date): LunarDate {
  const base = dateFromYmd(LUNAR_MIN_YEAR, 1, 31);
  if (date < base) {
    throw new Error('solar date before supported lunar range');
  }
  const dateYear = date.getUTCFullYear();
  if (dateYear > LUNAR_MAX_YEAR) {
    throw new Error(`lunar date range supported: ${LUNAR_MIN_YEAR}-${LUNAR_MAX_YEAR}`);
  }

  let offset = daysBetween(base, date);
  let totalDays = 0;
  for (let y = LUNAR_MIN_YEAR; y <= LUNAR_MAX_YEAR; y++) {
    totalDays += lunarYearDays(y);
  }
  if (offset >= totalDays) {
    throw new Error('solar date after supported lunar range');
  }

  let year = LUNAR_MIN_YEAR;
  for (let y = LUNAR_MIN_YEAR; y <= LUNAR_MAX_YEAR; y++) {
    const days = lunarYearDays(y);
    if (offset < days) {
      year = y;
      break;
    }
    offset -= days;
  }

  const leap = lunarLeapMonth(year);
  let month = 1;
  let isLeap = false;
  for (let m = 1; m <= 12; m++) {
    const mdays = lunarMonthDays(year, m);
    if (offset < mdays) {
      month = m;
      isLeap = false;
      break;
    }
    offset -= mdays;

    if (leap === m) {
      const ldays = lunarLeapDays(year);
      if (offset < ldays) {
        month = m;
        isLeap = true;
        break;
      }
      offset -= ldays;
    }
  }

  const day = offset + 1;
  return { year, month, day, isLeap };
}

export { remEuclid };
