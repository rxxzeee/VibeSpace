use axum::{routing::get, Router};
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = Router::new()
        .route("/", get(root))
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("127.0.0.1:8000")
        .await
        .unwrap();

    println!("VibeSpace Rust API running on http://127.0.0.1:8000");

    axum::serve(listener, app)
        .await
        .unwrap();
}

async fn root() -> &'static str {
    "VibeSpace Rust backend is running"
}
