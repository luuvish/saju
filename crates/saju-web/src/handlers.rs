use axum::extract::Form;
use axum::response::IntoResponse;
use chrono::NaiveDate;
use serde::Deserialize;

use saju_lib::bazi;
use saju_lib::i18n::{I18n, Lang, PillarKind};
use saju_lib::location;
use saju_lib::service::{CalendarType, SajuRequest, SajuResult};
use saju_lib::types::{Element, Gender};
use saju_lib::astro;

use crate::templates::{
    DaewonView, ElementView, ErrorTemplate, HiddenStemRow, IndexTemplate, LocationItem,
    MonthlyLuckItemView, PillarView, ResultTemplate, TenGodsHiddenRow, YearlyLuckView,
};

#[derive(Deserialize)]
pub struct SajuFormInput {
    pub date: String,
    pub time: String,
    pub calendar: String,
    pub leap_month: Option<String>,
    pub gender: String,
    pub tz: Option<String>,
    pub location: Option<String>,
    pub longitude: Option<String>,
    pub lang: Option<String>,
}

pub async fn index() -> impl IntoResponse {
    let locations: Vec<LocationItem> = location::location_list()
        .into_iter()
        .map(|loc| LocationItem {
            key: loc.key.to_string(),
            display: loc.display.to_string(),
        })
        .collect();
    IndexTemplate { locations }
}

pub async fn calculate(Form(input): Form<SajuFormInput>) -> impl IntoResponse {
    match do_calculate(input) {
        Ok(tmpl) => tmpl.into_response(),
        Err(msg) => ErrorTemplate { message: msg }.into_response(),
    }
}

fn do_calculate(input: SajuFormInput) -> Result<ResultTemplate, String> {
    let date = NaiveDate::parse_from_str(&input.date, "%Y-%m-%d")
        .map_err(|_| "Invalid date format. Use YYYY-MM-DD.".to_string())?;

    let calendar = match input.calendar.as_str() {
        "lunar" => CalendarType::Lunar,
        _ => CalendarType::Solar,
    };
    let leap_month = input.leap_month.is_some();
    let gender = match input.gender.as_str() {
        "female" => Gender::Female,
        _ => Gender::Male,
    };
    let tz = input.tz.unwrap_or_else(|| "Asia/Seoul".to_string());
    let lang = match input.lang.as_deref() {
        Some("en") => Lang::En,
        _ => Lang::Ko,
    };

    let longitude: Option<f64> = input
        .longitude
        .as_deref()
        .and_then(|s| if s.is_empty() { None } else { Some(s) })
        .map(|s| s.parse::<f64>())
        .transpose()
        .map_err(|_| "Invalid longitude value.".to_string())?;

    let loc = input
        .location
        .as_deref()
        .and_then(|s| if s.is_empty() { None } else { Some(s.to_string()) });

    let use_lmt = longitude.is_some() || loc.is_some();

    let req = SajuRequest {
        date,
        time: input.time.clone(),
        calendar,
        leap_month,
        gender,
        tz,
        use_lmt,
        longitude,
        location: loc,
        daewon_count: 10,
        month_year: None,
        year_start: None,
        year_count: 10,
    };

    let result = saju_lib::service::calculate(&req)?;
    let i18n = I18n::new(lang);

    Ok(build_result_template(&result, &i18n))
}

fn element_css(element: Element) -> &'static str {
    match element {
        Element::Wood => "element-wood",
        Element::Fire => "element-fire",
        Element::Earth => "element-earth",
        Element::Metal => "element-metal",
        Element::Water => "element-water",
    }
}

