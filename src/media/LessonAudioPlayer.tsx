// "Ouvir a lição" (Modo Áudio, docs/07 Prompt 8): the full narration of the lesson with play/pause,
// back 10 s and speed 1x / 1,25x / 1,5x, controllable from the lock screen (Media Session API).
// Listening to the end completes the lesson.
// Long-form playback uses one <audio> element here rather than the SoundManager (effects): the
// browser needs a real media element to stream it and to show it on the lock screen.
import { useEffect, useRef, useState } from 'react'
import { lessonAudioUrl } from '../access/lessonAudio'
import { soundManager } from '../sound/SoundManager'

const SPEEDS = [1, 1.25, 1.5]
const fmt = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')

interface Props {
  trailId: string
  trailTitle: string
  dayN: number
  dayTitle: string
  tone: 'light' | 'dark'
  /** Called once when the narration plays to the end. */
  onListened(): void
}

export function LessonAudioPlayer({ trailId, trailTitle, dayN, dayTitle, tone, onListened }: Props) {
  const audio = useRef<HTMLAudioElement>(null)
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState<string | null | undefined>(undefined)
  const [missing, setMissing] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [time, setTime] = useState({ at: 0, total: 0 })
  const ended = useRef(false)

  async function start() {
    setOpen(true)
    if (src === undefined) {
      const url = await lessonAudioUrl(trailId, dayN)
      setSrc(url)
      if (!url) setMissing(true)
    } else void audio.current?.play()
  }

  // Lock screen / headphones controls.
  useEffect(() => {
    if (!src || !('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    ms.metadata = new MediaMetadata({
      title: `Dia ${dayN} · ${dayTitle}`,
      artist: 'A Palavra em Ordem',
      album: trailTitle,
      artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    })
    const a = () => audio.current!
    ms.setActionHandler('play', () => void a().play())
    ms.setActionHandler('pause', () => a().pause())
    ms.setActionHandler('seekbackward', () => (a().currentTime = Math.max(0, a().currentTime - 10)))
    ms.setActionHandler('seekforward', () => (a().currentTime = Math.min(a().duration || 0, a().currentTime + 10)))
    ms.setActionHandler('seekto', (d) => d.seekTime !== undefined && (a().currentTime = d.seekTime))
    return () => {
      for (const action of ['play', 'pause', 'seekbackward', 'seekforward', 'seekto'] as MediaSessionAction[]) ms.setActionHandler(action, null)
    }
  }, [src, dayN, dayTitle, trailTitle])

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed
  }, [speed])

  // The scene ambience would fight the voice: quiet it while the lesson plays.
  useEffect(() => {
    if (playing) soundManager.stopAmbient()
  }, [playing])

  const dark = tone === 'dark'
  if (!open)
    return (
      <button
        type="button"
        onClick={() => void start()}
        data-testid="ouvir-licao"
        className={`flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold ${dark ? 'bg-white/10 text-paper' : 'bg-card text-ink shadow-card'}`}
      >
        <HeadphonesIcon /> Ouvir a lição
      </button>
    )

  const pct = time.total ? (time.at / time.total) * 100 : 0
  return (
    <div className={`w-full rounded-card px-3 py-2 ${dark ? 'bg-white/10 text-paper' : 'bg-card text-ink shadow-card'}`} data-testid="player-licao">
      {missing ? (
        <p className="py-1.5 text-[13px]">O áudio desta lição ainda não está disponível.</p>
      ) : (
        <>
          {src && (
            <audio
              ref={audio}
              src={src}
              autoPlay
              preload="auto"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => setMissing(true)}
              onLoadedMetadata={(e) => {
                e.currentTarget.playbackRate = speed
                setTime({ at: 0, total: e.currentTarget.duration })
              }}
              onTimeUpdate={(e) => setTime({ at: e.currentTarget.currentTime, total: e.currentTarget.duration })}
              onEnded={() => {
                setPlaying(false)
                if (!ended.current) {
                  ended.current = true
                  onListened()
                }
              }}
            />
          )}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Voltar 10 segundos"
              onClick={() => audio.current && (audio.current.currentTime = Math.max(0, audio.current.currentTime - 10))}
              className="grid h-11 w-11 place-items-center rounded-full text-[12px] font-bold"
            >
              −10
            </button>
            <button
              type="button"
              aria-label={playing ? 'Pausar' : 'Tocar'}
              onClick={() => (playing ? audio.current?.pause() : void audio.current?.play())}
              className={`grid h-11 w-11 place-items-center rounded-full ${dark ? 'bg-paper text-ink' : 'bg-ink text-paper'}`}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className="mx-1 flex-1">
              <div className={`h-1.5 overflow-hidden rounded-full ${dark ? 'bg-white/15' : 'bg-line'}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Andamento do áudio">
                <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[11px] opacity-70">
                <span>{fmt(time.at)}</span>
                <span>{fmt(time.total)}</span>
              </div>
            </div>
            <button
              type="button"
              aria-label={`Velocidade ${speed}x`}
              onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
              className="min-h-11 min-w-[52px] rounded-full px-2 text-[12.5px] font-bold"
            >
              {String(speed).replace('.', ',')}x
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const HeadphonesIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden="true">
    <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    <rect x="3" y="14" width="4" height="6" rx="1.5" fill="currentColor" fillOpacity={0.2} />
    <rect x="17" y="14" width="4" height="6" rx="1.5" fill="currentColor" fillOpacity={0.2} />
  </svg>
)
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13l10-6.5z" />
  </svg>
)
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <rect x="6.5" y="5" width="4" height="14" rx="1" />
    <rect x="13.5" y="5" width="4" height="14" rx="1" />
  </svg>
)
