use clap::{Parser, ValueEnum};
use chrono::{
    DateTime, Datelike, Duration, FixedOffset, NaiveDate, NaiveDateTime, NaiveTime, Offset,
    TimeZone, Timelike, Utc,
};
use chrono_tz::Tz;
use std::str::FromStr;

use saju::astro;
use saju::bazi;
use saju::i18n::{I18n, Lang, PillarKind};
use saju::location;
use saju::luck;
use saju::lunar;
use saju::types::{Gender, LmtInfo, LunarDate, Pillar};

#[derive(Clone, Copy, Debug, ValueEnum, PartialEq, Eq)]
enum CalendarType {
    Solar,
    Lunar,
}

#[derive(Clone, Copy, Debug, ValueEnum)]
enum LangArg {
    Ko,
    En,
}

impl From<LangArg> for Lang {
    fn from(value: LangArg) -> Self {
        match value {
            LangArg::Ko => Lang::Ko,
            LangArg::En => Lang::En,
        }
    }
}

#[derive(Parser, Debug)]
#[command(
    name = "saju",
    version,
    about = "Saju palja calculator using solar terms (입춘 기준)"
)]
struct Args {
    #[arg(long)]
    date: String,
    #[arg(long)]
    time: String,
    #[arg(long, default_value = "solar", value_enum)]
    calendar: CalendarType,
    #[arg(long, action = clap::ArgAction::SetTrue)]
    leap_month: bool,
    #[arg(long, default_value = "Asia/Seoul")]
    tz: String,
    #[arg(long, value_name = "male|female|m|f|남|여")]
    gender: String,
    #[arg(long, default_value_t = 10)]
    daewon_count: usize,
    #[arg(long, value_name = "YYYY")]
    month_year: Option<i32>,
    #[arg(long, value_name = "YYYY")]
    year_start: Option<i32>,
    #[arg(long, default_value_t = 10)]
    year_count: usize,
    #[arg(long, action = clap::ArgAction::SetTrue)]
    local_mean_time: bool,
    #[arg(long, value_name = "DEG")]
    longitude: Option<f64>,
    #[arg(long, value_name = "NAME")]
    location: Option<String>,
    #[arg(long, default_value = "ko", value_enum)]
    lang: LangArg,
    #[arg(long, action = clap::ArgAction::SetTrue)]
    show_terms: bool,
}

