use crate::types::{
    Direction, Element, Gender, Pillar, StrengthClass, StrengthVerdict, TenGod, TermDef,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Lang {
    Ko,
    En,
}

#[derive(Clone, Copy, Debug)]
pub enum PillarKind {
    Year,
    Month,
    Day,
    Hour,
}

pub struct I18n {
    lang: Lang,
}

impl I18n {
    pub fn new(lang: Lang) -> Self {
        Self { lang }
    }

    pub fn title(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "사주팔자 (입춘 기준)",
            Lang::En => "Saju Palja (Lichun 기준)",
        }
    }

    pub fn input_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "입력",
            Lang::En => "Input",
        }
    }

    pub fn converted_solar_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "변환 양력",
            Lang::En => "Converted solar",
        }
    }

    pub fn converted_lunar_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "변환 음력",
            Lang::En => "Converted lunar",
        }
    }

    pub fn leap_suffix(&self) -> &'static str {
        match self.lang {
            Lang::Ko => " (윤달)",
            Lang::En => " (Leap)",
        }
    }

    pub fn local_mean_time_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "지역시 보정(평태양시)",
            Lang::En => "Local mean time correction",
        }
    }

    pub fn corrected_time_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "보정 시각",
            Lang::En => "Corrected time",
        }
    }

    pub fn gender_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "성별",
            Lang::En => "Gender",
        }
    }

    pub fn day_boundary_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "일주 경계",
            Lang::En => "Day boundary",
        }
    }

    pub fn pillars_heading(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "천간/지지",
            Lang::En => "Stems/Branches",
        }
    }

    pub fn hidden_stems_heading(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "지장간",
            Lang::En => "Hidden Stems",
        }
    }

    pub fn ten_gods_heading(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "십성(일간 기준)",
            Lang::En => "Ten Gods (Day stem)",
        }
    }

    pub fn twelve_stages_heading(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "12운성(일간 기준)",
            Lang::En => "12 Stages (Day stem)",
        }
    }

    pub fn twelve_shinsal_heading(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "12신살(연지 삼합 기준)",
            Lang::En => "12 Shinsal (Year branch trine)",
        }
    }

    pub fn strength_heading(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "신강/신약(간단 판정)",
            Lang::En => "Strength (simple)",
        }
    }

    pub fn elements_heading(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "오행 분포(천간+지지)",
            Lang::En => "Five Elements (stems + branches)",
        }
    }

    pub fn daewon_heading(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "대운",
            Lang::En => "Decennial Luck",
        }
    }

    pub fn yearly_luck_heading(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "연운 (입춘 기준)",
            Lang::En => "Yearly Luck (Lichun)",
        }
    }

    pub fn monthly_luck_heading(&self, year: i32) -> String {
        match self.lang {
            Lang::Ko => format!("월운 ({}년, 입춘~다음 입춘)", year),
            Lang::En => format!("Monthly Luck ({}: Lichun to next Lichun)", year),
        }
    }

    pub fn terms_heading(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "절기",
            Lang::En => "Solar Terms",
        }
    }

    pub fn tz_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "기준",
            Lang::En => "time zone",
        }
    }

    pub fn pillar_kind_label(&self, kind: PillarKind) -> &'static str {
        match (self.lang, kind) {
            (Lang::Ko, PillarKind::Year) => "연주",
            (Lang::Ko, PillarKind::Month) => "월주",
            (Lang::Ko, PillarKind::Day) => "일주",
            (Lang::Ko, PillarKind::Hour) => "시주",
            (Lang::En, PillarKind::Year) => "Year Pillar",
            (Lang::En, PillarKind::Month) => "Month Pillar",
            (Lang::En, PillarKind::Day) => "Day Pillar",
            (Lang::En, PillarKind::Hour) => "Hour Pillar",
        }
    }

    pub fn stem_kind_label(&self, kind: PillarKind) -> &'static str {
        match (self.lang, kind) {
            (Lang::Ko, PillarKind::Year) => "연간",
            (Lang::Ko, PillarKind::Month) => "월간",
            (Lang::Ko, PillarKind::Day) => "일간",
            (Lang::Ko, PillarKind::Hour) => "시간",
            (Lang::En, PillarKind::Year) => "Year stem",
            (Lang::En, PillarKind::Month) => "Month stem",
            (Lang::En, PillarKind::Day) => "Day stem",
            (Lang::En, PillarKind::Hour) => "Hour stem",
        }
    }

    pub fn branch_kind_label(&self, kind: PillarKind) -> &'static str {
        match (self.lang, kind) {
            (Lang::Ko, PillarKind::Year) => "연지",
            (Lang::Ko, PillarKind::Month) => "월지",
            (Lang::Ko, PillarKind::Day) => "일지",
            (Lang::Ko, PillarKind::Hour) => "시지",
            (Lang::En, PillarKind::Year) => "Year branch",
            (Lang::En, PillarKind::Month) => "Month branch",
            (Lang::En, PillarKind::Day) => "Day branch",
            (Lang::En, PillarKind::Hour) => "Hour branch",
        }
    }

    pub fn stem_word(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "천간",
            Lang::En => "Stem",
        }
    }

    pub fn branch_word(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "지지",
            Lang::En => "Branch",
        }
    }

    pub fn day_stem_word(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "일간",
            Lang::En => "Day stem",
        }
    }

    pub fn stems_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "천간",
            Lang::En => "Stems",
        }
    }

    pub fn branches_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "지지",
            Lang::En => "Branches",
        }
    }

    pub fn branches_main_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "지지(본기)",
            Lang::En => "Branches (main)",
        }
    }

    pub fn branches_hidden_label(&self, kind: PillarKind) -> String {
        match self.lang {
            Lang::Ko => format!("{}(지장간)", self.branch_kind_label(kind)),
            Lang::En => format!("{} (hidden)", self.branch_kind_label(kind)),
        }
    }

    pub fn ten_gods_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "십성",
            Lang::En => "Ten Gods",
        }
    }

    pub fn year_luck_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "세운",
            Lang::En => "Annual Pillar",
        }
    }

    pub fn direction_label(&self, direction: Direction) -> &'static str {
        match (self.lang, direction) {
            (Lang::Ko, Direction::Forward) => "순행",
            (Lang::Ko, Direction::Backward) => "역행",
            (Lang::En, Direction::Forward) => "Forward",
            (Lang::En, Direction::Backward) => "Backward",
        }
    }

    pub fn start_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "시작",
            Lang::En => "start",
        }
    }

    pub fn year_unit(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "년",
            Lang::En => "y",
        }
    }

    pub fn month_unit(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "개월",
            Lang::En => "m",
        }
    }

    pub fn calendar_label(&self, is_lunar: bool, leap: bool) -> String {
        match self.lang {
            Lang::Ko => {
                if is_lunar {
                    if leap {
                        "음력(윤달)".to_string()
                    } else {
                        "음력".to_string()
                    }
                } else {
                    "양력".to_string()
                }
            }
            Lang::En => {
                if is_lunar {
                    if leap {
                        "Lunar (Leap)".to_string()
                    } else {
                        "Lunar".to_string()
                    }
                } else {
                    "Solar".to_string()
                }
            }
        }
    }

    pub fn gender_value(&self, gender: Gender) -> &'static str {
        match (self.lang, gender) {
            (Lang::Ko, Gender::Male) => "남",
            (Lang::Ko, Gender::Female) => "여",
            (Lang::En, Gender::Male) => "Male",
            (Lang::En, Gender::Female) => "Female",
        }
    }

    pub fn format_age(&self, months: i32, aligned: bool) -> String {
        let years = months / 12;
        let rem = months % 12;
        if self.lang == Lang::Ko {
            if rem == 0 {
                if aligned {
                    format!("{:>2}{}", years, self.year_unit())
                } else {
                    format!("{}{}", years, self.year_unit())
                }
            } else if aligned {
                format!("{:>2}{} {}{}", years, self.year_unit(), rem, self.month_unit())
            } else {
                format!("{}{} {}{}", years, self.year_unit(), rem, self.month_unit())
            }
        } else if rem == 0 {
            if aligned {
                format!("{:>2}{}", years, self.year_unit())
            } else {
                format!("{}{}", years, self.year_unit())
            }
        } else if aligned {
            format!("{:>2}{} {}{}", years, self.year_unit(), rem, self.month_unit())
        } else {
            format!("{}{} {}{}", years, self.year_unit(), rem, self.month_unit())
        }
    }

    pub fn format_year_label(&self, year: i32) -> String {
        match self.lang {
            Lang::Ko => format!("{}년", year),
            Lang::En => year.to_string(),
        }
    }

    pub fn month_label(&self, branch: usize) -> String {
        match self.lang {
            Lang::Ko => format!("{}월", BRANCHES_KO[branch]),
            Lang::En => format!("{} Month", BRANCHES_EN[branch]),
        }
    }

    pub fn element_label(&self, element: Element) -> &'static str {
        match (self.lang, element) {
            (Lang::Ko, Element::Wood) => "목(木)",
            (Lang::Ko, Element::Fire) => "화(火)",
            (Lang::Ko, Element::Earth) => "토(土)",
            (Lang::Ko, Element::Metal) => "금(金)",
            (Lang::Ko, Element::Water) => "수(水)",
            (Lang::En, Element::Wood) => "Wood (木)",
            (Lang::En, Element::Fire) => "Fire (火)",
            (Lang::En, Element::Earth) => "Earth (土)",
            (Lang::En, Element::Metal) => "Metal (金)",
            (Lang::En, Element::Water) => "Water (水)",
        }
    }

    pub fn element_short_label(&self, element: Element) -> &'static str {
        match (self.lang, element) {
            (Lang::Ko, Element::Wood) => "목",
            (Lang::Ko, Element::Fire) => "화",
            (Lang::Ko, Element::Earth) => "토",
            (Lang::Ko, Element::Metal) => "금",
            (Lang::Ko, Element::Water) => "수",
            (Lang::En, Element::Wood) => "Wood",
            (Lang::En, Element::Fire) => "Fire",
            (Lang::En, Element::Earth) => "Earth",
            (Lang::En, Element::Metal) => "Metal",
            (Lang::En, Element::Water) => "Water",
        }
    }

    pub fn polarity_label(&self, is_yang: bool) -> &'static str {
        match (self.lang, is_yang) {
            (Lang::Ko, true) => "양",
            (Lang::Ko, false) => "음",
            (Lang::En, true) => "Yang",
            (Lang::En, false) => "Yin",
        }
    }

    pub fn ten_god_label(&self, god: TenGod) -> &'static str {
        match (self.lang, god) {
            (Lang::Ko, TenGod::BiGyeon) => "비견(比肩)",
            (Lang::Ko, TenGod::GeopJae) => "겁재(劫財)",
            (Lang::Ko, TenGod::SikShin) => "식신(食神)",
            (Lang::Ko, TenGod::SangGwan) => "상관(傷官)",
            (Lang::Ko, TenGod::PyeonJae) => "편재(偏財)",
            (Lang::Ko, TenGod::JeongJae) => "정재(正財)",
            (Lang::Ko, TenGod::ChilSal) => "칠살(七殺)",
            (Lang::Ko, TenGod::JeongGwan) => "정관(正官)",
            (Lang::Ko, TenGod::PyeonIn) => "편인(偏印)",
            (Lang::Ko, TenGod::JeongIn) => "정인(正印)",
            (Lang::En, TenGod::BiGyeon) => "Companion (比肩)",
            (Lang::En, TenGod::GeopJae) => "Rob Wealth (劫財)",
            (Lang::En, TenGod::SikShin) => "Eating God (食神)",
            (Lang::En, TenGod::SangGwan) => "Hurting Officer (傷官)",
            (Lang::En, TenGod::PyeonJae) => "Indirect Wealth (偏財)",
            (Lang::En, TenGod::JeongJae) => "Direct Wealth (正財)",
            (Lang::En, TenGod::ChilSal) => "Seven Killings (七殺)",
            (Lang::En, TenGod::JeongGwan) => "Direct Officer (正官)",
            (Lang::En, TenGod::PyeonIn) => "Indirect Resource (偏印)",
            (Lang::En, TenGod::JeongIn) => "Direct Resource (正印)",
        }
    }

    pub fn stage_label(&self, index: usize) -> &'static str {
        match self.lang {
            Lang::Ko => TWELVE_STAGES_KO[index],
            Lang::En => TWELVE_STAGES_EN[index],
        }
    }

    pub fn shinsal_label(&self, index: usize) -> &'static str {
        match self.lang {
            Lang::Ko => SHINSAL_NAMES_KO[index],
            Lang::En => SHINSAL_NAMES_EN[index],
        }
    }

    pub fn strength_class_label(&self, class: StrengthClass) -> &'static str {
        match (self.lang, class) {
            (Lang::Ko, StrengthClass::Strong) => "강",
            (Lang::Ko, StrengthClass::Weak) => "약",
            (Lang::Ko, StrengthClass::Neutral) => "중",
            (Lang::En, StrengthClass::Strong) => "Strong",
            (Lang::En, StrengthClass::Weak) => "Weak",
            (Lang::En, StrengthClass::Neutral) => "Neutral",
        }
    }

    pub fn strength_verdict_label(&self, verdict: StrengthVerdict) -> &'static str {
        match (self.lang, verdict) {
            (Lang::Ko, StrengthVerdict::Strong) => "신강",
            (Lang::Ko, StrengthVerdict::Weak) => "신약",
            (Lang::Ko, StrengthVerdict::Neutral) => "중화",
            (Lang::En, StrengthVerdict::Strong) => "Strong",
            (Lang::En, StrengthVerdict::Weak) => "Weak",
            (Lang::En, StrengthVerdict::Neutral) => "Balanced",
        }
    }

    pub fn score_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "점수",
            Lang::En => "Score",
        }
    }

    pub fn basis_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "기준",
            Lang::En => "Basis",
        }
    }

    pub fn verdict_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "판정",
            Lang::En => "Verdict",
        }
    }

    pub fn root_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "뿌리",
            Lang::En => "Roots",
        }
    }

    pub fn support_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "지원",
            Lang::En => "Support",
        }
    }

    pub fn drain_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "억제",
            Lang::En => "Drain",
        }
    }

    pub fn month_stage_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "월지 운성",
            Lang::En => "Month branch stage",
        }
    }

    pub fn location_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "위치",
            Lang::En => "Location",
        }
    }

    pub fn longitude_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "경도",
            Lang::En => "Longitude",
        }
    }

    pub fn std_meridian_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "표준경도",
            Lang::En => "Std meridian",
        }
    }

    pub fn correction_label(&self) -> &'static str {
        match self.lang {
            Lang::Ko => "보정",
            Lang::En => "Correction",
        }
    }

    pub fn term_name(&self, term: &TermDef) -> String {
        match self.lang {
            Lang::Ko => format!("{}({})", term.name_ko, term.name_hanja),
            Lang::En => format!("{} ({})", term.name_en, term.name_hanja),
        }
    }

    pub fn pillar_label(&self, pillar: Pillar) -> String {
        let stem = self.stem_name(pillar.stem);
        let branch = self.branch_name(pillar.branch);
        format!("{}{}({}{})", stem, branch, STEMS_HANJA[pillar.stem], BRANCHES_HANJA[pillar.branch])
    }

    pub fn stem_label(&self, stem: usize) -> String {
        format!("{}({})", self.stem_name(stem), STEMS_HANJA[stem])
    }

    pub fn branch_label(&self, branch: usize) -> String {
        format!("{}({})", self.branch_name(branch), BRANCHES_HANJA[branch])
    }

    fn stem_name(&self, stem: usize) -> &'static str {
        match self.lang {
            Lang::Ko => STEMS_KO[stem],
            Lang::En => STEMS_EN[stem],
        }
    }

    fn branch_name(&self, branch: usize) -> &'static str {
        match self.lang {
            Lang::Ko => BRANCHES_KO[branch],
            Lang::En => BRANCHES_EN[branch],
        }
    }
}

