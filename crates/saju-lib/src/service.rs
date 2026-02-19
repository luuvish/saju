use chrono::{Datelike, Duration, NaiveDate, NaiveDateTime, NaiveTime, Timelike, Utc};

use crate::bazi::StrengthResult;
use crate::luck::{DaewonItem, MonthlyLuck, YearLuck};
use crate::timezone::TimeZoneSpec;
use crate::types::{Direction, Gender, LmtInfo, LunarDate, Pillar, SolarTerm};
use crate::{astro, bazi, location, luck, lunar, timezone};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CalendarType {
    Solar,
    Lunar,
}

#[derive(Clone, Debug)]
pub struct SajuRequest {
    pub date: NaiveDate,
    pub time: String,
    pub calendar: CalendarType,
    pub leap_month: bool,
    pub gender: Gender,
    pub tz: String,
    pub use_lmt: bool,
    pub longitude: Option<f64>,
    pub location: Option<String>,
    pub daewon_count: usize,
    pub month_year: Option<i32>,
    pub year_start: Option<i32>,
    pub year_count: usize,
}

#[derive(Clone, Debug)]
pub struct SajuResult {
    pub input_date: String,
    pub input_time: String,
    pub calendar_is_lunar: bool,
    pub leap_month: bool,
    pub tz_name: String,
    pub converted_solar: Option<NaiveDate>,
    pub converted_lunar: Option<LunarDate>,
    pub lmt_info: Option<LmtInfo>,
    pub gender: Gender,

    pub year_pillar: Pillar,
    pub month_pillar: Pillar,
    pub day_pillar: Pillar,
    pub hour_pillar: Pillar,

    pub strength: StrengthResult,

    pub daewon_direction: Direction,
    pub daewon_start_months: i32,
    pub daewon_items: Vec<DaewonItem>,

    pub yearly_luck: Vec<YearLuck>,
    pub monthly_luck: MonthlyLuck,

    pub tz_spec: TimeZoneSpec,
    pub solar_terms: Vec<SolarTerm>,
}

fn parse_time(input: &str) -> Result<NaiveTime, String> {
    if let Ok(time) = NaiveTime::parse_from_str(input, "%H:%M:%S") {
        return Ok(time);
    }
    if let Ok(time) = NaiveTime::parse_from_str(input, "%H:%M") {
        return Ok(time);
    }
    Err("time format must be HH:MM or HH:MM:SS".to_string())
}

