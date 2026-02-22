import { describe, expect, it } from 'vitest';
import {
  parseIntegerOption,
  parseOptionalIntegerOption,
  parseNumberOption,
  parseOptionalNumberOption,
} from '../src/cliParsing';

describe('cliParsing', () => {
  it('정수 옵션은 엄격하게 파싱한다', () => {
    expect(parseIntegerOption('10', '--year-count')).toBe(10);
    expect(() => parseIntegerOption('10abc', '--year-count')).toThrow('--year-count must be an integer');
    expect(() => parseIntegerOption('1.5', '--year-count')).toThrow('--year-count must be an integer');
  });

  it('선택 정수 옵션은 undefined를 null로 처리한다', () => {
    expect(parseOptionalIntegerOption(undefined, '--year-start')).toBeNull();
    expect(parseOptionalIntegerOption('-2', '--year-start')).toBe(-2);
  });

  it('실수 옵션은 부호를 포함해 엄격하게 파싱한다', () => {
    expect(parseNumberOption('+127.5', '--longitude')).toBe(127.5);
    expect(parseNumberOption('-127.5', '--longitude')).toBe(-127.5);
    expect(parseNumberOption('.5', '--longitude')).toBe(0.5);
    expect(() => parseNumberOption('127abc', '--longitude')).toThrow('--longitude must be a number');
  });

  it('선택 실수 옵션은 undefined를 null로 처리한다', () => {
    expect(parseOptionalNumberOption(undefined, '--longitude')).toBeNull();
    expect(parseOptionalNumberOption('+127.1', '--longitude')).toBe(127.1);
  });
});

