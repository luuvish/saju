use chrono::{DateTime, FixedOffset};
use serde::Serialize;

#[derive(Clone, Copy, Debug, Serialize)]
pub struct Pillar {
    pub stem: usize,
    pub branch: usize,
}

#[derive(Clone, Copy, Debug, Serialize)]
pub enum Gender {
    Male,
    Female,
}

#[derive(Clone, Copy, Debug, Serialize)]
pub enum Direction {
    Forward,
    Backward,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum Element {
    Wood,
    Fire,
    Earth,
    Metal,
    Water,
}

#[derive(Clone, Copy, Debug, Serialize)]
pub enum Relation {
    Same,
    Output,
    Wealth,
    Officer,
    Resource,
}

#[derive(Clone, Copy, Debug, Serialize)]
pub enum TenGod {
    BiGyeon,
    GeopJae,
    SikShin,
    SangGwan,
    PyeonJae,
    JeongJae,
    ChilSal,
    JeongGwan,
    PyeonIn,
    JeongIn,
}

#[derive(Clone, Copy, Debug, Serialize)]
pub enum StrengthClass {
    Strong,
    Weak,
    Neutral,
}

#[derive(Clone, Copy, Debug, Serialize)]
pub enum StrengthVerdict {
    Strong,
    Weak,
    Neutral,
}

#[derive(Clone, Copy, Debug, Serialize)]
pub struct TermDef {
    pub key: &'static str,
    pub name_ko: &'static str,
    pub name_hanja: &'static str,
    pub name_en: &'static str,
    pub angle: f64,
}

#[derive(Clone, Copy, Debug, Serialize)]
pub struct SolarTerm {
    pub def: &'static TermDef,
    pub jd: f64,
}

#[derive(Clone, Copy, Debug, Serialize)]
pub struct LunarDate {
    pub year: i32,
    pub month: u32,
    pub day: u32,
    pub is_leap: bool,
}

#[derive(Clone, Debug, Serialize)]
pub struct LmtInfo {
    pub longitude: f64,
    pub std_meridian: f64,
    pub correction_seconds: i64,
    pub corrected_local: DateTime<FixedOffset>,
    pub location_label: Option<String>,
}
