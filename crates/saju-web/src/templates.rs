use askama::Template;
use axum::response::{Html, IntoResponse, Response};

fn render_template(tmpl: &impl Template) -> Response {
    match tmpl.render() {
        Ok(html) => Html(html).into_response(),
        Err(e) => {
            (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

impl IntoResponse for IndexTemplate {
    fn into_response(self) -> Response {
        render_template(&self)
    }
}

impl IntoResponse for ResultTemplate {
    fn into_response(self) -> Response {
        render_template(&self)
    }
}

impl IntoResponse for ErrorTemplate {
    fn into_response(self) -> Response {
        render_template(&self)
    }
}

pub struct LocationItem {
    pub key: String,
    pub display: String,
}

pub struct PillarView {
    pub kind: String,
    pub label: String,
    pub stem_word: String,
    pub stem_element: String,
    pub stem_polarity: String,
    pub branch_word: String,
    pub branch_element: String,
    pub branch_polarity: String,
    pub stem_css: String,
    pub branch_css: String,
}

pub struct HiddenStemRow {
    pub kind: String,
    pub stems: String,
}

pub struct TenGodsHiddenRow {
    pub kind: String,
    pub stems: String,
}

pub struct ElementView {
    pub name: String,
    pub count: u8,
    pub percentage: f64,
    pub css: String,
}

pub struct DaewonView {
    pub age: String,
    pub pillar: String,
    pub stem_god: String,
    pub branch_god: String,
    pub css: String,
}

pub struct YearlyLuckView {
    pub label: String,
    pub period: String,
    pub pillar: String,
    pub stem_god: String,
    pub branch_god: String,
    pub css: String,
}

pub struct MonthlyLuckItemView {
    pub label: String,
    pub period: String,
    pub pillar: String,
    pub stem_god: String,
    pub branch_god: String,
    pub css: String,
}

#[derive(Template)]
#[template(path = "index.html")]
pub struct IndexTemplate {
    pub locations: Vec<LocationItem>,
}

#[derive(Template)]
#[template(path = "fragments/result.html")]
pub struct ResultTemplate {
    pub title: String,
    pub input_line: String,
    pub converted_solar_line: Option<String>,
    pub converted_lunar_line: Option<String>,
    pub gender_line: String,

    pub pillars_heading: String,
    pub pillars: Vec<PillarView>,

    pub hidden_stems_heading: String,
    pub hidden_stems: Vec<HiddenStemRow>,

    pub ten_gods_heading: String,
    pub ten_gods_stem_line: String,
    pub ten_gods_branch_line: String,
    pub ten_gods_hidden: Vec<TenGodsHiddenRow>,

    pub twelve_stages_heading: String,
    pub twelve_stages_line: String,

    pub twelve_shinsal_heading: String,
    pub twelve_shinsal_line: String,

    pub strength_heading: String,
    pub strength: Vec<String>,

    pub elements_heading: String,
    pub elements: Vec<ElementView>,

    pub daewon_heading: String,
    pub daewon_items: Vec<DaewonView>,

    pub yearly_luck_heading: String,
    pub yearly_luck_items: Vec<YearlyLuckView>,

    pub monthly_luck_heading: String,
    pub monthly_luck_year_line: String,
    pub monthly_luck_items: Vec<MonthlyLuckItemView>,
}

#[derive(Template)]
#[template(path = "fragments/error.html")]
pub struct ErrorTemplate {
    pub message: String,
}
