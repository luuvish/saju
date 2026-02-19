mod handlers;
mod templates;

use axum::Router;
use tower_http::services::ServeDir;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", axum::routing::get(handlers::index))
        .route("/calculate", axum::routing::post(handlers::calculate))
        .nest_service("/static", ServeDir::new("crates/saju-web/static"));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Listening on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}
