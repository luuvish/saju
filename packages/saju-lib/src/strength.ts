/**
 * @fileoverview 신강/신약(身強/身弱) 판정 및 용신(用神) 결정 모듈
 *
 * 일간의 강약을 분석하고 억부용신법(抑扶用神法)에 따라
 * 용신·희신·기신·구신을 결정한다.
 */

import type {
  Element,
  Pillar,
  StrengthClass,
  StrengthVerdict,
  YongshinResult,
} from './types.js';
import {
  stemElement,
  relation,
  hiddenStems,
  twelveStageIndex,
  stageStrengthClass,
  elementGenerates,
  elementControls,
} from './bazi.js';

// ── 강약 판정 가중치 상수 ──

/** 강약 판정 가중치 상수 */
export const STRENGTH_WEIGHTS = {
  /** 월지 운성 Strong/Weak 가산점 */
  STAGE_BONUS: 2,
  /** 천간 지원/억제 가중치 */
  STEM_WEIGHT: 2,
  /** 지장간 지원/억제 가중치 */
  HIDDEN_WEIGHT: 1,
  /** 신강 판정 임계값 */
  STRONG_THRESHOLD: 3,
  /** 신약 판정 임계값 */
  WEAK_THRESHOLD: -3,
} as const;

// ── 신강/신약 판정 결과 ──

/** 신강/신약 판정 상세 결과 */
export interface StrengthResult {
  /** 월지 12운성 인덱스 (0~11) */
  stageIndex: number;
  /** 12운성 기반 강약 분류 */
  stageClass: StrengthClass;
  /** 뿌리(통근) 개수 — 지지에 일간과 같은 오행이 있는 기둥 수 */
  rootCount: number;
  /** 천간 중 일간을 지원하는 수 (비겁/인성) */
  supportStems: number;
  /** 지장간 중 일간을 지원하는 수 */
  supportHidden: number;
  /** 천간 중 일간을 소모하는 수 (식상/재성/관성) */
  drainStems: number;
  /** 지장간 중 일간을 소모하는 수 */
  drainHidden: number;
  /** 종합 점수 */
  total: number;
  /** 최종 판정 (Strong/Weak/Neutral) */
  verdict: StrengthVerdict;
}

// ── 내부 헬퍼 ──

/** 해당 오행을 생(生)하는 오행을 반환한다 (상생 역방향) */
function elementGeneratedBy(element: Element): Element {
  const map: Record<Element, Element> = {
    Wood: 'Water', Fire: 'Wood', Earth: 'Fire', Metal: 'Earth', Water: 'Metal',
  };
  return map[element];
}

/** 해당 오행을 극(剋)하는 오행을 반환한다 (상극 역방향) */
function elementControlledBy(element: Element): Element {
  const map: Record<Element, Element> = {
    Wood: 'Metal', Fire: 'Water', Earth: 'Wood', Metal: 'Fire', Water: 'Earth',
  };
  return map[element];
}

// ── 신강/신약(身強/身弱) 판정 ──

/**
 * 일간의 신강/신약을 판정한다.
 *
 * 판정 요소:
 * 1. 월지 12운성 (장생~제왕=+2, 쇠~절=-2, 태양=0)
 * 2. 통근(通根) 수 — 지지에 일간과 같은 오행이 있는 기둥 수
 * 3. 천간 지원/소모 (비겁·인성=지원, 식상·재성·관성=소모)
 * 4. 지장간 지원/소모 (위와 동일 기준)
 *
 * 종합 점수: 운성보너스 + 통근수 + (지원천간×2 + 지원지장간) - (소모천간×2 + 소모지장간)
 * - 3 이상: 신강(Strong)
 * - -3 이하: 신약(Weak)
 * - 그 외: 중화(Neutral)
 *
 * @param dayStem 일간 인덱스
 * @param pillars 네 기둥 배열
 * @returns 상세 판정 결과
 */
