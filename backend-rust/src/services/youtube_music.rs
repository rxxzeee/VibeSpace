use crate::models::track::Track;
use serde_json::Value;

pub async fn search_music(query: &str, limit: usize) -> Result<Vec<Track>, String> {
    let client = reqwest::Client::new();

    let response = client
        .get("https://music.youtube.com/youtubei/v1/search")
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "query": query,
            "params": "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D"
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: Value = response.json().await.map_err(|e| e.to_string())?;

    // Parsing is intentionally isolated here.
    // YouTube Music response parsing will mirror ytmusicapi output.
    let _ = (json, limit);

    Ok(Vec::new())
}
