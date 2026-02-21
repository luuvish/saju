import { describe, it, expect } from 'vitest'
import * as bazi from '../src/bazi.js'
import { STRENGTH_WEIGHTS } from '../src/bazi.js'
import type { Pillar } from '../src/types.js'

// ── 테스트 헬퍼 ──

/** Pillar 객체 생성 헬퍼 */
function p(stem: number, branch: number): Pillar {
  return { stem, branch }
}

// ── 연주(年柱) ──

describe('yearPillar', () => {
  it('서기 4년 = 甲子 기준점 (stem=0, branch=0)', () => {
    expect(bazi.yearPillar(4)).toEqual([0, 0])
  })

  it('2000년 → 庚辰 (stem=6, branch=4)', () => {
    // (2000-4) % 10 = 6(庚), (2000-4) % 12 = 4(辰)
    expect(bazi.yearPillar(2000)).toEqual([6, 4])
  })

  it('1984년 → 甲子 (stem=0, branch=0)', () => {
    // (1984-4) % 10 = 0(甲), (1984-4) % 12 = 0(子)
    expect(bazi.yearPillar(1984)).toEqual([0, 0])
  })

  it('1999년 → 己卯 (stem=5, branch=3)', () => {
    // (1999-4) % 10 = 5(己), (1999-4) % 12 = 3(卯)
    expect(bazi.yearPillar(1999)).toEqual([5, 3])
  })

  it('60갑자 주기: 1924년과 1984년은 같은 간지', () => {
    expect(bazi.yearPillar(1984)).toEqual(bazi.yearPillar(1924))
  })
})

// ── 일주(日柱) ──

describe('jdnFromDate + dayPillarFromJdn', () => {
  it('2000-01-15 → 壬申 (stem=8, branch=8)', () => {
    const jdn = bazi.jdnFromDate(2000, 1, 15)
    expect(bazi.dayPillarFromJdn(jdn)).toEqual([8, 8])
  })

  it('1984-07-22의 일주 계산', () => {
    const jdn = bazi.jdnFromDate(1984, 7, 22)
    const [stem, branch] = bazi.dayPillarFromJdn(jdn)
    // 유효한 범위인지 확인
    expect(stem).toBeGreaterThanOrEqual(0)
    expect(stem).toBeLessThanOrEqual(9)
    expect(branch).toBeGreaterThanOrEqual(0)
    expect(branch).toBeLessThanOrEqual(11)
  })

  it('날짜가 1 다를 때 간지도 1씩 이동', () => {
    const jdn1 = bazi.jdnFromDate(2000, 6, 1)
    const jdn2 = bazi.jdnFromDate(2000, 6, 2)
    const [s1, b1] = bazi.dayPillarFromJdn(jdn1)
    const [s2, b2] = bazi.dayPillarFromJdn(jdn2)
    expect(s2).toBe((s1 + 1) % 10)
    expect(b2).toBe((b1 + 1) % 12)
  })
})

// ── 시지(時支) ──

describe('hourBranchIndex', () => {
  it('23:00 → 자(0)', () => {
    expect(bazi.hourBranchIndex(23, 0)).toBe(0)
  })

  it('00:00 → 자(0)', () => {
    expect(bazi.hourBranchIndex(0, 0)).toBe(0)
  })

  it('01:00 → 축(1)', () => {
    expect(bazi.hourBranchIndex(1, 0)).toBe(1)
  })

  it('03:00 → 인(2)', () => {
    expect(bazi.hourBranchIndex(3, 0)).toBe(2)
  })

  it('12:00 → 오(6)', () => {
    expect(bazi.hourBranchIndex(12, 0)).toBe(6)
  })

  it('17:00 → 유(9)', () => {
    expect(bazi.hourBranchIndex(17, 0)).toBe(9)
  })

  it('22:59 → 해(11)', () => {
    expect(bazi.hourBranchIndex(22, 59)).toBe(11)
  })
})

// ── 월간(月干) ──

describe('monthStemFromYear', () => {
  it('庚년(6) 寅월(2) → (6×2+2) % 10 = 4(戊)', () => {
    expect(bazi.monthStemFromYear(6, 2)).toBe(4)
  })

  it('己년(5) 丑월(1) → (5×2+1) % 10 = 1(乙)', () => {
    expect(bazi.monthStemFromYear(5, 1)).toBe(1)
  })

  it('甲년(0) 寅월(2) → (0×2+2) % 10 = 2(丙)', () => {
    expect(bazi.monthStemFromYear(0, 2)).toBe(2)
  })

  it('결과는 항상 0-9 범위', () => {
    for (let ys = 0; ys < 10; ys++) {
      for (let mb = 0; mb < 12; mb++) {
        const result = bazi.monthStemFromYear(ys, mb)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThanOrEqual(9)
      }
    }
  })
})

// ── 시간(時干) ──