fn build_result_template(result: &SajuResult, i18n: &I18n) -> ResultTemplate {
    let pillars = build_pillars(result, i18n);
    let hidden_stems = build_hidden_stems(result, i18n);
    let ten_gods_stem_line = build_ten_gods_stem_line(result, i18n);
    let ten_gods_branch_line = build_ten_gods_branch_line(result, i18n);
    let ten_gods_hidden = build_ten_gods_hidden(result, i18n);
    let twelve_stages_line = build_twelve_stages(result, i18n);
    let twelve_shinsal_line = build_twelve_shinsal(result, i18n);
    let strength = build_strength(result, i18n);
    let elements = build_elements(result, i18n);
    let daewon = build_daewon(result, i18n);
    let yearly_luck = build_yearly_luck(result, i18n);
    let monthly_luck = build_monthly_luck(result, i18n);

    // Header
    let title = i18n.title().to_string();
    let input_line = format!(
        "{}({}): {} {} {}",
        i18n.input_label(),
        i18n.calendar_label(result.calendar_is_lunar, result.leap_month),
        result.input_date,
        result.input_time,
        result.tz_name
    );
    let converted_solar_line = result.converted_solar.map(|d| {
        format!(
            "{}: {} {} {}",
            i18n.converted_solar_label(),
            d.format("%Y-%m-%d"),
            result.input_time,
            result.tz_name
        )
    });
    let converted_lunar_line = result.converted_lunar.as_ref().map(|l| {
        let suffix = if l.is_leap { i18n.leap_suffix() } else { "" };
        format!(
            "{}: {:04}-{:02}-{:02}{}",
            i18n.converted_lunar_label(),
            l.year,
            l.month,
            l.day,
            suffix
        )
    });
    let gender_line = format!("{}: {}", i18n.gender_label(), i18n.gender_value(result.gender));

    let strength_heading = i18n.strength_heading().to_string();
    let elements_heading = i18n.elements_heading().to_string();
    let pillars_heading = i18n.pillars_heading().to_string();
    let hidden_stems_heading = i18n.hidden_stems_heading().to_string();
    let ten_gods_heading = i18n.ten_gods_heading().to_string();
    let twelve_stages_heading = i18n.twelve_stages_heading().to_string();
    let twelve_shinsal_heading = i18n.twelve_shinsal_heading().to_string();

    ResultTemplate {
        title,
        input_line,
        converted_solar_line,
        converted_lunar_line,
        gender_line,
        pillars_heading,
        pillars,
        hidden_stems_heading,
        hidden_stems,
        ten_gods_heading,
        ten_gods_stem_line,
        ten_gods_branch_line,
        ten_gods_hidden,
        twelve_stages_heading,
        twelve_stages_line,
        twelve_shinsal_heading,
        twelve_shinsal_line,
        strength_heading,
        strength,
        elements_heading,
        elements,
        daewon_heading: daewon.0,
        daewon_items: daewon.1,
        yearly_luck_heading: i18n.yearly_luck_heading().to_string(),
        yearly_luck_items: yearly_luck,
        monthly_luck_heading: monthly_luck.0,
        monthly_luck_year_line: monthly_luck.1,
        monthly_luck_items: monthly_luck.2,
    }
}

fn build_pillars(result: &SajuResult, i18n: &I18n) -> Vec<PillarView> {
    let kinds = [PillarKind::Hour, PillarKind::Day, PillarKind::Month, PillarKind::Year];
    let ps = [result.hour_pillar, result.day_pillar, result.month_pillar, result.year_pillar];
    kinds
        .iter()
        .zip(ps.iter())
        .map(|(kind, pillar)| {
            let stem_word = if matches!(kind, PillarKind::Day) {
                i18n.day_stem_word().to_string()
            } else {
                i18n.stem_word().to_string()
            };
            PillarView {
                kind: i18n.pillar_kind_label(*kind).to_string(),
                label: i18n.pillar_label(*pillar),
                stem_word,
                stem_element: i18n.element_label(bazi::stem_element(pillar.stem)).to_string(),
                stem_polarity: i18n.polarity_label(bazi::stem_polarity(pillar.stem)).to_string(),
                branch_word: i18n.branch_word().to_string(),
                branch_element: i18n.element_label(bazi::branch_element(pillar.branch)).to_string(),
                branch_polarity: i18n.polarity_label(bazi::branch_polarity(pillar.branch)).to_string(),
                stem_css: element_css(bazi::stem_element(pillar.stem)).to_string(),
                branch_css: element_css(bazi::branch_element(pillar.branch)).to_string(),
            }
        })
        .collect()
}

