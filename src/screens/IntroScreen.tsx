// Cinema intro, shown only the first time, right after "Começar minha jornada".
// Full-screen silent video (intro-luz); the full logo rises over the sky in its last 2 seconds.
// Sounds: lamp_ignite at the start, day_complete when the logo appears. "Pular" leaves at any time.
// While the video file is missing, its placeholder runs on the same timeline. With reduced motion
// the video never autoplays: the poster (or placeholder) stays still and the logo fades in early.
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ui } from '../content'
import { MediaPlaceholder } from '../media/MediaPlaceholder'
import { posterPath, videoSources } from '../media/paths'
import { soundManager } from '../sound/SoundManager'
import { useNarration } from '../sound/useNarration'
import { Logo } from '../ui/Logo'

const ID = 'intro-luz'
const LOGO_LEAD_S = 2 // the logo shows during the video's last 2 seconds
const HOLD_AFTER_MS = 1200 // logo stays on screen after the video (and the voice) end
const NARRATION_ID = 'narr-intro-luz'
/** Timeline without a playable video: placeholder (missing file) or reduced motion. */
const STILL_TIMELINE = { full: { logoAt: 4000, endAt: 6000 }, reduced: { logoAt: 300, endAt: 2600 } }

interface Props {
  onDone(): void
}

export function IntroScreen({ onDone }: Props) {
  const reduced = useReducedMotion()
  const [videoMissing, setVideoMissing] = useState(false)
  const [videoOk, setVideoOk] = useState(false)
  const [posterOk, setPosterOk] = useState(false)
  const [logo, setLogo] = useState(false)
  const left = useRef(false)
  // The narrator speaks over the intro; the last frame holds until the voice ends.
  const voice = useNarration(NARRATION_ID, { delayMs: 400 })
  const [ended, setEnded] = useState(false)

  const leave = () => {
    if (left.current) return
    left.current = true
    onDone()
  }

  // The lamp lights as the intro starts. Deferred a tick so StrictMode's double mount plays it once.
  useEffect(() => {
    const t = window.setTimeout(() => soundManager.play('lamp_ignite'), 0)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!logo) return
    soundManager.play('day_complete')
  }, [logo])

  useEffect(() => {
    const img = new Image()
    img.onload = () => setPosterOk(true)
    img.src = posterPath(ID)
    return () => {
      img.onload = null
    }
  }, [])

  // No playable video: run the same beats on a timer.
  const still = reduced || videoMissing
  useEffect(() => {
    if (!still) return
    const { logoAt, endAt } = reduced ? STILL_TIMELINE.reduced : STILL_TIMELINE.full
    const a = window.setTimeout(() => setLogo(true), logoAt)
    const b = window.setTimeout(() => setEnded(true), endAt)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, reduced])

  useEffect(() => {
    if (!ended || !voice.done) return
    const t = window.setTimeout(leave, HOLD_AFTER_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, voice.done])

  function onTime(v: HTMLVideoElement) {
    if (!logo && Number.isFinite(v.duration) && v.duration - v.currentTime <= LOGO_LEAD_S) setLogo(true)
  }

  return (
    <section className="relative flex-1 overflow-hidden bg-ink" aria-label="Abertura" data-testid="intro">
      {!videoOk && !posterOk && <MediaPlaceholder id={ID} fill />}
      {posterOk && !videoOk && <img src={posterPath(ID)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {!reduced && !videoMissing && (
        <video
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoOk ? 'opacity-100' : 'opacity-0'}`}
          muted
          playsInline
          autoPlay
          preload="auto"
          poster={posterOk ? posterPath(ID) : undefined}
          onLoadedData={() => setVideoOk(true)}
          onTimeUpdate={(e) => onTime(e.currentTarget)}
          onEnded={() => {
            setLogo(true)
            setEnded(true)
          }}
          aria-hidden="true"
        >
          {videoSources(ID).map((s, i, all) => (
            <source
              key={s.src}
              src={s.src}
              type={s.type}
              // The last source failing means no format could play.
              onError={i === all.length - 1 ? () => setVideoMissing(true) : undefined}
            />
          ))}
        </video>
      )}

      {/* Soft darkening at the top so the logo reads over a bright sky. */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${logo ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'radial-gradient(ellipse 90% 45% at 50% 38%, rgba(30,34,48,0.55), rgba(30,34,48,0) 70%)' }}
      />

      <AnimatePresence>
        {logo && (
          <motion.div
            key="logo"
            className="pointer-events-none absolute inset-x-0 top-[26%] flex justify-center px-10"
            initial={{ opacity: 0, y: reduced ? 0 : 16, filter: reduced ? 'none' : 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: reduced ? 0.3 : 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Logo variant="full" className="w-full max-w-[300px] text-paper drop-shadow-[0_2px_18px_rgba(20,22,32,0.55)]" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+44px)] flex min-h-[56px] justify-center px-8 text-center" aria-live="off" data-testid="legenda-narracao">
        {voice.cue && (
          <span key={voice.cue.text} className="narr-cue self-end rounded-md bg-ink/50 px-2 py-[3px] font-serif text-[16px] italic leading-[1.8] text-paper/95 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
            {voice.cue.text}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={leave}
        className="absolute right-3 top-[calc(env(safe-area-inset-top)+10px)] z-10 min-h-11 min-w-11 rounded-full bg-ink/35 px-4 text-[13px] font-semibold text-paper/80 backdrop-blur-sm transition-colors hover:bg-ink/55 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-soft"
      >
        {ui.abertura.pular}
      </button>
    </section>
  )
}