describe('hourStemFromDay', () => {
  it('壬일(8) 酉시(9) → (8×2+9) % 10 = 5(己)', () => {
    // 壬일 酉시 → 己酉
    expect(bazi.hourStemFromDay(8, 9)).toBe(5)
  })

  it('甲일(0) 子시(0) → (0×2+0) % 10 = 0(甲)', () => {
    expect(bazi.hourStemFromDay(0, 0)).toBe(0)
  })

  it('결과는 항상 0-9 범위', () => {
    for (let ds = 0; ds < 10; ds++) {
      for (let hb = 0; hb < 12; hb++) {
        const result = bazi.hourStemFromDay(ds, hb)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThanOrEqual(9)
      }
    }
  })
})

// ── 천간 오행(天干 五行) ──

describe('stemElement', () => {
  it('갑(0)·을(1) → 木(Wood)', () => {
    expect(bazi.stemElement(0)).toBe('Wood')
    expect(bazi.stemElement(1)).toBe('Wood')
  })

  it('병(2)·정(3) → 火(Fire)', () => {
    expect(bazi.stemElement(2)).toBe('Fire')
    expect(bazi.stemElement(3)).toBe('Fire')
  })

  it('무(4)·기(5) → 土(Earth)', () => {
    expect(bazi.stemElement(4)).toBe('Earth')
    expect(bazi.stemElement(5)).toBe('Earth')
  })

  it('경(6)·신(7) → 金(Metal)', () => {
    expect(bazi.stemElement(6)).toBe('Metal')
    expect(bazi.stemElement(7)).toBe('Metal')
  })

  it('임(8)·계(9) → 水(Water)', () => {
    expect(bazi.stemElement(8)).toBe('Water')
    expect(bazi.stemElement(9)).toBe('Water')
  })
})

// ── 지지 오행(地支 五行) ──

describe('branchElement', () => {
  it('자(0) → 水(Water)', () => {
    expect(bazi.branchElement(0)).toBe('Water')
  })

  it('축(1) → 土(Earth)', () => {
    expect(bazi.branchElement(1)).toBe('Earth')
  })

  it('인(2)·묘(3) → 木(Wood)', () => {
    expect(bazi.branchElement(2)).toBe('Wood')
    expect(bazi.branchElement(3)).toBe('Wood')
  })

  it('진(4)·미(7)·술(10) → 土(Earth)', () => {
    expect(bazi.branchElement(4)).toBe('Earth')
    expect(bazi.branchElement(7)).toBe('Earth')
    expect(bazi.branchElement(10)).toBe('Earth')
  })

  it('사(5)·오(6) → 火(Fire)', () => {
    expect(bazi.branchElement(5)).toBe('Fire')
    expect(bazi.branchElement(6)).toBe('Fire')
  })

  it('신(8)·유(9) → 金(Metal)', () => {
    expect(bazi.branchElement(8)).toBe('Metal')
    expect(bazi.branchElement(9)).toBe('Metal')
  })

  it('해(11) → 水(Water)', () => {
    expect(bazi.branchElement(11)).toBe('Water')
  })
})

// ── 상생(相生) ──

describe('elementGenerates', () => {
  it('木生火: Wood → Fire', () => {
    expect(bazi.elementGenerates('Wood')).toBe('Fire')
  })

  it('火生土: Fire → Earth', () => {
    expect(bazi.elementGenerates('Fire')).toBe('Earth')
  })

  it('土生金: Earth → Metal', () => {
    expect(bazi.elementGenerates('Earth')).toBe('Metal')
  })

  it('金生水: Metal → Water', () => {
    expect(bazi.elementGenerates('Metal')).toBe('Water')
  })

  it('水生木: Water → Wood', () => {
    expect(bazi.elementGenerates('Water')).toBe('Wood')
  })

  it('순환 확인: 5단계 순환하면 원래 오행으로 돌아옴', () => {
    let el = bazi.elementGenerates('Wood')
    el = bazi.elementGenerates(el)
    el = bazi.elementGenerates(el)
    el = bazi.elementGenerates(el)
    el = bazi.elementGenerates(el)
    expect(el).toBe('Wood')
  })
})

// ── 상극(相剋) ──

describe('elementControls', () => {
  it('木剋土: Wood → Earth', () => {
    expect(bazi.elementControls('Wood')).toBe('Earth')
  })

  it('火剋金: Fire → Metal', () => {
    expect(bazi.elementControls('Fire')).toBe('Metal')
  })

  it('土剋水: Earth → Water', () => {
    expect(bazi.elementControls('Earth')).toBe('Water')
  })

  it('金剋木: Metal → Wood', () => {
    expect(bazi.elementControls('Metal')).toBe('Wood')
  })

  it('水剋火: Water → Fire', () => {
    expect(bazi.elementControls('Water')).toBe('Fire')
  })

  it('순환 확인: 5단계 순환하면 원래 오행으로 돌아옴', () => {
    let el = bazi.elementControls('Wood')
    el = bazi.elementControls(el)
    el = bazi.elementControls(el)
    el = bazi.elementControls(el)
    el = bazi.elementControls(el)
    expect(el).toBe('Wood')
  })
})

// ── 천간 음양(天干 陰陽) ──

