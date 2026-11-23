import { useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { getMidia } from '../content'
import { SCENE_NARRATION_DELAY_MS } from '../sound/narration'
import { isAmbientId } from '../sound/sounds'
import { soundManager } from '../sound/SoundManager'
import { useNarration } from '../sound/useNarration'
import { MediaPlaceholder } from './MediaPlaceholder'
import { posterPath, videoSources } from './paths'

interface Props {
  id: string
  legenda: string
  referencia?: string
  onNext(): void
  /** Era color the caption gradient fades into. */
  tint?: string
  /** Narration id (content/narracoes.json): spoken 400 ms after scene_in, with subtitles. */
  narracao?: string
}

/**
 * Full-screen 9:16 scene: muted inline video over its poster, caption and reference on a dark
 * gradient. Sound comes from the SoundManager (scene_in + the catalog's ambient loop).
 * With a narration the video plays once and holds its last frame while the voice speaks; tapping
 * moves on at any time and cuts the voice with a short fade. The subtitles show even without sound.
 * With reduced motion the poster stays still and the video never autoplays.
 */
export function Scene({ id, legenda, referencia, onNext, tint = '#14161f', narracao }: Props) {
  const reduced = useReducedMotion()
  const [posterOk, setPosterOk] = useState(false)
  const [videoOk, setVideoOk] = useState(false)
  const [videoMissing, setVideoMissing] = useState(false)
  const voice = useNarration(narracao, { delayMs: SCENE_NARRATION_DELAY_MS })

  useEffect(() => {
    // Deferred one tick so a quick mount/unmount (React StrictMode) doesn't play it twice.
    const t = window.setTimeout(() => {
      soundManager.play('scene_in')
      const amb = getMidia(id)?.ambiente
      if (isAmbientId(amb)) soundManager.startAmbient(amb)
    }, 0)
    return () => {
      window.clearTimeout(t)
      soundManager.stopAmbient()
    }
  }, [id])

  useEffect(() => {
    const img = new Image()
    img.onload = () => setPosterOk(true)
    img.src = posterPath(id)
    return () => {
      img.onload = null
    }
  }, [id])

  const sources = videoSources(id)

  return (
    <div className="absolute inset-0 overflow-hidden">
      <button
        type="button"
        data-sound="card_next"
        onClick={() => {
          voice.stop()
          onNext()
        }}
        aria-label={`${legenda}${referencia ? ` (${referencia})` : ''}. Toque para seguir.`}
        className="absolute inset-0 flex flex-col justify-end overflow-hidden text-left"
      >
        {!posterOk && !videoOk && <MediaPlaceholder id={id} fill />}
        {posterOk && <img src={posterPath(id)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        {!reduced && !videoMissing && (
          <video
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${videoOk ? 'opacity-100' : 'opacity-0'}`}
            muted
            playsInline
            autoPlay
            loop={!narracao}
            preload="auto"
            poster={posterOk ? posterPath(id) : undefined}
            onLoadedData={() => setVideoOk(true)}
            aria-hidden="true"
          >
            {sources.map((s, i) => (
              <source
                key={s.src}
                src={s.src}
                type={s.type}
                onError={i === sources.length - 1 ? () => setVideoMissing(true) : undefined}
              />
            ))}
          </video>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: `linear-gradient(to top, ${tint}, transparent)` }} />
        <div className="relative px-6 pb-6">
          {narracao && (
            <p className="mb-4 min-h-[48px]" aria-hidden="true" data-testid="legenda-narracao">
              {voice.cue && (
                <span
                  key={voice.cue.text}
                  className="narr-cue rounded-md bg-ink/55 px-2 py-[3px] font-serif text-[15.5px] italic leading-[1.8] text-paper/95 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]"
                >
                  {voice.cue.text}
                </span>
              )}
            </p>
          )}
          <p className="font-display text-[26px] font-semibold leading-[1.2] text-paper">{legenda}</p>
          {referencia && <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.12em] text-gold">{referencia}</p>}
          <p className="mt-5 text-[12.5px] text-paper/50">Toque para seguir</p>
        </div>
      </button>

      {narracao && (
        <button
          type="button"
          onClick={voice.replay}
          aria-label="Ouvir a narração de novo"
          data-testid="repetir-narracao"
          className={`absolute right-3 top-[calc(env(safe-area-inset-top)+58px)] z-[2] grid h-11 w-11 place-items-center rounded-full bg-ink/40 backdrop-blur-sm transition-colors hover:bg-ink/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-soft ${voice.speaking ? 'text-gold-soft' : 'text-paper/85 hover:text-paper'}`}
        >
          <SpeakerIcon active={voice.speaking} />
        </button>
      )}
      {voice.provisional && (
        <span className="pointer-events-none absolute left-3 top-[calc(env(safe-area-inset-top)+68px)] z-[2] rounded bg-ember/85 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-paper">
          Voz provisória
        </span>
      )}
    </div>
  )
}

function SpeakerIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fillOpacity="0.25" />
      <path d="M15.5 9a4 4 0 0 1 0 6" className={active ? 'narr-wave' : ''} />
      <path d="M18.2 6.5a7.5 7.5 0 0 1 0 11" className={active ? 'narr-wave narr-wave-2' : ''} />
    </svg>
  )
}
