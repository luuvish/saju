import { describe, it, expect } from 'vitest';
import { calculate, type SajuRequest } from '../src/service.js';
import * as bazi from '../src/bazi.js';
import type { Gender } from '../src/types.js';

function makeRequest(date: string, time: string, gender: Gender): SajuRequest {
  return {
    date,
    time,
    calendar: 'Solar',
    leapMonth: false,
    gender,
    tz: 'Asia/Seoul',
    useLmt: false,
    longitude: null,
    location: null,
    daewonCount: 10,
    monthYear: null,
    yearStart: 2024,
    yearCount: 3,
  };
}

describe('service tests (ported from Rust)', () => {
  it('test_known_pillars_2000_01_15', () => {
    const req = makeRequest('2000-01-15', '17:15', 'Male');
    const result = calculate(req);

    // Year: 己卯 (stem=5, branch=3) — before lichun, so 1999's pillar
    expect(result.yearPillar.stem).toBe(5);
    expect(result.yearPillar.branch).toBe(3);
    expect(bazi.stemElement(result.yearPillar.stem)).toBe('Earth');

    // Month: 乙丑 (stem=1, branch=1)
    expect(result.monthPillar.stem).toBe(1);
    expect(result.monthPillar.branch).toBe(1);

    // Day: 壬申 (stem=8, branch=8)
    expect(result.dayPillar.stem).toBe(8);
    expect(result.dayPillar.branch).toBe(8);
    expect(bazi.stemElement(result.dayPillar.stem)).toBe('Water');

    // Hour: 己酉 (stem=5, branch=9)
    expect(result.hourPillar.stem).toBe(5);
    expect(result.hourPillar.branch).toBe(9);
  });

  it('test_gender_and_direction', () => {
    const reqMale = makeRequest('2000-01-15', '17:15', 'Male');
    const resultMale = calculate(reqMale);
    expect(resultMale.gender).toBe('Male');

    const reqFemale = makeRequest('2000-01-15', '17:15', 'Female');
    const resultFemale = calculate(reqFemale);
    expect(resultFemale.gender).toBe('Female');

    // 己 is yin stem → male=backward, female=forward
    expect(resultMale.daewonDirection).toBe('Backward');
    expect(resultFemale.daewonDirection).toBe('Forward');
  });

  it('test_lunar_calendar_input', () => {
    const req: SajuRequest = {
      date: '2000-01-01',
      time: '17:15',
      calendar: 'Lunar',
      leapMonth: false,
      gender: 'Male',
      tz: 'Asia/Seoul',
      useLmt: false,
      longitude: null,
      location: null,
      daewonCount: 10,
      monthYear: null,
      yearStart: 2024,
      yearCount: 3,
    };
    const result = calculate(req);
    expect(result.convertedSolar).not.toBeNull();
    expect(result.convertedLunar).toBeNull();
  });

  it('test_solar_calendar_shows_lunar_conversion', () => {
    const req = makeRequest('2000-01-15', '17:15', 'Male');
    const result = calculate(req);
    expect(result.convertedSolar).toBeNull();
    expect(result.convertedLunar).not.toBeNull();
  });

  it('test_invalid_date_format', () => {
    const req: SajuRequest = {
      date: '2000-01-01',
      time: 'bad_time',
      calendar: 'Solar',
      leapMonth: false,
      gender: 'Male',
      tz: 'Asia/Seoul',
      useLmt: false,
      longitude: null,
      location: null,
      daewonCount: 10,
      monthYear: null,
      yearStart: 2024,
      yearCount: 3,
    };
    expect(() => calculate(req)).toThrow('time format');
  });

  it('test_leap_month_with_solar_errors', () => {
    const req: SajuRequest = {
      date: '2000-01-01',
      time: '12:00',
      calendar: 'Solar',
      leapMonth: true,
      gender: 'Male',
      tz: 'Asia/Seoul',
      useLmt: false,
      longitude: null,
      location: null,
      daewonCount: 10,
      monthYear: null,
      yearStart: 2024,
      yearCount: 3,
    };
    expect(() => calculate(req)).toThrow('leap-month');
  });

  it('test_strength_result', () => {
    const req = makeRequest('2000-01-15', '17:15', 'Male');
    const result = calculate(req);
    expect(['Strong', 'Weak', 'Neutral']).toContain(result.strength.verdict);
  });

  it('test_daewon_items_count', () => {
    const req = makeRequest('2000-01-15', '17:15', 'Male');
    const result = calculate(req);
    expect(result.daewonItems.length).toBe(10);
  });

  it('test_yearly_luck_count', () => {
    const req = makeRequest('2000-01-15', '17:15', 'Male');
    const result = calculate(req);
    expect(result.yearlyLuck.length).toBe(3);
  });

  it('test_monthly_luck', () => {
    const req = makeRequest('2000-01-15', '17:15', 'Male');
    const result = calculate(req);
    expect(result.monthlyLuck.months.length).toBeGreaterThan(0);
  });

  it('test_lmt_correction_with_location', () => {
    const req: SajuRequest = {
      date: '2000-01-15',
      time: '17:15',
      calendar: 'Solar',
      leapMonth: false,
      gender: 'Male',
      tz: 'Asia/Seoul',
      useLmt: true,
      longitude: null,
      location: 'seoul',
      daewonCount: 10,
      monthYear: null,
      yearStart: 2024,
      yearCount: 3,
    };
    const result = calculate(req);
    expect(result.lmtInfo).not.toBeNull();
    expect(result.lmtInfo!.correctionSeconds).not.toBe(0);
  });

  it('test_stem_hap_detection', () => {
    expect(bazi.stemHap(0, 5)).toBe('Earth');
    expect(bazi.stemHap(1, 6)).toBe('Metal');
    expect(bazi.stemHap(2, 7)).toBe('Water');
    expect(bazi.stemHap(3, 8)).toBe('Wood');
    expect(bazi.stemHap(4, 9)).toBe('Fire');
    expect(bazi.stemHap(0, 1)).toBeNull();

    const req = makeRequest('2000-01-15', '17:15', 'Male');
    const result = calculate(req);
    expect(result.stemInteractions.length).toBeLessThanOrEqual(12);

    const req2 = makeRequest('1984-07-22', '06:00', 'Male');
    const result2 = calculate(req2);
    expect(result2.stemInteractions.length).toBeLessThanOrEqual(12);
  });

  it('test_branch_chung_detection', () => {
    expect(bazi.stemChung(0, 6)).toBe(true);
    expect(bazi.stemChung(0, 1)).toBe(false);

    const req = makeRequest('2000-01-15', '17:15', 'Male');
    const result = calculate(req);
    // Branches: 卯(3), 丑(1), 申(8), 酉(9) → 卯(3)-酉(9): diff=6 → 충!
    const chungCount = result.branchInteractions.filter((b) => b.relation === 'Chung').length;
    expect(chungCount).toBe(1);

    for (const bi of result.branchInteractions) {
      expect(bi.positions.length).toBeGreaterThan(0);
      expect(bi.branches.length).toBeGreaterThan(0);
    }
  });

  it('test_gongmang_calculation', () => {
    // 壬申 (stem=8, branch=8) → gongmang = 술(10), 해(11)
    expect(bazi.gongmang(8, 8)).toEqual([10, 11]);
    // 甲子 (stem=0, branch=0) → 술,해
    expect(bazi.gongmang(0, 0)).toEqual([10, 11]);
    // 甲戌 (stem=0, branch=10) → 신(8),유(9)
    expect(bazi.gongmang(0, 10)).toEqual([8, 9]);
  });

  it('test_shinsal_entries', () => {
    const req = makeRequest('2000-01-15', '17:15', 'Male');
    const result = calculate(req);

    for (const entry of result.shinsalEntries) {
      expect(entry.foundAt.length).toBeGreaterThan(0);
      for (const pos of entry.foundAt) {
        expect(['Year', 'Month', 'Day', 'Hour']).toContain(pos);
      }
    }

    // 天乙貴人: 일간 壬(8) → targets [3,5]. 연지=卯(3) matches!
    const cheonEul = result.shinsalEntries.find((e) => e.kind === 'CheonEulGwiIn');
    expect(cheonEul).toBeDefined();
    expect(cheonEul!.foundAt).toContain('Year');

    // 괴강살: 壬申 is not goegang
    const goegang = result.shinsalEntries.find((e) => e.kind === 'GoeGangSal');
    expect(goegang).toBeUndefined();
  });

  it('test_different_timezone', () => {
    const req: SajuRequest = {
      date: '2000-06-15',
      time: '10:30',
      calendar: 'Solar',
      leapMonth: false,
      gender: 'Female',
      tz: 'America/New_York',
      useLmt: false,
      longitude: null,
      location: null,
      daewonCount: 10,
      monthYear: null,
      yearStart: 2024,
      yearCount: 3,
    };
    const result = calculate(req);
    expect(result.tzName).toBe('America/New_York');
    // Year 2000 庚辰 (stem=6, branch=4)
    expect(result.yearPillar.stem).toBe(6);
    expect(result.yearPillar.branch).toBe(4);
  });
});
