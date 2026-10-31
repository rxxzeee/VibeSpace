use axum::{extract::Path, Json};
use serde_json::json;

use crate::services::youtube_stream;

pub async fn stream(Path(video_id): Path<String>) -> Json<serde_json::Value> {
    match youtube_stream::get_audio_url(&video_id).await {
        Ok(url) => Json(json!({
            "status": "success",
            "url": url
        })),
        Err(error) => Json(json!({
            "status": "error",
            "message": error
        })),
    }
}
