/**
 * @fileoverview 신강/신약 판정 및 용신 결정 테스트
 */

import { describe, it, expect } from 'vitest';
import { strength, bazi } from '../src/index.js';
import type { Pillar } from '../src/index.js';

describe('assessStrength', () => {
  // 甲子 甲寅 甲午 甲子 — 甲木 일간, 목이 많아 신강 경향
  const strongPillars: Pillar[] = [
    { stem: 0, branch: 0 },  // 甲子
    { stem: 0, branch: 2 },  // 甲寅
    { stem: 0, branch: 6 },  // 甲午
    { stem: 0, branch: 0 },  // 甲子
  ];

  // 甲子 庚午 甲申 庚午 — 甲木 일간, 금극목으로 신약 경향
  const weakPillars: Pillar[] = [
    { stem: 0, branch: 0 },  // 甲子
    { stem: 6, branch: 6 },  // 庚午
    { stem: 0, branch: 8 },  // 甲申
    { stem: 6, branch: 6 },  // 庚午
  ];

  it('판정 결과에 필요한 모든 필드를 포함한다', () => {
    const result = strength.assessStrength(0, strongPillars);
    expect(result).toHaveProperty('stageIndex');
    expect(result).toHaveProperty('stageClass');
    expect(result).toHaveProperty('rootCount');
    expect(result).toHaveProperty('supportStems');
    expect(result).toHaveProperty('supportHidden');
    expect(result).toHaveProperty('drainStems');
    expect(result).toHaveProperty('drainHidden');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('verdict');
  });

  it('verdict는 Strong/Weak/Neutral 중 하나이다', () => {
    const result = strength.assessStrength(0, strongPillars);
    expect(['Strong', 'Weak', 'Neutral']).toContain(result.verdict);
  });

  it('월지 12운성 인덱스를 올바르게 산출한다', () => {
    const result = strength.assessStrength(0, strongPillars);
    // 甲의 장생 시작=亥(11), 寅(2)은 순행 3칸 → 관대(冠帶, index 2)... 실제 계산
    const expected = bazi.twelveStageIndex(0, strongPillars[1].branch);
    expect(result.stageIndex).toBe(expected);
  });

  it('stageClass가 stageIndex와 일관된다', () => {
    const result = strength.assessStrength(0, strongPillars);
    const expected = bazi.stageStrengthClass(result.stageIndex);
    expect(result.stageClass).toBe(expected);
  });

  it('rootCount는 0 이상이다', () => {
    const result = strength.assessStrength(0, strongPillars);
    expect(result.rootCount).toBeGreaterThanOrEqual(0);
    expect(result.rootCount).toBeLessThanOrEqual(4);
  });

  it('supportStems + drainStems = 4 (기둥 수)', () => {
    const result = strength.assessStrength(0, strongPillars);
    expect(result.supportStems + result.drainStems).toBe(4);
  });

  it('같은 천간이 많으면 지원 수가 높다', () => {
    // 4기둥 모두 甲 → supportStems 높음
    const result = strength.assessStrength(0, strongPillars);
    expect(result.supportStems).toBeGreaterThanOrEqual(3);
  });

  it('극하는 천간이 많으면 소모 수가 높다', () => {
    const result = strength.assessStrength(0, weakPillars);
    expect(result.drainStems).toBeGreaterThanOrEqual(2);
  });
});

describe('determineYongshin', () => {
  it('신강 판정 시 suppress 방법을 반환한다', () => {
    const result = strength.determineYongshin(0, 'Strong');
    expect(result.method).toBe('suppress');
  });

  it('신약 판정 시 support 방법을 반환한다', () => {
    const result = strength.determineYongshin(0, 'Weak');
    expect(result.method).toBe('support');
  });

  it('중화 판정 시 support 방법을 반환한다', () => {
    const result = strength.determineYongshin(0, 'Neutral');
    expect(result.method).toBe('support');
  });

  it('용신 결과에 4가지 오행이 모두 포함된다', () => {
    const result = strength.determineYongshin(0, 'Strong');
    const elements = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
    expect(elements).toContain(result.yongshin);
    expect(elements).toContain(result.heeshin);
    expect(elements).toContain(result.gishin);
    expect(elements).toContain(result.gushin);
  });

  it('신강 시 용신=식상, 희신=재성이다', () => {
    // 甲木 일간: 식상=火, 재성=Earth
    const result = strength.determineYongshin(0, 'Strong');
    expect(result.yongshin).toBe('Fire');   // 식상: 木→火
    expect(result.heeshin).toBe('Earth');   // 재성: 木→Earth
    expect(result.gishin).toBe('Wood');     // 비겁: 같은 오행
    expect(result.gushin).toBe('Water');    // 인성: 水→木
  });

  it('신약 시 용신=인성, 희신=비겁이다', () => {
    // 甲木 일간: 인성=Water, 비겁=Wood
    const result = strength.determineYongshin(0, 'Weak');
    expect(result.yongshin).toBe('Water');  // 인성: 水→木
    expect(result.heeshin).toBe('Wood');    // 비겁: 같은 오행
    expect(result.gishin).toBe('Metal');    // 관성: 金→木
    expect(result.gushin).toBe('Earth');    // 재성: 木→Earth
  });

  it('모든 천간에 대해 용신을 정상 산출한다', () => {
    for (let stem = 0; stem <= 9; stem++) {
      for (const verdict of ['Strong', 'Weak', 'Neutral'] as const) {
        const result = strength.determineYongshin(stem, verdict);
        expect(result.yongshin).toBeDefined();
        expect(result.heeshin).toBeDefined();
        expect(result.gishin).toBeDefined();
        expect(result.gushin).toBeDefined();
      }
    }
  });
});

describe('STRENGTH_WEIGHTS', () => {
  it('필요한 가중치 상수가 모두 정의되어 있다', () => {
    expect(strength.STRENGTH_WEIGHTS.STAGE_BONUS).toBe(2);
    expect(strength.STRENGTH_WEIGHTS.STEM_WEIGHT).toBe(2);
    expect(strength.STRENGTH_WEIGHTS.HIDDEN_WEIGHT).toBe(1);
    expect(strength.STRENGTH_WEIGHTS.STRONG_THRESHOLD).toBe(3);
    expect(strength.STRENGTH_WEIGHTS.WEAK_THRESHOLD).toBe(-3);
  });
});
