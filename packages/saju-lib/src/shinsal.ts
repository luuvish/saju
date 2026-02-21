/**
 * @fileoverview 신살(神殺) 검출 모듈
 *
 * 주요 신살 13종(도화살, 천을귀인, 역마살, 문창귀인, 학당귀인,
 * 천덕귀인, 월덕귀인, 양인살, 공망, 괴강살, 백호살, 원진살,
 * 귀문관살)의 탐지와 12신살 인덱스 산출을 담당한다.
 */

import type {
  Pillar,
  PillarPosition,
  ShinsalEntry,
} from './types.js';
import { gongmang } from './bazi.js';

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
