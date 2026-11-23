// 1 · Hero. The era-d1 picture split into three depths (sky, land with the road, the lamp's hill in
// front) that move at different speeds as you scroll. While scrolling, a light runs along the road
// from the lamp to the city on the horizon. The title reveals word by word once the preloader opens.
import { useLayoutEffect, useRef } from 'react'
import landing from '../../../content/landing.json'
import { imagePath, imageSmallPath } from '../../media/paths'
import { Logo } from '../../ui/Logo'
import { checkoutHref, freeHref } from '../links'
import { gsap, markTitleDone, onReady, reducedMotion } from '../motion'
import { offerText } from '../oferta'
import { copyFor, publicoFromUrl } from '../publico'
import { onBuyClick, onFreeClick } from '../track'
import { ScrollCue } from '../ScrollCue'
import { HeroBook } from '../HeroBook'
import { useWide } from '../useWide'

const h = landing.hero
// The hero's message is fixed: the 'padrao' version, or the one in the address (?p=). The chooser
// below it changes only what comes after it.
const fixed = copyFor(publicoFromUrl)
/** Retargeting traffic (?origem=rt): the purchase leads the hero. */
const retargeting = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('origem') === 'rt'

/** A title word: *Bíblia* gets the gold gradient (Fraunces italic), a hand-drawn stroke and one shine. */
function Word({ w }: { w: string }) {
  const m = w.match(/^\*(.+)\*(.*)$/)
  if (!m)
    return (
      // Room under the line for descenders (j, g, p), given back with a negative margin.
      <span className="lp-word -mb-[0.12em] inline-block overflow-hidden pb-[0.2em] align-top">
        <span className="inline-block">{w}&nbsp;</span>
      </span>
    )
  return (
    <span className="lp-word inline-block overflow-hidden pb-[0.3em] align-top -mb-[0.22em]">
      <span className="inline-block">
        <span className="lp-hl relative inline-block">
          {m[1]}
          <svg className="lp-hl-line" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
            <path d="M3 9.5C38 4.5 92 3 197 6.5" pathLength={1} />
          </svg>
        </span>
        {m[2]}&nbsp;
      </span>
    </span>
  )
}
const IMG = 'era-d1'
// The road in the picture's own pixels (768×1376): from the lamp's flame, up the hill, along the
// winding road to the city gate.
const ROAD =
  'M345 872 C360 830 395 790 425 748 C380 735 300 725 280 690 C262 660 290 640 360 628 C430 616 495 600 488 580 C482 562 380 562 350 552 C325 543 360 530 430 522 C490 515 545 508 530 490 C522 478 528 470 545 468'

// Bands of the picture for each depth (as % of its height): horizon ≈ 31%, hill crest ≈ 56%.
const MASKS = {
  sky: 'linear-gradient(to bottom, #000 0%, #000 30%, transparent 34%)',
  land: 'linear-gradient(to bottom, transparent 28%, #000 32%, #000 57%, transparent 61%)',
  front: 'linear-gradient(to bottom, transparent 54%, #000 59%)',
}

/** The picture at its own aspect, covering the hero like object-fit: cover (see .lp-cover). */
function Layer({ depth, children, priority }: { depth: keyof typeof MASKS; children?: React.ReactNode; priority?: boolean }) {
  return (
    <div className={`lp-layer lp-layer-${depth} absolute inset-0 will-change-transform`}>
      <div className="lp-cover" style={{ WebkitMaskImage: MASKS[depth], maskImage: MASKS[depth] }}>
        <img
          src={imagePath(IMG)}
          srcSet={`${imageSmallPath(IMG)} 540w, ${imagePath(IMG)} 768w`}
          sizes="(min-width: 768px) 100vw, 150vw"
          alt=""
          decoding="async"
          // React 18 only knows the lowercase attribute.
          {...{ fetchpriority: priority ? 'high' : 'auto' }}
          className="h-full w-full"
        />
      </div>
      {children}
    </div>
  )
}