describe('stemPolarity', () => {
  it('양간(陽干): 짝수 인덱스 → true', () => {
    expect(bazi.stemPolarity(0)).toBe(true)  // 甲
    expect(bazi.stemPolarity(2)).toBe(true)  // 丙
    expect(bazi.stemPolarity(4)).toBe(true)  // 戊
    expect(bazi.stemPolarity(6)).toBe(true)  // 庚
    expect(bazi.stemPolarity(8)).toBe(true)  // 壬
  })

  it('음간(陰干): 홀수 인덱스 → false', () => {
    expect(bazi.stemPolarity(1)).toBe(false)  // 乙
    expect(bazi.stemPolarity(3)).toBe(false)  // 丁
    expect(bazi.stemPolarity(5)).toBe(false)  // 己
    expect(bazi.stemPolarity(7)).toBe(false)  // 辛
    expect(bazi.stemPolarity(9)).toBe(false)  // 癸
  })
})

// ── 지지 음양(地支 陰陽) ──

describe('branchPolarity', () => {
  it('자(0): 정기 癸(9, 음) → false', () => {
    // 자(子)의 정기는 癸(9), 홀수 → 음
    expect(bazi.branchPolarity(0)).toBe(false)
  })

  it('인(2): 정기 甲(0, 양) → true', () => {
    // 인(寅)의 정기는 甲(0), 짝수 → 양
    expect(bazi.branchPolarity(2)).toBe(true)
  })

  it('묘(3): 정기 乙(1, 음) → false', () => {
    // 묘(卯)의 정기는 乙(1), 홀수 → 음
    expect(bazi.branchPolarity(3)).toBe(false)
  })

  it('신(8): 정기 庚(6, 양) → true', () => {
    // 신(申)의 정기는 庚(6), 짝수 → 양
    expect(bazi.branchPolarity(8)).toBe(true)
  })
})

// ── 오행 관계(Relation) ──

describe('relation', () => {
  it('Wood vs Wood → Same(비겁)', () => {
    expect(bazi.relation('Wood', 'Wood')).toBe('Same')
  })

  it('Wood vs Fire → Output(식상, 木生火)', () => {
    expect(bazi.relation('Wood', 'Fire')).toBe('Output')
  })

  it('Wood vs Earth → Wealth(재성, 木剋土)', () => {
    expect(bazi.relation('Wood', 'Earth')).toBe('Wealth')
  })

  it('Wood vs Metal → Officer(관성, 金剋木)', () => {
    expect(bazi.relation('Wood', 'Metal')).toBe('Officer')
  })

  it('Wood vs Water → Resource(인성, 水生木)', () => {
    expect(bazi.relation('Wood', 'Water')).toBe('Resource')
  })

  it('Fire vs Water → Officer(火를 극하는 水)', () => {
    expect(bazi.relation('Fire', 'Water')).toBe('Officer')
  })

  it('Metal vs Wood → Wealth(金剋木)', () => {
    expect(bazi.relation('Metal', 'Wood')).toBe('Wealth')
  })
})

// ── 십성(十星) ──

describe('tenGod', () => {
  // 甲(0, Wood, 양) 일간 기준
  describe('甲(0) 일간 기준 십성', () => {
    it('(0,0) 甲甲 → BiGyeon(비견): 같은 오행, 같은 음양', () => {
      expect(bazi.tenGod(0, 0)).toBe('BiGyeon')
    })

    it('(0,1) 甲乙 → GeopJae(겁재): 같은 오행, 다른 음양', () => {
      expect(bazi.tenGod(0, 1)).toBe('GeopJae')
    })

    it('(0,2) 甲丙 → SikShin(식신): 生하는 오행, 같은 음양 (木生火, 丙=양)', () => {
      expect(bazi.tenGod(0, 2)).toBe('SikShin')
    })

    it('(0,3) 甲丁 → SangGwan(상관): 生하는 오행, 다른 음양', () => {
      expect(bazi.tenGod(0, 3)).toBe('SangGwan')
    })

    it('(0,4) 甲戊 → PyeonJae(편재): 剋하는 오행, 같은 음양 (木剋土, 戊=양)', () => {
      expect(bazi.tenGod(0, 4)).toBe('PyeonJae')
    })

    it('(0,5) 甲己 → JeongJae(정재): 剋하는 오행, 다른 음양', () => {
      expect(bazi.tenGod(0, 5)).toBe('JeongJae')
    })

    it('(0,6) 甲庚 → ChilSal(편관/칠살): 剋받는 오행, 같은 음양 (金剋木, 庚=양)', () => {
      expect(bazi.tenGod(0, 6)).toBe('ChilSal')
    })

    it('(0,7) 甲辛 → JeongGwan(정관): 剋받는 오행, 다른 음양', () => {
      expect(bazi.tenGod(0, 7)).toBe('JeongGwan')
    })

    it('(0,8) 甲壬 → PyeonIn(편인): 生받는 오행, 같은 음양 (水生木, 壬=양)', () => {
      expect(bazi.tenGod(0, 8)).toBe('PyeonIn')
    })

    it('(0,9) 甲癸 → JeongIn(정인): 生받는 오행, 다른 음양', () => {
      expect(bazi.tenGod(0, 9)).toBe('JeongIn')
    })
  })

  describe('壬(8) 일간 기준 십성', () => {
    it('(8,8) 壬壬 → BiGyeon(비견)', () => {
      expect(bazi.tenGod(8, 8)).toBe('BiGyeon')
    })

    it('(8,9) 壬癸 → GeopJae(겁재)', () => {
      expect(bazi.tenGod(8, 9)).toBe('GeopJae')
    })

    it('(8,0) 壬甲 → SikShin(식신, 水生木, 甲=양)', () => {
      expect(bazi.tenGod(8, 0)).toBe('SikShin')
    })

    it('(8,3) 壬丁 → JeongJae(정재, 水剋火, 丁=음)', () => {
      expect(bazi.tenGod(8, 3)).toBe('JeongJae')
    })
  })
})

