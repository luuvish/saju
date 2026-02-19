use serde::Serialize;

use crate::types::{
    BranchInteraction, BranchRelationType, Element, Pillar, PillarPosition, Relation, ShinsalEntry,
    ShinsalKind, SolarTerm, StemInteraction, StemRelationType, StrengthClass, StrengthVerdict,
    TenGod,
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

#[derive(Clone, Copy, Debug, Serialize)]
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
    stem_polarity(main_hidden_stem(branch))
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
        0 | 4 | 8 => 8,  // 申子辰 -> 지살 at 申
        2 | 6 | 10 => 2, // 寅午戌 -> 지살 at 寅
        3 | 7 | 11 => 11, // 亥卯未 -> 지살 at 亥
        1 | 5 | 9 => 5,  // 巳酉丑 -> 지살 at 巳
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

// ── Stem interactions (천간 합/충) ──

/// 천간합: returns the resulting element if the pair forms a hap
pub fn stem_hap(a: usize, b: usize) -> Option<Element> {
    let (lo, hi) = if a < b { (a, b) } else { (b, a) };
    match (lo, hi) {
        (0, 5) => Some(Element::Earth), // 갑기합 → 토
        (1, 6) => Some(Element::Metal), // 을경합 → 금
        (2, 7) => Some(Element::Water), // 병신합 → 수
        (3, 8) => Some(Element::Wood),  // 정임합 → 목
        (4, 9) => Some(Element::Fire),  // 무계합 → 화
        _ => None,
    }
}

/// 천간충: returns true if the pair clashes
pub fn stem_chung(a: usize, b: usize) -> bool {
    let diff = (a as i32 - b as i32).unsigned_abs() as usize;
    // 천간충 pairs differ by exactly 6 (양간만): 갑경, 을신, 병임, 정계
    diff == 6 && a < 8 && b < 8
}

pub fn find_stem_interactions(pillars: [Pillar; 4]) -> Vec<StemInteraction> {
    const POS: [PillarPosition; 4] = [
        PillarPosition::Year,
        PillarPosition::Month,
        PillarPosition::Day,
        PillarPosition::Hour,
    ];
    let mut result = Vec::new();
    for i in 0..4 {
        for j in (i + 1)..4 {
            let a = pillars[i].stem;
            let b = pillars[j].stem;
            if let Some(el) = stem_hap(a, b) {
                result.push(StemInteraction {
                    relation: StemRelationType::Hap,
                    positions: [POS[i], POS[j]],
                    stems: [a, b],
                    result_element: Some(el),
                });
            }
            if stem_chung(a, b) {
                result.push(StemInteraction {
                    relation: StemRelationType::Chung,
                    positions: [POS[i], POS[j]],
                    stems: [a, b],
                    result_element: None,
                });
            }
        }
    }
    result
}

// ── Branch interactions (지지 관계) ──

/// 육합
fn branch_yuk_hap(a: usize, b: usize) -> Option<Element> {
    let (lo, hi) = if a < b { (a, b) } else { (b, a) };
    match (lo, hi) {
        (0, 1) => Some(Element::Earth),  // 자축합 → 토
        (2, 11) => Some(Element::Wood),  // 인해합 → 목
        (3, 10) => Some(Element::Fire),  // 묘술합 → 화
        (4, 9) => Some(Element::Metal),  // 진유합 → 금
        (5, 8) => Some(Element::Water),  // 사신합 → 수
        (6, 7) => Some(Element::Earth),  // 오미합 → 토
        _ => None,
    }
}

/// 충
fn branch_chung(a: usize, b: usize) -> bool {
    let diff = (a as i32 - b as i32).unsigned_abs() as usize;
    diff == 6
}

/// 형
fn branch_hyung(a: usize, b: usize) -> bool {
    let pairs: &[(usize, usize)] = &[
        (2, 5),   // 인사형
        (5, 8),   // 사신형
        (8, 2),   // 신인형
        (1, 10),  // 축술형
        (10, 7),  // 술미형
        (7, 1),   // 미축형
        (0, 3),   // 자묘형
        (3, 0),   // 묘자형
    ];
    pairs.iter().any(|&(x, y)| (a == x && b == y) || (a == y && b == x))
}

/// 자형 (self-punishment)
fn branch_self_hyung(a: usize, b: usize) -> bool {
    if a != b { return false; }
    matches!(a, 4 | 6 | 9 | 11) // 진진, 오오, 유유, 해해
}

/// 파
fn branch_pa(a: usize, b: usize) -> bool {
    let pairs: &[(usize, usize)] = &[
        (0, 9),  // 자유파
        (1, 4),  // 축진파
        (2, 11), // 인해파
        (3, 6),  // 묘오파
        (5, 8),  // 사신파
        (10, 7), // 술미파
    ];
    pairs.iter().any(|&(x, y)| (a == x && b == y) || (a == y && b == x))
}

/// 해
fn branch_hae(a: usize, b: usize) -> bool {
    let pairs: &[(usize, usize)] = &[
        (0, 7),   // 자미해
        (1, 6),   // 축오해
        (2, 5),   // 인사해
        (3, 4),   // 묘진해
        (8, 11),  // 신해해
        (9, 10),  // 유술해
    ];
    pairs.iter().any(|&(x, y)| (a == x && b == y) || (a == y && b == x))
}

/// 방합 triples
const BANG_HAP: [(usize, usize, usize, Element); 4] = [
    (2, 3, 4, Element::Wood),    // 인묘진 → 목
    (5, 6, 7, Element::Fire),    // 사오미 → 화
    (8, 9, 10, Element::Metal),  // 신유술 → 금
    (11, 0, 1, Element::Water),  // 해자축 → 수
];

/// 삼합 triples
const SAM_HAP: [(usize, usize, usize, Element); 4] = [
    (2, 6, 10, Element::Fire),   // 인오술 → 화
    (11, 3, 7, Element::Wood),   // 해묘미 → 목
    (8, 0, 4, Element::Water),   // 신자진 → 수
    (5, 9, 1, Element::Metal),   // 사유축 → 금
];

pub fn find_branch_interactions(pillars: [Pillar; 4]) -> Vec<BranchInteraction> {
    const POS: [PillarPosition; 4] = [
        PillarPosition::Year,
        PillarPosition::Month,
        PillarPosition::Day,
        PillarPosition::Hour,
    ];
    let branches: [usize; 4] = [
        pillars[0].branch,
        pillars[1].branch,
        pillars[2].branch,
        pillars[3].branch,
    ];
    let mut result = Vec::new();

    // Pairwise checks (6 pairs)
    for i in 0..4 {
        for j in (i + 1)..4 {
            let a = branches[i];
            let b = branches[j];

            if let Some(el) = branch_yuk_hap(a, b) {
                result.push(BranchInteraction {
                    relation: BranchRelationType::YukHap,
                    positions: vec![POS[i], POS[j]],
                    branches: vec![a, b],
                    result_element: Some(el),
                });
            }
            if branch_chung(a, b) {
                result.push(BranchInteraction {
                    relation: BranchRelationType::Chung,
                    positions: vec![POS[i], POS[j]],
                    branches: vec![a, b],
                    result_element: None,
                });
            }
            if branch_hyung(a, b) || branch_self_hyung(a, b) {
                result.push(BranchInteraction {
                    relation: BranchRelationType::Hyung,
                    positions: vec![POS[i], POS[j]],
                    branches: vec![a, b],
                    result_element: None,
                });
            }
            if branch_pa(a, b) {
                result.push(BranchInteraction {
                    relation: BranchRelationType::Pa,
                    positions: vec![POS[i], POS[j]],
                    branches: vec![a, b],
                    result_element: None,
                });
            }
            if branch_hae(a, b) {
                result.push(BranchInteraction {
                    relation: BranchRelationType::Hae,
                    positions: vec![POS[i], POS[j]],
                    branches: vec![a, b],
                    result_element: None,
                });
            }
        }
    }

    // Triple checks (방합, 삼합) — check all combinations of 3 pillars
    let triples: [(usize, usize, usize); 4] = [(0, 1, 2), (0, 1, 3), (0, 2, 3), (1, 2, 3)];

    for &(i, j, k) in &triples {
        let triple = [branches[i], branches[j], branches[k]];
        let mut tri_sorted = triple;
        tri_sorted.sort();

        for &(a, b, c, el) in &BANG_HAP {
            let mut target = [a, b, c];
            target.sort();
            if tri_sorted == target {
                result.push(BranchInteraction {
                    relation: BranchRelationType::BangHap,
                    positions: vec![POS[i], POS[j], POS[k]],
                    branches: vec![triple[0], triple[1], triple[2]],
                    result_element: Some(el),
                });
            }
        }

        for &(a, b, c, el) in &SAM_HAP {
            let mut target = [a, b, c];
            target.sort();
            if tri_sorted == target {
                result.push(BranchInteraction {
                    relation: BranchRelationType::SamHap,
                    positions: vec![POS[i], POS[j], POS[k]],
                    branches: vec![triple[0], triple[1], triple[2]],
                    result_element: Some(el),
                });
            }
        }
    }

    result
}

// ── Shinsal detection (신살 감지) ──

/// Helper: which samhap group does a branch belong to?
/// Returns: 0=인오술, 1=해묘미, 2=신자진, 3=사유축
fn samhap_group(branch: usize) -> usize {
    match branch {
        2 | 6 | 10 => 0, // 인오술
        11 | 3 | 7 => 1, // 해묘미
        8 | 0 | 4 => 2,  // 신자진
        5 | 9 | 1 => 3,  // 사유축
        _ => unreachable!(),
    }
}

/// 도화살: 삼합→왕지
fn dohwa_branch(basis_branch: usize) -> usize {
    match samhap_group(basis_branch) {
        0 => 3,  // 인오술 → 묘
        1 => 0,  // 해묘미 → 자
        2 => 9,  // 신자진 → 유
        3 => 6,  // 사유축 → 오
        _ => unreachable!(),
    }
}

/// 역마살: 삼합→충왕지
fn yeokma_branch(basis_branch: usize) -> usize {
    match samhap_group(basis_branch) {
        0 => 8,  // 인오술 → 신
        1 => 5,  // 해묘미 → 사
        2 => 2,  // 신자진 → 인
        3 => 11, // 사유축 → 해
        _ => unreachable!(),
    }
}

/// 천을귀인 (일간 기준)
fn cheon_eul_branches(day_stem: usize) -> &'static [usize] {
    match day_stem {
        0 | 4 | 6 => &[1, 7],  // 갑무경 → 축,미
        1 | 5 => &[0, 8],      // 을기 → 자,신
        2 | 3 => &[11, 9],     // 병정 → 해,유
        7 => &[2, 6],          // 신 → 인,오
        8 | 9 => &[3, 5],      // 임계 → 묘,사
        _ => &[],
    }
}

