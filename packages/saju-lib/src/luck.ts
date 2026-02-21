import { computeSolarTerms } from './astro.js';
import { monthBranchFromTermKey, monthStemFromYear, yearPillar } from './bazi.js';
import type { Direction, Gender, Pillar, SolarTerm } from './types.js';

export interface DaewonItem {
  startMonths: number;
  pillar: Pillar;
}

export interface YearLuck {
  year: number;
  startJd: number;
  endJd: number;
  pillar: Pillar;
}

export interface MonthLuck {
  startJd: number;
  endJd: number;
  pillar: Pillar;
  branch: number;
}

export interface MonthlyLuck {
  year: number;
  yearPillar: Pillar;
  months: MonthLuck[];
}

function remEuclid(a: number, b: number): number {
  return ((a % b) + b) % b;
}

export function daewonDirection(gender: Gender, yearStem: number): Direction {
  const yang = yearStem % 2 === 0;
  if ((gender === 'Male' && yang) || (gender === 'Female' && !yang)) {
    return 'Forward';
  }
  return 'Backward';
}

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
    target = allTerms
      .filter((t) => t.jd > birthJd)
      .sort((a, b) => a.jd - b.jd)[0];
  } else {
    target = allTerms
      .filter((t) => t.jd < birthJd)
      .sort((a, b) => b.jd - a.jd)[0];
  }

  if (!target) return null;

  const diffDays = Math.abs(target.jd - birthJd);
  const months = Math.round((diffDays / 3.0) * 12.0);
  return months;
}

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

export function buildDaewonItems(startMonths: number, pillars: Pillar[]): DaewonItem[] {
  return pillars.map((pillar, idx) => ({
    startMonths: startMonths + idx * 120,
    pillar,
  }));
}

export function yearlyLuck(startYear: number, count: number): YearLuck[] {
  const results: YearLuck[] = [];
  for (let idx = 0; idx < count; idx++) {
    const year = startYear + idx;
    const termsCurr = computeSolarTerms(year);
    const termsNext = computeSolarTerms(year + 1);
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

export function monthlyLuck(year: number): MonthlyLuck {
  const termsCurr = computeSolarTerms(year);
  const termsNext = computeSolarTerms(year + 1);
  const lichunCurr = termsCurr.find((t) => t.def.key === 'lichun');
  if (!lichunCurr) throw new Error('failed to find lichun term for monthly luck');
  const lichunNext = termsNext.find((t) => t.def.key === 'lichun');
  if (!lichunNext) throw new Error('failed to find next lichun term for monthly luck');

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
