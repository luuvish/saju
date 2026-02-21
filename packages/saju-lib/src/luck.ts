/**
 * @fileoverview 운(運) 계산 모듈 — 대운, 세운, 월운
 *
 * - 대운(大運): 10년 주기의 운세. 월주를 기준으로 순행/역행 방향으로 전개.
 * - 세운(歲運): 매년의 운세. 입춘(立春) 기준으로 연주를 산출.
 * - 월운(月運): 매월의 운세. 절기(節氣) 기준으로 월주를 산출.
 */

import { computeSolarTerms } from './astro.js';
import { monthBranchFromTermKey, monthStemFromYear, yearPillar } from './bazi.js';
import type { Direction, Gender, Pillar, SolarTerm } from './types.js';
import { remEuclid } from './utils.js';

/** 대운 항목: 시작 시기(개월)와 해당 기둥 */
export interface DaewonItem {
  /** 대운 시작 시기 (출생 후 개월 수) */
  startMonths: number;
  /** 대운 기둥 (천간·지지) */
  pillar: Pillar;
}

/** 세운(연운) 항목: 특정 연도의 입춘~입춘 구간 */
export interface YearLuck {
  year: number;
  /** 해당 연도 입춘 시점 (JD) */
  startJd: number;
  /** 다음 연도 입춘 시점 (JD) */
  endJd: number;
  /** 세운 기둥 */
  pillar: Pillar;
}

/** 월운 항목: 절기 기준 한 달 구간 */
export interface MonthLuck {
  /** 해당 절기 시점 (JD) */
  startJd: number;
  /** 다음 절기 시점 (JD) */
  endJd: number;
  /** 월운 기둥 */
  pillar: Pillar;
  /** 월지 인덱스 (0~11) */
  branch: number;
}

/** 특정 연도의 월운 전체 데이터 */
export interface MonthlyLuck {
  year: number;
  /** 해당 연도의 연주 */
  yearPillar: Pillar;
  /** 12개월 월운 배열 (입춘월~대설월) */
  months: MonthLuck[];
}

// ── 절기 캐시 ──

const MAX_TERMS_CACHE_SIZE = 50
const termsCache = new Map<number, SolarTerm[]>()

/** 절기 계산 결과를 캐싱하여 반복 호출 시 재계산을 방지한다 */
function getCachedTerms(year: number): SolarTerm[] {
  let t = termsCache.get(year)
  if (!t) {
    if (termsCache.size >= MAX_TERMS_CACHE_SIZE) {
      const oldest = termsCache.keys().next().value!
      termsCache.delete(oldest)
    }
    t = computeSolarTerms(year)
    termsCache.set(year, t)
  }
  return t
}

/**
 * 대운 진행 방향을 결정한다.
 *
 * 양남음녀(陽男陰女)는 순행, 음남양녀(陰男陽女)는 역행.
 * 연간(年干)의 음양으로 판단한다.
 *
 * @param gender 성별
 * @param yearStem 연간 인덱스 (짝수=양, 홀수=음)
 * @returns 순행(Forward) 또는 역행(Backward)
 */
export function daewonDirection(gender: Gender, yearStem: number): Direction {
  const yang = yearStem % 2 === 0;
  if ((gender === 'Male' && yang) || (gender === 'Female' && !yang)) {
    return 'Forward';
  }
  return 'Backward';
}

/**
 * 대운 시작 시기(개월)를 계산한다.
 *
 * 출생일(birthJd)에서 가장 가까운 절기까지의 일수를 구한 뒤,
 * "3일 = 1년" 비율로 환산한다.
 * - 순행: 출생 이후 첫 절기까지의 일수
 * - 역행: 출생 이전 마지막 절기까지의 일수
 *
 * @param birthJd 출생 시점 (JD)
 * @param termsPrev 전년도 절기 배열
 * @param termsCurr 당해 절기 배열
 * @param termsNext 다음해 절기 배열
 * @param direction 대운 진행 방향
 * @returns 대운 시작까지의 개월 수, 또는 null
 */
export function daewonStartMonths(
  birthJd: number,
  termsPrev: SolarTerm[],
  termsCurr: SolarTerm[],
  termsNext: SolarTerm[],
  direction: Direction,
): number | null {
  const allTerms = [...termsPrev, ...termsCurr, ...termsNext];

  let target: SolarTerm | undefined;
  if (direction === 'Forward') {
    // 순행: 출생 이후 가장 가까운 절기
    target = allTerms
      .filter((t) => t.jd > birthJd)
      .sort((a, b) => a.jd - b.jd)[0];
  } else {
    // 역행: 출생 이전 가장 가까운 절기
    target = allTerms
      .filter((t) => t.jd < birthJd)
      .sort((a, b) => b.jd - a.jd)[0];
  }

  if (!target) return null;

  // 3일 = 1년(12개월) 비율 환산
  const diffDays = Math.abs(target.jd - birthJd);
  const months = Math.round((diffDays / 3.0) * 12.0);
  return months;
}

