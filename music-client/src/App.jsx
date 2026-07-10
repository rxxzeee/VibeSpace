import { useState, useEffect, useRef } from 'react'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [currentTrack, setCurrentTrack] = useState(null)
  const [currentTrackUrl, setCurrentTrackUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // Смуга прогресу
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // СТАН ПЛЕЙЛІСТІВ
  const [playlists, setPlaylists] = useState([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [activePlaylistName, setActivePlaylistName] = useState(null) 
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState(null) 

  // Стан черги відтворення
  const [currentTrackIndex, setCurrentTrackIndex] = useState(null)
  const [activeTrackList, setActiveTrackList] = useState([]) 

  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    fetchPlaylists()
  }, [])

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/playlists')
      const data = await res.json()
      if (data.status === 'success') setPlaylists(data.data)
    } catch (e) { console.error(e) }
  }

  const createPlaylist = async (e) => {
    e.preventDefault()
    if (!newPlaylistName.trim()) return
    try {
      const res = await fetch(`http://127.0.0.1:8000/playlists?name=${encodeURIComponent(newPlaylistName)}`, { method: 'POST' })
      const data = await res.json()
      if (data.status === 'success') {
        setNewPlaylistName('')
        fetchPlaylists()
      } else { alert(data.message) }
    } catch (e) { console.error(e) }
  }

  const loadPlaylistTracks = async (name) => {
    setLoading(true)
    setActivePlaylistName(name)
    try {
      const res = await fetch(`http://127.0.0.1:8000/playlists/${encodeURIComponent(name)}`)
      const data = await res.json()
      if (data.status === 'success') {
        setResults(data.data)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
    setIsDrawerOpen(false) 
  }

  const addTrackToPlaylist = async (playlistName) => {
    if (!trackToAddToPlaylist) return
    try {
      const res = await fetch(`http://127.0.0.1:8000/playlists/${encodeURIComponent(playlistName)}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackToAddToPlaylist)
      })
      const data = await res.json()
      if (data.status === 'success') {
        setTrackToAddToPlaylist(null) 
      }
    } catch (e) { console.error(e) }
  }

  // НОВА ФУНКЦІЯ: Видалення треку з плейлісту
  const deleteTrackFromPlaylist = async (playlistName, videoId, e) => {
    e.stopPropagation() // Щоб трек не починав грати при натисканні на кошик
    try {
      const res = await fetch(`http://127.0.0.1:8000/playlists/${encodeURIComponent(playlistName)}/tracks/${videoId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.status === 'success') {
        // Оновлюємо список треків на екрані, щоб видалений трек зник
        loadPlaylistTracks(playlistName)
      }
    } catch (e) { console.error("Помилка видалення:", e) }
  }

  const searchMusic = async (e) => {
    e.preventDefault()
    if (!query) return
    setLoading(true)
    setActivePlaylistName(null) 
    try {
      const res = await fetch(`http://127.0.0.1:8000/search?query=${query}`)
      const data = await res.json()
      if (data.status === 'success') {
        setResults(data.data)
      }
    } catch (error) { console.error("Помилка пошуку:", error) }
    setLoading(false)
  }

  const playTrack = async (track, index, trackList) => {
    setCurrentTrackUrl(null)
    setCurrentTrack(track)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setCurrentTrackIndex(index)
    setActiveTrackList(trackList)

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
    } catch (error) { console.error("Помилка завантаження треку:", error) }
  }

  const handleTrackEnded = () => {
    if (activeTrackList && currentTrackIndex !== null && currentTrackIndex < activeTrackList.length - 1) {
      const nextIndex = currentTrackIndex + 1
      playTrack(activeTrackList[nextIndex], nextIndex, activeTrackList)
    } else {
      setIsPlaying(false)
    }
  }

  const togglePlay = async () => {
    if (!audioRef.current) return
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }
    if (isPlaying) { audioRef.current.pause() } else { audioRef.current.play() }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e) => {
    const seekTime = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime
      setCurrentTime(seekTime)
    }
  }

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00'
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

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
    return () => cancelAnimationFrame(animationRef.current)
  }, [currentTrackUrl])

  return (
    <div className="min-h-screen bg-[#64557B] relative overflow-x-hidden font-['Inter',sans-serif] select-none pb-36">
      
      {/* ЛІВИЙ ДРОВЕР (МЕНЮ ПЛЕЙЛІСТІВ) */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-[#504561] shadow-2xl z-50 transform ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 p-6 flex flex-col`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-violet-200 text-xl font-black">Мої плейлісти</h2>
          <button onClick={() => setIsDrawerOpen(false)} className="text-violet-200 font-bold hover:text-white text-lg">✕</button>
        </div>
        
        <form onSubmit={createPlaylist} className="mb-6 flex gap-2">
          <input 
            type="text" 
            placeholder="Новий плейліст..." 
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            className="flex-1 bg-[#423852] rounded-lg px-3 py-1.5 text-sm text-white outline-none placeholder-violet-200/40"
          />
          {isDrawerOpen && (
            <button type="submit" className="bg-violet-200 text-[#504561] px-3 rounded-lg font-black text-sm hover:bg-violet-300">+</button>
          )}
        </form>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {playlists.map(name => (
            <button 
              key={name}
              onClick={() => loadPlaylistTracks(name)}
              className={`w-full text-left p-3 rounded-xl font-bold text-sm transition-colors ${activePlaylistName === name ? 'bg-violet-200 text-[#504561]' : 'bg-[#5e5073] text-violet-100 hover:bg-[#6c5c85]'}`}
            >
              📁 {name}
            </button>
          ))}
        </div>
      </div>

      {/* ВЕРХНЯ ПАНЕЛЬ (Header) */}
      <div className="w-full pt-8 px-10 flex items-center justify-between drag-area z-40">
        <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' }}>
          <button 
            onClick={() => window.electronAPI?.closeWindow()}
            className="size-7 bg-violet-200 rounded-full shadow-[0px_6px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-violet-300 transition-colors"
          >
            <span className="text-violet-900 text-xs font-black">X</span>
          </button>
          <button 
            onClick={() => window.electronAPI?.minimizeWindow()}
            className="size-7 bg-violet-200 rounded-full shadow-[0px_6px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-violet-300 transition-colors pb-1"
          >
            <span className="text-violet-900 text-xs font-black">_</span>
          </button>
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="size-7 bg-violet-200 rounded-full shadow-[0px_6px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-violet-300 transition-colors text-violet-900 font-bold text-sm"
            title="Плейлісти"
          >
            ☰
          </button>
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4 pr-5" style={{ WebkitAppRegion: 'no-drag' }}>
          <button onClick={searchMusic} className="size-7 bg-violet-200 rounded-full shadow-[0px_6px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-violet-300 transition-colors">
            {loading ? <div className="size-3.5 border-[3px] border-violet-900 border-t-transparent rounded-full animate-spin"></div> :
              <div className="size-3.5 relative overflow-hidden flex items-center justify-center">
                 <div className="size-3 outline outline-4 outline-offset-[-1.75px] outline-violet-900 rounded-full" />
                 <div className="w-2 h-1 bg-violet-900 absolute bottom-[-1px] right-[-3px] rotate-45 rounded-full" />
              </div>}
          </button>
          <form onSubmit={searchMusic}>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="w-[440px] h-10 bg-violet-200 rounded-2xl shadow-[0px_6px_4px_0px_rgba(0,0,0,0.25)] px-5 justify-start text-violet-900 text-sm font-black font-['Inter'] outline-none placeholder-violet-900/60" />
          </form>
        </div>

        <div className="w-40 h-10 justify-end flex items-center text-violet-200 text-3xl font-normal font-['Modak',_cursive,sans-serif] [text-shadow:_0px_6px_4px_rgb(0_0_0_/_0.25)] pointer-events-none">
          VibeSpace
        </div>
      </div>

      {/* ОСНОВНИЙ СПИСОК */}
      <div className="flex flex-col items-center mt-12 gap-5" style={{ WebkitAppRegion: 'no-drag' }}>
        
        {activePlaylistName && (
          <div className="w-[500px] flex justify-between items-center bg-[#56496b] p-4 rounded-2xl shadow-md border border-[#4d4061]">
            <h2 className="text-white font-black text-lg">📁 Плейліст: {activePlaylistName}</h2>
            {results.length > 0 && (
              <button 
                onClick={() => playTrack(results[0], 0, results)}
                className="bg-violet-200 text-[#504561] px-4 py-1.5 rounded-xl font-black text-xs hover:bg-violet-300 transition-colors shadow-md"
              >
                ▶ Грати все підряд
              </button>
            )}
          </div>
        )}

        {results.length > 0 && results.map((track, index) => (
          <div 
            key={track.videoId} 
            className="w-[500px] h-20 relative bg-[#8C7DA8] hover:bg-[#A99EC5] transition-colors rounded-2xl cursor-pointer shadow-md group"
          >
            <div className="absolute inset-0 rounded-2xl" onClick={() => playTrack(track, index, results)}></div>
            
            <div className="size-10 left-[16px] top-[18px] absolute bg-zinc-300 rounded-[5px] overflow-hidden pointer-events-none">
              {track.thumbnail && <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />}
            </div>
            
            {/* Трохи зменшив ширину тексту до w-[330px], щоб залишалося місце для двох кнопок справа */}
            <div className="left-[67px] top-[18px] absolute text-violet-100 text-base font-black truncate w-[330px] pointer-events-none [text-shadow:_0px_6px_4px_rgb(0_0_0_/_0.25)]">{track.title}</div>
            <div className="left-[67px] top-[43px] absolute opacity-60 text-violet-100 text-xs font-black truncate w-[330px] pointer-events-none [text-shadow:_0px_6px_4px_rgb(0_0_0_/_0.25)]">{track.artist.join(', ')}</div>
            
            {/* КНОПКА ПЛЮС `+` (Зсувається лівіше, якщо ми всередині плейлісту) */}
            <button 
              onClick={(e) => { e.stopPropagation(); setTrackToAddToPlaylist(track); }}
              className={`absolute ${activePlaylistName ? 'right-14' : 'right-4'} top-1/2 transform -translate-y-1/2 size-8 bg-violet-200 hover:bg-violet-300 text-violet-900 font-black text-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md`}
              title="Додати в інший плейліст"
            >
              +
            </button>

            {/* НОВА КНОПКА: Кошик для видалення (Рендериться ТІЛЬКИ всередині плейлісту) */}
            {activePlaylistName && (
              <button 
                onClick={(e) => deleteTrackFromPlaylist(activePlaylistName, track.videoId, e)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 size-8 bg-red-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
                title="Видалити з цього плейлісту"
              >
                {/* Іконка кошика */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* МОДАЛКА `+` */}
      {trackToAddToPlaylist && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#504561] p-6 rounded-3xl w-80 shadow-2xl border border-[#64557B]">
            <h3 className="text-white font-black text-md mb-4 truncate">Додати: {trackToAddToPlaylist.title}</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {playlists.length === 0 ? <p className="text-violet-200/50 text-sm text-center py-4">Спочатку створи плейліст у меню</p> : 
                playlists.map(name => (
                  <button 
                    key={name}
                    onClick={() => addTrackToPlaylist(name)}
                    className="w-full text-left bg-[#64557B] hover:bg-[#73638c] text-white p-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    📁 {name}
                  </button>
                ))
              }
            </div>
            <button onClick={() => setTrackToAddToPlaylist(null)} className="w-full mt-4 bg-transparent border border-violet-200/40 text-violet-200 py-2 rounded-xl text-sm font-bold hover:bg-white/5 transition-colors">Скасувати</button>
          </div>
        </div>
      )}

      <audio ref={audioRef} src={currentTrackUrl || ''} autoPlay crossOrigin="anonymous" onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)} onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)} onEnded={handleTrackEnded} />

      {/* НИЖНЯ ПАНЕЛЬ ПЛЕЄРА */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 h-28 bg-[#504561] shadow-[0_-10px_30px_rgba(0,0,0,0.3)] flex items-center justify-between px-8 border-t border-[#4B3C61]/20 z-40" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
            <div className="size-14 bg-zinc-300 rounded-xl overflow-hidden shadow-md flex-shrink-0">
              {currentTrack.thumbnail && <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />}
            </div>
            <div className="flex flex-col truncate">
              <h4 className="text-white font-black text-sm font-['Inter'] truncate [text-shadow:_0px_2px_4px_rgba(0,0,0,0.25)]">{currentTrack.title}</h4>
              <p className="text-violet-200 opacity-60 font-black text-xs font-['Inter'] truncate mt-0.5">{currentTrack.artist.join(', ')}</p>
            </div>
          </div>

          <div className="flex items-center flex-1 max-w-[600px] gap-5 mx-6" style={{ WebkitAppRegion: 'no-drag' }}>
            <div className="flex flex-col flex-1 gap-2">
              <div className="w-[450px] h-10 relative flex items-center bg-[#463b57] rounded-xl px-2 overflow-hidden shadow-inner">
                <canvas ref={canvasRef} width={450} height={40} className="w-full h-full" />
              </div>
              <div className="w-[450px] flex items-center gap-3">
                <input type="range" min={0} max={duration || 0} value={currentTime} onChange={handleSeek} className="flex-1 h-1 bg-[#463b57] rounded-lg appearance-none cursor-pointer accent-violet-200" />
                <span className="text-violet-200 opacity-80 font-black text-[11px] font-['Inter'] w-20 text-right tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
            </div>

            <button onClick={togglePlay} className="size-10 bg-violet-200 rounded-full shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-violet-300 transition-colors text-violet-900 flex-shrink-0">
              {isPlaying ? <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" /></svg> :
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 ml-0.5"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>}
            </button>
          </div>
          <div className="w-1/4 hidden md:block"></div>
        </div>
      )}
    </div>
  )
}

export default App