use crate::types::{
    Element, Pillar, Relation, SolarTerm, StrengthClass, StrengthVerdict, TenGod,
};

const HIDDEN_STEMS: [&[usize]; 12] = [
    &[9],          // 자: 癸
    &[5, 9, 7],    // 축: 己 癸 辛
    &[0, 2, 4],    // 인: 甲 丙 戊
    &[1],          // 묘: 乙
    &[4, 1, 9],    // 진: 戊 乙 癸
    &[2, 4, 6],    // 사: 丙 戊 庚
    &[3, 5],       // 오: 丁 己
    &[5, 3, 1],    // 미: 己 丁 乙
    &[6, 8, 4],    // 신: 庚 壬 戊
    &[7],          // 유: 辛
    &[4, 7, 3],    // 술: 戊 辛 丁
    &[8, 0],       // 해: 壬 甲
];

const CHANGSHENG_START: [usize; 10] = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];

#[derive(Clone, Copy, Debug)]
pub struct StrengthResult {
    pub stage_index: usize,
    pub stage_class: StrengthClass,
    pub root_count: usize,
    pub support_stems: usize,
    pub support_hidden: usize,
    pub drain_stems: usize,
    pub drain_hidden: usize,
    pub total: i32,
    pub verdict: StrengthVerdict,
}

pub fn year_pillar(year: i32) -> (usize, usize) {
    let stem = (year - 4).rem_euclid(10) as usize;
    let branch = (year - 4).rem_euclid(12) as usize;
    (stem, branch)
}

pub fn month_branch_for_birth(
    birth_jd: f64,
    terms_prev: &[SolarTerm],
    terms_curr: &[SolarTerm],
) -> Result<usize, String> {
    let mut boundaries: Vec<&SolarTerm> = terms_prev
        .iter()
        .chain(terms_curr.iter())
        .filter(|t| month_branch_from_term_key(t.def.key).is_some())
        .collect();
    boundaries.sort_by(|a, b| a.jd.partial_cmp(&b.jd).unwrap());

    let mut last = None;
    for term in boundaries {
        if term.jd <= birth_jd {
            last = Some(term);
        } else {
            break;
        }
    }
    let term = last.ok_or("failed to determine month boundary")?;
    month_branch_from_term_key(term.def.key)
        .ok_or_else(|| "invalid month boundary term".to_string())
}

pub fn month_branch_from_term_key(key: &str) -> Option<usize> {
    match key {
        "lichun" => Some(2),
        "jingzhe" => Some(3),
        "qingming" => Some(4),
        "lixia" => Some(5),
        "mangzhong" => Some(6),
        "xiaoshu" => Some(7),
        "liqiu" => Some(8),
        "bailu" => Some(9),
        "hanlu" => Some(10),
        "lidong" => Some(11),
        "daxue" => Some(0),
        "xiaohan" => Some(1),
        _ => None,
    }
}

pub fn month_stem_from_year(year_stem: usize, month_branch: usize) -> usize {
    (year_stem * 2 + month_branch) % 10
}

pub fn jdn_from_date(year: i32, month: u32, day: u32) -> i64 {
    let a = (14 - month as i32) / 12;
    let y = year + 4800 - a;
    let m = month as i32 + 12 * a - 3;
    let jdn = day as i32
        + ((153 * m + 2) / 5)
        + 365 * y
        + y / 4
        - y / 100
        + y / 400
        - 32045;
    jdn as i64
}

pub fn day_pillar_from_jdn(jdn: i64) -> (usize, usize) {
    let stem = (jdn + 9).rem_euclid(10) as usize;
    let branch = (jdn + 1).rem_euclid(12) as usize;
    (stem, branch)
}

pub fn hour_branch_index(hour: u32, minute: u32) -> usize {
    let total_minutes = hour * 60 + minute;
    ((total_minutes + 60) / 120 % 12) as usize
}

pub fn hour_stem_from_day(day_stem: usize, hour_branch: usize) -> usize {
    (day_stem * 2 + hour_branch) % 10
}

pub fn stem_element(stem: usize) -> Element {
    match stem {
        0 | 1 => Element::Wood,
        2 | 3 => Element::Fire,
        4 | 5 => Element::Earth,
        6 | 7 => Element::Metal,
        _ => Element::Water,
    }
}

pub fn branch_element(branch: usize) -> Element {
    match branch {
        0 => Element::Water,
        1 => Element::Earth,
        2 | 3 => Element::Wood,
        4 => Element::Earth,
        5 | 6 => Element::Fire,
        7 => Element::Earth,
        8 | 9 => Element::Metal,
        10 => Element::Earth,
        _ => Element::Water,
    }
}

pub fn element_generates(element: Element) -> Element {
    match element {
        Element::Wood => Element::Fire,
        Element::Fire => Element::Earth,
        Element::Earth => Element::Metal,
        Element::Metal => Element::Water,
        Element::Water => Element::Wood,
    }
}

pub fn element_controls(element: Element) -> Element {
    match element {
        Element::Wood => Element::Earth,
        Element::Earth => Element::Water,
        Element::Water => Element::Fire,
        Element::Fire => Element::Metal,
        Element::Metal => Element::Wood,
    }
}

pub fn stem_polarity(stem: usize) -> bool {
    stem % 2 == 0
}

pub fn branch_polarity(branch: usize) -> bool {
    branch % 2 == 0
}

