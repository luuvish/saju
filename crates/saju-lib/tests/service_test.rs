use chrono::NaiveDate;
use saju_lib::service::{CalendarType, SajuRequest, calculate};
use saju_lib::types::{Direction, Element, Gender};
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
