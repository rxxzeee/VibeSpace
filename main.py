import requests
from fastapi.responses import StreamingResponse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic
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