/// 문창귀인 (일간 기준)
fn munchang_branch(day_stem: usize) -> usize {
    match day_stem {
        0 => 5,  // 갑→사
        1 => 6,  // 을→오
        2 => 8,  // 병→신
        3 => 9,  // 정→유
        4 => 8,  // 무→신
        5 => 9,  // 기→유
        6 => 11, // 경→해
        7 => 0,  // 신→자
        8 => 2,  // 임→인
        9 => 3,  // 계→묘
        _ => unreachable!(),
    }
}

/// 학당귀인 (일간 기준)
fn hakdang_branch(day_stem: usize) -> usize {
    match day_stem {
        0 => 11, // 갑→해
        1 => 0,  // 을→자
        2 => 2,  // 병→인
        3 => 3,  // 정→묘
        4 => 2,  // 무→인
        5 => 3,  // 기→묘
        6 => 5,  // 경→사
        7 => 6,  // 신→오
        8 => 8,  // 임→신
        9 => 9,  // 계→유
        _ => unreachable!(),
    }
}

/// 천덕귀인 (월지 기준) — returns branch to look for
fn cheondeok_branch(month_branch: usize) -> Option<usize> {
    match month_branch {
        0 => Some(5),   // 자월→사
        1 => Some(6),   // 축월→오
        2 => Some(11),  // 인월→해
        3 => Some(8),   // 묘월→신
        4 => Some(3),   // 진월→묘
        5 => Some(2),   // 사월→인
        6 => Some(1),   // 오월→축
        7 => Some(0),   // 미월→자
        8 => Some(9),   // 신월→유
        9 => Some(10),  // 유월→술
        10 => Some(7),  // 술월→미
        11 => Some(4),  // 해월→진
        _ => None,
    }
}

