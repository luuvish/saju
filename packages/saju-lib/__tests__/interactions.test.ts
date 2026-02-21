/**
 * @fileoverview interactions 모듈 테스트 — 천간/지지 합충형파해
 */
import { describe, it, expect } from 'vitest'
import { interactions } from '../src/index'

describe('stemHap', () => {
  it('甲己 합 → Earth', () => {
    expect(interactions.stemHap(0, 5)).toBe('Earth')
  })

  it('乙庚 합 → Metal', () => {
    expect(interactions.stemHap(1, 6)).toBe('Metal')
  })

  it('丙辛 합 → Water', () => {
    expect(interactions.stemHap(2, 7)).toBe('Water')
  })

  it('丁壬 합 → Wood', () => {
    expect(interactions.stemHap(3, 8)).toBe('Wood')
  })

  it('戊癸 합 → Fire', () => {
    expect(interactions.stemHap(4, 9)).toBe('Fire')
  })

  it('합이 아닌 경우 null', () => {
    expect(interactions.stemHap(0, 1)).toBeNull()
  })

  it('순서 무관', () => {
    expect(interactions.stemHap(5, 0)).toBe('Earth')
  })

  it('범위 밖 인덱스 → null', () => {
    expect(interactions.stemHap(-1, 5)).toBeNull()
    expect(interactions.stemHap(0, 10)).toBeNull()
  })
})

describe('stemChung', () => {
  it('甲庚 충 → true', () => {
    expect(interactions.stemChung(0, 6)).toBe(true)
  })

  it('乙辛 충 → true', () => {
    expect(interactions.stemChung(1, 7)).toBe(true)
  })

  it('충이 아닌 경우 false', () => {
    expect(interactions.stemChung(0, 1)).toBe(false)
  })

  it('범위 밖 인덱스 → false', () => {
    expect(interactions.stemChung(-1, 5)).toBe(false)
    expect(interactions.stemChung(0, 10)).toBe(false)
  })
})

describe('findBranchInteractions', () => {
  it('子丑 육합을 탐지한다', () => {
    const pillars = [
      { stem: 0, branch: 0 },  // 子
      { stem: 1, branch: 1 },  // 丑
      { stem: 2, branch: 2 },
      { stem: 3, branch: 3 },
    ]
    const result = interactions.findBranchInteractions(pillars)
    const yukHap = result.filter((r) => r.relation === 'YukHap')
    expect(yukHap.length).toBeGreaterThanOrEqual(1)
    const found = yukHap.find((r) => r.branches.includes(0) && r.branches.includes(1))
    expect(found).toBeDefined()
    expect(found!.resultElement).toBe('Earth')
  })

  it('子午 충을 탐지한다', () => {
    const pillars = [
      { stem: 0, branch: 0 },  // 子
      { stem: 1, branch: 6 },  // 午
      { stem: 2, branch: 2 },
      { stem: 3, branch: 3 },
    ]
    const result = interactions.findBranchInteractions(pillars)
    const chung = result.filter((r) => r.relation === 'Chung')
    expect(chung.length).toBeGreaterThanOrEqual(1)
  })

  it('寅巳 형을 탐지한다', () => {
    const pillars = [
      { stem: 0, branch: 2 },  // 寅
      { stem: 1, branch: 5 },  // 巳
      { stem: 2, branch: 9 },
      { stem: 3, branch: 10 },
    ]
    const result = interactions.findBranchInteractions(pillars)
    const hyung = result.filter((r) => r.relation === 'Hyung')
    expect(hyung.length).toBeGreaterThanOrEqual(1)
  })

  it('子酉 파를 탐지한다', () => {
    const pillars = [
      { stem: 0, branch: 0 },  // 子
      { stem: 1, branch: 9 },  // 酉
      { stem: 2, branch: 2 },
      { stem: 3, branch: 3 },
    ]
    const result = interactions.findBranchInteractions(pillars)
    const pa = result.filter((r) => r.relation === 'Pa')
    expect(pa.length).toBeGreaterThanOrEqual(1)
  })

  it('子未 해를 탐지한다', () => {
    const pillars = [
      { stem: 0, branch: 0 },  // 子
      { stem: 1, branch: 7 },  // 未
      { stem: 2, branch: 2 },
      { stem: 3, branch: 3 },
    ]
    const result = interactions.findBranchInteractions(pillars)
    const hae = result.filter((r) => r.relation === 'Hae')
    expect(hae.length).toBeGreaterThanOrEqual(1)
  })

  it('寅卯辰 방합(木)을 탐지한다', () => {
    const pillars = [
      { stem: 0, branch: 2 },  // 寅
      { stem: 1, branch: 3 },  // 卯
      { stem: 2, branch: 4 },  // 辰
      { stem: 3, branch: 9 },
    ]
    const result = interactions.findBranchInteractions(pillars)
    const bangHap = result.filter((r) => r.relation === 'BangHap')
    expect(bangHap.length).toBeGreaterThanOrEqual(1)
    expect(bangHap[0].resultElement).toBe('Wood')
  })

  it('寅午戌 삼합(火)을 탐지한다', () => {
    const pillars = [
      { stem: 0, branch: 2 },  // 寅
      { stem: 1, branch: 6 },  // 午
      { stem: 2, branch: 10 }, // 戌
      { stem: 3, branch: 9 },
    ]
    const result = interactions.findBranchInteractions(pillars)
    const samHap = result.filter((r) => r.relation === 'SamHap')
    expect(samHap.length).toBeGreaterThanOrEqual(1)
    expect(samHap[0].resultElement).toBe('Fire')
  })
})

describe('findStemInteractions', () => {
  it('甲己 합과 甲庚 충을 동시에 탐지한다', () => {
    const pillars = [
      { stem: 0, branch: 0 },  // 甲
      { stem: 5, branch: 1 },  // 己
      { stem: 6, branch: 2 },  // 庚
      { stem: 3, branch: 3 },
    ]
    const result = interactions.findStemInteractions(pillars)
    const hap = result.filter((r) => r.relation === 'Hap')
    const chung = result.filter((r) => r.relation === 'Chung')
    expect(hap.length).toBeGreaterThanOrEqual(1)
    expect(chung.length).toBeGreaterThanOrEqual(1)
  })
})