export function Hero() {
  const root = useRef<HTMLElement>(null)
  const wide = useWide()
  const cell = useRef<HTMLDivElement>(null)

  // The book's vertical centre follows the title's (not the whole block with the logo above it).
  useLayoutEffect(() => {
    const c = cell.current
    const h1 = root.current?.querySelector('h1')
    if (!wide || !c || !h1) return
    const set = () => {
      const t = h1.getBoundingClientRect()
      c.style.setProperty('--hb-top', `${Math.round((t.top + t.bottom) / 2 - c.getBoundingClientRect().top)}px`)
    }
    set()
    const ro = new ResizeObserver(set)
    ro.observe(h1)
    return () => ro.disconnect()
  }, [wide])

  useLayoutEffect(() => {
    const el = root.current!
    const q = gsap.utils.selector(el)
    const reduced = reducedMotion()
    // The road light is revealed by a soft gradient mask that climbs from the lamp to the city
    // (the road only ever goes up the picture, so a vertical gradient follows it). Its leading edge
    // is feathered over FEATHER of the way, so the light fades in instead of appearing as a hard line.
    const FEATHER = 0.24
    const stopOn = el.querySelector<SVGStopElement>('.lp-road-on')!
    const stopOff = el.querySelector<SVGStopElement>('.lp-road-off')!
    const reveal = { p: -FEATHER }
    const paint = () => {
      stopOn.setAttribute('offset', String(reveal.p))
      stopOff.setAttribute('offset', String(reveal.p + FEATHER))
    }
    const ctx = gsap.context(() => {
      gsap.set(q('.lp-book'), { yPercent: -50 })
      if (reduced) reveal.p = 1 // reduced motion: the road is simply lit
      paint()
      if (reduced) {
        gsap.set(q('.lp-word > span, .lp-reveal'), { opacity: 0 })
        return
      }
      gsap.set(q('.lp-word > span'), { yPercent: 115 })
      gsap.set(q('.lp-reveal'), { opacity: 0, y: 14 })

      // Parallax: deeper on desktop.
      const mm = gsap.matchMedia()
      mm.add({ desk: '(min-width: 768px)', mob: '(max-width: 767px)' }, (c) => {
        const k = c.conditions!.desk ? 1.6 : 1
        const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true } })
        tl.to(q('.lp-layer-sky'), { yPercent: 10 * k, ease: 'none' }, 0)
          .to(q('.lp-layer-land, .lp-road'), { yPercent: 5 * k, ease: 'none' }, 0)
          .to(q('.lp-layer-front'), { yPercent: -3 * k, ease: 'none' }, 0)
          .to(q('.lp-copy'), { yPercent: -18, opacity: 0.15, ease: 'none' }, 0)
          .to(q('.lp-book'), { y: -120, opacity: 0.25, ease: 'none' }, 0)
      })

      // The road lights from the lamp to the horizon over the first part of the scroll.
      gsap.fromTo(
        reveal,
        { p: 0.04 },
        { p: 1, ease: 'none', immediateRender: false, onUpdate: paint, scrollTrigger: { trigger: el, start: 'top top', end: '75% top', scrub: 1.2 } },
      )
    }, el)

    const off = onReady(() => {
      if (reduced) {
        gsap.to(q('.lp-word > span, .lp-reveal'), { opacity: 1, duration: 0.3 })
        el.classList.add('is-drawn')
        markTitleDone()
        return
      }
      const tl = gsap.timeline()
      tl.to(q('.lp-logo, .lp-eyebrow'), { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.1 })
        .to(q('.lp-word > span'), { yPercent: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07 }, 0.1)
        .to(q('.lp-reveal:not(.lp-eyebrow):not(.lp-logo)'), { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1 }, 0.6)
        // The highlighted word: the stroke draws itself, then one shine runs across it.
        .add(() => el.classList.add('is-drawn'), 1.05)
        // The title is up: the book opens.
        .add(markTitleDone, 0.1 + 0.07 * q('.lp-word').length + 0.7)
        // A first glow leaves the lamp, softly.
        .to(reveal, { p: 0.04, duration: 1.6, ease: 'sine.out', onUpdate: paint }, 0.3)
    })

    return () => {
      off()
      ctx.revert()
    }
  }, [])

  return (
    <section id="hero" ref={root} className="lp-hero relative h-[100svh] min-h-[620px] overflow-hidden bg-ink text-paper">
      <div className="absolute inset-0" aria-hidden="true">
        <Layer depth="sky" priority />
        <Layer depth="land" />
        {/* Light along the road (moves with the land). */}
        <div className="lp-road absolute inset-0 will-change-transform">
          <svg className="lp-cover overflow-visible" viewBox="0 0 768 1376" fill="none">
            <defs>
              <filter id="lp-road-blur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="9" />
              </filter>
              <filter id="lp-road-soft" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.6" />
              </filter>
              {/* From the lamp (bottom) to the city gate (top): lit up to the 'on' stop, then fading. */}
              <linearGradient id="lp-road-grad" gradientUnits="userSpaceOnUse" x1="0" y1="884" x2="0" y2="462">
                <stop offset="0" stopColor="#fff" />
                <stop className="lp-road-on" offset="0" stopColor="#fff" />
                <stop className="lp-road-off" offset="0" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <mask id="lp-road-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="768" height="1376">
                <rect width="768" height="1376" fill="url(#lp-road-grad)" />
              </mask>
            </defs>
            <g mask="url(#lp-road-mask)">
              <path d={ROAD} stroke="#F2C66E" strokeWidth={26} strokeLinecap="round" opacity={0.4} filter="url(#lp-road-blur)" />
              <path d={ROAD} stroke="#FBE6B0" strokeWidth={4} strokeLinecap="round" opacity={0.7} filter="url(#lp-road-soft)" />
            </g>
          </svg>
        </div>
        <Layer depth="front" />
        {/* The picture always melts into the ink of the next section. */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink md:h-24" />
        {/* Readability: darker sky behind the title, dark ground behind the buttons. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(30,34,48,0.82)_0%,rgba(30,34,48,0.45)_22%,rgba(30,34,48,0)_40%,rgba(30,34,48,0)_58%,rgba(30,34,48,0.7)_74%,#1E2230_92%)] md:bg-[linear-gradient(to_right,rgba(30,34,48,0.92)_0%,rgba(30,34,48,0.7)_32%,rgba(30,34,48,0)_58%)]" />
      </div>

      {/* Scroll cue: bottom-right on mobile (the buttons fill the bottom), centred on desktop. */}
      <ScrollCue hideOnScroll className="absolute bottom-[calc(env(safe-area-inset-bottom)+6px)] right-2 z-[3] md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2" />

      {/* ≥1024px: a 1320px grid (text 1fr, book 1.15fr). The book is centred on the title and may
          reach 48px into the text column; below 1024px it comes after the hero (HeroBookBand). */}
      <div className="lp-copy pointer-events-none relative mx-auto flex h-full max-w-6xl flex-col justify-between px-5 pb-[calc(env(safe-area-inset-bottom)+22px)] pt-[14px] md:justify-center md:px-10 md:pb-0 md:pt-0 lg:grid lg:max-w-[1320px] lg:grid-cols-[1fr_1.15fr] lg:content-center lg:gap-x-6">
        <div className="pointer-events-auto md:max-w-[560px] lg:col-start-1 lg:row-start-1">
          {/* In the flow above the eyebrow, so it never sits on top of the text at any screen height. */}
          <Logo variant="full" className="lp-logo lp-reveal mb-4 block w-[92px] text-paper drop-shadow-[0_2px_10px_rgba(20,22,32,0.5)] md:mb-8 md:w-[140px]" />
          <p className="lp-eyebrow lp-reveal mb-3 text-[11px] font-bold tracking-[0.16em] text-gold-soft/85 md:text-xs">{fixed.eyebrow}</p>
          <h1 className="font-display text-[31px] font-semibold leading-[1.1] tracking-[-0.015em] md:text-[58px] lg:text-[48px] xl:text-[58px]">
            {fixed.titulo.split(' ').map((w, j) => (
              <Word key={j} w={w} />
            ))}
          </h1>
        </div>

        {wide && (
          <div ref={cell} className="lp-herobook-cell lg:col-start-2 lg:row-start-1">
            <div className="lp-herobook">
              <HeroBook />
            </div>
          </div>
        )}

        <div className="pointer-events-auto md:mt-7 md:max-w-[520px] lg:col-start-1 lg:row-start-2">
          {/* No "Ouvir" here for now: the recorded narr-lp-hero speaks the old title. */}
          <p className="lp-reveal text-[17px] font-medium leading-[1.45] text-paper/90 md:text-[22px]">{fixed.subtitulo}</p>
          <HeroCtas />
          <ul className="lp-reveal mt-1.5 flex flex-wrap justify-center gap-x-2.5 gap-y-0.5 text-[11.5px] text-paper/65 md:mt-2 md:justify-start md:gap-y-1">
            {h.confianca.map((c, i) => (
              <li key={c} className="flex items-center gap-2.5">
                {i > 0 && <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold/70" />}
                {c}
              </li>
            ))}
          </ul>
          <p className="lp-reveal mt-1 pr-11 text-left text-[11px] leading-snug text-paper/55 md:mt-1.5 md:pr-0">{h.renovacao}</p>
        </div>
      </div>
    </section>
  )
}

/**
 * The hero's buttons by where the visitor comes from. Cold traffic (no parameter): the free start
 * is the main button, the Founder purchase a link under it. Retargeting (?origem=rt): the purchase
 * leads, the free start is the link.
 */
function HeroCtas() {
  const big =
    'lp-shine grid min-h-[52px] flex-none place-items-center whitespace-nowrap rounded-btn bg-ember-button px-7 text-center text-[15px] font-bold text-white shadow-[0_10px_30px_-8px_rgba(196,87,46,0.7)] transition-transform active:scale-[0.98]'
  const link =
    'grid min-h-11 place-items-center text-center text-sm font-semibold text-paper/85 underline decoration-gold/70 underline-offset-4 hover:text-paper'
  return (
    <div className="lp-reveal mt-4 flex flex-col gap-1.5 md:mt-6 md:flex-row md:flex-wrap md:items-start md:gap-x-6 md:gap-y-1">
      {retargeting ? (
        <>
          <a href={checkoutHref()} onClick={() => onBuyClick('hero')} className={`lp-buy ${big}`}>
            {offerText(h.botaoPrincipal)}
          </a>
          <a href={freeHref()} onClick={() => onFreeClick('hero')} className={`whitespace-nowrap ${link}`}>
            {fixed.cta}
          </a>
        </>
      ) : (
        <>
          <div className="flex flex-col items-stretch gap-1 md:items-start">
            <a href={freeHref()} onClick={() => onFreeClick('hero')} className={big}>
              {fixed.cta}
            </a>
            <span className="text-center text-[11.5px] text-paper/60 md:text-left">{fixed.microcopy}</span>
          </div>
          <a href={checkoutHref()} onClick={() => onBuyClick('hero')} className={`lp-buy whitespace-nowrap ${link} md:min-h-[52px]`}>
            {offerText(h.botaoCompraSecundario)}
          </a>
        </>
      )}
    </div>
  )
}