/// 월덕귀인 (월지 기준) — returns stem to look for
fn woldeok_stem(month_branch: usize) -> Option<usize> {
    match samhap_group(month_branch) {
        0 => Some(2), // 인오술월 → 병
        3 => Some(6), // 사유축월 → 경
        2 => Some(8), // 신자진월 → 임
        1 => Some(0), // 해묘미월 → 갑
        _ => None,
    }
}

/// 양인살 (일간 기준, 양간만)
fn yangin_branch(day_stem: usize) -> Option<usize> {
    match day_stem {
        0 => Some(3),  // 갑→묘
        2 | 4 => Some(6), // 병,무→오
        6 => Some(9),  // 경→유
        8 => Some(0),  // 임→자
        _ => None, // 음간은 없음
    }
}

/// 공망 (일주 기준) — returns two branches that are 공망
pub fn gongmang(day_stem: usize, day_branch: usize) -> [usize; 2] {
    // 60간지 순서에서 일주의 순(旬)의 마지막 두 지지가 공망
    // day_stem과 day_branch로 60간지 index를 구한다
    // 순(旬)은 10개씩 묶인 그룹. 해당 순에서 빠진 2개 지지가 공망.
    // 빠진 지지 = 10 + day_branch - day_stem 부터 2개 (mod 12)
    let first = (10 + day_branch as i32 - day_stem as i32).rem_euclid(12) as usize;
    let second = (first + 1) % 12;
    [first, second]
}

