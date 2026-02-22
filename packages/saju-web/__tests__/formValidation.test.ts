import { describe, expect, it } from 'vitest';
import {
  validateSajuFormInput,
  type FormValidationInput,
} from '../src/components/formValidation';

function makeInput(overrides: Partial<FormValidationInput> = {}): FormValidationInput {
  return {
    date: '2000-01-15',
    time: '12:00',
    calendar: 'Solar',
    leapMonth: false,
    gender: 'Male',
    tz: 'Asia/Seoul',
    useLmt: false,
    location: null,
    longitude: null,
    daewonCount: 10,
    monthYear: null,
    yearStart: null,
    yearCount: 10,
    ...overrides,
  };
}

describe('validateSajuFormInput', () => {
  it('유효한 입력이면 오류가 없다', () => {
    const result = validateSajuFormInput(makeInput());
    expect(result.summary).toBeNull();
    expect(result.fieldErrors).toEqual({});
  });

  it('양력 범위 밖 연도는 날짜 오류로 매핑한다', () => {
    const result = validateSajuFormInput(makeInput({ date: '1800-01-01' }));
    expect(result.fieldErrors.date).toBe('양력은 1900년~2100년까지만 지원합니다.');
    expect(result.summary).toBe('입력값을 다시 확인해 주세요 (날짜).');
  });

  it('존재하지 않는 양력 날짜는 날짜 오류로 매핑한다', () => {
    const result = validateSajuFormInput(makeInput({ date: '2000-02-30' }));
    expect(result.fieldErrors.date).toBe('존재하지 않는 날짜입니다.');
    expect(result.summary).toBe('입력값을 다시 확인해 주세요 (날짜).');
  });

  it('날짜 형식이 YYYY-MM-DD가 아니면 형식 오류로 매핑한다', () => {
    const result = validateSajuFormInput(makeInput({ date: '2000-1-1' }));
    expect(result.fieldErrors.date).toBe('날짜 형식이 올바르지 않습니다.');
    expect(result.summary).toBe('입력값을 다시 확인해 주세요 (날짜).');
  });

  it('잘못된 시간 입력은 시간 오류로 매핑한다', () => {
    const result = validateSajuFormInput(makeInput({ time: '25:10' }));
    expect(result.fieldErrors.time).toBe('시간은 00:00~23:59 범위로 입력해 주세요.');
    expect(result.summary).toBe('입력값을 다시 확인해 주세요 (시간).');
  });

  it('시간 형식이 HH:MM이 아니면 형식 오류로 매핑한다', () => {
    const result = validateSajuFormInput(makeInput({ time: '12:3a' }));
    expect(result.fieldErrors.time).toBe('시간 형식이 올바르지 않습니다.');
    expect(result.summary).toBe('입력값을 다시 확인해 주세요 (시간).');
  });

  it('잘못된 지역 키는 지역 오류로 매핑한다', () => {
    const result = validateSajuFormInput(makeInput({
      useLmt: true,
      location: 'not-a-location',
    }));
    expect(result.fieldErrors.location).toBe('선택한 지역을 다시 확인해 주세요.');
    expect(result.summary).toBe('입력값을 다시 확인해 주세요 (지역).');
  });

  it('세운 표시 기간이 0이면 설정 안내를 반환한다', () => {
    const result = validateSajuFormInput(makeInput({ yearCount: 0 }));
    expect(result.fieldErrors).toEqual({});
    expect(result.summary).toBe('세운 표시 기간을 1 이상의 정수로 설정해 주세요.');
  });

  it('세운 표시 기간이 음수여도 설정 안내를 반환한다', () => {
    const result = validateSajuFormInput(makeInput({ yearCount: -1 }));
    expect(result.fieldErrors).toEqual({});
    expect(result.summary).toBe('세운 표시 기간을 1 이상의 정수로 설정해 주세요.');
  });

  it('세운 표시 기간이 정수가 아니면 설정 안내를 반환한다', () => {
    const result = validateSajuFormInput(makeInput({ yearCount: 1.2 }));
    expect(result.fieldErrors).toEqual({});
    expect(result.summary).toBe('세운 표시 기간을 1 이상의 정수로 설정해 주세요.');
  });

  it('세운 표시 기간이 너무 크면 상한 안내를 반환한다', () => {
    const result = validateSajuFormInput(makeInput({ yearCount: 121 }));
    expect(result.fieldErrors).toEqual({});
    expect(result.summary).toBe('세운 표시 기간을 120 이하로 설정해 주세요.');
  });

  it('대운 개수가 정수가 아니면 설정 안내를 반환한다', () => {
    const result = validateSajuFormInput(makeInput({ daewonCount: 2.5 }));
    expect(result.fieldErrors).toEqual({});
    expect(result.summary).toBe('대운 개수를 1 이상의 정수로 설정해 주세요.');
  });

  it('대운 개수가 너무 크면 상한 안내를 반환한다', () => {
    const result = validateSajuFormInput(makeInput({ daewonCount: 121 }));
    expect(result.fieldErrors).toEqual({});
    expect(result.summary).toBe('대운 개수를 120 이하로 설정해 주세요.');
  });

  it('월운 기준 연도가 범위를 벗어나면 범위 안내를 반환한다', () => {
    const result = validateSajuFormInput(makeInput({ monthYear: 1800 }));
    expect(result.fieldErrors).toEqual({});
    expect(result.summary).toBe('월운 기준 연도를 1900~2100 범위의 정수로 설정해 주세요.');
  });

  it('세운 시작 연도가 범위를 벗어나면 범위 안내를 반환한다', () => {
    const result = validateSajuFormInput(makeInput({ yearStart: 2200 }));
    expect(result.fieldErrors).toEqual({});
    expect(result.summary).toBe('세운 시작 연도를 1900~2100 범위의 정수로 설정해 주세요.');
  });

  it('세운 시작/기간 조합이 범위를 벗어나면 범위 안내를 반환한다', () => {
    const result = validateSajuFormInput(makeInput({ yearStart: 2100, yearCount: 2 }));
    expect(result.fieldErrors).toEqual({});
    expect(result.summary).toBe('세운 범위를 1900~2100 안에서 설정해 주세요.');
  });

  it('월운 기준 연도 기반 기본 시작연도로 계산한 세운 범위도 제한한다', () => {
    const result = validateSajuFormInput(makeInput({ monthYear: 2100, yearStart: null, yearCount: 10 }));
    expect(result.fieldErrors).toEqual({});
    expect(result.summary).toBe('세운 범위를 1900~2100 안에서 설정해 주세요.');
  });
});