fn build_hidden_stems(result: &SajuResult, i18n: &I18n) -> Vec<HiddenStemRow> {
    let kinds = [PillarKind::Year, PillarKind::Month, PillarKind::Day, PillarKind::Hour];
    let branches = [
        result.year_pillar.branch,
        result.month_pillar.branch,
        result.day_pillar.branch,
        result.hour_pillar.branch,
    ];
    kinds
        .iter()
        .zip(branches.iter())
        .map(|(kind, &branch)| {
            let stems = bazi::hidden_stems(branch)
                .iter()
                .map(|&s| i18n.stem_label(s))
                .collect::<Vec<_>>()
                .join(", ");
            HiddenStemRow {
                kind: i18n.branch_kind_label(*kind).to_string(),
                stems,
            }
        })
        .collect()
}

fn build_ten_gods_stem_line(result: &SajuResult, i18n: &I18n) -> String {
    let ds = result.day_pillar.stem;
    format!(
        "{} {} / {} {} / {} {} / {} {}",
        i18n.stem_kind_label(PillarKind::Year),
        i18n.ten_god_label(bazi::ten_god(ds, result.year_pillar.stem)),
        i18n.stem_kind_label(PillarKind::Month),
        i18n.ten_god_label(bazi::ten_god(ds, result.month_pillar.stem)),
        i18n.stem_kind_label(PillarKind::Day),
        i18n.ten_god_label(bazi::ten_god(ds, result.day_pillar.stem)),
        i18n.stem_kind_label(PillarKind::Hour),
        i18n.ten_god_label(bazi::ten_god(ds, result.hour_pillar.stem))
    )
}

fn build_ten_gods_branch_line(result: &SajuResult, i18n: &I18n) -> String {
    let ds = result.day_pillar.stem;
    format!(
        "{} {} / {} {} / {} {} / {} {}",
        i18n.branch_kind_label(PillarKind::Year),
        i18n.ten_god_label(bazi::ten_god_branch(ds, result.year_pillar.branch)),
        i18n.branch_kind_label(PillarKind::Month),
        i18n.ten_god_label(bazi::ten_god_branch(ds, result.month_pillar.branch)),
        i18n.branch_kind_label(PillarKind::Day),
        i18n.ten_god_label(bazi::ten_god_branch(ds, result.day_pillar.branch)),
        i18n.branch_kind_label(PillarKind::Hour),
        i18n.ten_god_label(bazi::ten_god_branch(ds, result.hour_pillar.branch))
    )
}

fn build_ten_gods_hidden(result: &SajuResult, i18n: &I18n) -> Vec<TenGodsHiddenRow> {
    let ds = result.day_pillar.stem;
    let kinds = [PillarKind::Year, PillarKind::Month, PillarKind::Day, PillarKind::Hour];
    let branches = [
        result.year_pillar.branch,
        result.month_pillar.branch,
        result.day_pillar.branch,
        result.hour_pillar.branch,
    ];
    kinds
        .iter()
        .zip(branches.iter())
        .map(|(kind, &branch)| {
            let stems = bazi::hidden_stems(branch)
                .iter()
                .map(|&s| {
                    format!(
                        "{} {}",
                        i18n.stem_label(s),
                        i18n.ten_god_label(bazi::ten_god(ds, s))
                    )
                })
                .collect::<Vec<_>>()
                .join(", ");
            TenGodsHiddenRow {
                kind: i18n.branches_hidden_label(*kind),
                stems,
            }
        })
        .collect()
}

