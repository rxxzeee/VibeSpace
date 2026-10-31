use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Track {
    #[serde(rename = "videoId")]
    pub video_id: String,
    pub title: String,
    pub artist: Vec<String>,
    pub thumbnail: Option<String>,
    pub duration: Option<String>,
}

#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub status: String,
    pub data: T,
}
