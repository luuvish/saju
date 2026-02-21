import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface TimeZoneSpec {
  type: 'fixed' | 'named';
  offsetSeconds?: number;
  name?: string;
}

export function parseTimezone(input: string): TimeZoneSpec {
  const fixed = parseFixedOffset(input);
  if (fixed !== null) {
    return { type: 'fixed', offsetSeconds: fixed };
  }
  // Try to validate as IANA timezone
  const d = dayjs.tz('2000-01-01 00:00', input);
  if (d.isValid()) {
    return { type: 'named', name: input };
  }
  throw new Error('timezone must be IANA name (e.g., Asia/Seoul) or offset (+09:00)');
}

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

export function tzName(spec: TimeZoneSpec): string {
  if (spec.type === 'named') return spec.name!;
  const total = spec.offsetSeconds!;
  const sign = total >= 0 ? '+' : '-';
  const abs = Math.abs(total);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function localize(spec: TimeZoneSpec, dateStr: string, timeStr: string): dayjs.Dayjs {
  const naive = `${dateStr} ${timeStr}`;
  if (spec.type === 'named') {
    return dayjs.tz(naive, spec.name!);
  }
  return dayjs.utc(naive).subtract(spec.offsetSeconds!, 'second');
}

export function toLocal(spec: TimeZoneSpec, utcDate: dayjs.Dayjs | Date): dayjs.Dayjs {
  const d = utcDate instanceof Date ? dayjs.utc(utcDate) : utcDate;
  if (spec.type === 'named') {
    return d.tz(spec.name!);
  }
  return d.utcOffset(spec.offsetSeconds! / 60);
}

export function getOffsetSeconds(spec: TimeZoneSpec, dateStr: string, timeStr: string): number {
  const dt = localize(spec, dateStr, timeStr);
  return dt.utcOffset() * 60;
}
