import { describe, expect, it } from 'vitest';
import { invalidInputEffects } from '../src/appInvalidState';

describe('invalidInputEffects', () => {
  it('유효 상태(null 메시지)에서는 이전 오류를 유지한다', () => {
    const effects = invalidInputEffects(null);
    expect(effects).toEqual({
      clearError: false,
      clearResult: false,
      stopLoading: false,
    });
  });

  it('무효 상태(메시지 존재)에서는 결과와 로딩을 함께 초기화한다', () => {
    const effects = invalidInputEffects('입력값을 다시 확인해 주세요 (날짜).');
    expect(effects).toEqual({
      clearError: true,
      clearResult: true,
      stopLoading: true,
    });
  });
});
