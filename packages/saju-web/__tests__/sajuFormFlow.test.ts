import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FormValidationInput } from '../src/components/formValidation';
import {
  runValidatedSubmission,
  scheduleDebouncedSubmit,
} from '../src/components/sajuFormFlow';

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

describe('runValidatedSubmission', () => {
  it('유효한 입력이면 onSubmit을 호출한다', () => {
    const onInvalid = vi.fn();
    const onSubmit = vi.fn();
    const payload = makeInput();

    const validation = runValidatedSubmission(payload, onInvalid, onSubmit);
    expect(validation.summary).toBeNull();
    expect(onInvalid).toHaveBeenCalledWith(null);
    expect(onSubmit).toHaveBeenCalledWith(payload);
  });

  it('무효한 입력이면 onInvalid만 호출한다', () => {
    const onInvalid = vi.fn();
    const onSubmit = vi.fn();
    const payload = makeInput({ date: '1800-01-01' });

    const validation = runValidatedSubmission(payload, onInvalid, onSubmit);
    expect(validation.summary).toBe('입력값을 다시 확인해 주세요 (날짜).');
    expect(onInvalid).toHaveBeenCalledWith('입력값을 다시 확인해 주세요 (날짜).');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('scheduleDebouncedSubmit', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('연속 호출 시 마지막 콜백만 실행한다', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    let timer: ReturnType<typeof setTimeout> | undefined;

    timer = scheduleDebouncedSubmit(timer, 300, callback);
    timer = scheduleDebouncedSubmit(timer, 300, callback);

    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
