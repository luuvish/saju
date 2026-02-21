/**
 * @fileoverview astro 모듈 테스트 — 절기 계산 경계 조건
 */
import { describe, it, expect } from 'vitest'
import { astro } from '../src/index'

describe('computeSolarTerms', () => {
  it('2024년 절기 24개를 정상 반환한다', () => {
    const terms = astro.computeSolarTerms(2024)
    expect(terms).toHaveLength(24)
  })

  it('경계 연도 1900년 절기 24개를 반환한다', () => {
    const terms = astro.computeSolarTerms(1900)
    expect(terms).toHaveLength(24)
  })

  it('경계 연도 2100년 절기 24개를 반환한다', () => {
    const terms = astro.computeSolarTerms(2100)
    expect(terms).toHaveLength(24)
  })

  it('절기가 JD 오름차순으로 정렬되어 있다', () => {
    const terms = astro.computeSolarTerms(2024)
    for (let i = 1; i < terms.length; i++) {
      expect(terms[i].jd).toBeGreaterThan(terms[i - 1].jd)
    }
  })

  it('1900년 절기도 JD 오름차순이다', () => {
    const terms = astro.computeSolarTerms(1900)
    for (let i = 1; i < terms.length; i++) {
      expect(terms[i].jd).toBeGreaterThan(terms[i - 1].jd)
    }
  })

  it('2024년 입춘이 2월 4일 부근이다', () => {
    const terms = astro.computeSolarTerms(2024)
    const lichun = terms.find((t) => t.def.key === 'lichun')
    expect(lichun).toBeDefined()
    // 2024 입춘: 2024-02-04 (UTC 기준)
    const dt = astro.datetimeFromJd(lichun!.jd)
    expect(dt.getUTCMonth()).toBe(1) // 0-indexed → 2월
    expect(dt.getUTCDate()).toBeGreaterThanOrEqual(3)
    expect(dt.getUTCDate()).toBeLessThanOrEqual(5)
  })

  it('각 절기 def에 key, nameKo, angle이 있다', () => {
    const terms = astro.computeSolarTerms(2024)
    for (const term of terms) {
      expect(term.def.key).toBeTruthy()
      expect(term.def.nameKo).toBeTruthy()
      expect(typeof term.def.angle).toBe('number')
      expect(typeof term.jd).toBe('number')
    }
  })
})
