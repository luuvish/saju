/**
 * @fileoverview luck 모듈 테스트 — 대운/세운/월운
 */
import { describe, it, expect } from 'vitest'
import { luck } from '../src/index'

describe('daewonDirection', () => {
  it('양남(陽男)은 순행', () => {
    // 甲(0)은 양간
    expect(luck.daewonDirection('Male', 0)).toBe('Forward')
  })

  it('음녀(陰女)는 순행', () => {
    // 乙(1)은 음간
    expect(luck.daewonDirection('Female', 1)).toBe('Forward')
  })

  it('음남(陰男)은 역행', () => {
    expect(luck.daewonDirection('Male', 1)).toBe('Backward')
  })

  it('양녀(陽女)는 역행', () => {
    expect(luck.daewonDirection('Female', 0)).toBe('Backward')
  })
})

describe('buildDaewonPillars', () => {
  it('순행 시 stem/branch가 +1씩 증가한다', () => {
    const pillars = luck.buildDaewonPillars({ stem: 0, branch: 2 }, 'Forward', 3)
    expect(pillars).toHaveLength(3)
    expect(pillars[0]).toEqual({ stem: 1, branch: 3 })
    expect(pillars[1]).toEqual({ stem: 2, branch: 4 })
    expect(pillars[2]).toEqual({ stem: 3, branch: 5 })
  })

  it('역행 시 stem/branch가 -1씩 감소한다', () => {
    const pillars = luck.buildDaewonPillars({ stem: 0, branch: 0 }, 'Backward', 2)
    expect(pillars).toHaveLength(2)
    expect(pillars[0]).toEqual({ stem: 9, branch: 11 })
    expect(pillars[1]).toEqual({ stem: 8, branch: 10 })
  })
})

describe('buildDaewonItems', () => {
  it('120개월 간격으로 시작 시기가 배치된다', () => {
    const pillars = [{ stem: 1, branch: 3 }, { stem: 2, branch: 4 }]
    const items = luck.buildDaewonItems(36, pillars)
    expect(items[0].startMonths).toBe(36)
    expect(items[1].startMonths).toBe(156)
  })
})

describe('yearlyLuck', () => {
  it('지정 연도 수만큼 세운을 반환한다', () => {
    const result = luck.yearlyLuck(2020, 5)
    expect(result).toHaveLength(5)
    expect(result[0].year).toBe(2020)
    expect(result[4].year).toBe(2024)
  })

  it('각 세운에 pillar, startJd, endJd가 있다', () => {
    const result = luck.yearlyLuck(2024, 1)
    const item = result[0]
    expect(item.pillar).toBeDefined()
    expect(item.startJd).toBeDefined()
    expect(item.endJd).toBeDefined()
    expect(item.endJd).toBeGreaterThan(item.startJd)
  })
})

describe('monthlyLuck', () => {
  it('12개월 월운을 반환한다', () => {
    const result = luck.monthlyLuck(2024)
    expect(result.months).toHaveLength(12)
    expect(result.year).toBe(2024)
  })

  it('각 월운에 startJd < endJd', () => {
    const result = luck.monthlyLuck(2024)
    for (const m of result.months) {
      expect(m.endJd).toBeGreaterThan(m.startJd)
    }
  })

  it('연주 pillar이 포함된다', () => {
    const result = luck.monthlyLuck(2024)
    expect(result.yearPillar).toBeDefined()
    expect(typeof result.yearPillar.stem).toBe('number')
    expect(typeof result.yearPillar.branch).toBe('number')
  })
})
