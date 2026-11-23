// "▶ Ouvir" on the landing page (docs/05 §3.5): a discreet button that speaks one narration, with a
// sound wave while it plays and the subtitle revealed word by word, like the page's titles.
// It never plays by itself, and it plays even with the page's sound switch off (the visitor asked).
// Outside development it only shows once the recording is on the server.
import { useEffect, useState } from 'react'
import { getNarracao, narrationAvailable } from '../sound/narration'
import { useNarration } from '../sound/useNarration'
import { lpSound } from './state'
import { lpEvent } from './track'

interface Props {
  id: string
  /** Where it sits (analytics). */
  origem: string
  align?: 'left' | 'center'
  className?: string
}

export function Listen({ id, origem, align = 'center', className = '' }: Props) {
  const narr = getNarracao(id)
  const [available, setAvailable] = useState(import.meta.env.DEV)
  const [started, setStarted] = useState(false)
  const voice = useNarration(id, { active: started, manager: lpSound, explicit: true })

  useEffect(() => {
    if (import.meta.env.DEV) return
    let alive = true
    void narrationAvailable(id).then((ok) => alive && setAvailable(ok))
    return () => {
      alive = false
    }
  }, [id])

  if (!narr || !available) return null
  const playing = voice.speaking || (started && !voice.done)

  const toggle = () => {
    lpSound.unlock()
    if (playing) return voice.stop()
    lpEvent('lp_click', { tipo: 'ouvir', origem })
    if (started) voice.replay()
    else setStarted(true)
  }

  return (
    <div className={`flex flex-col gap-2.5 ${align === 'center' ? 'items-center text-center' : 'items-start text-left'} ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? 'Parar a narração' : 'Ouvir a narração'}
        className="lp-listen inline-flex min-h-11 items-center gap-2 rounded-full border border-gold-soft/35 bg-ink/35 px-4 text-[13px] font-semibold text-paper/90 backdrop-blur-sm transition-colors hover:border-gold-soft/70 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-soft"
      >
        {playing ? <Wave /> : <PlayIcon />}
        {playing ? 'Ouvindo' : 'Ouvir'}
      </button>
      {/* The subtitle: also for anyone with the sound off, or a screen reader (as plain text). */}
      {started && <p className={`min-h-[1.6em] max-w-md font-serif text-[16px] italic leading-[1.6] text-paper/90 md:text-lg ${voice.cue ? '' : 'invisible'}`} aria-live="polite">
        {voice.cue && (
          <span key={voice.cue.text} className="lp-cue">
            <span className="sr-only">{voice.cue.text}</span>
            {voice.cue.text.split(' ').map((w, i) => (
              <span key={i} aria-hidden="true" className="lp-cue-word" style={{ animationDelay: `${i * 70}ms` }}>
                {w}&nbsp;
              </span>
            ))}
          </span>
        )}
      </p>}
      {voice.provisional && <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-gold-soft/80">Voz provisória (dev)</span>}
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="text-gold-soft">
      <path d="M2.5 1.4v9.2a.6.6 0 0 0 .9.5l7.4-4.6a.6.6 0 0 0 0-1L3.4.9a.6.6 0 0 0-.9.5z" fill="currentColor" />
    </svg>
  )
}

/** Four bars rising and falling while the voice plays. */
function Wave() {
  return (
    <span className="lp-wave flex h-3.5 items-end gap-[2px] text-gold-soft" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="w-[2.5px] rounded-full bg-current" style={{ animationDelay: `${i * 0.13}s` }} />
      ))}
    </span>
  )
}
