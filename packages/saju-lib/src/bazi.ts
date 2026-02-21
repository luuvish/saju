/**
 * @fileoverview 사주팔자(四柱八字) 핵심 계산 모듈
 *
 * 천간(天干)·지지(地支) 기반의 사주 계산 로직을 담당한다:
 * - 연주·월주·일주·시주 산출
 * - 오행(五行) 관계 및 십성(十星) 판정
 * - 지장간(地藏干) 조회
 * - 12운성(十二運星) 및 12신살(十二神殺)
 * - 천간 합/충, 지지 육합/충/형/파/해/방합/삼합
 * - 주요 신살(도화살, 천을귀인, 역마살 등) 검출
 * - 신강/신약 판정 및 용신(用神) 결정
 */

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
  YongshinResult,
} from './types.js';

// ── 지장간(地藏干) 테이블 ──

/**
 * 지장간 테이블: 각 지지에 숨겨진 천간 인덱스.
 * 배열 순서: [정기(正氣), 여기(餘氣), 중기(中氣)]
 * - 정기: 해당 지지의 대표 천간
 * - 여기/중기: 보조 천간 (四正은 2개, 나머지는 3개)
 */
const HIDDEN_STEMS: readonly (readonly number[])[] = [
  [9, 8],       // 자(子): 癸 壬
  [5, 9, 7],    // 축(丑): 己 癸 辛
  [0, 2, 4],    // 인(寅): 甲 丙 戊
  [1, 0],       // 묘(卯): 乙 甲
  [4, 1, 9],    // 진(辰): 戊 乙 癸
  [2, 4, 6],    // 사(巳): 丙 戊 庚
  [3, 5, 2],    // 오(午): 丁 己 丙
  [5, 3, 1],    // 미(未): 己 丁 乙
  [6, 8, 4],    // 신(申): 庚 壬 戊
  [7, 6],       // 유(酉): 辛 庚
  [4, 7, 3],    // 술(戌): 戊 辛 丁
  [8, 0, 4],    // 해(亥): 壬 甲 戊
];

/**
 * 지장간 비율 (30일 기준, HIDDEN_STEMS 순서와 동일).
 * 지지의 월령(月令)에서 각 지장간이 차지하는 일수를 나타낸다.
 *
 * 그룹별 비율:
 * - 四正(자/묘/유): 정기 20일, 여기 10일
 * - 四庫(축/진/미/술): 정기 18일, 여기 9일, 중기 3일
 * - 四生(인/사/신/해): 정기 16일, 여기 7일, 중기 7일
 * - 오(午)는 예외: 정기 11일, 여기 9일, 중기 10일
 */
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

/**
 * 12운성 시작 지지 인덱스 (천간별).
 * 각 천간이 '장생(長生)'에 해당하는 지지 인덱스.
 * 양간은 순행, 음간은 역행으로 12운성을 전개한다.
 *
 * 인덱스: 0=甲, 1=乙, ..., 9=癸
 */
const CHANGSHENG_START: readonly number[] = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];

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

// ── 유틸리티 ──

/** 유클리드 나머지 (항상 양수 반환) */
function remEuclid(a: number, b: number): number {
  return ((a % b) + b) % b;
}

// ── 연주·월주·일주·시주 산출 ──

/**
 * 연주(年柱)를 산출한다.
 * 갑자(甲子)년 = 서기 4년을 기준으로 60갑자 순환.
 * @param year 서기 연도 (입춘 기준으로 조정된 값)
 * @returns [천간 인덱스, 지지 인덱스]
 */
export function yearPillar(year: number): [number, number] {
  const stem = remEuclid(year - 4, 10);
  const branch = remEuclid(year - 4, 12);
  return [stem, branch];
}

/**
 * 절기 키로부터 해당 월의 지지 인덱스를 반환한다.
 * 절(節)에 해당하는 12개 절기만 매핑된다 (중기는 null).
 * @param key 절기 키 (예: 'lichun', 'jingzhe')
 * @returns 월지 인덱스 (0~11) 또는 null (중기인 경우)
 */
