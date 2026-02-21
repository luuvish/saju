/**
 * @fileoverview 천간·지지 합충형파해 관계 모듈
 *
 * 천간 합(合)/충(沖)과 지지 육합/충/형/파/해/방합/삼합을 탐지한다.
 */

import type {
  BranchInteraction,
  Element,
  Pillar,
  PillarPosition,
  StemInteraction,
} from './types.js';

// ── 천간 합/충 (天干 合沖) ──

/**
 * 두 천간의 합(合) 여부와 생성 오행을 판정한다.
 *
 * 천간합 5쌍: 甲己→土, 乙庚→金, 丙辛→水, 丁壬→木, 戊癸→火
 *
 * @param a 천간 인덱스
 * @param b 천간 인덱스
 * @returns 합인 경우 생성 오행, 아니면 null
 */
export function stemHap(a: number, b: number): Element | null {
  if (a < 0 || a > 9 || b < 0 || b > 9) return null;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const pairs: Record<string, Element> = {
    '0,5': 'Earth', '1,6': 'Metal', '2,7': 'Water', '3,8': 'Wood', '4,9': 'Fire',
  };
  return pairs[`${lo},${hi}`] ?? null;
}

/**
 * 두 천간의 충(沖) 여부를 판정한다.
 * 천간충은 인덱스 차이가 6인 경우 (甲庚, 乙辛, 丙壬, 丁癸).
 * 단, 戊·己(인덱스 4, 5)는 충이 아님에 주의.
 */
/**
 * 두 천간의 충(沖) 여부를 판정한다.
 * 천간충은 인덱스 차이가 6인 경우: 甲庚(0-6), 乙辛(1-7), 丙壬(2-8), 丁癸(3-9).
 * 戊·己(4, 5)는 차이 6이 되는 짝이 범위 내에 없으므로 자연스럽게 제외된다.
 */
export function stemChung(a: number, b: number): boolean {
  if (a < 0 || a > 9 || b < 0 || b > 9) return false;
  return Math.abs(a - b) === 6;
}

/**
 * 네 기둥 간의 모든 천간 합/충을 탐지한다.
 * @param pillars 네 기둥 배열 [연, 월, 일, 시]
 * @returns StemInteraction 배열
 */
export function findStemInteractions(pillars: Pillar[]): StemInteraction[] {
  const POS: PillarPosition[] = ['Year', 'Month', 'Day', 'Hour'];
  const result: StemInteraction[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const a = pillars[i].stem;
      const b = pillars[j].stem;
      const el = stemHap(a, b);
      if (el !== null) {
        result.push({
          relation: 'Hap',
          positions: [POS[i], POS[j]],
          stems: [a, b],
          resultElement: el,
        });
      }
      if (stemChung(a, b)) {
        result.push({
          relation: 'Chung',
          positions: [POS[i], POS[j]],
          stems: [a, b],
          resultElement: null,
        });
      }
    }
  }
  return result;
}

// ── 지지 관계 (地支 關係) ──

/**
 * 육합(六合): 두 지지의 합과 생성 오행을 판정한다.
 *
 * 6쌍: 子丑→土, 寅亥→木, 卯戌→火, 辰酉→金, 巳申→水, 午未→土
 */
function branchYukHap(a: number, b: number): Element | null {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const pairs: Record<string, Element> = {
    '0,1': 'Earth', '2,11': 'Wood', '3,10': 'Fire',
    '4,9': 'Metal', '5,8': 'Water', '6,7': 'Earth',
  };
  return pairs[`${lo},${hi}`] ?? null;
}

/** 충(沖): 지지 인덱스 차이가 6인 경우 */
function branchChung(a: number, b: number): boolean {
  return Math.abs(a - b) === 6;
}

/**
 * 형(刑): 삼형살(三刑殺) 등 지지 간 형 관계.
 * 인사형(寅巳刑), 사신형(巳申刑), 인신형(寅申刑),
 * 축술형(丑戌刑), 술미형(戌未刑), 미축형(未丑刑),
 * 자묘형(子卯刑) 등이 포함된다.
 */