const STEMS_KO: [&str; 10] = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const STEMS_EN: [&str; 10] = [
    "Gap", "Eul", "Byeong", "Jeong", "Mu", "Gi", "Gyeong", "Sin", "Im", "Gye",
];
const STEMS_HANJA: [&str; 10] = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

const BRANCHES_KO: [&str; 12] = [
    "자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해",
];
const BRANCHES_EN: [&str; 12] = [
    "Ja", "Chuk", "In", "Myo", "Jin", "Sa", "O", "Mi", "Sin", "Yu", "Sul", "Hae",
];
const BRANCHES_HANJA: [&str; 12] = [
    "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
];

const TWELVE_STAGES_KO: [&str; 12] = [
    "장생(長生)",
    "목욕(沐浴)",
    "관대(冠帶)",
    "건록(建祿)",
    "제왕(帝旺)",
    "쇠(衰)",
    "병(病)",
    "사(死)",
    "묘(墓)",
    "절(絶)",
    "태(胎)",
    "양(養)",
];

const TWELVE_STAGES_EN: [&str; 12] = [
    "Changsheng (長生)",
    "Muyu (沐浴)",
    "Guandai (冠帶)",
    "Jianlu (建祿)",
    "Dewang (帝旺)",
    "Shuai (衰)",
    "Bing (病)",
    "Si (死)",
    "Mu (墓)",
    "Jue (絶)",
    "Tai (胎)",
    "Yang (養)",
];

const SHINSAL_NAMES_KO: [&str; 12] = [
    "지살(地殺)",
    "년살(年殺)",
    "월살(月殺)",
    "망신살(亡身殺)",
    "장성살(將星殺)",
    "반안살(攀鞍殺)",
    "역마살(驛馬殺)",
    "육해살(六害殺)",
    "화개살(華蓋殺)",
    "겁살(劫殺)",
    "재살(災殺)",
    "천살(天殺)",
];

const SHINSAL_NAMES_EN: [&str; 12] = [
    "Earth Kill (地殺)",
    "Year Kill (年殺)",
    "Month Kill (月殺)",
    "Loss Star (亡身殺)",
    "General Star (將星殺)",
    "Mounting Saddle (攀鞍殺)",
    "Travel Horse (驛馬殺)",
    "Six Harm (六害殺)",
    "Canopy (華蓋殺)",
    "Robbery (劫殺)",
    "Disaster (災殺)",
    "Heaven Kill (天殺)",
];
