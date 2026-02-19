use clap::{Parser, ValueEnum};
use chrono::NaiveDate;

use saju_lib::astro;
use saju_lib::bazi;
use saju_lib::i18n::{I18n, Lang, PillarKind};
use saju_lib::luck;
use saju_lib::service::{CalendarType, SajuRequest, SajuResult};
use saju_lib::timezone::TimeZoneSpec;
use saju_lib::types::{Gender, Pillar, SolarTerm};
use saju_lib::{Direction, Element, StrengthClass};

#[derive(Clone, Copy, Debug, ValueEnum, PartialEq, Eq)]
enum CalendarArg {
    Solar,
    Lunar,
}

impl From<CalendarArg> for CalendarType {
    fn from(value: CalendarArg) -> Self {
        match value {
            CalendarArg::Solar => CalendarType::Solar,
            CalendarArg::Lunar => CalendarType::Lunar,
        }
    }
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
    calendar: CalendarArg,
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

    let gender = parse_gender(&args.gender)?;
    let use_lmt = args.local_mean_time || args.longitude.is_some() || args.location.is_some();

    let req = SajuRequest {
        date: input_date,
        time: args.time.clone(),
        calendar: args.calendar.into(),
        leap_month: args.leap_month,
        gender,
        tz: args.tz.clone(),
        use_lmt,
        longitude: args.longitude,
        location: args.location.clone(),
        daewon_count: args.daewon_count,
        month_year: args.month_year,
        year_start: args.year_start,
        year_count: args.year_count,
    };

    let result = saju_lib::service::calculate(&req)?;

    print_header(&result, &i18n);
    print_pillars(
        result.year_pillar,
        result.month_pillar,
        result.day_pillar,
        result.hour_pillar,
        &i18n,
    );
    print_hidden_stems(
        result.year_pillar,
        result.month_pillar,
        result.day_pillar,
        result.hour_pillar,
        &i18n,
    );
    print_ten_gods(
        result.year_pillar,
        result.month_pillar,
        result.day_pillar,
        result.hour_pillar,
        &i18n,
    );
    print_twelve_stages(
        result.day_pillar.stem,
        result.year_pillar,
        result.month_pillar,
        result.day_pillar,
        result.hour_pillar,
        &i18n,
    );
    print_twelve_shinsal(
        result.year_pillar.branch,
        result.year_pillar,
        result.month_pillar,
        result.day_pillar,
        result.hour_pillar,
        &i18n,
    );
    print_strength(result.strength, &i18n);
    print_elements(
        result.year_pillar,
        result.month_pillar,
        result.day_pillar,
        result.hour_pillar,
        &i18n,
    );
    print_daewon(
        result.daewon_direction,
        result.daewon_start_months,
        &result.daewon_items,
        result.day_pillar.stem,
        &i18n,
    );
    print_yearly_luck(
        &result.yearly_luck,
        result.day_pillar.stem,
        &result.tz_spec,
        &i18n,
    );
    print_monthly_luck(
        &result.monthly_luck,
        result.day_pillar.stem,
        &result.tz_spec,
        &i18n,
    );

    if args.show_terms {
        print_terms(&result.tz_spec, &result.solar_terms, &i18n);
    }

    Ok(())
}

fn parse_gender(input: &str) -> Result<Gender, String> {
    match input.to_lowercase().as_str() {
        "male" | "m" | "남" => Ok(Gender::Male),
        "female" | "f" | "여" => Ok(Gender::Female),
        _ => Err("gender must be male|female|m|f|남|여".to_string()),
    }
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

fn print_header(result: &SajuResult, i18n: &I18n) {
    println!("{}", i18n.title());
    println!(
        "- {}({}): {} {} {}",
        i18n.input_label(),
        i18n.calendar_label(result.calendar_is_lunar, result.leap_month),
        result.input_date,
        result.input_time,
        result.tz_name
    );
    if let Some(date) = result.converted_solar {
        println!(
            "- {}: {} {} {}",
            i18n.converted_solar_label(),
            date.format("%Y-%m-%d"),
            result.input_time,
            result.tz_name
        );
    }
    if let Some(ref lunar) = result.converted_lunar {
        let leap_suffix = if lunar.is_leap {
            i18n.leap_suffix()
        } else {
            ""
        };
        println!(
            "- {}: {:04}-{:02}-{:02}{}",
            i18n.converted_lunar_label(),
            lunar.year,
            lunar.month,
            lunar.day,
            leap_suffix
        );
    }
    if let Some(ref info) = result.lmt_info {
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
            result.tz_name
        );
    }
    println!(
        "- {}: {}",
        i18n.gender_label(),
        i18n.gender_value(result.gender)
    );
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
        StrengthClass::Strong => 2,
        StrengthClass::Weak => -2,
        StrengthClass::Neutral => 0,
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
        i18n.element_short_label(Element::Wood),
        counts[0],
        i18n.element_short_label(Element::Fire),
        counts[1],
        i18n.element_short_label(Element::Earth),
        counts[2],
        i18n.element_short_label(Element::Metal),
        counts[3],
        i18n.element_short_label(Element::Water),
        counts[4]
    );
    println!();
}

fn print_daewon(
    direction: Direction,
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

fn print_terms(tz_spec: &TimeZoneSpec, terms: &[SolarTerm], i18n: &I18n) {
    println!(
        "{} ({} {})",
        i18n.terms_heading(),
        tz_spec.name(),
        i18n.tz_label()
    );
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
