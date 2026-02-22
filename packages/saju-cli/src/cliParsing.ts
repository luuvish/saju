/**
 * @fileoverview CLI 숫자 옵션 파서
 *
 * 문자열 옵션을 엄격하게 숫자로 변환한다.
 * `parseInt`/`parseFloat`의 느슨한 파싱(접미 문자열 허용)을 피한다.
 */

export function parseIntegerOption(raw: string, optionName: string): number {
  if (!/^-?\d+$/.test(raw)) {
    throw new Error(`${optionName} must be an integer`);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${optionName} is out of safe integer range`);
  }
  return parsed;
}

export function parseOptionalIntegerOption(raw: string | undefined, optionName: string): number | null {
  if (raw == null) return null;
  return parseIntegerOption(raw, optionName);
}

export function parseNumberOption(raw: string, optionName: string): number {
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw)) {
    throw new Error(`${optionName} must be a number`);
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${optionName} must be a finite number`);
  }
  return parsed;
}

export function parseOptionalNumberOption(raw: string | undefined, optionName: string): number | null {
  if (raw == null) return null;
  return parseNumberOption(raw, optionName);
}