function branchHyung(a: number, b: number): boolean {
  const pairs = [
    [2, 5], [5, 8], [8, 2], [1, 10], [10, 7], [7, 1], [0, 3], [3, 0],
  ];
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

/** 자형(自刑): 같은 지지끼리의 형 (辰辰, 午午, 酉酉, 亥亥) */
function branchSelfHyung(a: number, b: number): boolean {
  if (a !== b) return false;
  return a === 4 || a === 6 || a === 9 || a === 11;
}

/** 파(破): 지지 파 관계 */
function branchPa(a: number, b: number): boolean {
  const pairs = [
    [0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [10, 7],
  ];
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

/** 해(害/穿): 지지 해 관계 */
function branchHae(a: number, b: number): boolean {
  const pairs = [
    [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
  ];
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

/**
 * 방합(方合): 같은 방위의 세 지지 합 (계절합).
 * 寅卯辰=木(봄), 巳午未=火(여름), 申酉戌=金(가을), 亥子丑=水(겨울)
 * 각 항목: [생성 오행, 사전 정렬된 지지 인덱스]
 */
const BANG_HAP: [Element, readonly [number, number, number]][] = [
  ['Wood', [2, 3, 4]],
  ['Fire', [5, 6, 7]],
  ['Metal', [8, 9, 10]],
  ['Water', [0, 1, 11]],
];

/**
 * 삼합(三合): 삼합국을 이루는 세 지지의 합.
 * 寅午戌=火局, 亥卯未=木局, 申子辰=水局, 巳酉丑=金局
 * 각 항목: [생성 오행, 사전 정렬된 지지 인덱스]
 */
const SAM_HAP: [Element, readonly [number, number, number]][] = [
  ['Fire', [2, 6, 10]],
  ['Wood', [3, 7, 11]],
  ['Water', [0, 4, 8]],
  ['Metal', [1, 5, 9]],
];

/**
 * 네 기둥 간의 모든 지지 관계(육합/충/형/파/해/방합/삼합)를 탐지한다.
 * @param pillars 네 기둥 배열 [연, 월, 일, 시]
 * @returns BranchInteraction 배열
 */
export function findBranchInteractions(pillars: Pillar[]): BranchInteraction[] {
  const POS: PillarPosition[] = ['Year', 'Month', 'Day', 'Hour'];
  const branches = pillars.map((p) => p.branch);
  const result: BranchInteraction[] = [];

  // 2개 조합: 육합, 충, 형, 파, 해
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const a = branches[i];
      const b = branches[j];

      const el = branchYukHap(a, b);
      if (el !== null) {
        result.push({ relation: 'YukHap', positions: [POS[i], POS[j]], branches: [a, b], resultElement: el });
      }
      if (branchChung(a, b)) {
        result.push({ relation: 'Chung', positions: [POS[i], POS[j]], branches: [a, b], resultElement: null });
      }
      if (branchHyung(a, b) || branchSelfHyung(a, b)) {
        result.push({ relation: 'Hyung', positions: [POS[i], POS[j]], branches: [a, b], resultElement: null });
      }
      if (branchPa(a, b)) {
        result.push({ relation: 'Pa', positions: [POS[i], POS[j]], branches: [a, b], resultElement: null });
      }
      if (branchHae(a, b)) {
        result.push({ relation: 'Hae', positions: [POS[i], POS[j]], branches: [a, b], resultElement: null });
      }
    }
  }

  // 3개 조합: 방합, 삼합
  const triples: [number, number, number][] = [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]];
  for (const [i, j, k] of triples) {
    const triple = [branches[i], branches[j], branches[k]];
    const triSorted = [...triple].sort((a, b) => a - b);

    for (const [el, sorted] of BANG_HAP) {
      if (triSorted[0] === sorted[0] && triSorted[1] === sorted[1] && triSorted[2] === sorted[2]) {
        result.push({ relation: 'BangHap', positions: [POS[i], POS[j], POS[k]], branches: [triple[0], triple[1], triple[2]], resultElement: el });
      }
    }
    for (const [el, sorted] of SAM_HAP) {
      if (triSorted[0] === sorted[0] && triSorted[1] === sorted[1] && triSorted[2] === sorted[2]) {
        result.push({ relation: 'SamHap', positions: [POS[i], POS[j], POS[k]], branches: [triple[0], triple[1], triple[2]], resultElement: el });
      }
    }
  }

  return result;
}
