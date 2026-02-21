import type {
  BranchInteraction,
  BranchRelationType,
  Element,
  Pillar,
  PillarPosition,
  Relation,
  ShinsalEntry,
  ShinsalKind,
  SolarTerm,
  StemInteraction,
  StemRelationType,
  StrengthClass,
  StrengthVerdict,
  TenGod,
} from './types.js';

const HIDDEN_STEMS: readonly (readonly number[])[] = [
  [9, 8],       // 자: 癸 壬
  [5, 9, 7],    // 축: 己 癸 辛
  [0, 2, 4],    // 인: 甲 丙 戊
  [1, 0],       // 묘: 乙 甲
  [4, 1, 9],    // 진: 戊 乙 癸
  [2, 4, 6],    // 사: 丙 戊 庚
  [3, 5, 2],    // 오: 丁 己 丙
  [5, 3, 1],    // 미: 己 丁 乙
  [6, 8, 4],    // 신: 庚 壬 戊
  [7, 6],       // 유: 辛 庚
  [4, 7, 3],    // 술: 戊 辛 丁
  [8, 0, 4],    // 해: 壬 甲 戊
];

// 지장간 비율 (30일 기준, HIDDEN_STEMS 순서와 동일)
// 四正(子卯酉): 정기20 여기10, 四庫(丑辰未戌): 정기18 여기9 중기3, 四生(寅巳申): 정기16 여기7 중기7
const HIDDEN_STEM_RATIOS: readonly (readonly number[])[] = [
  [20, 10],       // 자: 癸20 壬10
  [18, 9, 3],     // 축: 己18 癸9 辛3
  [16, 7, 7],     // 인: 甲16 丙7 戊7
  [20, 10],       // 묘: 乙20 甲10
  [18, 9, 3],     // 진: 戊18 乙9 癸3
  [16, 7, 7],     // 사: 丙16 戊7 庚7
  [11, 9, 10],    // 오: 丁11 己9 丙10
  [18, 9, 3],     // 미: 己18 丁9 乙3
  [16, 7, 7],     // 신: 庚16 壬7 戊7
  [20, 10],       // 유: 辛20 庚10
  [18, 9, 3],     // 술: 戊18 辛9 丁3
  [16, 7, 7],     // 해: 壬16 甲7 戊7
];

const CHANGSHENG_START: readonly number[] = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];

export interface StrengthResult {
  stageIndex: number;
  stageClass: StrengthClass;
  rootCount: number;
  supportStems: number;
  supportHidden: number;
  drainStems: number;
  drainHidden: number;
  total: number;
  verdict: StrengthVerdict;
}

function remEuclid(a: number, b: number): number {
  return ((a % b) + b) % b;
}

export function yearPillar(year: number): [number, number] {
  const stem = remEuclid(year - 4, 10);
  const branch = remEuclid(year - 4, 12);
  return [stem, branch];
}

export function monthBranchFromTermKey(key: string): number | null {
  const map: Record<string, number> = {
    lichun: 2, jingzhe: 3, qingming: 4, lixia: 5,
    mangzhong: 6, xiaoshu: 7, liqiu: 8, bailu: 9,
    hanlu: 10, lidong: 11, daxue: 0, xiaohan: 1,
  };
  return map[key] ?? null;
}

export function monthBranchForBirth(
  birthJd: number,
  termsPrev: SolarTerm[],
  termsCurr: SolarTerm[],
): number {
  const boundaries = [...termsPrev, ...termsCurr]
    .filter((t) => monthBranchFromTermKey(t.def.key) !== null)
    .sort((a, b) => a.jd - b.jd);

  let last: SolarTerm | null = null;
  for (const term of boundaries) {
    if (term.jd <= birthJd) {
      last = term;
    } else {
      break;
    }
  }
  if (!last) throw new Error('failed to determine month boundary');
  const branch = monthBranchFromTermKey(last.def.key);
  if (branch === null) throw new Error('invalid month boundary term');
  return branch;
}

export function monthStemFromYear(yearStem: number, monthBranch: number): number {
  return (yearStem * 2 + monthBranch) % 10;
}

