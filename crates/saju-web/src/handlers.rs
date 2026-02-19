use axum::extract::Form;
use axum::response::IntoResponse;
use chrono::{Datelike, NaiveDate, Utc};
use serde::Deserialize;

use saju_lib::bazi;
use saju_lib::luck;
use saju_lib::i18n::{I18n, Lang, PillarKind};
use saju_lib::location;
use saju_lib::service::{CalendarType, SajuRequest, SajuResult};
use saju_lib::types::{BranchRelationType, Element, Gender, StemRelationType};
use saju_lib::astro;

use crate::templates::{
    DaewonView, ElementView, ErrorTemplate, IndexTemplate, InteractionView, LocationItem,
    MonthlyLuckItemView, PillarColumnView, ResultTemplate, ShinsalView, YearlyLuckView,
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
    let now_utc = Utc::now();
    let now_jd = astro::jd_from_datetime(now_utc);
    let now_local = result.tz_spec.to_local(now_utc);

    // Compute current age in months for daewon highlighting
    let solar_birth = if result.calendar_is_lunar {
        result.converted_solar
    } else {
        NaiveDate::parse_from_str(&result.input_date, "%Y-%m-%d").ok()
    };
    let age_months = solar_birth.map(|bd| {
        (now_local.year() - bd.year()) * 12 + (now_local.month() as i32 - bd.month() as i32)
    });

    let pillar_columns = build_pillar_columns(result, i18n);
    let relations = build_relations(result, i18n);
    let shinsal_extra = build_shinsal_extra(result, i18n);
    let strength = build_strength(result, i18n);
    let elements = build_elements(result, i18n);
    let daewon = build_daewon(result, i18n, age_months);
    let yearly_luck = build_yearly_luck(result, i18n, now_jd);
    let monthly_luck = build_monthly_luck(result, i18n, now_jd);

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

    ResultTemplate {
        title,
        input_line,
        converted_solar_line,
        converted_lunar_line,
        gender_line,
        pillars_table_heading: i18n.pillars_heading().to_string(),
        pillar_columns,
        relations_heading: i18n.relations_heading().to_string(),
        relations,
        shinsal_extra_heading: i18n.shinsal_extra_heading().to_string(),
        shinsal_extra,
        strength_heading: i18n.strength_heading().to_string(),
        strength,
        elements_heading: i18n.elements_heading().to_string(),
        elements,
        daewon_heading: daewon.0,
        daewon_items: daewon.1,
        yearly_luck_heading: i18n.yearly_luck_heading().to_string(),
        yearly_luck_items: yearly_luck,
        monthly_luck_heading: monthly_luck.0,
        monthly_luck_items: monthly_luck.1,
    }
}

