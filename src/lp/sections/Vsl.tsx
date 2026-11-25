// The sales video, right before the offer (copy in content/landing.json → vsl).
// Hidden until the file exists (public/lp/vsl.mp4): a HEAD request checks it is really a video, not
// the site's fallback page. Before the click: a silent preview of the first seconds, on loop, with
// captions on (none under reduced motion: only the poster). The click plays from the start with
// sound and the player's controls; captions stay available in the controls (.vtt). The free-start
// button shows after 2:30 of the video, or at once for whoever scrolls past without watching.
// Pixel: VideoPlay, Video50, Video90 (once each).
import { useEffect, useRef, useState } from 'react'
import landing from '../../../content/landing.json'
import { freeHref } from '../links'
import { reducedMotion } from '../motion'
import { pixelCustom } from '../pixel'
import { publicoTag } from '../publico'
import { useReveal } from '../useReveal'
import { onFreeClick } from '../track'

const v = landing.vsl

/** True once the video file is known to exist. */
function useVideoExists(src: string) {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    let alive = true
    fetch(src, { method: 'HEAD' })
      .then((r) => alive && setOk(r.ok && (r.headers.get('content-type') ?? '').startsWith('video/')))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [src])
  return ok
}

export function Vsl() {
  const exists = useVideoExists(v.video)
  if (exists) return <VslSection />
  // In development only: the section with a placeholder, so the layout can be seen before the video.
  return import.meta.env.DEV ? <VslSection placeholder /> : null
}

function VslSection({ placeholder = false }: { placeholder?: boolean }) {
  const root = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  useReveal(root)
  const reduced = useRef(reducedMotion()).current
  const [playing, setPlaying] = useState(false)
  const [cta, setCta] = useState(false)
  const sent = useRef(new Set<string>())

  const once = (event: string) => {
    if (sent.current.has(event)) return
    sent.current.add(event)
    pixelCustom(event, { publico: publicoTag() })
  }

  // Preview: muted loop of the first seconds, with captions showing, only while on screen.
  useEffect(() => {
    const el = video.current
    if (!el || playing) return
    const track = el.textTracks[0]
    if (track) track.mode = 'showing'
    if (reduced) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) el.play().catch(() => {})
      else el.pause()
    }, { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [reduced, playing])

  // Whoever scrolls past without watching finds the button there when they come back.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting && e.boundingClientRect.top < 0 && !playing) setCta(true)
    })
    io.observe(root.current!)
    return () => io.disconnect()
  }, [playing])

  const onTime = () => {
    const el = video.current!
    if (!playing) {
      if (el.currentTime >= v.previaSegundos) el.currentTime = 0
      return
    }
    if (el.currentTime >= v.botaoAposSegundos) setCta(true)
    if (el.duration > 0) {
      const pct = el.currentTime / el.duration
      if (pct >= 0.5) once('Video50')
      if (pct >= 0.9) once('Video90')
    }
  }

  const start = () => {
    const el = video.current!
    setPlaying(true)
    el.currentTime = 0
    el.muted = false
    el.loop = false
    el.controls = true
    const track = el.textTracks[0]
    if (track) track.mode = 'hidden'
    el.play().catch(() => {})
    once('VideoPlay')
  }

  return (
    <section id="video" ref={root} className="relative bg-ink px-5 py-20 text-paper md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h2 data-reveal className="font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] md:text-[44px]">
          {v.titulo}
        </h2>
        <p data-reveal className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-paper/75 md:text-lg">
          {v.subtitulo}
        </p>

        <div data-reveal className="relative mt-10 aspect-video w-full overflow-hidden rounded-[18px] bg-black shadow-[0_30px_70px_-25px_rgba(0,0,0,0.8)]">
          {placeholder ? (
            <div className="grid h-full w-full place-items-center bg-[#14161F] text-center font-mono text-[13px] text-paper/60">
              <span>
                vsl
                <br />
                public/lp/vsl.mp4 · só aparece no modo de desenvolvimento
              </span>
            </div>
          ) : (
          <video
            ref={video}
            className="h-full w-full object-cover"
            poster={v.poster}
            muted
            playsInline
            loop={!playing}
            preload="metadata"
            onTimeUpdate={onTime}
            onEnded={() => setCta(true)}
          >
            <source src={v.video} type="video/mp4" />
            <track kind="captions" src={v.legendas} srcLang="pt-BR" label="Português" default />
          </video>
          )}
          {!playing && !placeholder && (
            <button
              type="button"
              onClick={start}
              className="absolute inset-0 grid place-items-center bg-[rgba(20,22,32,0.25)] transition-colors hover:bg-[rgba(20,22,32,0.1)]"
              aria-label={v.tocar}
            >
              <span className="flex min-h-[56px] items-center gap-3 rounded-full bg-paper px-6 text-[15px] font-bold text-ink shadow-xl">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
                </svg>
                {v.tocar}
              </span>
            </button>
          )}
        </div>

        <div className="mt-8 min-h-[52px]">
          {cta && (
            <a
              href={freeHref()}
              onClick={() => onFreeClick('vsl')}
              className="lp-shine inline-grid min-h-[52px] place-items-center rounded-btn bg-ember-button px-7 text-[15px] font-bold text-white shadow-[0_10px_30px_-8px_rgba(196,87,46,0.7)]"
            >
              {v.botao}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