// ── 지지 십성(地支 十星) — 정기(正氣) 기준 ──

describe('tenGodBranch', () => {
  it('甲(0) 일간, 자(0)지 → 자의 정기 癸(9) → JeongIn(정인)', () => {
    // 자(子) 정기: 癸(9), 甲 기준 癸 → 水生木 → Resource, 음양 다름 → JeongIn
    expect(bazi.tenGodBranch(0, 0)).toBe('JeongIn')
  })

  it('甲(0) 일간, 오(6)지 → 오의 정기 丁(3) → SangGwan(상관)', () => {
    // 오(午) 정기: 丁(3), 甲 기준 丁 → 火 → Output, 음양 다름 → SangGwan
    expect(bazi.tenGodBranch(0, 6)).toBe('SangGwan')
  })

  it('壬(8) 일간, 申(8)지 → 申의 정기 庚(6) → PyeonIn(편인)', () => {
    // 신(申) 정기: 庚(6), 壬 기준 庚 → 金生水 → Resource, 음양 같음 → PyeonIn
    expect(bazi.tenGodBranch(8, 8)).toBe('PyeonIn')
  })
})

// ── 지장간(地藏干) ──

describe('hiddenStems', () => {
  it('자(0) → [9, 8]: 癸 壬', () => {
    expect(bazi.hiddenStems(0)).toEqual([9, 8])
  })

  it('인(2) → [0, 2, 4]: 甲 丙 戊', () => {
    expect(bazi.hiddenStems(2)).toEqual([0, 2, 4])
  })

  it('묘(3) → [1, 0]: 乙 甲', () => {
    expect(bazi.hiddenStems(3)).toEqual([1, 0])
  })

  it('오(6) → [3, 5, 2]: 丁 己 丙', () => {
    expect(bazi.hiddenStems(6)).toEqual([3, 5, 2])
  })

  it('유(9) → [7, 6]: 辛 庚', () => {
    expect(bazi.hiddenStems(9)).toEqual([7, 6])
  })

  it('해(11) → [8, 0, 4]: 壬 甲 戊', () => {
    expect(bazi.hiddenStems(11)).toEqual([8, 0, 4])
  })

  it('12개 지지 모두 지장간이 1개 이상', () => {
    for (let b = 0; b < 12; b++) {
      expect(bazi.hiddenStems(b).length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('mainHiddenStem', () => {
  it('자(0) → 9(癸): 정기는 첫 번째 지장간', () => {
    expect(bazi.mainHiddenStem(0)).toBe(9)
  })

  it('인(2) → 0(甲)', () => {
    expect(bazi.mainHiddenStem(2)).toBe(0)
  })

  it('진(4) → 4(戊)', () => {
    expect(bazi.mainHiddenStem(4)).toBe(4)
  })

  it('오(6) → 3(丁)', () => {
    expect(bazi.mainHiddenStem(6)).toBe(3)
  })

  it('신(8) → 6(庚)', () => {
    expect(bazi.mainHiddenStem(8)).toBe(6)
  })

  it('해(11) → 8(壬)', () => {
    expect(bazi.mainHiddenStem(11)).toBe(8)
  })
})

// ── 천간 합(天干 合) ──

describe('stemHap', () => {
  it('甲己합(0,5) → 土(Earth)', () => {
    expect(bazi.stemHap(0, 5)).toBe('Earth')
  })

  it('乙庚합(1,6) → 金(Metal)', () => {
    expect(bazi.stemHap(1, 6)).toBe('Metal')
  })

  it('丙辛합(2,7) → 水(Water)', () => {
    expect(bazi.stemHap(2, 7)).toBe('Water')
  })

  it('丁壬합(3,8) → 木(Wood)', () => {
    expect(bazi.stemHap(3, 8)).toBe('Wood')
  })

  it('戊癸합(4,9) → 火(Fire)', () => {
    expect(bazi.stemHap(4, 9)).toBe('Fire')
  })

  it('순서 무관: stemHap(5,0) = stemHap(0,5)', () => {
    expect(bazi.stemHap(5, 0)).toBe('Earth')
    expect(bazi.stemHap(6, 1)).toBe('Metal')
  })

  it('합이 아닌 쌍 → null', () => {
    expect(bazi.stemHap(0, 1)).toBeNull()
    expect(bazi.stemHap(0, 2)).toBeNull()
    expect(bazi.stemHap(0, 3)).toBeNull()
    expect(bazi.stemHap(0, 4)).toBeNull()
    expect(bazi.stemHap(0, 6)).toBeNull()
    expect(bazi.stemHap(0, 9)).toBeNull()
  })
})

// ── 천간 충(天干 沖) ──

describe('stemChung', () => {
  it('甲庚충(0,6) → true', () => {
    expect(bazi.stemChung(0, 6)).toBe(true)
  })

  it('乙辛충(1,7) → true', () => {
    expect(bazi.stemChung(1, 7)).toBe(true)
  })

  it('丙壬충(2,8) → true', () => {
    expect(bazi.stemChung(2, 8)).toBe(true)
  })

  it('丁癸충(3,9) → true', () => {
    expect(bazi.stemChung(3, 9)).toBe(true)
  })

  it('순서 무관: stemChung(6,0) = true', () => {
    expect(bazi.stemChung(6, 0)).toBe(true)
  })

  it('戊己(4,5)는 충 아님 — 인덱스 차이=1', () => {
    expect(bazi.stemChung(4, 5)).toBe(false)
  })

  it('戊(4)는 충 없음 — a < 8 조건 위반 아니지만 차이 6인 대응 없음', () => {
    // (4,10)은 존재하지 않으므로 4 기준 충은 없음
    expect(bazi.stemChung(4, 9)).toBe(false)  // 차이=5
    expect(bazi.stemChung(0, 1)).toBe(false)  // 차이=1
  })

  it('인접한 천간은 충 아님', () => {
    expect(bazi.stemChung(0, 1)).toBe(false)
    expect(bazi.stemChung(2, 3)).toBe(false)
  })
})

// ── 천간 상호작용 탐지 ──

describe('findStemInteractions', () => {
  it('합이 있는 기둥: 연간甲(0)과 일간己(5) → 甲己합(Earth)', () => {
    // 연주: 甲子(0,0), 월주: 乙丑(1,1), 일주: 己卯(5,3), 시주: 壬午(8,6)
    const pillars = [p(0, 0), p(1, 1), p(5, 3), p(8, 6)]
    const interactions = bazi.findStemInteractions(pillars)
    const hap = interactions.find(
      (i) => i.relation === 'Hap' && i.stems.includes(0) && i.stems.includes(5)
    )
    expect(hap).toBeDefined()
    expect(hap!.resultElement).toBe('Earth')
    expect(hap!.positions).toContain('Year')
    expect(hap!.positions).toContain('Day')
  })

  it('충이 있는 기둥: 연간甲(0)과 시간庚(6) → 甲庚충', () => {
    const pillars = [p(0, 0), p(1, 1), p(8, 8), p(6, 9)]
    const interactions = bazi.findStemInteractions(pillars)
    const chung = interactions.find(
      (i) => i.relation === 'Chung' && i.stems.includes(0) && i.stems.includes(6)
    )
    expect(chung).toBeDefined()
    expect(chung!.resultElement).toBeNull()
    expect(chung!.positions).toContain('Year')
    expect(chung!.positions).toContain('Hour')
  })

  it('합충 없는 기둥 → 빈 배열', () => {
    // 甲乙丙丁 — 합충 없음 (diff 최대 3)
    const pillars = [p(0, 0), p(1, 1), p(2, 2), p(3, 3)]
    const interactions = bazi.findStemInteractions(pillars)
    expect(interactions).toHaveLength(0)
  })
})

// ── 지지 상호작용 탐지 ──

describe('findBranchInteractions', () => {
  it('卯酉충: 卯(3)과 酉(9), 차이=6 → Chung', () => {
    // 연지卯(3), 월지丑(1), 일지申(8), 시지酉(9)
    const pillars = [p(5, 3), p(1, 1), p(8, 8), p(5, 9)]
    const interactions = bazi.findBranchInteractions(pillars)
    const chung = interactions.find(
      (i) => i.relation === 'Chung' && i.branches.includes(3) && i.branches.includes(9)
    )
    expect(chung).toBeDefined()
    expect(chung!.positions).toContain('Year')
    expect(chung!.positions).toContain('Hour')
  })

  it('子丑육합: 子(0)과 丑(1) → YukHap(Earth)', () => {
    const pillars = [p(0, 0), p(1, 1), p(8, 8), p(5, 9)]
    const interactions = bazi.findBranchInteractions(pillars)
    const yukHap = interactions.find(
      (i) => i.relation === 'YukHap' && i.branches.includes(0) && i.branches.includes(1)
    )
    expect(yukHap).toBeDefined()
    expect(yukHap!.resultElement).toBe('Earth')
  })

  it('삼합: 寅(2)午(6)戌(10) → SamHap(Fire)', () => {
    const pillars = [p(0, 2), p(1, 6), p(2, 10), p(3, 0)]
    const interactions = bazi.findBranchInteractions(pillars)
    const samHap = interactions.find((i) => i.relation === 'SamHap')
    expect(samHap).toBeDefined()
    expect(samHap!.resultElement).toBe('Fire')
  })

  it('방합: 寅(2)卯(3)辰(4) → BangHap(Wood)', () => {
    const pillars = [p(0, 2), p(1, 3), p(2, 4), p(3, 5)]
    const interactions = bazi.findBranchInteractions(pillars)
    const bangHap = interactions.find((i) => i.relation === 'BangHap')
    expect(bangHap).toBeDefined()
    expect(bangHap!.resultElement).toBe('Wood')
  })

  it('관계 없는 기둥도 positions.length > 0', () => {
    const pillars = [p(5, 3), p(1, 1), p(8, 8), p(5, 9)]
    const interactions = bazi.findBranchInteractions(pillars)
    for (const bi of interactions) {
      expect(bi.positions.length).toBeGreaterThan(0)
      expect(bi.branches.length).toBeGreaterThan(0)
    }
  })
})

// ── 신살(神殺) 탐지 ──

describe('findShinsal', () => {
  // service.test.ts 기준: year=[5,3], month=[1,1], day=[8,8], hour=[5,9]
  const knownPillars = [p(5, 3), p(1, 1), p(8, 8), p(5, 9)]

  it('天乙貴人: 壬(8) 일간 → targets [3,5]. 연지卯(3) 매치 → foundAt Year', () => {
    const entries = bazi.findShinsal(knownPillars)
    const entry = entries.find((e) => e.kind === 'CheonEulGwiIn')
    expect(entry).toBeDefined()
    expect(entry!.foundAt).toContain('Year')
    expect(entry!.basis).toBe('Day')
  })

  it('괴강살(GoeGangSal): 壬申(8,8)은 해당하지 않음', () => {
    const entries = bazi.findShinsal(knownPillars)
    const goegang = entries.find((e) => e.kind === 'GoeGangSal')
    expect(goegang).toBeUndefined()
  })

  it('괴강살(GoeGangSal): 庚辰(6,4) 일주 → 해당', () => {
    // 일주를 庚辰으로 교체
    const pillarsGoegang = [p(5, 3), p(1, 1), p(6, 4), p(5, 9)]
    const entries = bazi.findShinsal(pillarsGoegang)
    const goegang = entries.find((e) => e.kind === 'GoeGangSal')
    expect(goegang).toBeDefined()
    expect(goegang!.foundAt).toContain('Day')
  })

  it('괴강살(GoeGangSal): 壬辰(8,4) 일주 → 해당', () => {
    const pillarsGoegang = [p(5, 3), p(1, 1), p(8, 4), p(5, 9)]
    const entries = bazi.findShinsal(pillarsGoegang)
    const goegang = entries.find((e) => e.kind === 'GoeGangSal')
    expect(goegang).toBeDefined()
  })

  it('신살 entries의 foundAt는 항상 유효한 PillarPosition', () => {
    const entries = bazi.findShinsal(knownPillars)
    for (const entry of entries) {
      expect(entry.foundAt.length).toBeGreaterThan(0)
      for (const pos of entry.foundAt) {
        expect(['Year', 'Month', 'Day', 'Hour']).toContain(pos)
      }
    }
  })

  it('도화살(DoHwaSal): 申子辰 삼합그룹(수국) → 도화=酉(9). 연지子(0) 기준 酉 탐색', () => {
    // 연지=子(0), 삼합그룹=申子辰(수국), 도화=酉(9)
    // 시지에 酉(9) 배치
    const pillars = [p(0, 0), p(1, 1), p(8, 8), p(5, 9)]
    const entries = bazi.findShinsal(pillars)
    const dohwa = entries.find((e) => e.kind === 'DoHwaSal')
    expect(dohwa).toBeDefined()
  })

  it('역마살(YeokMaSal): 寅午戌 삼합그룹(화국) → 역마=申(8)', () => {
    // 연지=寅(2), 역마=申(8). 시지에 申(8) 배치
    const pillars = [p(0, 2), p(1, 6), p(2, 10), p(3, 8)]
    const entries = bazi.findShinsal(pillars)
    const yeokma = entries.find((e) => e.kind === 'YeokMaSal')
    expect(yeokma).toBeDefined()
  })
})

// ── 신강/신약(身強/身弱) 판정 ──

describe('assessStrength', () => {
  it('신강 케이스: 같은 오행이 많으면 Strong', () => {
    // 甲(0, Wood) 일간, 인묘진 월지(木)
    // 연주: 甲寅(0,2), 월주: 甲卯(0,3), 일주: 甲辰(0,4), 시주: 甲辰(0,4)
    // 월지 卯(3)에서 甲의 12운성: 帝旺 → Strong
    const pillars = [p(0, 2), p(0, 3), p(0, 4), p(0, 4)]
    const result = bazi.assessStrength(0, pillars)
    expect(result.verdict).toBe('Strong')
    expect(result.total).toBeGreaterThanOrEqual(STRENGTH_WEIGHTS.STRONG_THRESHOLD)
  })

  it('신약 케이스: 억제하는 오행이 많으면 Weak', () => {
    // 甲(0, Wood) 일간, 庚金이 많은 구성
    // 연주: 庚申(6,8), 월주: 庚申(6,8), 일주: 甲申(0,8), 시주: 庚申(6,8)
    // 月지 申(8): 甲의 12운성 → 절(絶) → Weak
    const pillars = [p(6, 8), p(6, 8), p(0, 8), p(6, 8)]
    const result = bazi.assessStrength(0, pillars)
    expect(result.verdict).toBe('Weak')
    expect(result.total).toBeLessThanOrEqual(STRENGTH_WEIGHTS.WEAK_THRESHOLD)
  })

  it('결과 객체에 필요한 모든 필드 포함', () => {
    const pillars = [p(5, 3), p(1, 1), p(8, 8), p(5, 9)]
    const result = bazi.assessStrength(8, pillars)
    expect(result).toHaveProperty('stageIndex')
    expect(result).toHaveProperty('stageClass')
    expect(result).toHaveProperty('rootCount')
    expect(result).toHaveProperty('supportStems')
    expect(result).toHaveProperty('supportHidden')
    expect(result).toHaveProperty('drainStems')
    expect(result).toHaveProperty('drainHidden')
    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('verdict')
    expect(['Strong', 'Weak', 'Neutral']).toContain(result.verdict)
    expect(['Strong', 'Weak', 'Neutral']).toContain(result.stageClass)
  })

  it('판정 임계값 확인: total >= 3 → Strong, <= -3 → Weak, 그외 → Neutral', () => {
    expect(STRENGTH_WEIGHTS.STRONG_THRESHOLD).toBe(3)
    expect(STRENGTH_WEIGHTS.WEAK_THRESHOLD).toBe(-3)
  })
})

// ── 용신(用神) 결정 ──

describe('determineYongshin', () => {
  // 甲(0, Wood) 기준
  // output=Fire, wealth=Earth, resource=Water, officer=Metal, same=Wood

  it('신강(Strong) → suppress 방법, 용신=식상(Fire)', () => {
    const result = bazi.determineYongshin(0, 'Strong')
    expect(result.method).toBe('suppress')
    expect(result.yongshin).toBe('Fire')   // 식상: 木生火
    expect(result.heeshin).toBe('Earth')   // 재성: 木剋土
    expect(result.gishin).toBe('Wood')     // 비겁: 같은 오행(최악)
    expect(result.gushin).toBe('Water')    // 인성: 水生木 → 더 강하게 함
  })

  it('신약(Weak) → support 방법, 용신=인성(Water)', () => {
    const result = bazi.determineYongshin(0, 'Weak')
    expect(result.method).toBe('support')
    expect(result.yongshin).toBe('Water')  // 인성: 水生木
    expect(result.heeshin).toBe('Wood')    // 비겁: 같은 오행
    expect(result.gishin).toBe('Metal')    // 관성: 金剋木(최악)
    expect(result.gushin).toBe('Earth')    // 재성: 木剋土 → 에너지 소모
  })

  it('중화(Neutral) → support 방법 (신약과 동일)', () => {
    const result = bazi.determineYongshin(0, 'Neutral')
    expect(result.method).toBe('support')
    expect(result.yongshin).toBe('Water')
    expect(result.heeshin).toBe('Wood')
  })

  it('壬(8, Water) 신강 → 용신=木(Wood, 水生木)', () => {
    const result = bazi.determineYongshin(8, 'Strong')
    expect(result.method).toBe('suppress')
    expect(result.yongshin).toBe('Wood')   // 식상: 水生木
  })

  it('壬(8, Water) 신약 → 용신=金(Metal, 金生水)', () => {
    const result = bazi.determineYongshin(8, 'Weak')
    expect(result.method).toBe('support')
    expect(result.yongshin).toBe('Metal')  // 인성: 金生水
  })
})

// ── 공망(空亡) ──

describe('gongmang', () => {
  it('壬申(8,8) → [10, 11]: 술(戌)·해(亥) 공망', () => {
    expect(bazi.gongmang(8, 8)).toEqual([10, 11])
  })

  it('甲子(0,0) → [10, 11]: 술(戌)·해(亥) 공망', () => {
    expect(bazi.gongmang(0, 0)).toEqual([10, 11])
  })

  it('甲戌(0,10) → [8, 9]: 신(申)·유(酉) 공망', () => {
    expect(bazi.gongmang(0, 10)).toEqual([8, 9])
  })

  it('공망은 항상 연속된 두 지지', () => {
    for (let ds = 0; ds < 10; ds++) {
      for (let db = 0; db < 12; db++) {
        const [a, b] = bazi.gongmang(ds, db)
        expect(b).toBe((a + 1) % 12)
        expect(a).toBeGreaterThanOrEqual(0)
        expect(a).toBeLessThanOrEqual(11)
      }
    }
  })
})

// ── 오행 분포(五行 分布) ──

describe('elementsCount', () => {
  it('모든 天干이 같은 오행이면 해당 오행 4+지지값', () => {
    // 甲甲甲甲 (Wood×4), 지지: 子水, 午火, 申金, 寅木
    // Wood: 4(천간) + 1(인寅지지) = 5
    // Water: 1(자), Fire: 1(오), Metal: 1(신)
    const pillars = [p(0, 0), p(0, 6), p(0, 8), p(0, 2)]
    const [wood, fire, earth, metal, water] = bazi.elementsCount(pillars)
    expect(wood).toBe(5)  // 甲甲甲甲 + 寅
    expect(fire).toBe(1)  // 午
    expect(earth).toBe(0)
    expect(metal).toBe(1) // 申
    expect(water).toBe(1) // 子
  })

  it('결과 배열 합계 = pillars.length × 2 (천간 + 지지)', () => {
    const pillars = [p(5, 3), p(1, 1), p(8, 8), p(5, 9)]
    const counts = bazi.elementsCount(pillars)
    const total = counts.reduce((a, b) => a + b, 0)
    expect(total).toBe(8) // 4기둥 × 2(천간+지지)
  })

  it('반환 배열 순서: [목, 화, 토, 금, 수]', () => {
    // 甲寅(0,2): 木木, 丙午(2,6): 火火
    const pillars = [p(0, 2), p(2, 6), p(0, 2), p(2, 6)]
    const [wood, fire, earth, metal, water] = bazi.elementsCount(pillars)
    expect(wood).toBe(4)
    expect(fire).toBe(4)
    expect(earth).toBe(0)
    expect(metal).toBe(0)
    expect(water).toBe(0)
  })
})

// ── 12운성(十二運星) ──

describe('twelveStageIndex', () => {
  it('甲(0, 양간) 장생 시작지지 = 亥(11) → index 0(장생)', () => {
    // CHANGSHENG_START[0] = 11, 양간 순행
    // (11 + 12 - 11) % 12 = 0
    expect(bazi.twelveStageIndex(0, 11)).toBe(0)
  })

  it('甲(0) 子(0) → index 1(목욕)', () => {
    // (0 + 12 - 11) % 12 = 1
    expect(bazi.twelveStageIndex(0, 0)).toBe(1)
  })

  it('甲(0) 卯(3) → index 4(제왕)', () => {
    // (3 + 12 - 11) % 12 = 4
    expect(bazi.twelveStageIndex(0, 3)).toBe(4)
  })

  it('甲(0) 酉(9) → index 10(태)', () => {
    // (9 + 12 - 11) % 12 = 10
    expect(bazi.twelveStageIndex(0, 9)).toBe(10)
  })

  it('乙(1, 음간) 역행: 시작지지 午(6)', () => {
    // CHANGSHENG_START[1] = 6, 음간 역행
    // (6 + 12 - 6) % 12 = 0 (장생)
    expect(bazi.twelveStageIndex(1, 6)).toBe(0)
  })

  it('결과는 항상 0-11 범위', () => {
    for (let ds = 0; ds < 10; ds++) {
      for (let b = 0; b < 12; b++) {
        const idx = bazi.twelveStageIndex(ds, b)
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThanOrEqual(11)
      }
    }
  })
})

describe('stageStrengthClass', () => {
  it('0~4 (장생~제왕) → Strong', () => {
    expect(bazi.stageStrengthClass(0)).toBe('Strong')
    expect(bazi.stageStrengthClass(1)).toBe('Strong')
    expect(bazi.stageStrengthClass(2)).toBe('Strong')
    expect(bazi.stageStrengthClass(3)).toBe('Strong')
    expect(bazi.stageStrengthClass(4)).toBe('Strong')
  })

  it('5~9 (쇠~절) → Weak', () => {
    expect(bazi.stageStrengthClass(5)).toBe('Weak')
    expect(bazi.stageStrengthClass(6)).toBe('Weak')
    expect(bazi.stageStrengthClass(7)).toBe('Weak')
    expect(bazi.stageStrengthClass(8)).toBe('Weak')
    expect(bazi.stageStrengthClass(9)).toBe('Weak')
  })

  it('10~11 (태~양) → Neutral', () => {
    expect(bazi.stageStrengthClass(10)).toBe('Neutral')
    expect(bazi.stageStrengthClass(11)).toBe('Neutral')
  })
})

// ── STRENGTH_WEIGHTS 상수 ──

describe('STRENGTH_WEIGHTS', () => {
  it('STAGE_BONUS = 2', () => {
    expect(STRENGTH_WEIGHTS.STAGE_BONUS).toBe(2)
  })

  it('STEM_WEIGHT = 2', () => {
    expect(STRENGTH_WEIGHTS.STEM_WEIGHT).toBe(2)
  })

  it('HIDDEN_WEIGHT = 1', () => {
    expect(STRENGTH_WEIGHTS.HIDDEN_WEIGHT).toBe(1)
  })

  it('STRONG_THRESHOLD = 3', () => {
    expect(STRENGTH_WEIGHTS.STRONG_THRESHOLD).toBe(3)
  })

  it('WEAK_THRESHOLD = -3', () => {
    expect(STRENGTH_WEIGHTS.WEAK_THRESHOLD).toBe(-3)
  })

  it('상수 객체는 as const — 불변 값 확인', () => {
    expect(typeof STRENGTH_WEIGHTS.STAGE_BONUS).toBe('number')
    expect(typeof STRENGTH_WEIGHTS.STEM_WEIGHT).toBe('number')
    expect(typeof STRENGTH_WEIGHTS.HIDDEN_WEIGHT).toBe('number')
    expect(typeof STRENGTH_WEIGHTS.STRONG_THRESHOLD).toBe('number')
    expect(typeof STRENGTH_WEIGHTS.WEAK_THRESHOLD).toBe('number')
  })
})
