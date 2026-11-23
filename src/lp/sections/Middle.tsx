// 7 · Versículo, 8 · A jornada completa, 9 · Para quem é.
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import landing from '../../../content/landing.json'
import { imageSmallPath, posterPath, videoSources } from '../../media/paths'
import { CheckIcon } from '../../ui/icons'
import { gsap, reducedMotion } from '../motion'
import { Listen } from '../Listen'
import { copyFor, usePublico } from '../publico'
import { useReveal } from '../useReveal'
import { ScrollCue } from '../ScrollCue'

// ---------- 7 · Versículo ----------

/** Full-screen verse over the d1-labirinto scene, which drifts slower than the page. */
export function Verse() {
  const root = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  useReveal(root)
  const v = landing.versiculo

  useLayoutEffect(() => {
    const el = root.current!
    if (reducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.verse-bg',
        { yPercent: -12 },
        { yPercent: 12, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } },
      )
    }, el)
    return () => ctx.revert()
  }, [])

  // The video only loads and plays while the section is on screen.
  useEffect(() => {
    const el = root.current!
    if (reducedMotion()) return
    const io = new IntersectionObserver(([e]) => {
      const vid = video.current
      if (!vid) return
      if (e.isIntersecting) {
        if (vid.preload === 'none') vid.preload = 'auto'
        void vid.play().catch(() => {})
      } else vid.pause()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section id="versiculo" ref={root} className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-ink px-6 py-24 text-paper">
      <div aria-hidden="true" className="verse-bg absolute -inset-y-[14%] inset-x-0">
        <video ref={video} className="h-full w-full object-cover" muted playsInline loop preload="none" poster={posterPath(v.video)}>
          {videoSources(v.video).map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,34,48,0.55),rgba(30,34,48,0.85)_70%)]" />
      <figure className="relative mx-auto max-w-2xl text-center">
        <blockquote data-reveal className="font-serif text-[28px] italic leading-[1.3] md:text-[44px]">
          “{v.citacao}”
        </blockquote>
        <figcaption data-reveal className="mt-4 text-sm font-bold tracking-[0.14em] text-gold-soft">
          {v.referencia.toUpperCase()}
        </figcaption>
        <div data-reveal className="mt-6">
          <Listen id="narr-lp-versiculo" origem="versiculo" />
        </div>
        <p data-reveal className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-paper/80 md:text-lg">
          {v.texto}
        </p>
      </figure>
      <ScrollCue className="absolute bottom-3 left-1/2 z-[2] -translate-x-1/2 md:bottom-5" />
    </section>
  )
}

// ---------- 8 · A jornada completa ----------

/** Era pictures sliding past for the first stage ("fundos de era passando"). */
function EraStrip({ ids }: { ids: string[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reducedMotion() || ids.length < 2) return
    const t = window.setInterval(() => setI((n) => (n + 1) % ids.length), 1600)
    return () => window.clearInterval(t)
  }, [ids.length])
  return (
    <>
      {ids.map((id, k) => (
        <img
          key={id}
          src={imageSmallPath(id)}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
          style={{ opacity: k === i ? 1 : 0 }}
        />
      ))}
    </>
  )
}

export function Journey() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)
  const j = landing.jornada

  useLayoutEffect(() => {
    const el = root.current!
    if (reducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.journey-line',
        { scaleX: 0, scaleY: 0 },
        { scaleX: 1, scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.journey-list', start: 'top 75%', end: 'bottom 60%', scrub: 0.5 } },
      )
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section id="jornada" ref={root} className="relative bg-paper-2 px-5 py-20 text-ink md:px-10 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 data-reveal className="text-center font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] md:text-5xl">
          {j.titulo}
        </h2>
        <ol className="journey-list relative mt-12 grid gap-6 md:mt-16 md:grid-cols-4 md:gap-6">
          {/* The road linking the stages: vertical on mobile, horizontal on desktop. */}
          <span aria-hidden="true" className="journey-line absolute bottom-6 left-[19px] top-6 w-[3px] origin-top rounded bg-gradient-to-b from-gold to-gold/30 md:hidden" />
          <span aria-hidden="true" className="journey-line absolute left-6 right-6 top-[19px] hidden h-[3px] origin-left rounded bg-gradient-to-r from-gold to-gold/30 md:block" />
          {j.etapas.map((e, i) => (
            <li key={e.titulo} data-reveal className="relative pl-14 md:pl-0 md:pt-14">
              <span className="absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full bg-ink font-display text-lg font-semibold text-gold-soft shadow-card md:left-0">
                {i + 1}
              </span>
              <div className="overflow-hidden rounded-card bg-card shadow-card">
                <div className="relative aspect-[16/9] overflow-hidden bg-ink">
                  {e.imagens.length > 1 ? (
                    <EraStrip ids={e.imagens} />
                  ) : e.imagens.length === 1 ? (
                    <img src={imageSmallPath(e.imagens[0])} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '75% 45%' }} />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_60%,#3a3f55,#1E2230)]">
                      <span className="font-display text-2xl font-semibold text-gold-soft/90">{e.titulo}</span>
                    </div>
                  )}
                  {'selo' in e && e.selo && (
                    <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-bold text-ink">{e.selo}</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-xl font-semibold leading-tight">{e.titulo}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{e.texto}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ---------- 9 · Para quem é ----------

export function ForWhom() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)
  const p = landing.paraQuem
  return (
    <section id="para-quem" ref={root} className="relative bg-paper px-5 py-20 text-ink md:px-10 md:py-28">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1.4fr_1fr] md:items-start">
        <div>
          <h2 data-reveal className="font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] md:text-[42px]">
            {p.titulo}
          </h2>
          <ul className="mt-6 space-y-3">
            {p.sim.map((s) => (
              <li key={s} data-reveal className="flex gap-3 rounded-card bg-card p-4 shadow-card">
                <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-olive text-white">
                  <CheckIcon size={16} />
                </span>
                <span className="text-[16px] leading-snug">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-4 md:mt-[72px]">
          <Objection />
          <div data-reveal className="rounded-card border border-line bg-paper-2 p-5">
            <h3 className="font-display text-xl font-semibold">{p.naoTitulo}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{p.nao}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/** The audience's objection (question and answer), with a soft crossfade when the choice changes. */
function Objection() {
  const o = copyFor(usePublico()).objecao
  return (
    <div data-reveal className="grid rounded-card bg-card p-5 shadow-card">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={o.pergunta}
          className="[grid-area:1/1]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <h3 className="font-display text-xl font-semibold leading-snug">{o.pergunta}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{o.resposta}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}