export function jdnFromDate(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export function dayPillarFromJdn(jdn: number): [number, number] {
  const stem = remEuclid(jdn + 9, 10);
  const branch = remEuclid(jdn + 1, 12);
  return [stem, branch];
}

export function hourBranchIndex(hour: number, minute: number): number {
  const totalMinutes = hour * 60 + minute;
  return ((totalMinutes + 60) / 120 | 0) % 12;
}

export function hourStemFromDay(dayStem: number, hourBranch: number): number {
  return (dayStem * 2 + hourBranch) % 10;
}

export function stemElement(stem: number): Element {
  const elements: Element[] = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
  return elements[stem];
}

export function branchElement(branch: number): Element {
  const elements: Element[] = ['Water', 'Earth', 'Wood', 'Wood', 'Earth', 'Fire', 'Fire', 'Earth', 'Metal', 'Metal', 'Earth', 'Water'];
  return elements[branch];
}

export function elementGenerates(element: Element): Element {
  const map: Record<Element, Element> = {
    Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood',
  };
  return map[element];
}

export function elementControls(element: Element): Element {
  const map: Record<Element, Element> = {
    Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood',
  };
  return map[element];
}

export function stemPolarity(stem: number): boolean {
  return stem % 2 === 0;
}

export function branchPolarity(branch: number): boolean {
  return stemPolarity(mainHiddenStem(branch));
}

export function relation(day: Element, target: Element): Relation {
  if (day === target) return 'Same';
  if (elementGenerates(day) === target) return 'Output';
  if (elementControls(day) === target) return 'Wealth';
  if (elementGenerates(target) === day) return 'Resource';
  return 'Officer';
}

export function tenGod(dayStem: number, targetStem: number): TenGod {
  const dayElement = stemElement(dayStem);
  const targetElement = stemElement(targetStem);
  const samePolarity = stemPolarity(dayStem) === stemPolarity(targetStem);
  const rel = relation(dayElement, targetElement);

  const map: Record<Relation, [TenGod, TenGod]> = {
    Same: ['BiGyeon', 'GeopJae'],
    Output: ['SikShin', 'SangGwan'],
    Wealth: ['PyeonJae', 'JeongJae'],
    Officer: ['ChilSal', 'JeongGwan'],
    Resource: ['PyeonIn', 'JeongIn'],
  };
  return map[rel][samePolarity ? 0 : 1];
}

export function hiddenStems(branch: number): readonly number[] {
  return HIDDEN_STEMS[branch];
}

export function hiddenStemRatios(branch: number): readonly number[] {
  return HIDDEN_STEM_RATIOS[branch];
}

export function mainHiddenStem(branch: number): number {
  return HIDDEN_STEMS[branch][0];
}

export function tenGodBranch(dayStem: number, branch: number): TenGod {
  return tenGod(dayStem, mainHiddenStem(branch));
}

export function twelveStageIndex(dayStem: number, branch: number): number {
  const start = CHANGSHENG_START[dayStem];
  if (stemPolarity(dayStem)) {
    return (branch + 12 - start) % 12;
  } else {
    return (start + 12 - branch) % 12;
  }
}

export function stageStrengthClass(stageIndex: number): StrengthClass {
  if (stageIndex <= 4) return 'Strong';
  if (stageIndex <= 9) return 'Weak';
  return 'Neutral';
}

export function shinsalStartBranch(yearBranch: number): number {
  if (yearBranch === 0 || yearBranch === 4 || yearBranch === 8) return 8;
  if (yearBranch === 2 || yearBranch === 6 || yearBranch === 10) return 2;
  if (yearBranch === 3 || yearBranch === 7 || yearBranch === 11) return 11;
  return 5; // 1, 5, 9
}

export function twelveShinsalIndex(yearBranch: number, branch: number): number {
  const start = shinsalStartBranch(yearBranch);
  return (branch + 12 - start) % 12;
}

export function elementIndex(element: Element): number {
  const map: Record<Element, number> = { Wood: 0, Fire: 1, Earth: 2, Metal: 3, Water: 4 };
  return map[element];
}

export function elementsCount(pillars: Pillar[]): [number, number, number, number, number] {
  const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const pillar of pillars) {
    counts[elementIndex(stemElement(pillar.stem))]++;
    counts[elementIndex(branchElement(pillar.branch))]++;
  }
  return counts;
}