fn build_twelve_stages(result: &SajuResult, i18n: &I18n) -> String {
    let ds = result.day_pillar.stem;
    format!(
        "{}: {} / {}: {} / {}: {} / {}: {}",
        i18n.branch_kind_label(PillarKind::Year),
        i18n.stage_label(bazi::twelve_stage_index(ds, result.year_pillar.branch)),
        i18n.branch_kind_label(PillarKind::Month),
        i18n.stage_label(bazi::twelve_stage_index(ds, result.month_pillar.branch)),
        i18n.branch_kind_label(PillarKind::Day),
        i18n.stage_label(bazi::twelve_stage_index(ds, result.day_pillar.branch)),
        i18n.branch_kind_label(PillarKind::Hour),
        i18n.stage_label(bazi::twelve_stage_index(ds, result.hour_pillar.branch))
    )
}

fn build_twelve_shinsal(result: &SajuResult, i18n: &I18n) -> String {
    let yb = result.year_pillar.branch;
    format!(
        "{}: {} / {}: {} / {}: {} / {}: {}",
        i18n.branch_kind_label(PillarKind::Year),
        i18n.shinsal_label(bazi::twelve_shinsal_index(yb, result.year_pillar.branch)),
        i18n.branch_kind_label(PillarKind::Month),
        i18n.shinsal_label(bazi::twelve_shinsal_index(yb, result.month_pillar.branch)),
        i18n.branch_kind_label(PillarKind::Day),
        i18n.shinsal_label(bazi::twelve_shinsal_index(yb, result.day_pillar.branch)),
        i18n.branch_kind_label(PillarKind::Hour),
        i18n.shinsal_label(bazi::twelve_shinsal_index(yb, result.hour_pillar.branch))
    )
}

fn build_strength(result: &SajuResult, i18n: &I18n) -> Vec<String> {
    let s = &result.strength;
    let stage_bonus: i32 = match s.stage_class {
        saju_lib::StrengthClass::Strong => 2,
        saju_lib::StrengthClass::Weak => -2,
        saju_lib::StrengthClass::Neutral => 0,
    };
    let support_total = (s.support_stems as i32) * 2 + s.support_hidden as i32;
    let drain_total = (s.drain_stems as i32) * 2 + s.drain_hidden as i32;
    vec![
        format!(
            "{}: {} ({})",
            i18n.month_stage_label(),
            i18n.stage_label(s.stage_index),
            i18n.strength_class_label(s.stage_class)
        ),
        format!(
            "{}: {} / {}({} {}·{} {}) / {}({} {}·{} {})",
            i18n.root_label(),
            s.root_count,
            i18n.support_label(),
            i18n.stems_label(),
            s.support_stems,
            i18n.hidden_stems_heading(),
            s.support_hidden,
            i18n.drain_label(),
            i18n.stems_label(),
            s.drain_stems,
            i18n.hidden_stems_heading(),
            s.drain_hidden
        ),
        format!(
            "{}: {} ({} {} {} + {} {} + {} {} - {} {})",
            i18n.score_label(),
            s.total,
            i18n.basis_label(),
            i18n.month_stage_label(),
            stage_bonus,
            i18n.root_label(),
            s.root_count,
            i18n.support_label(),
            support_total,
            i18n.drain_label(),
            drain_total
        ),
        format!(
            "{}: {}",
            i18n.verdict_label(),
            i18n.strength_verdict_label(s.verdict)
        ),
    ]
}

fn build_elements(result: &SajuResult, i18n: &I18n) -> Vec<ElementView> {
    let counts = bazi::elements_count([
        result.year_pillar,
        result.month_pillar,
        result.day_pillar,
        result.hour_pillar,
    ]);
    let total: u16 = counts.iter().map(|&c| c as u16).sum();
    let elements = [
        Element::Wood,
        Element::Fire,
        Element::Earth,
        Element::Metal,
        Element::Water,
    ];
    elements
        .iter()
        .enumerate()
        .map(|(i, &el)| {
            let pct = if total > 0 {
                (counts[i] as f64 / total as f64) * 100.0
            } else {
                0.0
            };
            ElementView {
                name: i18n.element_short_label(el).to_string(),
                count: counts[i],
                percentage: pct.round(),
                css: element_css(el).to_string(),
            }
        })
        .collect()
}

