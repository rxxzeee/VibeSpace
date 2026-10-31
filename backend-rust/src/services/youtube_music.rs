use crate::models::track::Track;

pub async fn search_music(query: &str, limit: usize) -> Result<Vec<Track>, String> {
    // TODO: Replace Python ytmusicapi implementation.
    // The response format stays identical to the original FastAPI backend.

    let _ = (query, limit);

    Ok(Vec::new())
}