export function assessStrength(dayStem: number, pillars: Pillar[]): StrengthResult {
  const dayElement = stemElement(dayStem);
  const stageIdx = twelveStageIndex(dayStem, pillars[1].branch);
  const stageClass = stageStrengthClass(stageIdx);

  let rootCount = 0;
  let supportStems = 0;
  let drainStems = 0;
  let supportHidden = 0;
  let drainHidden = 0;

  for (const pillar of pillars) {
    // 천간 지원/소모 판정
    const stemRel = relation(dayElement, stemElement(pillar.stem));
    if (stemRel === 'Same' || stemRel === 'Resource') {
      supportStems++;
    } else {
      drainStems++;
    }

    // 지장간 통근 및 지원/소모 판정
    let hasRoot = false;
    for (const hidden of hiddenStems(pillar.branch)) {
      if (stemElement(hidden) === dayElement) {
        hasRoot = true;
      }
      const rel = relation(dayElement, stemElement(hidden));
      if (rel === 'Same' || rel === 'Resource') {
        supportHidden++;
      } else {
        drainHidden++;
      }
    }
    if (hasRoot) rootCount++;
  }

  // 종합 점수 계산
  const stageBonus = stageClass === 'Strong' ? STRENGTH_WEIGHTS.STAGE_BONUS : stageClass === 'Weak' ? -STRENGTH_WEIGHTS.STAGE_BONUS : 0;
  const supportTotal = supportStems * STRENGTH_WEIGHTS.STEM_WEIGHT + supportHidden * STRENGTH_WEIGHTS.HIDDEN_WEIGHT;
  const drainTotal = drainStems * STRENGTH_WEIGHTS.STEM_WEIGHT + drainHidden * STRENGTH_WEIGHTS.HIDDEN_WEIGHT;
  const total = stageBonus + rootCount + supportTotal - drainTotal;

  const verdict: StrengthVerdict = total >= STRENGTH_WEIGHTS.STRONG_THRESHOLD ? 'Strong' : total <= STRENGTH_WEIGHTS.WEAK_THRESHOLD ? 'Weak' : 'Neutral';

  return {
    stageIndex: stageIdx,
    stageClass,
    rootCount,
    supportStems,
    supportHidden,
    drainStems,
    drainHidden,
    total,
    verdict,
  };
}

// ── 용신(用神) 결정 — 억부용신법(抑扶用神法) ──

/**
 * 억부용신법으로 용신(用神)을 결정한다.
 *
 * - 신강(Strong): 일간이 강하므로 억제(抑) 필요
 *   → 용신=식상(설기), 희신=재성, 기신=비겁, 구신=인성
 * - 신약(Weak): 일간이 약하므로 부조(扶) 필요
 *   → 용신=인성(생조), 희신=비겁, 기신=관성, 구신=재성
 * - 중화(Neutral): 약간의 부조 방향
 *   → 신약과 동일하게 처리
 *
 * @param dayStem 일간 인덱스
 * @param verdict 신강/신약 판정 결과
 * @returns 용신 판정 결과
 */
export function determineYongshin(dayStem: number, verdict: StrengthVerdict): YongshinResult {
  const dayEl = stemElement(dayStem);

  const same = dayEl;                          // 비겁(比劫) — 같은 오행
  const output = elementGenerates(dayEl);      // 식상(食傷) — 일간이 생하는 오행
  const wealth = elementControls(dayEl);       // 재성(財星) — 일간이 극하는 오행
  const resource = elementGeneratedBy(dayEl);  // 인성(印星) — 일간을 생하는 오행
  const officer = elementControlledBy(dayEl);  // 관성(官星) — 일간을 극하는 오행

  if (verdict === 'Strong') {
    // 신강 → 억(抑): 강한 일간을 설기·소모
    return {
      yongshin: output,    // 식상 — 일간의 기운을 부드럽게 소모
      heeshin: wealth,     // 재성 — 추가 소모
      gishin: same,        // 비겁 — 같은 오행 추가 (최악)
      gushin: resource,    // 인성 — 일간 강화 (해로움)
      method: 'suppress',
    };
  } else if (verdict === 'Weak') {
    // 신약 → 부(扶): 약한 일간을 생조·지원
    return {
      yongshin: resource,  // 인성 — 일간을 생조·강화
      heeshin: same,       // 비겁 — 같은 오행으로 지원
      gishin: officer,     // 관성 — 일간을 극함 (최악)
      gushin: wealth,      // 재성 — 에너지 소모 (해로움)
      method: 'support',
    };
  } else {
    // 중화 → 약간의 부조 방향
    return {
      yongshin: resource,
      heeshin: same,
      gishin: officer,
      gushin: wealth,
      method: 'support',
    };
  }
}