fn build_daewon(result: &SajuResult, i18n: &I18n) -> (String, Vec<DaewonView>) {
    let heading = format!(
        "{} ({} , {} {})",
        i18n.daewon_heading(),
        i18n.direction_label(result.daewon_direction),
        i18n.start_label(),
        i18n.format_age(result.daewon_start_months, false)
    );
    let ds = result.day_pillar.stem;
    let items = result
        .daewon_items
        .iter()
        .map(|item| {
            let stem_el = bazi::stem_element(item.pillar.stem);
            DaewonView {
                age: i18n.format_age(item.start_months, true),
                pillar: i18n.pillar_label(item.pillar),
                stem_god: i18n
                    .ten_god_label(bazi::ten_god(ds, item.pillar.stem))
                    .to_string(),
                branch_god: i18n
                    .ten_god_label(bazi::ten_god_branch(ds, item.pillar.branch))
                    .to_string(),
                css: element_css(stem_el).to_string(),
            }
        })
        .collect();
    (heading, items)
}

fn build_yearly_luck(result: &SajuResult, i18n: &I18n) -> Vec<YearlyLuckView> {
    let ds = result.day_pillar.stem;
    result
        .yearly_luck
        .iter()
        .map(|y| {
            let start = result.tz_spec.to_local(astro::datetime_from_jd(y.start_jd));
            let end = result.tz_spec.to_local(astro::datetime_from_jd(y.end_jd));
            let stem_el = bazi::stem_element(y.pillar.stem);
            YearlyLuckView {
                label: i18n.format_year_label(y.year),
                period: format!(
                    "{} ~ {}",
                    start.format("%Y-%m-%d %H:%M"),
                    end.format("%Y-%m-%d %H:%M")
                ),
                pillar: i18n.pillar_label(y.pillar),
                stem_god: i18n.ten_god_label(bazi::ten_god(ds, y.pillar.stem)).to_string(),
                branch_god: i18n
                    .ten_god_label(bazi::ten_god_branch(ds, y.pillar.branch))
                    .to_string(),
                css: element_css(stem_el).to_string(),
            }
        })
        .collect()
}

fn build_monthly_luck(
    result: &SajuResult,
    i18n: &I18n,
) -> (String, String, Vec<MonthlyLuckItemView>) {
    let ds = result.day_pillar.stem;
    let ml = &result.monthly_luck;
    let heading = i18n.monthly_luck_heading(ml.year);
    let year_line = format!(
        "{}: {} | {}: {} {} / {} {}",
        i18n.year_luck_label(),
        i18n.pillar_label(ml.year_pillar),
        i18n.ten_gods_label(),
        i18n.stems_label(),
        i18n.ten_god_label(bazi::ten_god(ds, ml.year_pillar.stem)),
        i18n.branches_label(),
        i18n.ten_god_label(bazi::ten_god_branch(ds, ml.year_pillar.branch))
    );
    let items = ml
        .months
        .iter()
        .map(|m| {
            let start = result.tz_spec.to_local(astro::datetime_from_jd(m.start_jd));
            let end = result.tz_spec.to_local(astro::datetime_from_jd(m.end_jd));
            let stem_el = bazi::stem_element(m.pillar.stem);
            MonthlyLuckItemView {
                label: i18n.month_label(m.branch),
                period: format!(
                    "{} ~ {}",
                    start.format("%Y-%m-%d %H:%M"),
                    end.format("%Y-%m-%d %H:%M")
                ),
                pillar: i18n.pillar_label(m.pillar),
                stem_god: i18n.ten_god_label(bazi::ten_god(ds, m.pillar.stem)).to_string(),
                branch_god: i18n
                    .ten_god_label(bazi::ten_god_branch(ds, m.pillar.branch))
                    .to_string(),
                css: element_css(stem_el).to_string(),
            }
        })
        .collect();
    (heading, year_line, items)
}
