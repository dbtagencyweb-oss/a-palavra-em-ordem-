// Fixed pieces around the landing page:
// - JourneyBar: a thin gold line across the top that fills with the scroll;
//   at the end of the page (or when the closing section asks for it) the lamp lights.
// - Corner: steps counter (+N pops up as it rises) and the sound switch (off by default).
// - MobileBuyBar: price and button, shown after the hero and hidden on the offer section.
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import landing from '../../../content/landing.json'
import { StepsIcon } from '../../ui/icons'
import { Logo } from '../../ui/Logo'
import { checkoutHref } from '../links'
import { fill, OFERTA, offerText, useOffer } from '../oferta'
import { scrollToEl } from '../motion'
import { lpSound, useSoundOn, useSteps } from '../state'
import { onBuyClick } from '../track'

const t = landing.chrome

/** Lights the lamp at the end of the journey bar (the closing section dispatches it). */
export const LIGHT_LAMP_EVENT = 'lp:light-lamp'

export function JourneyBar() {
  const fill = useRef<HTMLDivElement>(null)
  const [lit, setLit] = useState(false)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max <= 0 ? 0 : Math.min(1, window.scrollY / max)
      if (fill.current) fill.current.style.transform = `scaleX(${p})`
      if (p > 0.985) setLit(true)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    const light = () => setLit(true)
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener(LIGHT_LAMP_EVENT, light)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener(LIGHT_LAMP_EVENT, light)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-6" aria-hidden="true">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-white/10" />
      <div
        ref={fill}
        className="absolute inset-x-0 top-0 h-[3px] origin-left bg-[linear-gradient(90deg,#9C7A43,#E2C580_60%,#F1E3C4)] shadow-[0_0_8px_rgba(226,197,128,0.7)]"
        style={{ transform: 'scaleX(0)' }}
      />
      {/* The lamp at the end of the road. */}
      <div className="absolute right-1.5 top-[3px] h-[18px] w-[10px]">
        <div
          className={`absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(241,217,160,0.75),rgba(226,168,96,0)_70%)] transition-opacity duration-700 ${lit ? 'opacity-100' : 'opacity-0'}`}
        />
        <Logo
          variant="mark"
          title={null}
          className={`relative h-full w-full transition-[filter,opacity] duration-700 ${lit ? 'opacity-100' : 'opacity-35 grayscale'}`}
        />
      </div>
    </div>
  )
}

export function Corner() {
  const steps = useSteps()
  const soundOn = useSoundOn()
  const prev = useRef(steps)
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null)

  useEffect(() => {
    if (steps > prev.current) setGain({ n: steps - prev.current, key: Date.now() })
    prev.current = steps
  }, [steps])

  useEffect(() => {
    if (!gain) return
    const id = window.setTimeout(() => setGain(null), 1200)
    return () => window.clearTimeout(id)
  }, [gain])

  return (
    <div className="fixed right-3 top-3 z-50 flex items-center gap-2 md:right-5 md:top-5">
      <div
        className="relative flex h-11 items-center gap-1.5 rounded-full border border-white/10 bg-ink/70 pl-3 pr-3.5 text-paper shadow-[0_6px_20px_rgba(0,0,0,0.25)] backdrop-blur-md"
        aria-live="polite"
        aria-label={`${steps} ${t.passos}`}
      >
        <StepsIcon className="h-4 w-4 text-gold" />
        <motion.span
          key={steps}
          initial={{ scale: steps ? 1.35 : 1 }}
          animate={{ scale: 1 }}
          className="min-w-[1ch] text-sm font-bold tabular-nums"
        >
          {steps}
        </motion.span>
        <span className="text-xs text-paper/60">{t.passos}</span>
        <AnimatePresence>
          {gain && (
            <motion.span
              key={gain.key}
              className="absolute -bottom-6 right-2 text-xs font-bold text-gold-soft"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              +{gain.n}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={() => {
          lpSound.unlock()
          lpSound.toggleMuted()
          lpSound.play('tap')
        }}
        aria-pressed={soundOn}
        aria-label={soundOn ? t.somDesligar : t.somLigar}
        className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-ink/70 text-paper shadow-[0_6px_20px_rgba(0,0,0,0.25)] backdrop-blur-md"
      >
        <SpeakerIcon on={soundOn} />
      </button>
    </div>
  )
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" fillOpacity={0.18} />
      {on ? (
        <>
          <path d="M15.5 9a4 4 0 0 1 0 6" />
          <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
        </>
      ) : (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      )}
    </svg>
  )
}

/** Mobile only: shows once the hero has scrolled away, hides while the offer is on screen. */
export function MobileBuyBar() {
  const offer = useOffer()
  const [heroOut, setHeroOut] = useState(false)
  const [offerIn, setOfferIn] = useState(false)
  const b = landing.preco.barraFixa

  useEffect(() => {
    const hero = document.getElementById('hero')
    const offer = document.getElementById('oferta')
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) setHeroOut(!e.isIntersecting && e.boundingClientRect.top < 0)
        if (e.target === offer) setOfferIn(e.isIntersecting)
      }
    })
    if (hero) io.observe(hero)
    if (offer) io.observe(offer)
    return () => io.disconnect()
  }, [])

  const show = heroOut && !offerIn
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] md:hidden"
          initial={{ y: '110%' }}
          animate={{ y: 0 }}
          exit={{ y: '110%' }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-ink/90 py-2.5 pl-4 pr-2.5 text-paper shadow-[0_-8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <div className="min-w-0 flex-1 leading-tight">
              {/* On phones the Founder strip lives here: the real seats left, when known. */}
              <small className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-soft/80">
                {offer.fechada ? OFERTA.nomeApos : offer.restantes !== null ? fill('{restantes} vagas de Fundador', offer) : b.detalhe}
              </small>
              <strong className="font-display text-lg">{offerText(b.preco)}</strong>
            </div>
            <a
              href={checkoutHref()}
              onClick={() => onBuyClick('barra-fixa')}
              className="lp-shine grid min-h-11 place-items-center rounded-btn bg-ember-button px-5 text-sm font-bold text-white"
            >
              {b.botao}
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


/**
 * The Founder strip (md and up; on phones the buy bar carries it): a discreet pill at the top, only
 * after the hero has scrolled away, with the real seats left. Hidden when the seats are gone or the
 * count could not be read.
 */
export function FounderStrip() {
  const offer = useOffer()
  const [heroOut, setHeroOut] = useState(false)

  useEffect(() => {
    const hero = document.getElementById('hero')
    if (!hero) return
    const io = new IntersectionObserver(([e]) => setHeroOut(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(hero)
    return () => io.disconnect()
  }, [])

  const show = heroOut && !offer.fechada && offer.restantes !== null && offer.restantes > 0
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed left-1/2 top-3 z-30 hidden -translate-x-1/2 md:block"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          data-testid="faixa-fundador"
        >
          <p className="flex items-center gap-3 rounded-full border border-gold/30 bg-ink/85 py-1.5 pl-4 pr-1.5 text-[13px] text-paper/90 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md">
            <span>{fill(OFERTA.faixa, offer)}</span>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('oferta')
                if (el) scrollToEl(el)
              }}
              className="rounded-full bg-gold/90 px-3 py-1 text-[12px] font-bold text-ink transition-colors hover:bg-gold-soft"
            >
              {OFERTA.faixaLink}
            </button>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}