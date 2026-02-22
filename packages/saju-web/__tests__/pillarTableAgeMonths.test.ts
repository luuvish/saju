import { describe, expect, it } from 'vitest';
import type { SajuResult } from 'saju-lib';
import { computeAgeMonths } from '../src/components/PillarTable';

function makeResult(overrides: Partial<SajuResult>): SajuResult {
  return {
    inputDate: '2000-01-01',
    calendarIsLunar: false,
    convertedSolar: undefined,
    ...overrides,
  } as unknown as SajuResult;
}

describe('computeAgeMonths', () => {
  it('출생 일자를 지나지 않았으면 개월 수를 올리지 않는다', () => {
    const result = makeResult({ inputDate: '2000-01-31' });
    expect(computeAgeMonths(result, new Date(2000, 1, 1))).toBe(0);
    expect(computeAgeMonths(result, new Date(2000, 1, 29))).toBe(0);
    expect(computeAgeMonths(result, new Date(2000, 2, 31))).toBe(2);
  });

  it('음력 입력은 convertedSolar를 기준으로 계산한다', () => {
    const result = makeResult({
      calendarIsLunar: true,
      inputDate: '2000-01-10',
      convertedSolar: '2000-02-15',
    });
    expect(computeAgeMonths(result, new Date(2000, 2, 14))).toBe(0);
    expect(computeAgeMonths(result, new Date(2000, 2, 15))).toBe(1);
  });

  it('잘못된 날짜 문자열이면 null을 반환한다', () => {
    const invalid = makeResult({ inputDate: '2000-02-30' });
    expect(computeAgeMonths(invalid, new Date(2000, 2, 1))).toBeNull();
  });
});
