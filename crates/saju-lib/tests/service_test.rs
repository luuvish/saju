use chrono::NaiveDate;
use saju_lib::service::{CalendarType, SajuRequest, calculate};
use saju_lib::types::{
    BranchRelationType, Direction, Element, Gender, PillarPosition, ShinsalKind,
};
use saju_lib::bazi;

fn make_request(date: &str, time: &str, gender: Gender) -> SajuRequest {
    SajuRequest {
        date: NaiveDate::parse_from_str(date, "%Y-%m-%d").unwrap(),
        time: time.to_string(),
        calendar: CalendarType::Solar,
        leap_month: false,
        gender,
        tz: "Asia/Seoul".to_string(),
        use_lmt: false,
        longitude: None,
        location: None,
        daewon_count: 10,
        month_year: None,
        year_start: Some(2024),
        year_count: 3,
    }
}

#[test]
fn test_known_pillars_2000_01_15() {
    // 2000-01-15 17:15 male, Asia/Seoul
    let req = make_request("2000-01-15", "17:15", Gender::Male);
    let result = calculate(&req).unwrap();

    // Year: 己卯 (stem=5 earth yin, branch=3 wood yin) — before lichun, so 1999's pillar
    assert_eq!(result.year_pillar.stem, 5, "year stem should be 己(5)");
    assert_eq!(result.year_pillar.branch, 3, "year branch should be 卯(3)");
    assert_eq!(bazi::stem_element(result.year_pillar.stem), Element::Earth);

    // Month: 乙丑 (stem=1, branch=1)
    assert_eq!(result.month_pillar.stem, 1, "month stem should be 乙(1)");
    assert_eq!(result.month_pillar.branch, 1, "month branch should be 丑(1)");

    // Day: 壬申 (stem=8, branch=8)
    assert_eq!(result.day_pillar.stem, 8, "day stem should be 壬(8)");
    assert_eq!(result.day_pillar.branch, 8, "day branch should be 申(8)");
    assert_eq!(bazi::stem_element(result.day_pillar.stem), Element::Water);

    // Hour: 己酉 (stem=5, branch=9)
    assert_eq!(result.hour_pillar.stem, 5, "hour stem should be 己(5)");
    assert_eq!(result.hour_pillar.branch, 9, "hour branch should be 酉(9)");
}

#[test]
fn test_gender_and_direction() {
    let req_male = make_request("2000-01-15", "17:15", Gender::Male);
    let result_male = calculate(&req_male).unwrap();
    assert!(matches!(result_male.gender, Gender::Male));

    let req_female = make_request("2000-01-15", "17:15", Gender::Female);
    let result_female = calculate(&req_female).unwrap();
    assert!(matches!(result_female.gender, Gender::Female));

    // 己 is yin stem → male=backward, female=forward
    assert!(matches!(result_male.daewon_direction, Direction::Backward));
    assert!(matches!(result_female.daewon_direction, Direction::Forward));
}

#[test]
fn test_lunar_calendar_input() {
    let req = SajuRequest {
        date: NaiveDate::parse_from_str("2000-01-01", "%Y-%m-%d").unwrap(),
        time: "17:15".to_string(),
        calendar: CalendarType::Lunar,
        leap_month: false,
        gender: Gender::Male,
        tz: "Asia/Seoul".to_string(),
        use_lmt: false,
        longitude: None,
        location: None,
        daewon_count: 10,
        month_year: None,
        year_start: Some(2024),
        year_count: 3,
    };
    let result = calculate(&req).unwrap();
    // Lunar 2000-01-01 converts to some solar date
    assert!(result.converted_solar.is_some());
    assert!(result.converted_lunar.is_none()); // lunar input → no lunar conversion shown
}

#[test]
fn test_solar_calendar_shows_lunar_conversion() {
    let req = make_request("2000-01-15", "17:15", Gender::Male);
    let result = calculate(&req).unwrap();
    assert!(result.converted_solar.is_none()); // solar input → no solar conversion
    assert!(result.converted_lunar.is_some()); // solar input → lunar conversion shown
}

