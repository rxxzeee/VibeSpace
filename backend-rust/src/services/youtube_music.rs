use crate::models::track::Track;
use serde_json::Value;

fn text(value: &Value, path: &[&str]) -> String {
    let mut current = value;
    for key in path {
        current = match current.get(*key) {
            Some(v) => v,
            None => return String::new(),
        };
    }
    current.as_str().unwrap_or_default().to_string()
}

pub async fn search_music(query: &str, limit: usize) -> Result<Vec<Track>, String> {
    let client = reqwest::Client::new();

    let response = client
        .post("https://music.youtube.com/youtubei/v1/search?prettyPrint=false")
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20241009.01.00"
                }
            },
            "query": query
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: Value = response.json().await.map_err(|e| e.to_string())?;
    let mut tracks = Vec::new();

    let contents = json
        .pointer("/contents/tabbedSearchResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    for section in contents {
        let items = section
            .pointer("/musicShelfRenderer/contents")
            .and_then(|v| v.as_array());

        if let Some(items) = items {
            for item in items.iter().take(limit) {
                let renderer = item.get("musicResponsiveListItemRenderer").unwrap_or(item);
                let video_id = text(renderer, &["playlistItemData", "videoId"]);

                if video_id.is_empty() {
                    continue;
                }

                tracks.push(Track {
                    video_id,
                    title: text(renderer, &["flexColumns", "0", "musicResponsiveListItemFlexColumnRenderer", "text", "runs", "0", "text"]),
                    artist: vec![],
                    thumbnail: None,
                    duration: None,
                });
            }
        }
    }

    Ok(tracks)
}