fn build_pillar_columns(result: &SajuResult, i18n: &I18n) -> Vec<PillarColumnView> {
    let ds = result.day_pillar.stem;
    let yb = result.year_pillar.branch;
    let kinds = [PillarKind::Hour, PillarKind::Day, PillarKind::Month, PillarKind::Year];
    let pillars = [result.hour_pillar, result.day_pillar, result.month_pillar, result.year_pillar];

    kinds
        .iter()
        .zip(pillars.iter())
        .map(|(kind, pillar)| {
            let stem_el = bazi::stem_element(pillar.stem);
            let stem_pol = bazi::stem_polarity(pillar.stem);
            let branch_el = bazi::branch_element(pillar.branch);
            let branch_pol = bazi::branch_polarity(pillar.branch);

            let stem_sub = format!(
                "{}{}",
                if stem_pol { "+" } else { "-" },
                i18n.element_short_label(stem_el)
            );
            let branch_sub = format!(
                "{}{}",
                if branch_pol { "+" } else { "-" },
                i18n.element_short_label(branch_el)
            );

            let hidden = bazi::hidden_stems(pillar.branch)
                .iter()
                .map(|&s| i18n.stem_label(s))
                .collect::<Vec<_>>()
                .join(", ");

            PillarColumnView {
                kind: i18n.pillar_kind_label(*kind).to_string(),
                stem_god: i18n.ten_god_label(bazi::ten_god(ds, pillar.stem)).to_string(),
                stem_label: i18n.stem_label(pillar.stem),
                stem_sub,
                stem_css: element_css(stem_el).to_string(),
                branch_god: i18n
                    .ten_god_label(bazi::ten_god_branch(ds, pillar.branch))
                    .to_string(),
                branch_label: i18n.branch_label(pillar.branch),
                branch_sub,
                branch_css: element_css(branch_el).to_string(),
                hidden_stems: hidden,
                stage: i18n
                    .stage_label(bazi::twelve_stage_index(ds, pillar.branch))
                    .to_string(),
                shinsal: i18n
                    .shinsal_label(bazi::twelve_shinsal_index(yb, pillar.branch))
                    .to_string(),
                is_day: matches!(kind, PillarKind::Day),
            }
        })
        .collect()
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

fn luck_stem_sub(i18n: &I18n, stem: usize) -> String {
    let pol = bazi::stem_polarity(stem);
    let el = bazi::stem_element(stem);
    format!("{}{}", if pol { "+" } else { "-" }, i18n.element_short_label(el))
}

fn luck_branch_sub(i18n: &I18n, branch: usize) -> String {
    let pol = bazi::branch_polarity(branch);
    let el = bazi::branch_element(branch);
    format!("{}{}", if pol { "+" } else { "-" }, i18n.element_short_label(el))
}

fn build_daewon(
    result: &SajuResult,
    i18n: &I18n,
    age_months: Option<i32>,
) -> (String, Vec<DaewonView>) {
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
            let p = item.pillar;
            let is_current = age_months
                .map(|am| am >= item.start_months && am < item.start_months + 120)
                .unwrap_or(false);
            DaewonView {
                age: i18n.format_age(item.start_months, true),
                stem_label: i18n.stem_label(p.stem),
                stem_sub: luck_stem_sub(i18n, p.stem),
                stem_css: element_css(bazi::stem_element(p.stem)).to_string(),
                stem_god: i18n.ten_god_label(bazi::ten_god(ds, p.stem)).to_string(),
                branch_label: i18n.branch_label(p.branch),
                branch_sub: luck_branch_sub(i18n, p.branch),
                branch_css: element_css(bazi::branch_element(p.branch)).to_string(),
                branch_god: i18n
                    .ten_god_label(bazi::ten_god_branch(ds, p.branch))
                    .to_string(),
                stage: i18n.stage_label(bazi::twelve_stage_index(ds, p.branch)).to_string(),
                is_current,
            }
        })
        .collect();
    (heading, items)
}

fn build_yearly_luck(result: &SajuResult, i18n: &I18n, now_jd: f64) -> Vec<YearlyLuckView> {
    let ds = result.day_pillar.stem;
    result
        .yearly_luck
        .iter()
        .map(|y| {
            let p = y.pillar;
            let is_current = now_jd >= y.start_jd && now_jd < y.end_jd;
            YearlyLuckView {
                label: i18n.format_year_label(y.year),
                stem_label: i18n.stem_label(p.stem),
                stem_sub: luck_stem_sub(i18n, p.stem),
                stem_css: element_css(bazi::stem_element(p.stem)).to_string(),
                stem_god: i18n.ten_god_label(bazi::ten_god(ds, p.stem)).to_string(),
                branch_label: i18n.branch_label(p.branch),
                branch_sub: luck_branch_sub(i18n, p.branch),
                branch_css: element_css(bazi::branch_element(p.branch)).to_string(),
                branch_god: i18n
                    .ten_god_label(bazi::ten_god_branch(ds, p.branch))
                    .to_string(),
                stage: i18n.stage_label(bazi::twelve_stage_index(ds, p.branch)).to_string(),
                is_current,
            }
        })
        .collect()
}

fn interaction_css(rel_type: &str) -> String {
    format!("interaction-{}", rel_type)
}

