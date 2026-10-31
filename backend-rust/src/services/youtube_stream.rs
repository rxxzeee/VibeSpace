use serde_json::Value;
use tokio::process::Command;

pub async fn get_audio_url(video_id: &str) -> Result<String, String> {
    let url = format!("https://www.youtube.com/watch?v={}", video_id);

    let output = Command::new("yt-dlp")
        .args([
            "-f",
            "bestaudio",
            "-g",
            &url,
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stream_url = String::from_utf8_lossy(&output.stdout)
        .trim()
        .to_string();

    if stream_url.is_empty() {
        return Err("No stream URL returned".into());
    }

    Ok(stream_url)
}

pub async fn get_audio_info(video_id: &str) -> Result<Value, String> {
    let url = format!("https://www.youtube.com/watch?v={}", video_id);

    let output = Command::new("yt-dlp")
        .args(["-j", &url])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())
}
