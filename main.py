import requests
from fastapi.responses import StreamingResponse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic
import os 
import json
from pydantic import BaseModel
from typing import List
import yt_dlp

app = FastAPI(title="Music Player API")
ytmusic = YTMusic()

# Тут одразу налаштую CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/search")
def search_music(query: str, limit: int = 10):
    """
    Здійснюємо пошук треків за назвою.
    Повертає список знайдених пісень
    """
    try:
        # Тут я поставив фільтр тільки на пісні, щоб не шукало відеокліпи, і виставив ліміт на 10 пісень, при бажані можна змінювати
        results = ytmusic.search(query, filter="songs", limit = limit)
        
        # Треба очистити результати від шуму щоб фронт ортимував тільки важливе
        cleaned_results = []
        for item in results:
            cleaned_results.append({
                "videoId": item.get("videoId"),
                "title": item.get("title"),
                "artist": [artist["name"] for artist in item.get("artists", [])],
                "thumbnail": item.get("thumbnails", [{}])[-1].get("url"),
                "duration": item.get("duration")
            })
        
        return {"status": "success", "data": cleaned_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка пошуку: {str(e)}")

@app.get("/stream/{video_id}")
def get_stream_url(video_id: str):
    """
    Отримуємо айді відео з Ютуба і повертаємо пряме посилання на аудіопотік
    """
    # Налаштую yt-dlp на найкращу якість аудіо, не завантажуючи відео
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'simulate': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            return {"status": "success", "stream_url": info['url']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка отримання аудіо: {str(e)}")

@app.get("/proxy-stream/{video_id}")
def proxy_stream(video_id: str):
    """
    Отримує пряме посилання на аудіо з YouTube через yt-dlp 
    і транслює його в плеєр від імені нашого сервера, щоб обійти CORS.
    """
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'simulate': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            audio_url = info['url']
            
        # Запитуємо аудіопотік у YouTube
        req = requests.get(audio_url, stream=True)
        
        # Перенаправляємо потік шматочками (chunks) у наш плеєр
        def generate():
            for chunk in req.iter_content(chunk_size=4096):
                yield chunk
                
        return StreamingResponse(generate(), media_type="audio/mp3")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка трансляції: {str(e)}")
    
"""
Блок з плейлістами
"""
PLAYLISTS_FILE = "playlists.json"

class TrackModel(BaseModel):
    videoId: str
    title: str
    artist: List[str]
    thumbnail: str = None

def load_playlists():
    if not os.path.exists(PLAYLISTS_FILE):
        return {}
    with open(PLAYLISTS_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except:
            return {}

def save_playlists(data):
    with open(PLAYLISTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

@app.get("/playlists")
def get_playlists():
    """Отримати список всіх плейлістів"""
    return {"status": "success", "data": list(load_playlists().keys())}

@app.post("/playlists")
def create_playlist(name: str):
    """Створити новий плейліст"""
    data = load_playlists()
    if name in data:
        return {"status": "error", "message": "Плейліст із такою назвою вже існує"}
    data[name] = []
    save_playlists(data)
    return {"status": "success"}

@app.get("/playlists/{name}")
def get_playlist_tracks(name: str):
    """Отримуємо список треків у плейлісті"""
    data = load_playlists()
    if name not in data:
        raise HTTPException(status_code=404, detail="Плейліст не знайдено")
    return {"status": "success", "data": data[name]}

@app.post("/playlists/{name}/add")
def add_to_playlist(name: str, track: TrackModel):
    """Додавання трека в плейліст"""
    data = load_playlists()
    if name not in data:
        raise HTTPException(status_code=404, detail="Плейліст не знайдено")
    if any(t["videoId"] == track.videoId for t in data[name]):
        return {"status": "success", "message": "Трек вже є в плейлісті"}
    data[name].append(track.dict())
    save_playlists(data)
    return {"status": "success"}

@app.delete("/playlists/{name}/tracks/{video_id}")
def remove_from_playlist(name: str, video_id: str):
    """Видалення треку з плейлісту"""
    data = load_playlists()
    if name not in data:
        raise HTTPException(status_code=404, detail="Плейліст не знайдено")
    
    original_length = len(data[name])
    data[name] = [track for track in data[name] if track["videoId"] != video_id]
    if len(data[name]) == original_length:
        return {"status": "error", "message": "Трек не знайдено в плейлісті"}
    
    save_playlists(data)
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)