fn build_relations(result: &SajuResult, i18n: &I18n) -> Vec<InteractionView> {
    let mut views = Vec::new();

    for si in &result.stem_interactions {
        let positions_label = si
            .positions
            .iter()
            .map(|p| i18n.position_label(*p))
            .collect::<Vec<_>>()
            .join("-");
        let detail = if let Some(el) = si.result_element {
            format!(
                "{}-{} → {}",
                i18n.stem_label(si.stems[0]),
                i18n.stem_label(si.stems[1]),
                i18n.element_label(el)
            )
        } else {
            format!(
                "{}-{}",
                i18n.stem_label(si.stems[0]),
                i18n.stem_label(si.stems[1])
            )
        };
        let css = match si.relation {
            StemRelationType::Hap => interaction_css("hap"),
            StemRelationType::Chung => interaction_css("chung"),
        };
        views.push(InteractionView {
            relation_label: i18n.stem_relation_label(si.relation).to_string(),
            positions_label,
            detail,
            css_class: css,
        });
    }

    for bi in &result.branch_interactions {
        let positions_label = bi
            .positions
            .iter()
            .map(|p| i18n.position_label(*p))
            .collect::<Vec<_>>()
            .join("-");
        let branches_str = bi
            .branches
            .iter()
            .map(|&b| i18n.branch_label(b))
            .collect::<Vec<_>>()
            .join("-");
        let detail = if let Some(el) = bi.result_element {
            format!("{} → {}", branches_str, i18n.element_label(el))
        } else {
            branches_str
        };
        let css = match bi.relation {
            BranchRelationType::YukHap => interaction_css("yukhap"),
            BranchRelationType::Chung => interaction_css("chung"),
            BranchRelationType::Hyung => interaction_css("hyung"),
            BranchRelationType::Pa => interaction_css("pa"),
            BranchRelationType::Hae => interaction_css("hae"),
            BranchRelationType::BangHap => interaction_css("banghap"),
            BranchRelationType::SamHap => interaction_css("samhap"),
        };
        views.push(InteractionView {
            relation_label: i18n.branch_relation_label(bi.relation).to_string(),
            positions_label,
            detail,
            css_class: css,
        });
    }

    views
}

fn build_shinsal_extra(result: &SajuResult, i18n: &I18n) -> Vec<ShinsalView> {
    result
        .shinsal_entries
        .iter()
        .map(|entry| {
            let found_at = entry
                .found_at
                .iter()
                .map(|p| i18n.position_label(*p))
                .collect::<Vec<_>>()
                .join(", ");
            ShinsalView {
                name: i18n.shinsal_kind_label(entry.kind).to_string(),
                found_at,
                basis: i18n.basis_position_label(entry.basis),
            }
        })
        .collect()
}

fn build_monthly_luck_item(
    m: &saju_lib::luck::MonthLuck,
    ds: usize,
    i18n: &I18n,
    now_jd: f64,
) -> MonthlyLuckItemView {
    let p = m.pillar;
    let is_current = now_jd >= m.start_jd && now_jd < m.end_jd;
    MonthlyLuckItemView {
        label: i18n.month_label(m.branch),
        stem_label: i18n.stem_label(p.stem),
        stem_sub: luck_stem_sub(i18n, p.stem),
        stem_css: element_css(bazi::stem_element(p.stem)).to_string(),
        stem_god: i18n.ten_god_label(bazi::ten_god(ds, p.stem)).to_string(),
        branch_label: i18n.branch_label(p.branch),
        branch_sub: luck_branch_sub(i18n, p.branch),
        branch_css: element_css(bazi::branch_element(p.branch)).to_string(),
        branch_god: i18n
            .ten_god_label(bazi::ten_god_branch(ds, p.branch))
            .to_string(),
        stage: i18n.stage_label(bazi::twelve_stage_index(ds, p.branch)).to_string(),
        is_current,
    }
}

fn build_monthly_luck(
    result: &SajuResult,
    i18n: &I18n,
    now_jd: f64,
) -> (String, Vec<MonthlyLuckItemView>) {
    let ds = result.day_pillar.stem;
    let ml = &result.monthly_luck;
    let heading = i18n.monthly_luck_heading(ml.year);

    // Find which month is current in this year's cycle
    let current_idx = ml
        .months
        .iter()
        .position(|m| now_jd >= m.start_jd && now_jd < m.end_jd);

    // We want current month at ~1/3 position (index 4 in 12-item list).
    // If current is at index < 4, prepend previous year's months to shift it right.
    let prefix_count = match current_idx {
        Some(idx) if idx < 4 => 4 - idx,
        _ => 0,
    };

    let mut items: Vec<MonthlyLuckItemView> = Vec::new();

    if prefix_count > 0 {
        if let Ok(prev_ml) = luck::monthly_luck(ml.year - 1) {
            let skip = prev_ml.months.len().saturating_sub(prefix_count);
            for m in prev_ml.months.iter().skip(skip) {
                items.push(build_monthly_luck_item(m, ds, i18n, now_jd));
            }
        }
    }

    let remaining = 12 - items.len();
    for m in ml.months.iter().take(remaining) {
        items.push(build_monthly_luck_item(m, ds, i18n, now_jd));
    }

    (heading, items)
}