pub fn calculate(req: &SajuRequest) -> Result<SajuResult, String> {
    let time = parse_time(&req.time)?;

    if req.calendar == CalendarType::Solar && req.leap_month {
        return Err("leap-month is only valid with calendar=lunar".to_string());
    }

    let mut converted_solar = None;
    let mut converted_lunar = None;
    let solar_date = match req.calendar {
        CalendarType::Solar => {
            converted_lunar = Some(lunar::solar_to_lunar(req.date)?);
            req.date
        }
        CalendarType::Lunar => {
            let solar = lunar::lunar_to_solar(
                req.date.year(),
                req.date.month(),
                req.date.day(),
                req.leap_month,
            )?;
            converted_solar = Some(solar);
            solar
        }
    };
    let naive = NaiveDateTime::new(solar_date, time);

    let tz_spec = timezone::parse_timezone(&req.tz)?;
    let input_local_dt = tz_spec.localize(naive)?;
    let (local_dt, lmt_info) = if req.use_lmt {
        if req.longitude.is_some() && req.location.is_some() {
            return Err("use either --longitude or --location (not both)".to_string());
        }
        let (longitude, location_label) = if let Some(longitude) = req.longitude {
            (longitude, None)
        } else if let Some(ref loc_name) = req.location {
            let loc = location::resolve_location(loc_name).ok_or_else(|| {
                format!(
                    "unknown location '{}'; try one of: {}",
                    loc_name,
                    location::location_hint()
                )
            })?;
            (loc.longitude, Some(loc.display.to_string()))
        } else {
            return Err("longitude or location is required for local mean time".to_string());
        };
        if !(-180.0..=180.0).contains(&longitude) {
            return Err("longitude must be between -180 and 180 degrees".to_string());
        }
        let (std_meridian, correction_seconds) =
            location::lmt_correction(longitude, input_local_dt.offset().local_minus_utc());
        let corrected_local = input_local_dt + Duration::seconds(correction_seconds);
        let info = LmtInfo {
            longitude,
            std_meridian,
            correction_seconds,
            corrected_local,
            location_label,
        };
        (corrected_local, Some(info))
    } else {
        (input_local_dt, None)
    };

    let utc_dt = local_dt.with_timezone(&Utc);
    let birth_jd = astro::jd_from_datetime(utc_dt);

    let year = local_dt.year();
    let terms_prev = astro::compute_solar_terms(year - 1);
    let terms_curr = astro::compute_solar_terms(year);
    let terms_next = astro::compute_solar_terms(year + 1);

    let lichun_jd = terms_curr
        .iter()
        .find(|t| t.def.key == "lichun")
        .ok_or("failed to find lichun term")?
        .jd;
    let year_for_pillar = if birth_jd >= lichun_jd { year } else { year - 1 };
    let (year_stem, year_branch) = bazi::year_pillar(year_for_pillar);
    let year_pillar = Pillar {
        stem: year_stem,
        branch: year_branch,
    };

    let month_branch = bazi::month_branch_for_birth(birth_jd, &terms_prev, &terms_curr)?;
    let month_stem = bazi::month_stem_from_year(year_stem, month_branch);
    let month_pillar = Pillar {
        stem: month_stem,
        branch: month_branch,
    };

    let local_naive = local_dt.naive_local();
    let adjusted_naive = if local_naive.time().hour() >= 23 {
        local_naive + Duration::days(1)
    } else {
        local_naive
    };
    let date_for_day = adjusted_naive.date();
    let jdn = bazi::jdn_from_date(
        date_for_day.year(),
        date_for_day.month(),
        date_for_day.day(),
    );
    let (day_stem, day_branch) = bazi::day_pillar_from_jdn(jdn);
    let day_pillar = Pillar {
        stem: day_stem,
        branch: day_branch,
    };

    let hour_branch =
        bazi::hour_branch_index(local_naive.time().hour(), local_naive.time().minute());
    let hour_stem = bazi::hour_stem_from_day(day_stem, hour_branch);
    let hour_pillar = Pillar {
        stem: hour_stem,
        branch: hour_branch,
    };

    let direction = luck::daewon_direction(req.gender, year_stem);
    let start_months = luck::daewon_start_months(
        birth_jd,
        &terms_prev,
        &terms_curr,
        &terms_next,
        direction,
    )
    .ok_or("failed to find solar term for daewon start")?;
    let daewon_pillars = luck::build_daewon_pillars(month_pillar, direction, req.daewon_count);
    let daewon_items = luck::build_daewon_items(start_months, &daewon_pillars);

    let month_year = req
        .month_year
        .unwrap_or_else(|| tz_spec.to_local(Utc::now()).year());
    let year_start = req.year_start.unwrap_or(month_year);
    if req.year_count == 0 {
        return Err("year-count must be at least 1".to_string());
    }

    let yearly_luck = luck::yearly_luck(year_start, req.year_count)?;
    let monthly_luck = luck::monthly_luck(month_year)?;
    let strength = bazi::assess_strength(
        day_stem,
        [year_pillar, month_pillar, day_pillar, hour_pillar],
    );

    Ok(SajuResult {
        input_date: req.date.format("%Y-%m-%d").to_string(),
        input_time: req.time.clone(),
        calendar_is_lunar: req.calendar == CalendarType::Lunar,
        leap_month: req.leap_month,
        tz_name: tz_spec.name(),
        converted_solar,
        converted_lunar,
        lmt_info,
        gender: req.gender,
        year_pillar,
        month_pillar,
        day_pillar,
        hour_pillar,
        strength,
        daewon_direction: direction,
        daewon_start_months: start_months,
        daewon_items,
        yearly_luck,
        monthly_luck,
        tz_spec,
        solar_terms: terms_curr,
    })
}