/**
 * 대운 기둥 배열을 생성한다.
 *
 * 월주를 기준으로 순행이면 천간·지지를 +1씩, 역행이면 -1씩 이동한다.
 *
 * @param monthPillar 월주 (대운의 시작점)
 * @param direction 진행 방향
 * @param count 생성할 대운 개수
 * @returns 대운 기둥 배열
 */
export function buildDaewonPillars(
  monthPillar: Pillar,
  direction: Direction,
  count: number,
): Pillar[] {
  const pillars: Pillar[] = [];
  let stem = monthPillar.stem;
  let branch = monthPillar.branch;
  for (let i = 0; i < count; i++) {
    if (direction === 'Forward') {
      stem = (stem + 1) % 10;
      branch = (branch + 1) % 12;
    } else {
      stem = remEuclid(stem - 1, 10);
      branch = remEuclid(branch - 1, 12);
    }
    pillars.push({ stem, branch });
  }
  return pillars;
}

/**
 * 대운 기둥에 시작 시기를 결합하여 DaewonItem 배열을 생성한다.
 * 각 대운은 120개월(10년) 간격으로 배치된다.
 *
 * @param startMonths 첫 대운 시작 시기 (개월)
 * @param pillars 대운 기둥 배열
 * @returns DaewonItem 배열
 */
export function buildDaewonItems(startMonths: number, pillars: Pillar[]): DaewonItem[] {
  return pillars.map((pillar, idx) => ({
    startMonths: startMonths + idx * 120,
    pillar,
  }));
}

/**
 * 세운(연운) 배열을 생성한다.
 *
 * 입춘(立春) 기준으로 연주를 산출하고, 각 연도의 입춘~다음 입춘 구간을 설정한다.
 *
 * @param startYear 시작 연도
 * @param count 연도 수
 * @returns YearLuck 배열
 */
export function yearlyLuck(startYear: number, count: number): YearLuck[] {
  const results: YearLuck[] = [];
  for (let idx = 0; idx < count; idx++) {
    const year = startYear + idx;
    const termsCurr = getCachedTerms(year);
    const termsNext = getCachedTerms(year + 1);
    const lichunCurr = termsCurr.find((t) => t.def.key === 'lichun');
    if (!lichunCurr) throw new Error('failed to find lichun for yearly luck');
    const lichunNext = termsNext.find((t) => t.def.key === 'lichun');
    if (!lichunNext) throw new Error('failed to find next lichun for yearly luck');
    const [yStem, yBranch] = yearPillar(year);
    results.push({
      year,
      startJd: lichunCurr.jd,
      endJd: lichunNext.jd,
      pillar: { stem: yStem, branch: yBranch },
    });
  }
  return results;
}

/**
 * 특정 연도의 월운 데이터를 생성한다.
 *
 * 절입일(節入日) 기준으로 12개월을 구성한다. 각 월은
 * 해당 절기 시작부터 다음 절기 시작까지의 구간이다.
 *
 * @param year 대상 연도
 * @returns MonthlyLuck (연주 + 12개월 월운)
 */
export function monthlyLuck(year: number): MonthlyLuck {
  const termsCurr = getCachedTerms(year);
  const termsNext = getCachedTerms(year + 1);
  const lichunCurr = termsCurr.find((t) => t.def.key === 'lichun');
  if (!lichunCurr) throw new Error('failed to find lichun term for monthly luck');
  const lichunNext = termsNext.find((t) => t.def.key === 'lichun');
  if (!lichunNext) throw new Error('failed to find next lichun term for monthly luck');

  // 입춘~다음 입춘 사이의 절기 경계 추출 (절기만, 중기 제외)
  let boundaries = [...termsCurr, ...termsNext]
    .filter((t) => monthBranchFromTermKey(t.def.key) !== null)
    .sort((a, b) => a.jd - b.jd)
    .filter((t) => t.jd >= lichunCurr.jd && t.jd <= lichunNext.jd);

  if (boundaries.length === 0) throw new Error('failed to build monthly boundaries');
  if (boundaries[0].def.key !== 'lichun') {
    const idx = boundaries.findIndex((t) => t.def.key === 'lichun');
    if (idx >= 0) boundaries = boundaries.slice(idx);
  }
  if (boundaries.length < 13) throw new Error('monthly boundary count insufficient');

  const [yStem, yBranch] = yearPillar(year);
  const months: MonthLuck[] = [];
  for (let idx = 0; idx < 12; idx++) {
    const start = boundaries[idx];
    const end = boundaries[idx + 1];
    const branch = monthBranchFromTermKey(start.def.key);
    if (branch === null) throw new Error('invalid month boundary for monthly luck');
    const stem = monthStemFromYear(yStem, branch);
    months.push({
      startJd: start.jd,
      endJd: end.jd,
      pillar: { stem, branch },
      branch,
    });
  }

  return {
    year,
    yearPillar: { stem: yStem, branch: yBranch },
    months,
  };
}
