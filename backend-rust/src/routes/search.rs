use axum::{extract::Query, Json};
use serde::Deserialize;

use crate::models::track::ApiResponse;
use crate::services::youtube_music;

#[derive(Deserialize)]
pub struct SearchParams {
    pub query: String,
    pub limit: Option<usize>,
}

pub async fn search_music(
    Query(params): Query<SearchParams>,
) -> Json<ApiResponse<Vec<crate::models::track::Track>>> {
    let result = youtube_music::search_music(
        &params.query,
        params.limit.unwrap_or(10),
    )
    .await
    .unwrap_or_default();

    Json(ApiResponse {
        status: "success".to_string(),
        data: result,
    })
}
