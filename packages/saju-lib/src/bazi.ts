/**
 * @fileoverview 사주팔자(四柱八字) 핵심 계산 모듈
 *
 * 천간(天干)·지지(地支) 기반의 사주 계산 로직을 담당한다:
 * - 연주·월주·일주·시주 산출
 * - 오행(五行) 관계 및 십성(十星) 판정
 * - 지장간(地藏干) 조회
 * - 12운성(十二運星)
 * - 공망(空亡) 산출
 * - 오행 분포 집계
 *
 * 분리된 모듈:
 * - interactions.ts — 천간 합/충, 지지 육합/충/형/파/해/방합/삼합
 * - shinsal.ts — 12신살, 주요 신살 13종 검출
 * - strength.ts — 신강/신약 판정, 용신 결정
 */

import type {
  Element,
  Pillar,
  Relation,
  SolarTerm,
  StrengthClass,
  TenGod,
} from './types.js';

// 분리 모듈 re-export (하위 호환성 유지)
export { stemHap, stemChung, findStemInteractions, findBranchInteractions } from './interactions.js';
export { shinsalStartBranch, twelveShinsalIndex, findShinsal } from './shinsal.js';
export { assessStrength, determineYongshin, STRENGTH_WEIGHTS } from './strength.js';
export type { StrengthResult } from './strength.js';

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

// ── 공망(空亡) ──

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