fn main() {
    if let Err(err) = run() {
        eprintln!("error: {}", err);
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let args = Args::parse();
    let i18n = I18n::new(args.lang.into());

    let input_date = NaiveDate::parse_from_str(&args.date, "%Y-%m-%d")
        .map_err(|_| "date format must be YYYY-MM-DD".to_string())?;
    let time = parse_time(&args.time)?;
    if args.calendar == CalendarType::Solar && args.leap_month {
        return Err("leap-month is only valid with calendar=lunar".to_string());
    }

    let mut converted_solar = None;
    let mut converted_lunar = None;
    let solar_date = match args.calendar {
        CalendarType::Solar => {
            converted_lunar = Some(lunar::solar_to_lunar(input_date)?);
            input_date
        }
        CalendarType::Lunar => {
            let solar = lunar::lunar_to_solar(
                input_date.year(),
                input_date.month(),
                input_date.day(),
                args.leap_month,
            )?;
            converted_solar = Some(solar);
            solar
        }
    };
    let naive = NaiveDateTime::new(solar_date, time);

    let tz_spec = parse_timezone(&args.tz)?;
    let input_local_dt = tz_spec.localize(naive)?;
    let use_lmt = args.local_mean_time || args.longitude.is_some() || args.location.is_some();
    let (local_dt, lmt_info) = if use_lmt {
        if args.longitude.is_some() && args.location.is_some() {
            return Err("use either --longitude or --location (not both)".to_string());
        }
        let (longitude, location_label) = if let Some(longitude) = args.longitude {
            (longitude, None)
        } else if let Some(location) = args.location.as_deref() {
            let loc = location::resolve_location(location).ok_or_else(|| {
                format!(
                    "unknown location '{}'; try one of: {}",
                    location,
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

    let gender = parse_gender(&args.gender)?;

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

    let hour_branch = bazi::hour_branch_index(local_naive.time().hour(), local_naive.time().minute());
    let hour_stem = bazi::hour_stem_from_day(day_stem, hour_branch);
    let hour_pillar = Pillar {
        stem: hour_stem,
        branch: hour_branch,
    };

    let direction = luck::daewon_direction(gender, year_stem);
    let start_months = luck::daewon_start_months(
        birth_jd,
        &terms_prev,
        &terms_curr,
        &terms_next,
        direction,
    )
    .ok_or("failed to find solar term for daewon start")?;
    let daewon_pillars = luck::build_daewon_pillars(month_pillar, direction, args.daewon_count);
    let daewon_items = luck::build_daewon_items(start_months, &daewon_pillars);

    let month_year = args
        .month_year
        .unwrap_or_else(|| tz_spec.to_local(Utc::now()).year());
    let year_start = args.year_start.unwrap_or(month_year);
    if args.year_count == 0 {
        return Err("year-count must be at least 1".to_string());
    }

    let yearly_luck = luck::yearly_luck(year_start, args.year_count)?;
    let monthly_luck = luck::monthly_luck(month_year)?;
    let strength = bazi::assess_strength(day_stem, [year_pillar, month_pillar, day_pillar, hour_pillar]);

    print_header(
        &args,
        gender,
        &tz_spec,
        args.calendar,
        converted_solar,
        converted_lunar,
        lmt_info,
        &i18n,
    );
    print_pillars(year_pillar, month_pillar, day_pillar, hour_pillar, &i18n);
    print_hidden_stems(year_pillar, month_pillar, day_pillar, hour_pillar, &i18n);
    print_ten_gods(year_pillar, month_pillar, day_pillar, hour_pillar, &i18n);
    print_twelve_stages(day_stem, year_pillar, month_pillar, day_pillar, hour_pillar, &i18n);
    print_twelve_shinsal(year_branch, year_pillar, month_pillar, day_pillar, hour_pillar, &i18n);
    print_strength(strength, &i18n);
    print_elements(year_pillar, month_pillar, day_pillar, hour_pillar, &i18n);
    print_daewon(direction, start_months, &daewon_items, day_stem, &i18n);
    print_yearly_luck(&yearly_luck, day_stem, &tz_spec, &i18n);
    print_monthly_luck(&monthly_luck, day_stem, &tz_spec, &i18n);

    if args.show_terms {
        print_terms(&tz_spec, &terms_curr, &i18n);
    }

    Ok(())
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

fn parse_gender(input: &str) -> Result<Gender, String> {
    match input.to_lowercase().as_str() {
        "male" | "m" | "남" => Ok(Gender::Male),
        "female" | "f" | "여" => Ok(Gender::Female),
        _ => Err("gender must be male|female|m|f|남|여".to_string()),
    }
}

enum TimeZoneSpec {
    Fixed(FixedOffset),
    Named(Tz),
}

impl TimeZoneSpec {
    fn localize(&self, naive: NaiveDateTime) -> Result<DateTime<FixedOffset>, String> {
        use chrono::offset::LocalResult;
        match self {
            TimeZoneSpec::Fixed(offset) => offset
                .from_local_datetime(&naive)
                .single()
                .ok_or_else(|| "invalid local time for fixed offset".to_string()),
            TimeZoneSpec::Named(tz) => match tz.from_local_datetime(&naive) {
                LocalResult::Single(dt) => Ok(dt.with_timezone(&dt.offset().fix())),
                LocalResult::Ambiguous(dt1, _) => Ok(dt1.with_timezone(&dt1.offset().fix())),
                LocalResult::None => Err("local time does not exist in this timezone".to_string()),
            },
        }
    }

    fn to_local(&self, utc: DateTime<Utc>) -> DateTime<FixedOffset> {
        match self {
            TimeZoneSpec::Fixed(offset) => utc.with_timezone(offset),
            TimeZoneSpec::Named(tz) => {
                let dt = tz.from_utc_datetime(&utc.naive_utc());
                dt.with_timezone(&dt.offset().fix())
            }
        }
    }

    fn name(&self) -> String {
        match self {
            TimeZoneSpec::Fixed(offset) => format!("{}", offset),
            TimeZoneSpec::Named(tz) => tz.name().to_string(),
        }
    }
}

fn parse_timezone(input: &str) -> Result<TimeZoneSpec, String> {
    if let Some(offset) = parse_fixed_offset(input) {
        return Ok(TimeZoneSpec::Fixed(offset));
    }
    if let Ok(tz) = Tz::from_str(input) {
        return Ok(TimeZoneSpec::Named(tz));
    }
    Err("timezone must be IANA name (e.g., Asia/Seoul) or offset (+09:00)".to_string())
}

fn parse_fixed_offset(input: &str) -> Option<FixedOffset> {
    let trimmed = input.trim();
    let sign = if trimmed.starts_with('+') {
        1
    } else if trimmed.starts_with('-') {
        -1
    } else {
        return None;
    };
    let rest = &trimmed[1..];
    let (hours, minutes) = if let Some((h, m)) = rest.split_once(':') {
        (h, m)
    } else if rest.len() == 4 {
        (&rest[0..2], &rest[2..4])
    } else {
        return None;
    };
    let hours: i32 = hours.parse().ok()?;
    let minutes: i32 = minutes.parse().ok()?;
    if hours.abs() > 23 || minutes.abs() > 59 {
        return None;
    }
    let total = sign * (hours * 3600 + minutes * 60);
    FixedOffset::east_opt(total)
}

fn format_correction(seconds: i64) -> String {
    let sign = if seconds >= 0 { "+" } else { "-" };
    let abs = seconds.abs();
    let mins = abs / 60;
    let secs = abs % 60;
    format!("{}{:02}m{:02}s", sign, mins, secs)
}

fn format_hidden_stems(i18n: &I18n, branch: usize) -> String {
    bazi::hidden_stems(branch)
        .iter()
        .map(|&stem| i18n.stem_label(stem))
        .collect::<Vec<_>>()
        .join(", ")
}

fn format_hidden_stems_with_tengod(i18n: &I18n, day_stem: usize, branch: usize) -> String {
    bazi::hidden_stems(branch)
        .iter()
        .map(|&stem| {
            format!(
                "{} {}",
                i18n.stem_label(stem),
                i18n.ten_god_label(bazi::ten_god(day_stem, stem))
            )
        })
        .collect::<Vec<_>>()
        .join(", ")
}

fn print_header(
    args: &Args,
    gender: Gender,
    tz_spec: &TimeZoneSpec,
    calendar: CalendarType,
    converted_solar: Option<NaiveDate>,
    converted_lunar: Option<LunarDate>,
    lmt_info: Option<LmtInfo>,
    i18n: &I18n,
) {
    let is_lunar = matches!(calendar, CalendarType::Lunar);
    println!("{}", i18n.title());
    println!(
        "- {}({}): {} {} {}",
        i18n.input_label(),
        i18n.calendar_label(is_lunar, args.leap_month),
        args.date,
        args.time,
        tz_spec.name()
    );
    if let Some(date) = converted_solar {
        println!(
            "- {}: {} {} {}",
            i18n.converted_solar_label(),
            date.format("%Y-%m-%d"),
            args.time,
            tz_spec.name()
        );
    }
    if let Some(lunar) = converted_lunar {
        let leap_suffix = if lunar.is_leap { i18n.leap_suffix() } else { "" };
        println!(
            "- {}: {:04}-{:02}-{:02}{}",
            i18n.converted_lunar_label(),
            lunar.year,
            lunar.month,
            lunar.day,
            leap_suffix
        );
    }
    if let Some(info) = lmt_info {
        if let Some(label) = info.location_label.as_deref() {
            println!(
                "- {}: {} {} | {} {:.4}deg | {} {:.1}deg | {} {}",
                i18n.local_mean_time_label(),
                i18n.location_label(),
                label,
                i18n.longitude_label(),
                info.longitude,
                i18n.std_meridian_label(),
                info.std_meridian,
                i18n.correction_label(),
                format_correction(info.correction_seconds)
            );
        } else {
            println!(
                "- {}: {} {:.4}deg | {} {:.1}deg | {} {}",
                i18n.local_mean_time_label(),
                i18n.longitude_label(),
                info.longitude,
                i18n.std_meridian_label(),
                info.std_meridian,
                i18n.correction_label(),
                format_correction(info.correction_seconds)
            );
        }
        println!(
            "- {}: {} {}",
            i18n.corrected_time_label(),
            info.corrected_local.format("%Y-%m-%d %H:%M:%S"),
            tz_spec.name()
        );
    }
    println!("- {}: {}", i18n.gender_label(), i18n.gender_value(gender));
    println!("- {}: 23:00", i18n.day_boundary_label());
    println!();
}

fn print_pillars(year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: &I18n) {
    println!("{}", i18n.pillars_heading());
    println!(
        "- {}: {} | {}: {} {} | {}: {} {}",
        i18n.pillar_kind_label(PillarKind::Year),
        i18n.pillar_label(year),
        i18n.stem_word(),
        i18n.element_label(bazi::stem_element(year.stem)),
        i18n.polarity_label(bazi::stem_polarity(year.stem)),
        i18n.branch_word(),
        i18n.element_label(bazi::branch_element(year.branch)),
        i18n.polarity_label(bazi::branch_polarity(year.branch))
    );
    println!(
        "- {}: {} | {}: {} {} | {}: {} {}",
        i18n.pillar_kind_label(PillarKind::Month),
        i18n.pillar_label(month),
        i18n.stem_word(),
        i18n.element_label(bazi::stem_element(month.stem)),
        i18n.polarity_label(bazi::stem_polarity(month.stem)),
        i18n.branch_word(),
        i18n.element_label(bazi::branch_element(month.branch)),
        i18n.polarity_label(bazi::branch_polarity(month.branch))
    );
    println!(
        "- {}: {} | {}: {} {} | {}: {} {}",
        i18n.pillar_kind_label(PillarKind::Day),
        i18n.pillar_label(day),
        i18n.day_stem_word(),
        i18n.element_label(bazi::stem_element(day.stem)),
        i18n.polarity_label(bazi::stem_polarity(day.stem)),
        i18n.branch_word(),
        i18n.element_label(bazi::branch_element(day.branch)),
        i18n.polarity_label(bazi::branch_polarity(day.branch))
    );
    println!(
        "- {}: {} | {}: {} {} | {}: {} {}",
        i18n.pillar_kind_label(PillarKind::Hour),
        i18n.pillar_label(hour),
        i18n.stem_word(),
        i18n.element_label(bazi::stem_element(hour.stem)),
        i18n.polarity_label(bazi::stem_polarity(hour.stem)),
        i18n.branch_word(),
        i18n.element_label(bazi::branch_element(hour.branch)),
        i18n.polarity_label(bazi::branch_polarity(hour.branch))
    );
    println!();
}

fn print_hidden_stems(year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: &I18n) {
    println!("{}", i18n.hidden_stems_heading());
    println!(
        "- {}: {}",
        i18n.branch_kind_label(PillarKind::Year),
        format_hidden_stems(i18n, year.branch)
    );
    println!(
        "- {}: {}",
        i18n.branch_kind_label(PillarKind::Month),
        format_hidden_stems(i18n, month.branch)
    );
    println!(
        "- {}: {}",
        i18n.branch_kind_label(PillarKind::Day),
        format_hidden_stems(i18n, day.branch)
    );
    println!(
        "- {}: {}",
        i18n.branch_kind_label(PillarKind::Hour),
        format_hidden_stems(i18n, hour.branch)
    );
    println!();
}

fn print_ten_gods(year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: &I18n) {
    println!("{}", i18n.ten_gods_heading());
    println!(
        "- {}: {} {} / {} {} / {} {} / {} {}",
        i18n.stems_label(),
        i18n.stem_kind_label(PillarKind::Year),
        i18n.ten_god_label(bazi::ten_god(day.stem, year.stem)),
        i18n.stem_kind_label(PillarKind::Month),
        i18n.ten_god_label(bazi::ten_god(day.stem, month.stem)),
        i18n.stem_kind_label(PillarKind::Day),
        i18n.ten_god_label(bazi::ten_god(day.stem, day.stem)),
        i18n.stem_kind_label(PillarKind::Hour),
        i18n.ten_god_label(bazi::ten_god(day.stem, hour.stem))
    );
    println!(
        "- {}: {} {} / {} {} / {} {} / {} {}",
        i18n.branches_main_label(),
        i18n.branch_kind_label(PillarKind::Year),
        i18n.ten_god_label(bazi::ten_god_branch(day.stem, year.branch)),
        i18n.branch_kind_label(PillarKind::Month),
        i18n.ten_god_label(bazi::ten_god_branch(day.stem, month.branch)),
        i18n.branch_kind_label(PillarKind::Day),
        i18n.ten_god_label(bazi::ten_god_branch(day.stem, day.branch)),
        i18n.branch_kind_label(PillarKind::Hour),
        i18n.ten_god_label(bazi::ten_god_branch(day.stem, hour.branch))
    );
    println!(
        "- {}: {}",
        i18n.branches_hidden_label(PillarKind::Year),
        format_hidden_stems_with_tengod(i18n, day.stem, year.branch)
    );
    println!(
        "- {}: {}",
        i18n.branches_hidden_label(PillarKind::Month),
        format_hidden_stems_with_tengod(i18n, day.stem, month.branch)
    );
    println!(
        "- {}: {}",
        i18n.branches_hidden_label(PillarKind::Day),
        format_hidden_stems_with_tengod(i18n, day.stem, day.branch)
    );
    println!(
        "- {}: {}",
        i18n.branches_hidden_label(PillarKind::Hour),
        format_hidden_stems_with_tengod(i18n, day.stem, hour.branch)
    );
    println!();
}

fn print_twelve_stages(
    day_stem: usize,
    year: Pillar,
    month: Pillar,
    day: Pillar,
    hour: Pillar,
    i18n: &I18n,
) {
    println!("{}", i18n.twelve_stages_heading());
    println!(
        "- {}: {} / {}: {} / {}: {} / {}: {}",
        i18n.branch_kind_label(PillarKind::Year),
        i18n.stage_label(bazi::twelve_stage_index(day_stem, year.branch)),
        i18n.branch_kind_label(PillarKind::Month),
        i18n.stage_label(bazi::twelve_stage_index(day_stem, month.branch)),
        i18n.branch_kind_label(PillarKind::Day),
        i18n.stage_label(bazi::twelve_stage_index(day_stem, day.branch)),
        i18n.branch_kind_label(PillarKind::Hour),
        i18n.stage_label(bazi::twelve_stage_index(day_stem, hour.branch))
    );
    println!();
}

fn print_twelve_shinsal(
    year_branch: usize,
    year: Pillar,
    month: Pillar,
    day: Pillar,
    hour: Pillar,
    i18n: &I18n,
) {
    println!("{}", i18n.twelve_shinsal_heading());
    println!(
        "- {}: {} / {}: {} / {}: {} / {}: {}",
        i18n.branch_kind_label(PillarKind::Year),
        i18n.shinsal_label(bazi::twelve_shinsal_index(year_branch, year.branch)),
        i18n.branch_kind_label(PillarKind::Month),
        i18n.shinsal_label(bazi::twelve_shinsal_index(year_branch, month.branch)),
        i18n.branch_kind_label(PillarKind::Day),
        i18n.shinsal_label(bazi::twelve_shinsal_index(year_branch, day.branch)),
        i18n.branch_kind_label(PillarKind::Hour),
        i18n.shinsal_label(bazi::twelve_shinsal_index(year_branch, hour.branch))
    );
    println!();
}

fn print_strength(strength: bazi::StrengthResult, i18n: &I18n) {
    let stage_bonus = match strength.stage_class {
        saju::StrengthClass::Strong => 2,
        saju::StrengthClass::Weak => -2,
        saju::StrengthClass::Neutral => 0,
    };
    let support_total = (strength.support_stems as i32) * 2 + strength.support_hidden as i32;
    let drain_total = (strength.drain_stems as i32) * 2 + strength.drain_hidden as i32;

    println!("{}", i18n.strength_heading());
    println!(
        "- {}: {} ({})",
        i18n.month_stage_label(),
        i18n.stage_label(strength.stage_index),
        i18n.strength_class_label(strength.stage_class)
    );
    println!(
        "- {}: {} / {}({} {}·{} {}) / {}({} {}·{} {})",
        i18n.root_label(),
        strength.root_count,
        i18n.support_label(),
        i18n.stems_label(),
        strength.support_stems,
        i18n.hidden_stems_heading(),
        strength.support_hidden,
        i18n.drain_label(),
        i18n.stems_label(),
        strength.drain_stems,
        i18n.hidden_stems_heading(),
        strength.drain_hidden
    );
    println!(
        "- {}: {} ({} {} {} + {} {} + {} {} - {} {})",
        i18n.score_label(),
        strength.total,
        i18n.basis_label(),
        i18n.month_stage_label(),
        stage_bonus,
        i18n.root_label(),
        strength.root_count,
        i18n.support_label(),
        support_total,
        i18n.drain_label(),
        drain_total
    );
    println!(
        "- {}: {}",
        i18n.verdict_label(),
        i18n.strength_verdict_label(strength.verdict)
    );
    println!();
}

fn print_elements(year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: &I18n) {
    let counts = bazi::elements_count([year, month, day, hour]);
    println!("{}", i18n.elements_heading());
    println!(
        "- {} {} / {} {} / {} {} / {} {} / {} {}",
        i18n.element_short_label(saju::Element::Wood),
        counts[0],
        i18n.element_short_label(saju::Element::Fire),
        counts[1],
        i18n.element_short_label(saju::Element::Earth),
        counts[2],
        i18n.element_short_label(saju::Element::Metal),
        counts[3],
        i18n.element_short_label(saju::Element::Water),
        counts[4]
    );
    println!();
}

fn print_daewon(
    direction: saju::Direction,
    start_months: i32,
    items: &[luck::DaewonItem],
    day_stem: usize,
    i18n: &I18n,
) {
    println!(
        "{} ({} , {} {})",
        i18n.daewon_heading(),
        i18n.direction_label(direction),
        i18n.start_label(),
        i18n.format_age(start_months, false)
    );
    for item in items {
        println!(
            "- {}: {} | {}: {} {} / {} {}",
            i18n.format_age(item.start_months, true),
            i18n.pillar_label(item.pillar),
            i18n.ten_gods_label(),
            i18n.stems_label(),
            i18n.ten_god_label(bazi::ten_god(day_stem, item.pillar.stem)),
            i18n.branches_label(),
            i18n.ten_god_label(bazi::ten_god_branch(day_stem, item.pillar.branch))
        );
    }
    println!();
}

fn print_yearly_luck(
    years: &[luck::YearLuck],
    day_stem: usize,
    tz_spec: &TimeZoneSpec,
    i18n: &I18n,
) {
    println!("{}", i18n.yearly_luck_heading());
    for year in years {
        let start_local = tz_spec.to_local(astro::datetime_from_jd(year.start_jd));
        let end_local = tz_spec.to_local(astro::datetime_from_jd(year.end_jd));
        println!(
            "- {}: {} ~ {} | {} | {}: {} {} / {} {}",
            i18n.format_year_label(year.year),
            start_local.format("%Y-%m-%d %H:%M"),
            end_local.format("%Y-%m-%d %H:%M"),
            i18n.pillar_label(year.pillar),
            i18n.ten_gods_label(),
            i18n.stems_label(),
            i18n.ten_god_label(bazi::ten_god(day_stem, year.pillar.stem)),
            i18n.branches_label(),
            i18n.ten_god_label(bazi::ten_god_branch(day_stem, year.pillar.branch))
        );
    }
    println!();
}

fn print_monthly_luck(
    monthly: &luck::MonthlyLuck,
    day_stem: usize,
    tz_spec: &TimeZoneSpec,
    i18n: &I18n,
) {
    println!("{}", i18n.monthly_luck_heading(monthly.year));
    println!(
        "- {}: {} | {}: {} {} / {} {}",
        i18n.year_luck_label(),
        i18n.pillar_label(monthly.year_pillar),
        i18n.ten_gods_label(),
        i18n.stems_label(),
        i18n.ten_god_label(bazi::ten_god(day_stem, monthly.year_pillar.stem)),
        i18n.branches_label(),
        i18n.ten_god_label(bazi::ten_god_branch(day_stem, monthly.year_pillar.branch))
    );
    for month in monthly.months.iter() {
        let start_local = tz_spec.to_local(astro::datetime_from_jd(month.start_jd));
        let end_local = tz_spec.to_local(astro::datetime_from_jd(month.end_jd));
        println!(
            "- {}: {} ~ {} | {} | {}: {} {} / {} {}",
            i18n.month_label(month.branch),
            start_local.format("%Y-%m-%d %H:%M"),
            end_local.format("%Y-%m-%d %H:%M"),
            i18n.pillar_label(month.pillar),
            i18n.ten_gods_label(),
            i18n.stems_label(),
            i18n.ten_god_label(bazi::ten_god(day_stem, month.pillar.stem)),
            i18n.branches_label(),
            i18n.ten_god_label(bazi::ten_god_branch(day_stem, month.pillar.branch))
        );
    }
    println!();
}

fn print_terms(tz_spec: &TimeZoneSpec, terms: &[saju::SolarTerm], i18n: &I18n) {
    println!("{} ({} {})", i18n.terms_heading(), tz_spec.name(), i18n.tz_label());
    for term in terms {
        let utc = astro::datetime_from_jd(term.jd);
        let local = tz_spec.to_local(utc);
        println!(
            "- {}: {}",
            i18n.term_name(term.def),
            local.format("%Y-%m-%d %H:%M:%S")
        );
    }
    println!();
}