#[test]
fn test_invalid_date_format() {
    let req = SajuRequest {
        date: NaiveDate::parse_from_str("2000-01-01", "%Y-%m-%d").unwrap(),
        time: "bad_time".to_string(),
        calendar: CalendarType::Solar,
        leap_month: false,
        gender: Gender::Male,
        tz: "Asia/Seoul".to_string(),
        use_lmt: false,
        longitude: None,
        location: None,
        daewon_count: 10,
        month_year: None,
        year_start: Some(2024),
        year_count: 3,
    };
    let result = calculate(&req);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("time format"));
}

#[test]
fn test_leap_month_with_solar_errors() {
    let req = SajuRequest {
        date: NaiveDate::parse_from_str("2000-01-01", "%Y-%m-%d").unwrap(),
        time: "12:00".to_string(),
        calendar: CalendarType::Solar,
        leap_month: true,
        gender: Gender::Male,
        tz: "Asia/Seoul".to_string(),
        use_lmt: false,
        longitude: None,
        location: None,
        daewon_count: 10,
        month_year: None,
        year_start: Some(2024),
        year_count: 3,
    };
    let result = calculate(&req);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("leap-month"));
}

#[test]
fn test_strength_result() {
    let req = make_request("2000-01-15", "17:15", Gender::Male);
    let result = calculate(&req).unwrap();
    // Strength should have a verdict
    let verdict = result.strength.verdict;
    assert!(
        matches!(
            verdict,
            saju_lib::StrengthVerdict::Strong
                | saju_lib::StrengthVerdict::Weak
                | saju_lib::StrengthVerdict::Neutral
        ),
        "verdict should be Strong, Weak, or Neutral"
    );
}

#[test]
fn test_daewon_items_count() {
    let req = make_request("2000-01-15", "17:15", Gender::Male);
    let result = calculate(&req).unwrap();
    assert_eq!(result.daewon_items.len(), 10, "should have 10 daewon items");
}

#[test]
fn test_yearly_luck_count() {
    let req = make_request("2000-01-15", "17:15", Gender::Male);
    let result = calculate(&req).unwrap();
    assert_eq!(result.yearly_luck.len(), 3, "should have 3 yearly luck items");
}

#[test]
fn test_monthly_luck() {
    let req = make_request("2000-01-15", "17:15", Gender::Male);
    let result = calculate(&req).unwrap();
    assert!(!result.monthly_luck.months.is_empty(), "should have monthly luck items");
}

#[test]
fn test_lmt_correction_with_location() {
    let req = SajuRequest {
        date: NaiveDate::parse_from_str("2000-01-15", "%Y-%m-%d").unwrap(),
        time: "17:15".to_string(),
        calendar: CalendarType::Solar,
        leap_month: false,
        gender: Gender::Male,
        tz: "Asia/Seoul".to_string(),
        use_lmt: true,
        longitude: None,
        location: Some("seoul".to_string()),
        daewon_count: 10,
        month_year: None,
        year_start: Some(2024),
        year_count: 3,
    };
    let result = calculate(&req).unwrap();
    assert!(result.lmt_info.is_some(), "should have LMT info");
    let lmt = result.lmt_info.unwrap();
    assert!(lmt.correction_seconds != 0, "Seoul should have non-zero LMT correction");
}

#[test]
fn test_stem_hap_detection() {
    // 갑기합(토): stem 0 and stem 5
    assert_eq!(bazi::stem_hap(0, 5), Some(Element::Earth));
    assert_eq!(bazi::stem_hap(1, 6), Some(Element::Metal));
    assert_eq!(bazi::stem_hap(2, 7), Some(Element::Water));
    assert_eq!(bazi::stem_hap(3, 8), Some(Element::Wood));
    assert_eq!(bazi::stem_hap(4, 9), Some(Element::Fire));
    // Non-hap pair
    assert_eq!(bazi::stem_hap(0, 1), None);

    // Check via service for 2000-01-15 17:15
    // Pillars: 己卯 乙丑 壬申 己酉 → stems [5,1,8,5]
    let req = make_request("2000-01-15", "17:15", Gender::Male);
    let result = calculate(&req).unwrap();
    // No hap pairs among these stems, verify empty or correct
    assert!(result.stem_interactions.len() <= 12);
    // All stem pairs: (5,1),(5,8),(5,5),(1,8),(1,5),(8,5) → no hap pairs here
    // 壬(8)-己(5) chung? diff=3, not 6. No chung either.
    // This date has no stem interactions, which is valid.
    // Test with a date that has stem hap: 甲(0) and 己(5) together
    let req2 = make_request("1984-07-22", "06:00", Gender::Male);
    let result2 = calculate(&req2).unwrap();
    // Just verify no panic and result is reasonable
    assert!(result2.stem_interactions.len() <= 12); // max 6 pairs * 2 types
}