/// 괴강살 (일주: 경진, 경술, 임진, 임술)
fn is_goegang(day_stem: usize, day_branch: usize) -> bool {
    matches!((day_stem, day_branch), (6, 4) | (6, 10) | (8, 4) | (8, 10))
}

/// 백호살 (연지 기준)
fn baekho_branch(year_branch: usize) -> Option<usize> {
    match year_branch {
        0 => Some(6),   // 자→오
        1 => Some(5),   // 축→사
        2 => Some(4),   // 인→진
        3 => Some(3),   // 묘→묘
        4 => Some(2),   // 진→인
        5 => Some(1),   // 사→축
        6 => Some(0),   // 오→자
        7 => Some(11),  // 미→해
        8 => Some(10),  // 신→술
        9 => Some(9),   // 유→유
        10 => Some(8),  // 술→신
        11 => Some(7),  // 해→미
        _ => None,
    }
}

/// 원진살
fn wonjin_branch(basis_branch: usize) -> usize {
    match basis_branch {
        0 => 7,   // 자→미
        1 => 6,   // 축→오
        2 => 5,   // 인→사
        3 => 4,   // 묘→진
        4 => 3,   // 진→묘
        5 => 2,   // 사→인
        6 => 1,   // 오→축
        7 => 0,   // 미→자
        8 => 11,  // 신→해
        9 => 10,  // 유→술
        10 => 9,  // 술→유
        11 => 8,  // 해→신
        _ => unreachable!(),
    }
}