export function monthBranchFromTermKey(key: string): number | null {
  const map: Record<string, number> = {
    lichun: 2, jingzhe: 3, qingming: 4, lixia: 5,
    mangzhong: 6, xiaoshu: 7, liqiu: 8, bailu: 9,
    hanlu: 10, lidong: 11, daxue: 0, xiaohan: 1,
  };
  return map[key] ?? null;
}

/**
 * 생일(birthJd)이 속하는 절기 구간의 월지를 결정한다.
 *
 * 전년도와 당해의 절기 경계를 합친 뒤, 생일 직전의 절(節)을 찾아
 * 해당 절기의 월지를 반환한다.
 *
 * @param birthJd 출생 시점 (JD)
 * @param termsPrev 전년도 절기 배열
 * @param termsCurr 당해 절기 배열
 * @returns 월지 인덱스 (0~11)
 */
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

/**
 * 연간(年干)으로부터 월간(月干)을 산출한다.
 * 공식: (연간 × 2 + 월지) mod 10
 * @param yearStem 연간 인덱스
 * @param monthBranch 월지 인덱스
 * @returns 월간 인덱스
 */
export function monthStemFromYear(yearStem: number, monthBranch: number): number {
  return (yearStem * 2 + monthBranch) % 10;
}

/**
 * 그레고리력 날짜 → 율리우스 일수(JDN, Julian Day Number) 변환.
 * 시각이 아닌 정수 일수를 반환한다.
 * @param year 연도
 * @param month 월 (1~12)
 * @param day 일
 * @returns 율리우스 일수 (정수)
 */