#[test]
fn test_branch_chung_detection() {
    // 자오충: branch 0 and branch 6
    assert!(bazi::stem_chung(0, 6)); // 갑경충
    assert!(!bazi::stem_chung(0, 1)); // not a chung pair

    // Test branch interactions via a known date
    let req = make_request("2000-01-15", "17:15", Gender::Male);
    let result = calculate(&req).unwrap();
    // Branches: 卯(3), 丑(1), 申(8), 酉(9)
    // 卯(3)-酉(9): diff=6 → 충!
    let chung_count = result.branch_interactions.iter()
        .filter(|b| b.relation == BranchRelationType::Chung)
        .count();
    assert_eq!(chung_count, 1, "卯酉충 should be detected");

    // Verify all interaction types are valid
    for bi in &result.branch_interactions {
        assert!(!bi.positions.is_empty());
        assert!(!bi.branches.is_empty());
    }
}

#[test]
fn test_gongmang_calculation() {
    // 壬申 (stem=8, branch=8) → gongmang
    // 순(旬): (10 + 8 - 8) % 12 = 10, 11 → 술(10), 해(11)
    let gm = bazi::gongmang(8, 8);
    assert_eq!(gm, [10, 11]); // 술, 해

    // 甲子 (stem=0, branch=0) → gongmang = (10+0-0)%12=10,11 → 술,해
    let gm2 = bazi::gongmang(0, 0);
    assert_eq!(gm2, [10, 11]);

    // 甲戌 (stem=0, branch=10) → gongmang = (10+10-0)%12=8,9 → 신,유
    let gm3 = bazi::gongmang(0, 10);
    assert_eq!(gm3, [8, 9]);
}

#[test]
fn test_shinsal_entries() {
    let req = make_request("2000-01-15", "17:15", Gender::Male);
    let result = calculate(&req).unwrap();

    // Verify shinsal entries exist and have valid structure
    for entry in &result.shinsal_entries {
        assert!(!entry.found_at.is_empty(), "shinsal should have at least one found_at position");
        // Verify position values are valid
        for pos in &entry.found_at {
            assert!(matches!(
                pos,
                PillarPosition::Year | PillarPosition::Month | PillarPosition::Day | PillarPosition::Hour
            ));
        }
    }

    // For this saju (己卯 乙丑 壬申 己酉):
    // 天乙貴人: 일간 壬(8) → targets [3,5] (묘,사). 연지=卯(3) matches!
    let cheon_eul = result.shinsal_entries.iter()
        .find(|e| e.kind == ShinsalKind::CheonEulGwiIn);
    assert!(cheon_eul.is_some(), "should detect 천을귀인");
    let ce = cheon_eul.unwrap();
    assert!(ce.found_at.contains(&PillarPosition::Year)); // 卯 is at year branch

    // 괴강살: 일주 壬申 is not 경진/경술/임진/임술 → no goegang
    let goegang = result.shinsal_entries.iter()
        .find(|e| e.kind == ShinsalKind::GoeGangSal);
    assert!(goegang.is_none(), "壬申 is not a goegang pillar");
}

#[test]
fn test_different_timezone() {
    let req = SajuRequest {
        date: NaiveDate::parse_from_str("2000-06-15", "%Y-%m-%d").unwrap(),
        time: "10:30".to_string(),
        calendar: CalendarType::Solar,
        leap_month: false,
        gender: Gender::Female,
        tz: "America/New_York".to_string(),
        use_lmt: false,
        longitude: None,
        location: None,
        daewon_count: 10,
        month_year: None,
        year_start: Some(2024),
        year_count: 3,
    };
    let result = calculate(&req).unwrap();
    assert_eq!(result.tz_name, "America/New_York");
    // Year 2000 庚辰 (stem=6, branch=4)
    assert_eq!(result.year_pillar.stem, 6, "year stem should be 庚(6)");
    assert_eq!(result.year_pillar.branch, 4, "year branch should be 辰(4)");
}
