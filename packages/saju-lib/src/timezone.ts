/**
 * @fileoverview 시간대(Timezone) 처리 모듈
 *
 * IANA 시간대명(예: 'Asia/Seoul')과 고정 오프셋(예: '+09:00')을 파싱하고,
 * 날짜·시간 문자열을 해당 시간대 기준 dayjs 객체로 변환한다.
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 시간대 명세: IANA 이름 또는 고정 UTC 오프셋.
 * 구별된 유니온(discriminated union)으로 각 variant에 필요한 필드만 보유한다.
 */
export type TimeZoneSpec =
  | { type: 'fixed'; offsetSeconds: number }
  | { type: 'named'; name: string };

/**
 * 시간대 문자열을 파싱하여 TimeZoneSpec을 반환한다.
 * @param input IANA 시간대명 또는 고정 오프셋 문자열 (예: 'Asia/Seoul', '+09:00')
 * @returns 파싱된 시간대 명세
 * @throws 유효하지 않은 시간대 문자열인 경우
 */
export function parseTimezone(input: string): TimeZoneSpec {
  const fixed = parseFixedOffset(input);
  if (fixed !== null) {
    return { type: 'fixed', offsetSeconds: fixed };
  }
  // IANA 시간대명으로 검증
  const d = dayjs.tz('2000-01-01 00:00', input);
  if (d.isValid()) {
    return { type: 'named', name: input };
  }
  throw new Error('timezone must be IANA name (e.g., Asia/Seoul) or offset (+09:00)');
}

/**
 * 고정 오프셋 문자열을 초 단위로 파싱한다.
 * @param input '+09:00', '-0530' 등의 문자열
 * @returns 오프셋 초 또는 파싱 실패 시 null
 */
function parseFixedOffset(input: string): number | null {
  const trimmed = input.trim();
  let sign: number;
  if (trimmed.startsWith('+')) {
    sign = 1;
  } else if (trimmed.startsWith('-')) {
    sign = -1;
  } else {
    return null;
  }
  const rest = trimmed.slice(1);
  let hours: number;
  let minutes: number;
  if (rest.includes(':')) {
    const [h, m] = rest.split(':');
    hours = parseInt(h, 10);
    minutes = parseInt(m, 10);
  } else if (rest.length === 4) {
    hours = parseInt(rest.slice(0, 2), 10);
    minutes = parseInt(rest.slice(2, 4), 10);
  } else {
    return null;
  }
  if (isNaN(hours) || isNaN(minutes) || Math.abs(hours) > 23 || Math.abs(minutes) > 59) {
    return null;
  }
  return sign * (hours * 3600 + minutes * 60);
}

/**
 * TimeZoneSpec의 표시 이름을 반환한다.
 * @param spec 시간대 명세
 * @returns IANA 이름 또는 '+09:00' 형식 문자열
 */
export function tzName(spec: TimeZoneSpec): string {
  if (spec.type === 'named') return spec.name;
  const total = spec.offsetSeconds;
  const sign = total >= 0 ? '+' : '-';
  const abs = Math.abs(total);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 날짜·시간 문자열을 해당 시간대 기준 dayjs 객체로 변환한다.
 * @param spec 시간대 명세
 * @param dateStr 날짜 문자열 (YYYY-MM-DD)
 * @param timeStr 시간 문자열 (HH:mm:ss)
 * @returns 시간대가 적용된 dayjs 객체
 */
export function localize(spec: TimeZoneSpec, dateStr: string, timeStr: string): dayjs.Dayjs {
  const naive = `${dateStr} ${timeStr}`;
  if (spec.type === 'named') {
    return dayjs.tz(naive, spec.name);
  }
  return dayjs.utc(naive).subtract(spec.offsetSeconds, 'second');
}

/**
 * UTC 날짜를 해당 시간대의 로컬 시각으로 변환한다.
 * @param spec 시간대 명세
 * @param utcDate UTC 기준 Date 또는 dayjs 객체
 * @returns 로컬 시각 dayjs 객체
 */
export function toLocal(spec: TimeZoneSpec, utcDate: dayjs.Dayjs | Date): dayjs.Dayjs {
  const d = utcDate instanceof Date ? dayjs.utc(utcDate) : utcDate;
  if (spec.type === 'named') {
    return d.tz(spec.name);
  }
  return d.utcOffset(spec.offsetSeconds / 60);
}

/**
 * 특정 날짜·시간의 UTC 오프셋(초)을 반환한다.
 * @param spec 시간대 명세
 * @param dateStr 날짜 문자열 (YYYY-MM-DD)
 * @param timeStr 시간 문자열 (HH:mm:ss)
 * @returns UTC 오프셋 (초 단위)
 */
export function getOffsetSeconds(spec: TimeZoneSpec, dateStr: string, timeStr: string): number {
  const dt = localize(spec, dateStr, timeStr);
  return dt.utcOffset() * 60;
}
