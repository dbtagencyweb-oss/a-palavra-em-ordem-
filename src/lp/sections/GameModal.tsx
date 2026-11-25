// The demo's reward and second challenge (loaded on demand by Game.tsx, after the first win).
// Step 1: "Você acendeu a primeira lâmpada." with +10 passos, "Próximo desafio" and the free start.
// Step 2: the app's own "ligar" activity (MatchActivity): four characters to their eras, colored
// like the map. Step 3: two lamps lit, +20 passos, the free start and a link to the offer. There
// is no third challenge. Nothing is saved; sounds follow the landing page's switch (off by default).
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import eraData from '../../../content/lp-eras.json'
import landing from '../../../content/landing.json'
import { MatchActivity } from '../../activities/MatchActivity'
import type { SoundBackend } from '../../sound/SoundManager'
import { soundManager } from '../../sound/SoundManager'
import { Logo } from '../../ui/Logo'
import { ERAS, desaturate } from '../HeroBook'
import { freeHref } from '../links'
import { scrollToEl } from '../motion'
import { getOffer } from '../oferta'
import { pixelCustom } from '../pixel'
import { publicoTag } from '../publico'
import { addSteps, lpSound } from '../state'
import { onFreeClick } from '../track'
import '../demo.css'

const m = landing.jogo.modal
const d = landing.jogo.desafio2
const eraName = (id: string) => eraData.eras.find((e) => e.id === id)?.nome ?? id
const PARES = d.pares.map((p) => ({ a: p.nome, b: eraName(p.era) }))
const COLORS = Object.fromEntries(
  d.pares.map((p) => {
    const era = ERAS.find((e) => e.id === p.era)
    return [eraName(p.era), era ? desaturate(era.color, 0.15) : '#B8893A']
  }),
)
const GOLD = '#C9A24A'

/** The app's activities speak through the landing page's sound switch. */
const viaLanding: SoundBackend = {
  unlock() {},
  setVolume() {},
  play(id) {
    lpSound.play(id)
  },
  startAmbient() {},
  stopAmbient() {},
  narrate(_id, _text, h) {
    h.onFail()
  },
  stopNarration() {},
  preloadNarration() {},
}

type Step = 'won' | 'match' | 'done'

export default function GameModal({ onClose }: { onClose(): void }) {
  const reduced = useReducedMotion()
  const [step, setStep] = useState<Step>('won')

  useEffect(() => {
    soundManager.setBackend(viaLanding)
    soundManager.unlock()
    lpSound.play('lamp_ignite')
  }, [])

  // Escape closes; the page behind does not scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      html.style.overflow = prev
    }
  }, [onClose])

  const solvedMatch = () => {
    window.setTimeout(() => {
      setStep('done')
      lpSound.play('lamp_ignite')
      addSteps(d.passos)
      pixelCustom('DemoComplete2', { publico: publicoTag() })
    }, 900)
  }

  const goOffer = (e: React.MouseEvent) => {
    e.preventDefault()
    onClose()
    const el = document.getElementById('oferta')
    if (el) scrollToEl(el)
  }

  const fade = reduced ? { duration: 0.15 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }
  const freeBtn = (label: string) => (
    <a
      href={freeHref()}
      onClick={() => onFreeClick('demo')}
      className="lp-shine grid min-h-[52px] w-full place-items-center rounded-btn bg-ember-button px-5 text-[15px] font-bold text-white shadow-[0_10px_30px_-8px_rgba(196,87,46,0.6)]"
    >
      {label}
    </a>
  )

  return (
    <motion.div
      className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-[rgba(20,22,32,0.6)] p-3 backdrop-blur-[6px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.3 }}
      onClick={onClose}
      data-lenis-prevent
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
        className="lp-demo relative my-auto w-full max-w-md rounded-[22px] bg-paper p-6 pb-6 text-center text-ink shadow-2xl md:p-8"
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        transition={fade}
        onClick={(e) => e.stopPropagation()}
      >
        {!reduced && <GoldDust key={step === 'match' ? 'won' : step} />}
        <button
          type="button"
          onClick={onClose}
          aria-label={m.fechar}
          className="absolute right-2 top-2 z-[3] grid h-11 w-11 place-items-center rounded-full text-2xl leading-none text-ink-3 hover:bg-paper-2"
        >
          ×
        </button>

        <AnimatePresence mode="wait" initial={false}>
          {step === 'won' && (
            <motion.div key="won" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
              <Lamps lit={1} />
              <h2 id="demo-modal-title" className="mt-4 font-display text-[26px] font-semibold leading-tight">
                {m.titulo}
              </h2>
              <p className="mt-1 text-sm font-bold text-gold-ink">{m.passos}</p>
              <p className="mt-3 text-[16px] text-ink-2">{m.texto}</p>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  lpSound.play('tap')
                  setStep('match')
                }}
                className="mt-6 grid min-h-[52px] w-full place-items-center rounded-btn bg-ink px-5 text-[15px] font-bold text-paper"
              >
                {m.botaoProximo}
              </button>
              <a
                href={freeHref()}
                onClick={() => onFreeClick('demo')}
                className="mt-3 grid min-h-[48px] w-full place-items-center rounded-btn border-[1.5px] border-line px-5 text-[15px] font-semibold text-ink hover:bg-paper-2"
              >
                {m.botaoGratis}
              </a>
            </motion.div>
          )}

          {step === 'match' && (
            <motion.div key="match" className="text-left" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
              <h2 id="demo-modal-title" className="pr-8 font-display text-[22px] font-semibold leading-tight">
                {d.titulo}
              </h2>
              <p className="mb-4 mt-1 text-[14px] text-ink-2">{d.instrucao}</p>
              <MatchActivity pares={PARES} acerto={d.acerto} onSolved={solvedMatch} threadColor={GOLD} colors={COLORS} />
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
              <Lamps lit={2} />
              <h2 id="demo-modal-title" className="mt-4 font-display text-[24px] font-semibold leading-tight">
                {d.fimTitulo}
              </h2>
              <p className="mt-1 text-sm font-bold text-gold-ink">{d.fimPassos}</p>
              <div className="mt-6">{freeBtn(d.botaoGratis)}</div>
              <a href="#oferta" onClick={goOffer} className="mt-3 inline-grid min-h-11 place-items-center text-[14px] font-semibold text-ink-2 underline underline-offset-4 hover:text-ink">
                {getOffer().fechada ? d.linkOfertaAnual : d.linkOferta}
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

/** One or two lamps, lit with a warm glow. */
function Lamps({ lit }: { lit: 1 | 2 }) {
  return (
    <div className="flex items-end justify-center gap-5" aria-hidden="true">
      {Array.from({ length: lit }, (_, i) => (
        <span key={i} className="relative">
          <span className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(242,190,110,0.5),rgba(242,190,110,0)_65%)]" />
          <Logo variant="mark" title={null} className="relative h-14 w-auto drop-shadow-[0_0_12px_rgba(242,190,110,0.85)]" />
        </span>
      ))}
    </div>
  )
}

/** Light golden dust over the card for ~1.2 s. */
function GoldDust() {
  const dots = Array.from({ length: 18 }, (_, i) => ({
    left: 8 + ((i * 37) % 84),
    size: 3 + (i % 3) * 1.5,
    rise: 40 + (i % 5) * 18,
    delay: (i % 6) * 0.06,
  }))
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-10 z-[2] h-24">
      {dots.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-[#F2C46E] shadow-[0_0_8px_#F6D98F]"
          style={{ left: `${p.left}%`, top: '60%', width: p.size, height: p.size }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -p.rise, opacity: [0, 1, 0] }}
          transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </span>
  )
}