/// 귀문관살
fn gwimun_branch(basis_branch: usize) -> Option<usize> {
    match basis_branch {
        0 => Some(9),   // 자→유
        1 => Some(10),  // 축→술
        2 => Some(7),   // 인→미
        3 => Some(8),   // 묘→신
        4 => Some(5),   // 진→사
        5 => Some(4),   // 사→진
        6 => Some(3),   // 오→묘
        7 => Some(2),   // 미→인
        8 => Some(3),   // 신→묘
        9 => Some(0),   // 유→자
        10 => Some(1),  // 술→축
        11 => Some(6),  // 해→오
        _ => None,
    }
}

pub fn find_shinsal(pillars: [Pillar; 4]) -> Vec<ShinsalEntry> {
    const POS: [PillarPosition; 4] = [
        PillarPosition::Year,
        PillarPosition::Month,
        PillarPosition::Day,
        PillarPosition::Hour,
    ];
    let branches: [usize; 4] = [
        pillars[0].branch,
        pillars[1].branch,
        pillars[2].branch,
        pillars[3].branch,
    ];
    let stems: [usize; 4] = [
        pillars[0].stem,
        pillars[1].stem,
        pillars[2].stem,
        pillars[3].stem,
    ];
    let day_stem = pillars[2].stem;
    let day_branch = pillars[2].branch;
    let year_branch = pillars[0].branch;
    let month_branch = pillars[1].branch;

    let mut entries = Vec::new();

    // 도화살 (연지/일지 기준)
    for &basis_idx in &[0usize, 2] {
        let target = dohwa_branch(branches[basis_idx]);
        let found: Vec<PillarPosition> = (0..4)
            .filter(|&i| i != basis_idx && branches[i] == target)
            .map(|i| POS[i])
            .collect();
        if !found.is_empty() {
            entries.push(ShinsalEntry {
                kind: ShinsalKind::DoHwaSal,
                found_at: found,
                basis: POS[basis_idx],
            });
        }
    }

    // 천을귀인 (일간 기준)
    {
        let targets = cheon_eul_branches(day_stem);
        let found: Vec<PillarPosition> = (0..4)
            .filter(|&i| targets.contains(&branches[i]))
            .map(|i| POS[i])
            .collect();
        if !found.is_empty() {
            entries.push(ShinsalEntry {
                kind: ShinsalKind::CheonEulGwiIn,
                found_at: found,
                basis: PillarPosition::Day,
            });
        }
    }

    // 역마살 (연지/일지 기준)
    for &basis_idx in &[0usize, 2] {
        let target = yeokma_branch(branches[basis_idx]);
        let found: Vec<PillarPosition> = (0..4)
            .filter(|&i| i != basis_idx && branches[i] == target)
            .map(|i| POS[i])
            .collect();
        if !found.is_empty() {
            entries.push(ShinsalEntry {
                kind: ShinsalKind::YeokMaSal,
                found_at: found,
                basis: POS[basis_idx],
            });
        }
    }

    // 문창귀인 (일간 기준)
    {
        let target = munchang_branch(day_stem);
        let found: Vec<PillarPosition> = (0..4)
            .filter(|&i| branches[i] == target)
            .map(|i| POS[i])
            .collect();
        if !found.is_empty() {
            entries.push(ShinsalEntry {
                kind: ShinsalKind::MunChangGwiIn,
                found_at: found,
                basis: PillarPosition::Day,
            });
        }
    }

    // 학당귀인 (일간 기준)
    {
        let target = hakdang_branch(day_stem);
        let found: Vec<PillarPosition> = (0..4)
            .filter(|&i| branches[i] == target)
            .map(|i| POS[i])
            .collect();
        if !found.is_empty() {
            entries.push(ShinsalEntry {
                kind: ShinsalKind::HakDangGwiIn,
                found_at: found,
                basis: PillarPosition::Day,
            });
        }
    }

    // 천덕귀인 (월지 기준)
    if let Some(target) = cheondeok_branch(month_branch) {
        let found: Vec<PillarPosition> = (0..4)
            .filter(|&i| branches[i] == target)
            .map(|i| POS[i])
            .collect();
        if !found.is_empty() {
            entries.push(ShinsalEntry {
                kind: ShinsalKind::CheonDeokGwiIn,
                found_at: found,
                basis: PillarPosition::Month,
            });
        }
    }

    // 월덕귀인 (월지 기준, 천간 검사)
    if let Some(target_stem) = woldeok_stem(month_branch) {
        let found: Vec<PillarPosition> = (0..4)
            .filter(|&i| stems[i] == target_stem)
            .map(|i| POS[i])
            .collect();
        if !found.is_empty() {
            entries.push(ShinsalEntry {
                kind: ShinsalKind::WolDeokGwiIn,
                found_at: found,
                basis: PillarPosition::Month,
            });
        }
    }

    // 양인살 (일간 기준, 양간만)
    if let Some(target) = yangin_branch(day_stem) {
        let found: Vec<PillarPosition> = (0..4)
            .filter(|&i| branches[i] == target)
            .map(|i| POS[i])
            .collect();
        if !found.is_empty() {
            entries.push(ShinsalEntry {
                kind: ShinsalKind::YangInSal,
                found_at: found,
                basis: PillarPosition::Day,
            });
        }
    }

    // 공망 (일주 기준)
    {
        let gm = gongmang(day_stem, day_branch);
        let found: Vec<PillarPosition> = (0..4)
            .filter(|&i| i != 2 && (branches[i] == gm[0] || branches[i] == gm[1]))
            .map(|i| POS[i])
            .collect();
        if !found.is_empty() {
            entries.push(ShinsalEntry {
                kind: ShinsalKind::GongMang,
                found_at: found,
                basis: PillarPosition::Day,
            });
        }
    }

    // 괴강살 (일주)
    if is_goegang(day_stem, day_branch) {
        entries.push(ShinsalEntry {
            kind: ShinsalKind::GoeGangSal,
            found_at: vec![PillarPosition::Day],
            basis: PillarPosition::Day,
        });
    }

    // 백호살 (연지 기준)
    if let Some(target) = baekho_branch(year_branch) {
        let found: Vec<PillarPosition> = (0..4)
            .filter(|&i| i != 0 && branches[i] == target)
            .map(|i| POS[i])
            .collect();
        if !found.is_empty() {
            entries.push(ShinsalEntry {
                kind: ShinsalKind::BaekHoSal,
                found_at: found,
                basis: PillarPosition::Year,
            });
        }
    }

    // 원진살 (연지/일지 기준)
    for &basis_idx in &[0usize, 2] {
        let target = wonjin_branch(branches[basis_idx]);
        let found: Vec<PillarPosition> = (0..4)
            .filter(|&i| i != basis_idx && branches[i] == target)
            .map(|i| POS[i])
            .collect();
        if !found.is_empty() {
            entries.push(ShinsalEntry {
                kind: ShinsalKind::WonJinSal,
                found_at: found,
                basis: POS[basis_idx],
            });
        }
    }

    // 귀문관살 (연지/일지 기준)
    for &basis_idx in &[0usize, 2] {
        if let Some(target) = gwimun_branch(branches[basis_idx]) {
            let found: Vec<PillarPosition> = (0..4)
                .filter(|&i| i != basis_idx && branches[i] == target)
                .map(|i| POS[i])
                .collect();
            if !found.is_empty() {
                entries.push(ShinsalEntry {
                    kind: ShinsalKind::GwiMunGwanSal,
                    found_at: found,
                    basis: POS[basis_idx],
                });
            }
        }
    }

    entries
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
