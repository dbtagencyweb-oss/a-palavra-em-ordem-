// The playable demo (loaded on demand by Demo.tsx): the real "ordenar" card of Day 1
// (content/trilhas/mapa-7-dias/dia-01.json, card d1-c05) running on the app's own activity
// component, inside a phone frame. Sounds and feedback are the app's; sound starts off on the
// landing page, with a button to turn it on. Getting it right lights the lamp, gives "+10 passos"
// and offers the free start (pixel DemoComplete, with the audience). Getting it wrong shows the
// card's hint and lets the visitor try again, no penalty. Nothing is saved: it's only a demo.
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import day1 from '../../../content/trilhas/mapa-7-dias/dia-01.json'
import { OrderActivity } from '../../activities/OrderActivity'
import { HowlerBackend } from '../../sound/HowlerBackend'
import type { SoundBackend } from '../../sound/SoundManager'
import { soundManager } from '../../sound/SoundManager'
import { Logo } from '../../ui/Logo'
import { freeHref } from '../links'
import { pixelCustom } from '../pixel'
import { publicoTag } from '../publico'
import { addSteps } from '../state'
import { onFreeClick } from '../track'
import '../demo.css'

type OrderCard = { id: string; tipo: 'ordenar'; rotulo: string; titulo: string; instrucao: string; itens: string[]; acerto: string; erro: string }
const CARD = (day1.cards as unknown as { tipo: string }[]).find((c) => c.tipo === 'ordenar') as OrderCard

const silent: SoundBackend = {
  unlock() {},
  setVolume() {},
  play() {},
  startAmbient() {},
  stopAmbient() {},
  narrate(_id, _text, h) {
    h.onFail()
  },
  stopNarration() {},
  preloadNarration() {},
}
let howler: HowlerBackend | null = null

export default function DemoPlay() {
  const reduced = useReducedMotion()
  const [soundOn, setSoundOn] = useState(false)
  const [done, setDone] = useState(false)
  const [round, setRound] = useState(0)

  // The landing page starts silent: the app's sound manager plays nothing until the visitor asks.
  useEffect(() => {
    soundManager.setBackend(silent)
    return () => soundManager.setBackend(silent)
  }, [])

  const toggleSound = () => {
    const on = !soundOn
    setSoundOn(on)
    if (on) {
      howler ??= new HowlerBackend()
      soundManager.setBackend(howler)
      soundManager.unlock()
      soundManager.play('tap')
    } else soundManager.setBackend(silent)
  }

  const solved = () => {
    window.setTimeout(() => {
      setDone(true)
      soundManager.play('lamp_ignite')
      addSteps(10)
      pixelCustom('DemoComplete', { publico: publicoTag() })
    }, 900)
  }

  return (
    <div className="lp-demo relative mx-auto aspect-[390/780] w-full max-w-[360px] rounded-[38px] bg-[#14161F] p-[9px] shadow-[0_30px_70px_-20px_rgba(30,34,48,0.55),inset_0_0_0_1.5px_rgba(255,255,255,0.08)]">
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[30px] bg-paper text-left text-ink">
        <div aria-hidden="true" className="absolute left-1/2 top-2 z-10 h-[18px] w-[86px] -translate-x-1/2 rounded-full bg-[#14161F]" />
        <div className="flex items-center justify-between px-5 pb-2 pt-9">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-ink">Dia 1 · {CARD.rotulo}</span>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            className="min-h-11 rounded-full px-3 text-[12px] font-semibold text-ink-2 transition-colors hover:text-ink"
          >
            {soundOn ? '🔊 som ligado' : '🔈 ativar som'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <h3 className="mb-2 font-display text-[22px] font-semibold leading-tight">{CARD.titulo}</h3>
          <p className="mb-3 text-[14px] text-ink-2">{CARD.instrucao}</p>
          <OrderActivity key={round} items={CARD.itens} acerto={CARD.acerto} erro={CARD.erro} onSolved={solved} />
        </div>

        {/* Right answer: the lamp lights, +10 passos, and the invitation. */}
        {done && (
          <motion.div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1E2230] px-6 text-center text-paper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduced ? 0.15 : 0.4 }}
          >
            <motion.div
              className="relative"
              initial={reduced ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(242,190,110,0.45),rgba(242,190,110,0)_65%)]" />
              <Logo variant="mark" title={null} className="relative h-16 w-auto drop-shadow-[0_0_14px_rgba(242,190,110,0.9)]" />
            </motion.div>
            <motion.p
              className="mt-3 font-display text-xl font-bold text-gold-soft"
              initial={reduced ? false : { y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              +10 passos
            </motion.p>
            <p className="mt-4 font-display text-[22px] font-semibold leading-snug">Assim é cada dia. Quer continuar?</p>
            <a
              href={freeHref()}
              onClick={() => onFreeClick('demo')}
              className="lp-shine mt-6 grid min-h-[52px] w-full place-items-center rounded-btn bg-ember-button px-5 text-[15px] font-bold text-white"
            >
              Começar os 7 dias grátis
            </a>
            <button
              type="button"
              onClick={() => {
                setDone(false)
                setRound((n) => n + 1)
              }}
              className="mt-3 min-h-11 text-[13px] font-semibold text-paper/70 underline underline-offset-4 hover:text-paper"
            >
              Jogar de novo
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
