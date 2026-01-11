use crate::astro::compute_solar_terms;
use crate::bazi::{month_branch_from_term_key, month_stem_from_year, year_pillar};
use crate::types::{Direction, Gender, Pillar, SolarTerm};

#[derive(Clone, Copy, Debug)]
pub struct DaewonItem {
    pub start_months: i32,
    pub pillar: Pillar,
}

#[derive(Clone, Copy, Debug)]
pub struct YearLuck {
    pub year: i32,
    pub start_jd: f64,
    pub end_jd: f64,
    pub pillar: Pillar,
}

#[derive(Clone, Copy, Debug)]
pub struct MonthLuck {
    pub start_jd: f64,
    pub end_jd: f64,
    pub pillar: Pillar,
    pub branch: usize,
}

#[derive(Clone, Debug)]
pub struct MonthlyLuck {
    pub year: i32,
    pub year_pillar: Pillar,
    pub months: Vec<MonthLuck>,
}

pub fn daewon_direction(gender: Gender, year_stem: usize) -> Direction {
    let yang = year_stem % 2 == 0;
    match (gender, yang) {
        (Gender::Male, true) | (Gender::Female, false) => Direction::Forward,
        _ => Direction::Backward,
    }
}

pub fn daewon_start_months(
    birth_jd: f64,
    terms_prev: &[SolarTerm],
    terms_curr: &[SolarTerm],
    terms_next: &[SolarTerm],
    direction: Direction,
) -> Option<i32> {
    let mut all_terms: Vec<SolarTerm> = Vec::new();
    all_terms.extend(terms_prev.iter().copied());
    all_terms.extend(terms_curr.iter().copied());
    all_terms.extend(terms_next.iter().copied());

    let target = match direction {
        Direction::Forward => all_terms
            .iter()
            .filter(|t| t.jd > birth_jd)
            .min_by(|a, b| a.jd.partial_cmp(&b.jd).unwrap()),
        Direction::Backward => all_terms
            .iter()
            .filter(|t| t.jd < birth_jd)
            .max_by(|a, b| a.jd.partial_cmp(&b.jd).unwrap()),
    }?;

    let diff_days = (target.jd - birth_jd).abs();
    let months = (diff_days / 3.0 * 12.0).round() as i32;
    Some(months)
}

pub fn build_daewon_pillars(
    month_pillar: Pillar,
    direction: Direction,
    count: usize,
) -> Vec<Pillar> {
    let mut pillars = Vec::with_capacity(count);
    let mut stem = month_pillar.stem as i32;
    let mut branch = month_pillar.branch as i32;
    for _ in 0..count {
        match direction {
            Direction::Forward => {
                stem = (stem + 1) % 10;
                branch = (branch + 1) % 12;
            }
            Direction::Backward => {
                stem = (stem - 1).rem_euclid(10);
                branch = (branch - 1).rem_euclid(12);
            }
        }
        pillars.push(Pillar {
            stem: stem as usize,
            branch: branch as usize,
        });
    }
    pillars
}

pub fn build_daewon_items(start_months: i32, pillars: &[Pillar]) -> Vec<DaewonItem> {
    pillars
        .iter()
        .enumerate()
        .map(|(idx, pillar)| DaewonItem {
            start_months: start_months + (idx as i32) * 120,
            pillar: *pillar,
        })
        .collect()
}

pub fn yearly_luck(start_year: i32, count: usize) -> Result<Vec<YearLuck>, String> {
    let mut results = Vec::with_capacity(count);
    for idx in 0..count {
        let year = start_year + idx as i32;
        let terms_curr = compute_solar_terms(year);
        let terms_next = compute_solar_terms(year + 1);
        let lichun_curr = terms_curr
            .iter()
            .find(|t| t.def.key == "lichun")
            .ok_or("failed to find lichun for yearly luck")?
            .jd;
        let lichun_next = terms_next
            .iter()
            .find(|t| t.def.key == "lichun")
            .ok_or("failed to find next lichun for yearly luck")?
            .jd;
        let (year_stem, year_branch) = year_pillar(year);
        results.push(YearLuck {
            year,
            start_jd: lichun_curr,
            end_jd: lichun_next,
            pillar: Pillar {
                stem: year_stem,
                branch: year_branch,
            },
        });
    }
    Ok(results)
}

pub fn monthly_luck(year: i32) -> Result<MonthlyLuck, String> {
    let terms_curr = compute_solar_terms(year);
    let terms_next = compute_solar_terms(year + 1);
    let lichun_curr = terms_curr
        .iter()
        .find(|t| t.def.key == "lichun")
        .ok_or("failed to find lichun term for monthly luck")?
        .jd;
    let lichun_next = terms_next
        .iter()
        .find(|t| t.def.key == "lichun")
        .ok_or("failed to find next lichun term for monthly luck")?
        .jd;

    let mut boundaries: Vec<SolarTerm> = terms_curr
        .iter()
        .chain(terms_next.iter())
        .filter(|t| month_branch_from_term_key(t.def.key).is_some())
        .copied()
        .collect();
    boundaries.sort_by(|a, b| a.jd.partial_cmp(&b.jd).unwrap());
    let mut boundaries: Vec<SolarTerm> = boundaries
        .into_iter()
        .filter(|t| t.jd >= lichun_curr && t.jd <= lichun_next)
        .collect();

    if boundaries.is_empty() {
        return Err("failed to build monthly boundaries".to_string());
    }
    if boundaries[0].def.key != "lichun" {
        if let Some(idx) = boundaries.iter().position(|t| t.def.key == "lichun") {
            boundaries = boundaries[idx..].to_vec();
        }
    }
    if boundaries.len() < 13 {
        return Err("monthly boundary count insufficient".to_string());
    }

    let (year_stem, year_branch) = year_pillar(year);
    let mut months = Vec::with_capacity(12);
    for idx in 0..12 {
        let start = boundaries[idx];
        let end = boundaries[idx + 1];
        let branch = month_branch_from_term_key(start.def.key)
            .ok_or("invalid month boundary for monthly luck")?;
        let stem = month_stem_from_year(year_stem, branch);
        months.push(MonthLuck {
            start_jd: start.jd,
            end_jd: end.jd,
            pillar: Pillar { stem, branch },
            branch,
        });
    }

    Ok(MonthlyLuck {
        year,
        year_pillar: Pillar {
            stem: year_stem,
            branch: year_branch,
        },
        months,
    })
}