pub fn relation(day: Element, target: Element) -> Relation {
    if day == target {
        Relation::Same
    } else if element_generates(day) == target {
        Relation::Output
    } else if element_controls(day) == target {
        Relation::Wealth
    } else if element_generates(target) == day {
        Relation::Resource
    } else {
        Relation::Officer
    }
}

pub fn ten_god(day_stem: usize, target_stem: usize) -> TenGod {
    let day_element = stem_element(day_stem);
    let target_element = stem_element(target_stem);
    let same_polarity = stem_polarity(day_stem) == stem_polarity(target_stem);
    match relation(day_element, target_element) {
        Relation::Same => {
            if same_polarity {
                TenGod::BiGyeon
            } else {
                TenGod::GeopJae
            }
        }
        Relation::Output => {
            if same_polarity {
                TenGod::SikShin
            } else {
                TenGod::SangGwan
            }
        }
        Relation::Wealth => {
            if same_polarity {
                TenGod::PyeonJae
            } else {
                TenGod::JeongJae
            }
        }
        Relation::Officer => {
            if same_polarity {
                TenGod::ChilSal
            } else {
                TenGod::JeongGwan
            }
        }
        Relation::Resource => {
            if same_polarity {
                TenGod::PyeonIn
            } else {
                TenGod::JeongIn
            }
        }
    }
}

pub fn hidden_stems(branch: usize) -> &'static [usize] {
    HIDDEN_STEMS[branch]
}

pub fn main_hidden_stem(branch: usize) -> usize {
    hidden_stems(branch)[0]
}

pub fn ten_god_branch(day_stem: usize, branch: usize) -> TenGod {
    ten_god(day_stem, main_hidden_stem(branch))
}

pub fn twelve_stage_index(day_stem: usize, branch: usize) -> usize {
    let start = CHANGSHENG_START[day_stem];
    if stem_polarity(day_stem) {
        (branch + 12 - start) % 12
    } else {
        (start + 12 - branch) % 12
    }
}

pub fn stage_strength_class(stage_index: usize) -> StrengthClass {
    match stage_index {
        0..=4 => StrengthClass::Strong,
        5..=9 => StrengthClass::Weak,
        _ => StrengthClass::Neutral,
    }
}

pub fn shinsal_start_branch(year_branch: usize) -> usize {
    match year_branch {
        0 | 4 | 8 => 2,  // 申子辰 -> 寅
        2 | 6 | 10 => 8, // 寅午戌 -> 申
        3 | 7 | 11 => 5, // 亥卯未 -> 巳
        1 | 5 | 9 => 11, // 巳酉丑 -> 亥
        _ => 0,
    }
}

pub fn twelve_shinsal_index(year_branch: usize, branch: usize) -> usize {
    let start = shinsal_start_branch(year_branch);
    (branch + 12 - start) % 12
}

pub fn element_index(element: Element) -> usize {
    match element {
        Element::Wood => 0,
        Element::Fire => 1,
        Element::Earth => 2,
        Element::Metal => 3,
        Element::Water => 4,
    }
}

pub fn elements_count(pillars: [Pillar; 4]) -> [u8; 5] {
    let mut counts = [0u8; 5];
    for pillar in pillars.iter() {
        counts[element_index(stem_element(pillar.stem))] += 1;
        counts[element_index(branch_element(pillar.branch))] += 1;
    }
    counts
}

pub fn assess_strength(day_stem: usize, pillars: [Pillar; 4]) -> StrengthResult {
    let day_element = stem_element(day_stem);
    let stage_index = twelve_stage_index(day_stem, pillars[1].branch);
    let stage_class = stage_strength_class(stage_index);

    let mut root_count = 0usize;
    let mut support_stems = 0usize;
    let mut drain_stems = 0usize;
    let mut support_hidden = 0usize;
    let mut drain_hidden = 0usize;

    for pillar in pillars.iter() {
        let stem_rel = relation(day_element, stem_element(pillar.stem));
        match stem_rel {
            Relation::Same | Relation::Resource => support_stems += 1,
            Relation::Output | Relation::Wealth | Relation::Officer => drain_stems += 1,
        }

        let mut has_root = false;
        for &hidden in hidden_stems(pillar.branch) {
            if stem_element(hidden) == day_element {
                has_root = true;
            }
            let rel = relation(day_element, stem_element(hidden));
            match rel {
                Relation::Same | Relation::Resource => support_hidden += 1,
                Relation::Output | Relation::Wealth | Relation::Officer => drain_hidden += 1,
            }
        }
        if has_root {
            root_count += 1;
        }
    }

    let stage_bonus: i32 = match stage_class {
        StrengthClass::Strong => 2,
        StrengthClass::Weak => -2,
        StrengthClass::Neutral => 0,
    };
    let support_total = (support_stems as i32) * 2 + support_hidden as i32;
    let drain_total = (drain_stems as i32) * 2 + drain_hidden as i32;
    let total = stage_bonus + root_count as i32 + support_total - drain_total;

    let verdict = if total >= 3 {
        StrengthVerdict::Strong
    } else if total <= -3 {
        StrengthVerdict::Weak
    } else {
        StrengthVerdict::Neutral
    };

    StrengthResult {
        stage_index,
        stage_class,
        root_count,
        support_stems,
        support_hidden,
        drain_stems,
        drain_hidden,
        total,
        verdict,
    }
}