// ── Stem interactions (천간 합/충) ──

export function stemHap(a: number, b: number): Element | null {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const pairs: Record<string, Element> = {
    '0,5': 'Earth', '1,6': 'Metal', '2,7': 'Water', '3,8': 'Wood', '4,9': 'Fire',
  };
  return pairs[`${lo},${hi}`] ?? null;
}

export function stemChung(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  return diff === 6 && a < 8 && b < 8;
}

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

// ── Branch interactions (지지 관계) ──

function branchYukHap(a: number, b: number): Element | null {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const pairs: Record<string, Element> = {
    '0,1': 'Earth', '2,11': 'Wood', '3,10': 'Fire',
    '4,9': 'Metal', '5,8': 'Water', '6,7': 'Earth',
  };
  return pairs[`${lo},${hi}`] ?? null;
}

function branchChung(a: number, b: number): boolean {
  return Math.abs(a - b) === 6;
}

function branchHyung(a: number, b: number): boolean {
  const pairs = [
    [2, 5], [5, 8], [8, 2], [1, 10], [10, 7], [7, 1], [0, 3], [3, 0],
  ];
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

function branchSelfHyung(a: number, b: number): boolean {
  if (a !== b) return false;
  return a === 4 || a === 6 || a === 9 || a === 11;
}

function branchPa(a: number, b: number): boolean {
  const pairs = [
    [0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [10, 7],
  ];
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

function branchHae(a: number, b: number): boolean {
  const pairs = [
    [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
  ];
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

const BANG_HAP: [number, number, number, Element][] = [
  [2, 3, 4, 'Wood'], [5, 6, 7, 'Fire'], [8, 9, 10, 'Metal'], [11, 0, 1, 'Water'],
];

const SAM_HAP: [number, number, number, Element][] = [
  [2, 6, 10, 'Fire'], [11, 3, 7, 'Wood'], [8, 0, 4, 'Water'], [5, 9, 1, 'Metal'],
];

export function findBranchInteractions(pillars: Pillar[]): BranchInteraction[] {
  const POS: PillarPosition[] = ['Year', 'Month', 'Day', 'Hour'];
  const branches = pillars.map((p) => p.branch);
  const result: BranchInteraction[] = [];

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

  const triples: [number, number, number][] = [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]];
  for (const [i, j, k] of triples) {
    const triple = [branches[i], branches[j], branches[k]];
    const triSorted = [...triple].sort((a, b) => a - b);

    for (const [a, b, c, el] of BANG_HAP) {
      const target = [a, b, c].sort((x, y) => x - y);
      if (triSorted[0] === target[0] && triSorted[1] === target[1] && triSorted[2] === target[2]) {
        result.push({ relation: 'BangHap', positions: [POS[i], POS[j], POS[k]], branches: [triple[0], triple[1], triple[2]], resultElement: el });
      }
    }
    for (const [a, b, c, el] of SAM_HAP) {
      const target = [a, b, c].sort((x, y) => x - y);
      if (triSorted[0] === target[0] && triSorted[1] === target[1] && triSorted[2] === target[2]) {
        result.push({ relation: 'SamHap', positions: [POS[i], POS[j], POS[k]], branches: [triple[0], triple[1], triple[2]], resultElement: el });
      }
    }
  }

  return result;
}

// ── Shinsal detection (신살 감지) ──

function samhapGroup(branch: number): number {
  if (branch === 2 || branch === 6 || branch === 10) return 0;
  if (branch === 11 || branch === 3 || branch === 7) return 1;
  if (branch === 8 || branch === 0 || branch === 4) return 2;
  return 3; // 5, 9, 1
}

function dohwaBranch(basisBranch: number): number {
  return [3, 0, 9, 6][samhapGroup(basisBranch)];
}

function yeokmaBranch(basisBranch: number): number {
  return [8, 5, 2, 11][samhapGroup(basisBranch)];
}

function cheonEulBranches(dayStem: number): readonly number[] {
  const map: Record<number, readonly number[]> = {
    0: [1, 7], 4: [1, 7], 6: [1, 7],
    1: [0, 8], 5: [0, 8],
    2: [11, 9], 3: [11, 9],
    7: [2, 6],
    8: [3, 5], 9: [3, 5],
  };
  return map[dayStem] ?? [];
}

function munchangBranch(dayStem: number): number {
  return [5, 6, 8, 9, 8, 9, 11, 0, 2, 3][dayStem];
}

function hakdangBranch(dayStem: number): number {
  return [11, 0, 2, 3, 2, 3, 5, 6, 8, 9][dayStem];
}

function cheondeokBranch(monthBranch: number): number | null {
  const map = [5, 6, 11, 8, 3, 2, 1, 0, 9, 10, 7, 4];
  return map[monthBranch] ?? null;
}

function woldeokStem(monthBranch: number): number | null {
  return [2, 6, 8, 0][samhapGroup(monthBranch)] ?? null;
}

function yanginBranch(dayStem: number): number | null {
  const map: Record<number, number> = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };
  return map[dayStem] ?? null;
}

export function gongmang(dayStem: number, dayBranch: number): [number, number] {
  const first = remEuclid(10 + dayBranch - dayStem, 12);
  const second = (first + 1) % 12;
  return [first, second];
}

function isGoegang(dayStem: number, dayBranch: number): boolean {
  return (
    (dayStem === 6 && dayBranch === 4) ||
    (dayStem === 6 && dayBranch === 10) ||
    (dayStem === 8 && dayBranch === 4) ||
    (dayStem === 8 && dayBranch === 10)
  );
}

function baekhoBranch(yearBranch: number): number | null {
  const map = [6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8, 7];
  return map[yearBranch] ?? null;
}

function wonjinBranch(basisBranch: number): number {
  return [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8][basisBranch];
}

function gwimunBranch(basisBranch: number): number | null {
  const map = [9, 10, 7, 8, 5, 4, 3, 2, 3, 0, 1, 6];
  return map[basisBranch] ?? null;
}

export function findShinsal(pillars: Pillar[]): ShinsalEntry[] {
  const POS: PillarPosition[] = ['Year', 'Month', 'Day', 'Hour'];
  const branches = pillars.map((p) => p.branch);
  const stems = pillars.map((p) => p.stem);
  const dayStem = pillars[2].stem;
  const dayBranch = pillars[2].branch;
  const yearBranch = pillars[0].branch;
  const monthBranch = pillars[1].branch;

  const entries: ShinsalEntry[] = [];

  // 도화살 (연지/일지 기준)
  for (const basisIdx of [0, 2]) {
    const target = dohwaBranch(branches[basisIdx]);
    const foundAt = [0, 1, 2, 3]
      .filter((i) => i !== basisIdx && branches[i] === target)
      .map((i) => POS[i]);
    if (foundAt.length > 0) {
      entries.push({ kind: 'DoHwaSal', foundAt, basis: POS[basisIdx] });
    }
  }

  // 천을귀인 (일간 기준)
  {
    const targets = cheonEulBranches(dayStem);
    const foundAt = [0, 1, 2, 3]
      .filter((i) => targets.includes(branches[i]))
      .map((i) => POS[i]);
    if (foundAt.length > 0) {
      entries.push({ kind: 'CheonEulGwiIn', foundAt, basis: 'Day' });
    }
  }

  // 역마살 (연지/일지 기준)
  for (const basisIdx of [0, 2]) {
    const target = yeokmaBranch(branches[basisIdx]);
    const foundAt = [0, 1, 2, 3]
      .filter((i) => i !== basisIdx && branches[i] === target)
      .map((i) => POS[i]);
    if (foundAt.length > 0) {
      entries.push({ kind: 'YeokMaSal', foundAt, basis: POS[basisIdx] });
    }
  }

  // 문창귀인 (일간 기준)
  {
    const target = munchangBranch(dayStem);
    const foundAt = [0, 1, 2, 3]
      .filter((i) => branches[i] === target)
      .map((i) => POS[i]);
    if (foundAt.length > 0) {
      entries.push({ kind: 'MunChangGwiIn', foundAt, basis: 'Day' });
    }
  }

  // 학당귀인 (일간 기준)
  {
    const target = hakdangBranch(dayStem);
    const foundAt = [0, 1, 2, 3]
      .filter((i) => branches[i] === target)
      .map((i) => POS[i]);
    if (foundAt.length > 0) {
      entries.push({ kind: 'HakDangGwiIn', foundAt, basis: 'Day' });
    }
  }

  // 천덕귀인 (월지 기준)
  {
    const target = cheondeokBranch(monthBranch);
    if (target !== null) {
      const foundAt = [0, 1, 2, 3]
        .filter((i) => branches[i] === target)
        .map((i) => POS[i]);
      if (foundAt.length > 0) {
        entries.push({ kind: 'CheonDeokGwiIn', foundAt, basis: 'Month' });
      }
    }
  }

  // 월덕귀인 (월지 기준, 천간 검사)
  {
    const targetStem = woldeokStem(monthBranch);
    if (targetStem !== null) {
      const foundAt = [0, 1, 2, 3]
        .filter((i) => stems[i] === targetStem)
        .map((i) => POS[i]);
      if (foundAt.length > 0) {
        entries.push({ kind: 'WolDeokGwiIn', foundAt, basis: 'Month' });
      }
    }
  }

  // 양인살 (일간 기준, 양간만)
  {
    const target = yanginBranch(dayStem);
    if (target !== null) {
      const foundAt = [0, 1, 2, 3]
        .filter((i) => branches[i] === target)
        .map((i) => POS[i]);
      if (foundAt.length > 0) {
        entries.push({ kind: 'YangInSal', foundAt, basis: 'Day' });
      }
    }
  }

  // 공망 (일주 기준)
  {
    const gm = gongmang(dayStem, dayBranch);
    const foundAt = [0, 1, 2, 3]
      .filter((i) => i !== 2 && (branches[i] === gm[0] || branches[i] === gm[1]))
      .map((i) => POS[i]);
    if (foundAt.length > 0) {
      entries.push({ kind: 'GongMang', foundAt, basis: 'Day' });
    }
  }

  // 괴강살 (일주)
  if (isGoegang(dayStem, dayBranch)) {
    entries.push({ kind: 'GoeGangSal', foundAt: ['Day'], basis: 'Day' });
  }

  // 백호살 (연지 기준)
  {
    const target = baekhoBranch(yearBranch);
    if (target !== null) {
      const foundAt = [0, 1, 2, 3]
        .filter((i) => i !== 0 && branches[i] === target)
        .map((i) => POS[i]);
      if (foundAt.length > 0) {
        entries.push({ kind: 'BaekHoSal', foundAt, basis: 'Year' });
      }
    }
  }

  // 원진살 (연지/일지 기준)
  for (const basisIdx of [0, 2]) {
    const target = wonjinBranch(branches[basisIdx]);
    const foundAt = [0, 1, 2, 3]
      .filter((i) => i !== basisIdx && branches[i] === target)
      .map((i) => POS[i]);
    if (foundAt.length > 0) {
      entries.push({ kind: 'WonJinSal', foundAt, basis: POS[basisIdx] });
    }
  }

  // 귀문관살 (연지/일지 기준)
  for (const basisIdx of [0, 2]) {
    const target = gwimunBranch(branches[basisIdx]);
    if (target !== null) {
      const foundAt = [0, 1, 2, 3]
        .filter((i) => i !== basisIdx && branches[i] === target)
        .map((i) => POS[i]);
      if (foundAt.length > 0) {
        entries.push({ kind: 'GwiMunGwanSal', foundAt, basis: POS[basisIdx] });
      }
    }
  }

  return entries;
}

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
    const stemRel = relation(dayElement, stemElement(pillar.stem));
    if (stemRel === 'Same' || stemRel === 'Resource') {
      supportStems++;
    } else {
      drainStems++;
    }

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

  const stageBonus = stageClass === 'Strong' ? 2 : stageClass === 'Weak' ? -2 : 0;
  const supportTotal = supportStems * 2 + supportHidden;
  const drainTotal = drainStems * 2 + drainHidden;
  const total = stageBonus + rootCount + supportTotal - drainTotal;

  const verdict: StrengthVerdict = total >= 3 ? 'Strong' : total <= -3 ? 'Weak' : 'Neutral';

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
