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

pub struct PillarColumnView {
    pub kind: String,
    pub stem_god: String,
    pub stem_label: String,
    pub stem_sub: String,
    pub stem_css: String,
    pub branch_god: String,
    pub branch_label: String,
    pub branch_sub: String,
    pub branch_css: String,
    pub hidden_stems: String,
    pub stage: String,
    pub shinsal: String,
    pub is_day: bool,
}

pub struct ElementView {
    pub name: String,
    pub count: u8,
    pub percentage: f64,
    pub css: String,
}

pub struct DaewonView {
    pub age: String,
    pub stem_label: String,
    pub stem_sub: String,
    pub stem_css: String,
    pub stem_god: String,
    pub branch_label: String,
    pub branch_sub: String,
    pub branch_css: String,
    pub branch_god: String,
    pub stage: String,
    pub is_current: bool,
}

pub struct YearlyLuckView {
    pub label: String,
    pub stem_label: String,
    pub stem_sub: String,
    pub stem_css: String,
    pub stem_god: String,
    pub branch_label: String,
    pub branch_sub: String,
    pub branch_css: String,
    pub branch_god: String,
    pub stage: String,
    pub is_current: bool,
}

pub struct InteractionView {
    pub relation_label: String,
    pub positions_label: String,
    pub detail: String,
    pub css_class: String,
}

pub struct ShinsalView {
    pub name: String,
    pub found_at: String,
    pub basis: String,
}

pub struct MonthlyLuckItemView {
    pub label: String,
    pub stem_label: String,
    pub stem_sub: String,
    pub stem_css: String,
    pub stem_god: String,
    pub branch_label: String,
    pub branch_sub: String,
    pub branch_css: String,
    pub branch_god: String,
    pub stage: String,
    pub is_current: bool,
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

    pub pillars_table_heading: String,
    pub pillar_columns: Vec<PillarColumnView>,

    pub relations_heading: String,
    pub relations: Vec<InteractionView>,

    pub shinsal_extra_heading: String,
    pub shinsal_extra: Vec<ShinsalView>,

    pub strength_heading: String,
    pub strength: Vec<String>,

    pub elements_heading: String,
    pub elements: Vec<ElementView>,

    pub daewon_heading: String,
    pub daewon_items: Vec<DaewonView>,

    pub yearly_luck_heading: String,
    pub yearly_luck_items: Vec<YearlyLuckView>,

    pub monthly_luck_heading: String,
    pub monthly_luck_items: Vec<MonthlyLuckItemView>,
}

#[derive(Template)]
#[template(path = "fragments/error.html")]
pub struct ErrorTemplate {
    pub message: String,
}
