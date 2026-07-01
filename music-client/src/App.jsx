import { useState, useEffect, useRef } from 'react'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [currentTrack, setCurrentTrack] = useState(null)
  const [currentTrackUrl, setCurrentTrackUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // Нові стани для часу треку
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationRef = useRef(null)

  // Пошук музики
  const searchMusic = async (e) => {
    e.preventDefault()
    if (!query) return
    setLoading(true)
    try {
      const res = await fetch(`http://127.0.0.1:8000/search?query=${query}`)
      const data = await res.json()
      if (data.status === 'success') {
        setResults(data.data)
      }
    } catch (error) {
      console.error("Помилка пошуку:", error)
    }
    setLoading(false)
  }

  // Вибір треку для відтворення
  const playTrack = async (track) => {
    setCurrentTrackUrl(null)
    setCurrentTrack(track)
    setIsPlaying(false)
    setCurrentTime(0) // Скидаємо час
    setDuration(0)
    try {
      const res = await fetch(`http://127.0.0.1:8000/stream/${track.videoId}`)
      const data = await res.json()
      if (data.status === 'success') {
        setCurrentTrackUrl(data.stream_url)
        setIsPlaying(true)
        
        if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || window.webkitAudioContext
          audioContextRef.current = new AudioContext()
          
          analyserRef.current = audioContextRef.current.createAnalyser()
          analyserRef.current.fftSize = 256 
          
          const source = audioContextRef.current.createMediaElementSource(audioRef.current)
          source.connect(analyserRef.current)
          analyserRef.current.connect(audioContextRef.current.destination)
        }
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume()
        }
      }
    } catch (error) {
      console.error("Помилка завантаження треку:", error)
    }
  }

  // Керування кнопкою Play/Pause
  const togglePlay = async () => {
    if (!audioRef.current) return
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Функція перемотування треку мишкою
  const handleSeek = (e) => {
    const seekTime = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime
      setCurrentTime(seekTime)
    }
  }

  // Функція для перетворення секунд у красивий формат "02:45"
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00'
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  // Малювання ДЗЕРКАЛЬНИХ хвиль
  useEffect(() => {
    if (!currentTrackUrl || !canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    const centerY = canvas.height / 2
    const centerX = canvas.width / 2

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      ctx.fillStyle = 'rgba(214, 199, 241, 0.15)'
      ctx.fillRect(0, centerY - 1, canvas.width, 2)

      const barWidth = (canvas.width / 2) / bufferLength
      ctx.fillStyle = '#D6C7F1' 

      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i]
        const percent = value / 255
        const barHeight = percent * canvas.height * 1.3 

        if (value > 0) {
          const xRight = centerX + (i * barWidth)
          ctx.fillRect(xRight, centerY - barHeight / 2, barWidth - 1, barHeight)

          const xLeft = centerX - (i * barWidth) - barWidth
          ctx.fillRect(xLeft, centerY - barHeight / 2, barWidth - 1, barHeight)
        }
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [currentTrackUrl])

  return (
    <div className="min-h-screen bg-[#64557B] relative overflow-x-hidden font-['Inter',sans-serif] select-none pb-36">
      
      {/* ВЕРХНЯ ПАНЕЛЬ (Header) */}
      <div className="w-full pt-8 px-10 flex items-center justify-between drag-area z-50">
        <div className="flex gap-4" style={{ WebkitAppRegion: 'no-drag' }}>
          <button 
            onClick={() => window.electronAPI?.closeWindow()}
            className="size-7 bg-violet-200 rounded-full shadow-[0px_6px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-violet-300 transition-colors"
          >
            <span className="justify-start text-violet-900 text-xs font-black font-['Inter']">X</span>
          </button>
          <button 
            onClick={() => window.electronAPI?.minimizeWindow()}
            className="size-7 bg-violet-200 rounded-full shadow-[0px_6px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-violet-300 transition-colors pb-1"
          >
            <span className="justify-start text-violet-900 text-xs font-black font-['Inter'] mb-1">_</span>
          </button>
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4 pr-5" style={{ WebkitAppRegion: 'no-drag' }}>
          <button 
            onClick={searchMusic}
            className="size-7 bg-violet-200 rounded-full shadow-[0px_6px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-violet-300 transition-colors"
          >
            {loading ? (
              <div className="size-3.5 border-[3px] border-violet-900 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <div className="size-3.5 relative overflow-hidden flex items-center justify-center">
                 <div className="size-3 outline outline-4 outline-offset-[-1.75px] outline-violet-900 rounded-full" />
                 <div className="w-2 h-1 bg-violet-900 absolute bottom-[-1px] right-[-3px] rotate-45 rounded-full" />
              </div>
            )}
          </button>
          
          <form onSubmit={searchMusic}>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-[440px] h-10 bg-violet-200 rounded-2xl shadow-[0px_6px_4px_0px_rgba(0,0,0,0.25)] px-5 justify-start text-violet-900 text-sm font-black font-['Inter'] outline-none placeholder-violet-900/60"
            />
          </form>
        </div>

        <div className="w-40 h-10 justify-end flex items-center text-violet-200 text-3xl font-normal font-['Modak',_cursive,sans-serif] [text-shadow:_0px_6px_4px_rgb(0_0_0_/_0.25)] pointer-events-none">
          VibeSpace
        </div>
      </div>

      {/* СПИСОК ТРЕКІВ */}
      <div className="flex flex-col items-center mt-12 gap-5" style={{ WebkitAppRegion: 'no-drag' }}>
        {results.length > 0 && results.map((track) => (
          <div 
            key={track.videoId} 
            className="w-[500px] h-20 relative bg-[#8C7DA8] hover:bg-[#A99EC5] transition-colors rounded-2xl cursor-pointer shadow-md"
            onClick={() => playTrack(track)}
          >
            <div className="size-10 left-[16px] top-[18px] absolute bg-zinc-300 rounded-[5px] overflow-hidden">
              {track.thumbnail && <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />}
            </div>
            <div className="left-[67px] top-[18px] absolute justify-start text-violet-100 text-base font-black font-['Inter'] [text-shadow:_0px_6px_4px_rgb(0_0_0_/_0.25)] truncate w-[410px]">
              {track.title}
            </div>
            <div className="left-[67px] top-[43px] absolute opacity-60 justify-start text-violet-100 text-xs font-black font-['Inter'] [text-shadow:_0px_6px_4px_rgb(0_0_0_/_0.25)] truncate w-[410px]">
              {track.artist.join(', ')}
            </div>
          </div>
        ))}
      </div>

      {/* Тег audio у фоні з новими подіями оновлення часу */}
      <audio 
        ref={audioRef}
        src={currentTrackUrl || ''} 
        autoPlay 
        crossOrigin="anonymous"
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* НИЖНЯ ПАНЕЛЬ ПЛЕЄРА */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 h-28 bg-[#504561] shadow-[0_-10px_30px_rgba(0,0,0,0.3)] flex items-center justify-between px-8 border-t border-[#4B3C61]/20" style={{ WebkitAppRegion: 'no-drag' }}>
          
          {/* Ліва частина */}
          <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
            <div className="size-14 bg-zinc-300 rounded-xl overflow-hidden shadow-md flex-shrink-0">
              {currentTrack.thumbnail && <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />}
            </div>
            <div className="flex flex-col truncate">
              <h4 className="text-white font-black text-sm font-['Inter'] truncate [text-shadow:_0px_2px_4px_rgba(0,0,0,0.25)]">{currentTrack.title}</h4>
              <p className="text-violet-200 opacity-60 font-black text-xs font-['Inter'] truncate mt-0.5">{currentTrack.artist.join(', ')}</p>
            </div>
          </div>

          {/* Центральна частина: ХВИЛІ, ПОЛОВИНКА ПРОГРЕСУ ТА ТЕКСТ ЧАСУ */}
          <div className="flex items-center flex-1 max-w-[600px] gap-5 mx-6" style={{ WebkitAppRegion: 'no-drag' }}>
            
            {/* Блок з еквалайзером та таймлайном */}
            <div className="flex flex-col flex-1 gap-2">
              {/* Віконце еквалайзера */}
              <div className="w-[450px] h-10 relative flex items-center bg-[#463b57] rounded-xl px-2 overflow-hidden shadow-inner">
                <canvas ref={canvasRef} width={450} height={40} className="w-full h-full" />
              </div>

              {/* РЯДОК З ПОЛОСКОЮ ПЕРЕМОТКИ ТА ТЕКСТОМ ЧАСУ */}
              <div className="w-[450px] flex items-center gap-3">
                <input 
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-[#463b57] rounded-lg appearance-none cursor-pointer accent-violet-200"
                />
                {/* Маленький акуратний текст часу справа після смуги */}
                <span className="text-violet-200 opacity-80 font-black text-[11px] font-['Inter'] w-20 text-right tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Кнопка Play/Pause */}
            <button 
              onClick={togglePlay}
              className="size-10 bg-violet-200 rounded-full shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-violet-300 transition-colors text-violet-900 flex-shrink-0"
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 ml-0.5"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
              )}
            </button>
          </div>

          <div className="w-1/4 hidden md:block"></div>
        </div>
      )}
    </div>
  )
}

export default App