export function jdnFromDate(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/**
 * 율리우스 일수(JDN)로부터 일주(日柱)를 산출한다.
 * @param jdn 율리우스 일수
 * @returns [천간 인덱스, 지지 인덱스]
 */
export function dayPillarFromJdn(jdn: number): [number, number] {
  const stem = remEuclid(jdn + 9, 10);
  const branch = remEuclid(jdn + 1, 12);
  return [stem, branch];
}

/**
 * 시간(hour, minute)으로부터 시지(時支) 인덱스를 산출한다.
 *
 * 시간대별 지지 매핑 (2시간 단위):
 * 23:00~00:59 → 자(0), 01:00~02:59 → 축(1), ...
 *
 * @param hour 시 (0~23)
 * @param minute 분 (0~59)
 * @returns 시지 인덱스 (0~11)
 */
export function hourBranchIndex(hour: number, minute: number): number {
  const totalMinutes = hour * 60 + minute;
  return ((totalMinutes + 60) / 120 | 0) % 12;
}

/**
 * 일간(日干)으로부터 시간(時干)을 산출한다.
 * 공식: (일간 × 2 + 시지) mod 10
 * @param dayStem 일간 인덱스
 * @param hourBranch 시지 인덱스
 * @returns 시간 인덱스
 */
export function hourStemFromDay(dayStem: number, hourBranch: number): number {
  return (dayStem * 2 + hourBranch) % 10;
}

// ── 오행(五行) 관계 ──

/**
 * 천간의 오행을 반환한다.
 * 갑을=木, 병정=火, 무기=土, 경신=金, 임계=水
 * @param stem 천간 인덱스 (0~9)
 */
export function stemElement(stem: number): Element {
  const elements: Element[] = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
  return elements[stem];
}

/**
 * 지지의 오행을 반환한다.
 * @param branch 지지 인덱스 (0~11)
 */
export function branchElement(branch: number): Element {
  const elements: Element[] = ['Water', 'Earth', 'Wood', 'Wood', 'Earth', 'Fire', 'Fire', 'Earth', 'Metal', 'Metal', 'Earth', 'Water'];
  return elements[branch];
}

/**
 * 오행의 상생(相生) 관계: 해당 오행이 생(生)하는 오행을 반환한다.
 * 목→화→토→금→수→목 순환.
 */
export function elementGenerates(element: Element): Element {
  const map: Record<Element, Element> = {
    Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood',
  };
  return map[element];
}

/**
 * 오행의 상극(相剋) 관계: 해당 오행이 극(剋)하는 오행을 반환한다.
 * 목→토→수→화→금→목 순환.
 */
export function elementControls(element: Element): Element {
  const map: Record<Element, Element> = {
    Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood',
  };
  return map[element];
}

/**
 * 천간의 음양을 반환한다.
 * @returns true=양(陽, 짝수 인덱스), false=음(陰, 홀수 인덱스)
 */
export function stemPolarity(stem: number): boolean {
  return stem % 2 === 0;
}

/**
 * 지지의 음양을 반환한다 (정기 지장간의 음양으로 판단).
 * @returns true=양(陽), false=음(陰)
 */
export function branchPolarity(branch: number): boolean {
  return stemPolarity(mainHiddenStem(branch));
}

// ── 십성(十星) 판정 ──

/**
 * 일간 기준 대상 오행과의 관계(Relation)를 판정한다.
 * @param day 일간 오행
 * @param target 대상 오행
 * @returns Same(비겁)/Output(식상)/Wealth(재성)/Officer(관성)/Resource(인성)
 */
export function relation(day: Element, target: Element): Relation {
  if (day === target) return 'Same';
  if (elementGenerates(day) === target) return 'Output';
  if (elementControls(day) === target) return 'Wealth';
  if (elementGenerates(target) === day) return 'Resource';
  return 'Officer';
}

/**
 * 십성(十星)을 판정한다.
 *
 * 일간과 대상 천간의 오행 관계 + 음양 동이(同異)로 10가지를 구분:
 * - 같은 오행: 비견(同)/겁재(異)
 * - 생하는 오행: 식신(同)/상관(異)
 * - 극하는 오행: 편재(同)/정재(異)
 * - 극받는 오행: 편관(同)/정관(異)
 * - 생받는 오행: 편인(同)/정인(異)
 *
 * @param dayStem 일간 인덱스
 * @param targetStem 대상 천간 인덱스
 * @returns 십성 식별자
 */
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

// ── 지장간(地藏干) ──

/**
 * 지지의 지장간(숨겨진 천간들)을 반환한다.
 * @param branch 지지 인덱스 (0~11)
 * @returns 천간 인덱스 배열 [정기, 여기, (중기)]
 */
export function hiddenStems(branch: number): readonly number[] {
  return HIDDEN_STEMS[branch];
}

/**
 * 지장간 비율(30일 기준)을 반환한다.
 * @param branch 지지 인덱스
 * @returns 일수 배열 (HIDDEN_STEMS 순서와 동일)
 */
export function hiddenStemRatios(branch: number): readonly number[] {
  return HIDDEN_STEM_RATIOS[branch];
}

/**
 * 지지의 정기(正氣, 대표 지장간)를 반환한다.
 * @param branch 지지 인덱스
 * @returns 정기 천간 인덱스
 */
export function mainHiddenStem(branch: number): number {
  return HIDDEN_STEMS[branch][0];
}

/**
 * 지지의 정기를 기준으로 십성을 판정한다.
 * @param dayStem 일간 인덱스
 * @param branch 지지 인덱스
 * @returns 십성 식별자
 */
export function tenGodBranch(dayStem: number, branch: number): TenGod {
  return tenGod(dayStem, mainHiddenStem(branch));
}

// ── 12운성(十二運星) ──

/**
 * 12운성 인덱스를 산출한다.
 *
 * 장생(0)부터 양(11)까지의 순환에서, 일간이 해당 지지에서
 * 어떤 운성에 해당하는지를 계산한다.
 * 양간은 순행, 음간은 역행으로 전개한다.
 *
 * @param dayStem 일간 인덱스
 * @param branch 지지 인덱스
 * @returns 12운성 인덱스 (0=장생, 1=목욕, ..., 11=양)
 */
export function twelveStageIndex(dayStem: number, branch: number): number {
  const start = CHANGSHENG_START[dayStem];
  if (stemPolarity(dayStem)) {
    // 양간: 순행
    return (branch + 12 - start) % 12;
  } else {
    // 음간: 역행
    return (start + 12 - branch) % 12;
  }
}

/**
 * 12운성 인덱스를 강약 분류로 변환한다.
 * - 0~4 (장생~제왕): Strong
 * - 5~9 (쇠~절): Weak
 * - 10~11 (태~양): Neutral
 */
export function stageStrengthClass(stageIndex: number): StrengthClass {
  if (stageIndex <= 4) return 'Strong';
  if (stageIndex <= 9) return 'Weak';
  return 'Neutral';
}

// ── 12신살(十二神殺) ──

/**
 * 12신살 시작 지지를 결정한다 (연지 삼합 그룹 기준).
 * @param yearBranch 연지 인덱스
 * @returns 시작 지지 인덱스
 */
export function shinsalStartBranch(yearBranch: number): number {
  if (yearBranch === 0 || yearBranch === 4 || yearBranch === 8) return 8;
  if (yearBranch === 2 || yearBranch === 6 || yearBranch === 10) return 2;
  if (yearBranch === 3 || yearBranch === 7 || yearBranch === 11) return 11;
  return 5; // 1, 5, 9
}

/**
 * 12신살 인덱스를 산출한다.
 * @param yearBranch 연지 인덱스
 * @param branch 대상 지지 인덱스
 * @returns 12신살 인덱스 (0=지살, ..., 11=천살)
 */
export function twelveShinsalIndex(yearBranch: number, branch: number): number {
  const start = shinsalStartBranch(yearBranch);
  return (branch + 12 - start) % 12;
}

// ── 오행 분포 ──

/**
 * 오행을 인덱스(0~4)로 변환한다.
 * @returns 0=Wood, 1=Fire, 2=Earth, 3=Metal, 4=Water
 */
export function elementIndex(element: Element): number {
  const map: Record<Element, number> = { Wood: 0, Fire: 1, Earth: 2, Metal: 3, Water: 4 };
  return map[element];
}

/**
 * 네 기둥의 오행 분포(천간+지지)를 카운트한다.
 * @param pillars 네 기둥 배열
 * @returns [목, 화, 토, 금, 수] 개수 튜플
 */
export function elementsCount(pillars: Pillar[]): [number, number, number, number, number] {
  const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const pillar of pillars) {
    counts[elementIndex(stemElement(pillar.stem))]++;
    counts[elementIndex(branchElement(pillar.branch))]++;
  }
  return counts;
}

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
export function stemChung(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  return diff === 6 && a < 8 && b < 8;
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
 */
const BANG_HAP: [number, number, number, Element][] = [
  [2, 3, 4, 'Wood'], [5, 6, 7, 'Fire'], [8, 9, 10, 'Metal'], [11, 0, 1, 'Water'],
];

/**
 * 삼합(三合): 삼합국을 이루는 세 지지의 합.
 * 寅午戌=火局, 亥卯未=木局, 申子辰=水局, 巳酉丑=金局
 */
const SAM_HAP: [number, number, number, Element][] = [
  [2, 6, 10, 'Fire'], [11, 3, 7, 'Wood'], [8, 0, 4, 'Water'], [5, 9, 1, 'Metal'],
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

// ── 주요 신살(神殺) 검출 ──

/**
 * 삼합 그룹 번호를 반환한다 (삼합국 분류).
 * 0: 화국(寅午戌), 1: 목국(亥卯未), 2: 수국(申子辰), 3: 금국(巳酉丑)
 */
function samhapGroup(branch: number): number {
  if (branch === 2 || branch === 6 || branch === 10) return 0;
  if (branch === 11 || branch === 3 || branch === 7) return 1;
  if (branch === 8 || branch === 0 || branch === 4) return 2;
  return 3; // 5, 9, 1
}

/** 도화살(桃花殺) 대상 지지 — 삼합국의 왕지(旺地) */
function dohwaBranch(basisBranch: number): number {
  return [3, 0, 9, 6][samhapGroup(basisBranch)];
}

/** 역마살(驛馬殺) 대상 지지 — 삼합국의 충지(沖地) */
function yeokmaBranch(basisBranch: number): number {
  return [8, 5, 2, 11][samhapGroup(basisBranch)];
}

/** 천을귀인(天乙貴人) 대상 지지 — 일간별 2개 지지 */
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

/** 문창귀인(文昌貴人) 대상 지지 — 일간 기준 */
function munchangBranch(dayStem: number): number {
  return [5, 6, 8, 9, 8, 9, 11, 0, 2, 3][dayStem];
}

/** 학당귀인(學堂貴人) 대상 지지 — 일간 기준 */
function hakdangBranch(dayStem: number): number {
  return [11, 0, 2, 3, 2, 3, 5, 6, 8, 9][dayStem];
}

/** 천덕귀인(天德貴人) 대상 지지 — 월지 기준 */
function cheondeokBranch(monthBranch: number): number | null {
  const map = [5, 6, 11, 8, 3, 2, 1, 0, 9, 10, 7, 4];
  return map[monthBranch] ?? null;
}

/** 월덕귀인(月德貴人) 대상 천간 — 월지의 삼합 그룹 기준 */
function woldeokStem(monthBranch: number): number | null {
  return [2, 6, 8, 0][samhapGroup(monthBranch)] ?? null;
}

/** 양인살(羊刃殺) 대상 지지 — 양간(陽干)만 해당 */
function yanginBranch(dayStem: number): number | null {
  const map: Record<number, number> = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };
  return map[dayStem] ?? null;
}

/**
 * 공망(空亡) 두 지지를 산출한다.
 *
 * 60갑자에서 일주가 속하는 10간(旬)의 마지막 두 지지가 공망이다.
 * 예: 甲子旬 → 戌亥가 공망.
 *
 * @param dayStem 일간 인덱스
 * @param dayBranch 일지 인덱스
 * @returns 공망 지지 인덱스 2개
 */
export function gongmang(dayStem: number, dayBranch: number): [number, number] {
  const first = remEuclid(10 + dayBranch - dayStem, 12);
  const second = (first + 1) % 12;
  return [first, second];
}

/** 괴강살(魁罡殺): 庚辰, 庚戌, 壬辰, 壬戌 네 일주만 해당 */
function isGoegang(dayStem: number, dayBranch: number): boolean {
  return (
    (dayStem === 6 && dayBranch === 4) ||
    (dayStem === 6 && dayBranch === 10) ||
    (dayStem === 8 && dayBranch === 4) ||
    (dayStem === 8 && dayBranch === 10)
  );
}

/** 백호살(白虎殺) 대상 지지 — 연지 기준 */
function baekhoBranch(yearBranch: number): number | null {
  const map = [6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8, 7];
  return map[yearBranch] ?? null;
}

/** 원진살(怨嗔殺) 대상 지지 — 기준 지지의 7번째(대충 다음) */
function wonjinBranch(basisBranch: number): number {
  return [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8][basisBranch];
}

/** 귀문관살(鬼門關殺) 대상 지지 */
function gwimunBranch(basisBranch: number): number | null {
  const map = [9, 10, 7, 8, 5, 4, 3, 2, 3, 0, 1, 6];
  return map[basisBranch] ?? null;
}

/**
 * 네 기둥에서 주요 신살을 검출한다.
 *
 * 검출 대상 (13종):
 * - 도화살, 천을귀인, 역마살, 문창귀인, 학당귀인
 * - 천덕귀인, 월덕귀인, 양인살, 공망, 괴강살
 * - 백호살, 원진살, 귀문관살
 *
 * @param pillars 네 기둥 배열 [연, 월, 일, 시]
 * @returns ShinsalEntry 배열
 */
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

// ── 용신(用神) 결정 — 억부용신법(抑扶用神法) ──

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
