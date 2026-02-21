/**
 * @fileoverview shinsal 모듈 테스트 — 신살 검출
 */
import { describe, it, expect } from 'vitest'
import { shinsal } from '../src/index'

describe('shinsalStartBranch', () => {
  it('子(0)의 시작 지지는 申(8)', () => {
    expect(shinsal.shinsalStartBranch(0)).toBe(8)
  })

  it('寅(2)의 시작 지지는 寅(2)', () => {
    expect(shinsal.shinsalStartBranch(2)).toBe(2)
  })

  it('丑(1)의 시작 지지는 巳(5)', () => {
    expect(shinsal.shinsalStartBranch(1)).toBe(5)
  })
})

describe('twelveShinsalIndex', () => {
  it('연지=子(0), 지지=申(8) → 0(지살)', () => {
    expect(shinsal.twelveShinsalIndex(0, 8)).toBe(0)
  })
})

describe('findShinsal', () => {
  it('도화살을 검출한다 (연지=寅, 대상 지지에 卯)', () => {
    // 寅(2) 삼합그룹 → 도화살 대상 = 卯(3)
    const pillars = [
      { stem: 0, branch: 2 },  // 연: 寅
      { stem: 1, branch: 3 },  // 월: 卯 (도화살 위치)
      { stem: 2, branch: 4 },
      { stem: 3, branch: 5 },
    ]
    const result = shinsal.findShinsal(pillars)
    const dohwa = result.filter((e) => e.kind === 'DoHwaSal')
    expect(dohwa.length).toBeGreaterThanOrEqual(1)
  })

  it('천을귀인을 검출한다 (일간=甲, 지지에 丑)', () => {
    // 甲(0) → 천을귀인: 丑(1), 未(7)
    const pillars = [
      { stem: 0, branch: 1 },  // 연: 丑 (천을귀인 위치)
      { stem: 1, branch: 3 },
      { stem: 0, branch: 4 },  // 일: 甲
      { stem: 3, branch: 5 },
    ]
    const result = shinsal.findShinsal(pillars)
    const cheonEul = result.filter((e) => e.kind === 'CheonEulGwiIn')
    expect(cheonEul.length).toBeGreaterThanOrEqual(1)
  })

  it('역마살을 검출한다 (연지=寅, 대상에 申)', () => {
    // 寅(2) 삼합그룹 → 역마 대상 = 申(8)
    const pillars = [
      { stem: 0, branch: 2 },  // 연: 寅
      { stem: 1, branch: 8 },  // 월: 申 (역마 위치)
      { stem: 2, branch: 4 },
      { stem: 3, branch: 5 },
    ]
    const result = shinsal.findShinsal(pillars)
    const yeokma = result.filter((e) => e.kind === 'YeokMaSal')
    expect(yeokma.length).toBeGreaterThanOrEqual(1)
  })

  it('괴강살을 검출한다 (庚辰 일주)', () => {
    const pillars = [
      { stem: 0, branch: 0 },
      { stem: 1, branch: 1 },
      { stem: 6, branch: 4 },  // 庚辰
      { stem: 3, branch: 5 },
    ]
    const result = shinsal.findShinsal(pillars)
    const goegang = result.filter((e) => e.kind === 'GoeGangSal')
    expect(goegang).toHaveLength(1)
  })

  it('공망을 검출한다', () => {
    // 甲子(0,0) 일주 → 공망: 戌(10), 亥(11)
    const pillars = [
      { stem: 0, branch: 10 },  // 연: 戌 (공망 위치)
      { stem: 1, branch: 1 },
      { stem: 0, branch: 0 },   // 일: 甲子
      { stem: 3, branch: 5 },
    ]
    const result = shinsal.findShinsal(pillars)
    const gongmang = result.filter((e) => e.kind === 'GongMang')
    expect(gongmang.length).toBeGreaterThanOrEqual(1)
  })

  it('양인살을 검출한다 (일간=甲, 지지에 卯)', () => {
    // 甲(0) → 양인 대상 = 卯(3)
    const pillars = [
      { stem: 0, branch: 3 },  // 연: 卯 (양인 위치)
      { stem: 1, branch: 1 },
      { stem: 0, branch: 4 },  // 일: 甲
      { stem: 3, branch: 5 },
    ]
    const result = shinsal.findShinsal(pillars)
    const yangin = result.filter((e) => e.kind === 'YangInSal')
    expect(yangin.length).toBeGreaterThanOrEqual(1)
  })

  it('원진살을 검출한다 (연지=子, 대상에 未)', () => {
    // 子(0) → 원진 대상 = 未(7)
    const pillars = [
      { stem: 0, branch: 0 },  // 연: 子
      { stem: 1, branch: 7 },  // 월: 未 (원진 위치)
      { stem: 2, branch: 4 },
      { stem: 3, branch: 5 },
    ]
    const result = shinsal.findShinsal(pillars)
    const wonjin = result.filter((e) => e.kind === 'WonJinSal')
    expect(wonjin.length).toBeGreaterThanOrEqual(1)
  })

  it('귀문관살을 검출한다 (연지=子, 대상에 酉)', () => {
    // 子(0) → 귀문관 대상 = 酉(9)
    const pillars = [
      { stem: 0, branch: 0 },  // 연: 子
      { stem: 1, branch: 9 },  // 월: 酉 (귀문관 위치)
      { stem: 2, branch: 4 },
      { stem: 3, branch: 5 },
    ]
    const result = shinsal.findShinsal(pillars)
    const gwimun = result.filter((e) => e.kind === 'GwiMunGwanSal')
    expect(gwimun.length).toBeGreaterThanOrEqual(1)
  })

  it('백호살을 검출한다 (연지=子, 대상에 午)', () => {
    // 子(0) → 백호 대상 = 午(6)
    const pillars = [
      { stem: 0, branch: 0 },  // 연: 子
      { stem: 1, branch: 6 },  // 월: 午 (백호 위치)
      { stem: 2, branch: 4 },
      { stem: 3, branch: 5 },
    ]
    const result = shinsal.findShinsal(pillars)
    const baekho = result.filter((e) => e.kind === 'BaekHoSal')
    expect(baekho.length).toBeGreaterThanOrEqual(1)
  })

  it('문창귀인을 검출한다 (일간=甲, 지지에 巳)', () => {
    // 甲(0) → 문창 대상 = 巳(5)
    const pillars = [
      { stem: 0, branch: 5 },  // 연: 巳 (문창 위치)
      { stem: 1, branch: 1 },
      { stem: 0, branch: 4 },  // 일: 甲
      { stem: 3, branch: 3 },
    ]
    const result = shinsal.findShinsal(pillars)
    const munchang = result.filter((e) => e.kind === 'MunChangGwiIn')
    expect(munchang.length).toBeGreaterThanOrEqual(1)
  })

  it('학당귀인을 검출한다 (일간=甲, 지지에 亥)', () => {
    // 甲(0) → 학당 대상 = 亥(11)
    const pillars = [
      { stem: 0, branch: 11 },  // 연: 亥 (학당 위치)
      { stem: 1, branch: 1 },
      { stem: 0, branch: 4 },   // 일: 甲
      { stem: 3, branch: 3 },
    ]
    const result = shinsal.findShinsal(pillars)
    const hakdang = result.filter((e) => e.kind === 'HakDangGwiIn')
    expect(hakdang.length).toBeGreaterThanOrEqual(1)
  })
})
