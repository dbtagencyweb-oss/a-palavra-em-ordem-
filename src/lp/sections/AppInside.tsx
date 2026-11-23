// 6 · O app por dentro. A phone stays fixed (sticky) while seven steps scroll past; each step swaps
// the phone's screen (real captures of the app, see scripts/lp-screens.mjs) and reveals its text.
// Step 1 plays a recorded tour of the app (scripts/lp-tour.mjs): the Home, a walk down the map and a
// few sections opened. Step 3 plays a stretch of the d4-mar-aberto scene inside the phone. Step 6 shows the 7 medals in a
// row turning gold one by one, tilting in 3D under the finger or the mouse.
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import landing from '../../../content/landing.json'
import { imagePath, posterPath, videoSources } from '../../media/paths'
import { useReveal } from '../useReveal'

const a = landing.app
type Step = (typeof a.passos)[number]
const screenSrc = (id: string) => `/media/lp/${id}.webp`

function PhoneScreen({ step, active }: { step: Step; active: boolean }) {
  const reduced = useReducedMotion()
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = video.current
    if (!v) return
    if (active && !reduced) {
      if ('tour' in step && step.tour) v.currentTime = 0 // the tour always starts at the Home
      void v.play().catch(() => {})
    }
    else v.pause()
  }, [active, reduced, step])

  if ('tour' in step && step.tour) {
    return (
      <video
        ref={video}
        className="absolute inset-0 h-full w-full bg-paper object-cover object-top"
        muted
        playsInline
        loop
        preload="metadata"
        poster={posterPath(step.tour)}
        aria-hidden="true"
      >
        {videoSources(step.tour).map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>
    )
  }
  if ('video' in step && step.video) {
    return (
      <div className="absolute inset-0 bg-ink">
        <video
          ref={video}
          className="h-full w-full object-cover"
          muted
          playsInline
          loop
          preload="none"
          poster={posterPath(step.video)}
          aria-hidden="true"
        >
          {videoSources(step.video).map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-6 pt-16 text-[11px] leading-snug text-white/90">
          {step.titulo}
        </div>
      </div>
    )
  }
  return <img src={screenSrc(step.tela!)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-top" />
}

/** The phone plays only while it is on screen, so the tour starts at the Home when the visitor arrives. */
function Phone({ index }: { index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 })
    io.observe(ref.current!)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className="relative mx-auto aspect-[390/844] h-full max-h-[640px] rounded-[38px] bg-[#14161F] p-[9px] shadow-[0_30px_70px_-20px_rgba(30,34,48,0.55),inset_0_0_0_1.5px_rgba(255,255,255,0.08)]">
      <div className="relative h-full w-full overflow-hidden rounded-[30px] bg-paper">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <PhoneScreen step={a.passos[index]} active={inView} />
          </motion.div>
        </AnimatePresence>
        <div aria-hidden="true" className="absolute left-1/2 top-2 h-[18px] w-[86px] -translate-x-1/2 rounded-full bg-[#14161F]" />
      </div>
    </div>
  )
}

/** The seven medals; they turn gold one by one when `on`, and tilt toward the pointer. */
function Medals({ on }: { on: boolean }) {
  const reduced = useReducedMotion()
  function tilt(e: PointerEvent<HTMLDivElement>) {
    if (reduced) return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(500px) rotateY(${x * 28}deg) rotateX(${-y * 28}deg) scale(1.06)`
  }
  const reset = (e: PointerEvent<HTMLDivElement>) => (e.currentTarget.style.transform = '')
  return (
    <div className="mt-5 flex flex-wrap gap-2 md:gap-2.5">
      {a.medalhas.map((id, i) => (
        <div
          key={id}
          onPointerMove={tilt}
          onPointerLeave={reset}
          className="h-11 w-11 transition-transform duration-200 ease-out md:h-14 md:w-14"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <img
            src={imagePath(`simbolo-${id}`)}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full drop-shadow-[0_4px_8px_rgba(30,34,48,0.3)] transition-[filter] duration-700"
            style={{ filter: on ? 'none' : 'grayscale(1) brightness(1.1) opacity(0.55)', transitionDelay: on ? `${i * 160}ms` : '0ms' }}
          />
        </div>
      ))}
    </div>
  )
}

export function AppInside() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)
  const [active, setActive] = useState(0)
  const [medalsOn, setMedalsOn] = useState(false)

  // The step crossing a line across the screen is the active one.
  useEffect(() => {
    const steps = [...root.current!.querySelectorAll<HTMLElement>('[data-step]')]
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.step)
            setActive(i)
            if ('medalhas' in a.passos[i] && a.passos[i].medalhas) setMedalsOn(true)
          }
      },
      // Mobile: the phone covers the top half, so the active step is the one in the lower part.
      { rootMargin: window.matchMedia('(min-width: 768px)').matches ? '-45% 0px -45% 0px' : '-70% 0px -24% 0px' },
    )
    steps.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  // Warm the next screens so the swap never shows an empty phone.
  useEffect(() => {
    a.passos.slice(active + 1, active + 3).forEach((s) => {
      if ('tela' in s && s.tela) new Image().src = screenSrc(s.tela)
    })
  }, [active])

  return (
    <section id="app" ref={root} className="relative bg-paper text-ink">
      <div className="mx-auto max-w-6xl px-5 pt-20 md:px-10 md:pt-28">
        <h2 data-reveal className="text-center font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] md:text-5xl">
          {a.titulo}
        </h2>
      </div>

      <div className="relative mx-auto max-w-6xl px-5 md:grid md:grid-cols-[1fr_minmax(300px,360px)_1fr] md:gap-10 md:px-10">
        {/* Phone: sticky. Mobile: at the top of the screen; desktop: in the middle column. */}
        <div className="sticky top-[64px] z-10 h-[52svh] bg-paper pt-4 shadow-[0_18px_18px_-6px_#F5EFE3] md:top-0 md:bg-transparent md:shadow-none md:col-start-2 md:row-start-1 md:flex md:h-[100svh] md:items-center md:pt-0">
          <div className="h-full w-full md:h-[78svh]">
            <Phone index={active} />
          </div>
        </div>

        {/* Steps. Desktop: alternating sides of the phone. */}
        <ol className="relative md:col-span-3 md:col-start-1 md:row-start-1 md:grid md:grid-cols-[1fr_minmax(300px,360px)_1fr] md:gap-10">
          {a.passos.map((s, i) => {
            const left = i % 2 === 0
            return (
              <li
                key={i}
                data-step={i}
                // Desktop: one row per step, so the left and right ones never cross the line together.
                style={{ gridRow: i + 1 }}
                className={`flex min-h-[62svh] items-end pb-16 md:min-h-[80svh] md:items-center md:pb-0 ${left ? 'md:col-start-1 md:text-right' : 'md:col-start-3'}`}
              >
                <div
                  className={`w-full rounded-card bg-card/90 p-5 shadow-card backdrop-blur transition-[opacity,transform] duration-500 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none ${active === i ? 'opacity-100' : 'opacity-40 md:translate-y-3'}`}
                >
                  <span className="text-xs font-bold tracking-[0.14em] text-gold-ink">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-1 font-display text-[22px] font-semibold leading-tight md:text-[30px]">{s.titulo}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2 md:text-[17px]">{s.texto}</p>
                  {'medalhas' in s && s.medalhas && (
                    <div className={left ? 'md:flex md:justify-end' : ''}>
                      <Medals on={medalsOn} />
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
