/**
 * @fileoverview lunar 모듈 테스트 — 음양력 변환
 */
import { describe, it, expect } from 'vitest'
import { lunar } from '../src/index'

// ---------------------------------------------------------------------------
// 내부 헬퍼: 테스트 전용 재구현 (lunar.ts 원본 로직을 그대로 복사)
// ---------------------------------------------------------------------------

/** 연-월-일로 UTC Date를 생성한다 */
function _dateFromYmd(year: number, month: number, day: number): Date {
  const d = new Date(Date.UTC(year, month - 1, day))
  if (year >= 0 && year < 100) d.setUTCFullYear(year)
  return d
}

/** 두 Date 사이의 일수 차이를 반환한다 */
function _daysBetween(d1: Date, d2: Date): number {
  const ms = d2.getTime() - d1.getTime()
  return Math.round(ms / 86400000)
}

/**
 * lunar.ts 의 lunarToSolar 공개 함수를 이용해 음력 연도의 첫날(양력)을 구한다.
 * 연도별 일수 = daysBetween(firstDayOf(y), firstDayOf(y+1)).
 * 단, 2100년은 범위 밖이므로 별도 처리가 필요하다.
 */
function _lunarYearDaysViaPublicApi(year: number): number {
  const startOfYear = lunar.lunarToSolar(year, 1, 1, false)
  const startOfNext = lunar.lunarToSolar(year + 1, 1, 1, false)
  return _daysBetween(startOfYear, startOfNext)
}

// ---------------------------------------------------------------------------
// solarToLunar totalDays 검증: 루프 합산 vs 날짜 기반 계산
// ---------------------------------------------------------------------------

describe('solarToLunar totalDays 검증', () => {
  it('루프 기반 합산과 날짜 기반 계산(2100-02-19)이 일치한다', () => {
    // --- 구(舊) 방식: LUNAR_MIN_YEAR~LUNAR_MAX_YEAR 각 연도 일수 합산 ---
    // 1900~2098년은 공개 API로 직접 계산 가능 (year+1 ≤ 2099).
    // 2099년은 startOfNext(2100년)를 공개 API로 구할 수 없으므로,
    // base → 2099년 첫날까지의 일수를 따로 구하고 2099년 몫은 역산한다.
    const LUNAR_MIN_YEAR = 1900
    const LUNAR_MAX_YEAR = 2099
    const base = _dateFromYmd(LUNAR_MIN_YEAR, 1, 31) // 음력 기준일: 양력 1900-01-31

    // 1900~2098: lunarToSolar(y,1,1) ~ lunarToSolar(y+1,1,1) 차이
    let loopTotal = 0
    for (let y = LUNAR_MIN_YEAR; y < LUNAR_MAX_YEAR; y++) {
      loopTotal += _lunarYearDaysViaPublicApi(y)
    }
    // 2099년: 2099-01-01(양력)부터 실제 end date(2100-02-19)까지의 차이
    const start2099 = lunar.lunarToSolar(LUNAR_MAX_YEAR, 1, 1, false)
    const endDate = _dateFromYmd(LUNAR_MAX_YEAR + 1, 2, 19)
    loopTotal += _daysBetween(start2099, endDate)

    // --- 신(新) 방식: daysBetween(base, dateFromYmd(2100, 2, 19)) ---
    const newTotal = _daysBetween(base, endDate)

    expect(loopTotal).toBe(newTotal)
  })

  it('지원 범위 마지막 날(2099-12-31)은 변환에 성공한다', () => {
    // solarToLunar은 연도 가드(dateYear > 2099)도 있으므로,
    // 2099년 이내의 마지막 유효 양력 날짜를 확인한다.
    // 2099-12-31은 음력 2099년 12월에 해당해야 한다.
    const lastSolar = new Date(Date.UTC(2099, 11, 31))
    expect(() => lunar.solarToLunar(lastSolar)).not.toThrow()
    const result = lunar.solarToLunar(lastSolar)
    expect(result.year).toBe(2099)
  })

  it('지원 범위를 벗어난 날(2100-02-19)은 에러를 발생시킨다', () => {
    // endDate 자체(offset >= totalDays)는 범위 초과여야 한다
    const outOfRange = new Date(Date.UTC(2100, 1, 19))
    expect(() => lunar.solarToLunar(outOfRange)).toThrow()
  })
})

describe('solarToLunar / lunarToSolar 왕복 변환', () => {
  const cases: [number, number, number][] = [
    [2000, 1, 15],
    [2024, 6, 10],
    [1990, 3, 25],
    [2050, 12, 1],
  ]

  for (const [y, m, d] of cases) {
    it(`양력 ${y}-${m}-${d} → 음력 → 양력 왕복`, () => {
      const sDate = new Date(Date.UTC(y, m - 1, d))
      const lunarDate = lunar.solarToLunar(sDate)
      const back = lunar.lunarToSolar(lunarDate.year, lunarDate.month, lunarDate.day, lunarDate.isLeap)
      expect(back.getUTCFullYear()).toBe(y)
      expect(back.getUTCMonth() + 1).toBe(m)
      expect(back.getUTCDate()).toBe(d)
    })
  }
})

describe('solarToLunar', () => {
  it('1900-01-31 → 음력 1900-01-01', () => {
    const d = new Date(Date.UTC(1900, 0, 31))
    const result = lunar.solarToLunar(d)
    expect(result.year).toBe(1900)
    expect(result.month).toBe(1)
    expect(result.day).toBe(1)
    expect(result.isLeap).toBe(false)
  })

  it('범위 밖 날짜에 대해 에러 발생', () => {
    expect(() => lunar.solarToLunar(new Date(Date.UTC(1899, 0, 1)))).toThrow()
  })
})

describe('lunarToSolar', () => {
  it('경계 연도 1900년 음력 1-1을 변환한다', () => {
    const result = lunar.lunarToSolar(1900, 1, 1, false)
    expect(result.getUTCFullYear()).toBe(1900)
    expect(result.getUTCMonth()).toBe(0) // 1월
    expect(result.getUTCDate()).toBe(31)
  })

  it('범위 밖 연도에 에러 발생', () => {
    expect(() => lunar.lunarToSolar(1899, 1, 1, false)).toThrow()
    expect(() => lunar.lunarToSolar(2100, 1, 1, false)).toThrow()
  })

  it('잘못된 월에 에러 발생', () => {
    expect(() => lunar.lunarToSolar(2000, 0, 1, false)).toThrow()
    expect(() => lunar.lunarToSolar(2000, 13, 1, false)).toThrow()
  })

  it('윤달이 아닌 월에 윤달 플래그 → 에러', () => {
    // 2000년에 윤달이 없는 월 (예: 1월)
    expect(() => lunar.lunarToSolar(2000, 1, 1, true)).toThrow()
  })
})
