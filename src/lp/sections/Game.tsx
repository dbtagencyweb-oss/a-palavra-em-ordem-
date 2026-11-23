// 5 · Mini jogo. On ink: four shuffled buttons (Criação · Queda · Redenção · Restauração); each tap
// fills the next slot. All four right: light particles, the lamp lights, +10 steps and the invite.
// Wrong: a gentle shake, a hint, and it starts over after 1.4s.
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import landing from '../../../content/landing.json'
import { Logo } from '../../ui/Logo'
import { FadeBg } from '../FadeBg'
import { pixelCustom } from '../pixel'
import { addSteps, lpSound } from '../state'
import { useReveal } from '../useReveal'
import { ScrollCue } from '../ScrollCue'

const g = landing.jogo
type Status = 'playing' | 'wrong' | 'right'

export function Game() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)
  const reduced = useReducedMotion()
  const [picked, setPicked] = useState<string[]>([])
  const [status, setStatus] = useState<Status>('playing')
  const [tries, setTries] = useState(0)
  const rewarded = useRef(false)

  useEffect(() => {
    if (picked.length < g.ordem.length) return
    const ok = picked.every((p, i) => p === g.ordem[i])
    setTries((n) => n + 1)
    if (ok) {
      setStatus('right')
      lpSound.play('lamp_ignite')
      lpSound.vibrate('correct')
      if (!rewarded.current) {
        rewarded.current = true
        addSteps(g.passos)
      }
      pixelCustom('GameSolved', { tentativas: tries + 1 })
    } else {
      setStatus('wrong')
      lpSound.vibrate('wrong')
      const id = window.setTimeout(() => {
        setPicked([])
        setStatus('playing')
      }, 1400)
      return () => window.clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked])

  function tap(word: string) {
    if (status !== 'playing' || picked.includes(word)) return
    lpSound.play('tap')
    setPicked((p) => [...p, word])
  }

  return (
    <section id="jogo" ref={root} className="relative overflow-hidden bg-ink px-5 py-20 text-paper md:py-28">
      <FadeBg id="era-d6" position="50% 60%" opacity={0.7} veil="radial-gradient(ellipse at 50% 40%, rgba(30,34,48,0.62), rgba(30,34,48,0.12) 75%)" />
      <div className="relative mx-auto max-w-2xl text-center">
        <h2 data-reveal className="font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] md:text-5xl">
          {g.titulo}
        </h2>
        <p data-reveal className="mt-3 text-[16px] text-paper/75 md:text-lg">
          {g.instrucao}
        </p>

        {/* The lamp: dark until the order is right. */}
        <div data-reveal className="relative mx-auto mt-9 h-16 w-10">
          <motion.div
            aria-hidden="true"
            className="absolute -inset-14 rounded-full bg-[radial-gradient(circle,rgba(241,217,160,0.5),rgba(226,168,96,0.12)_45%,rgba(226,168,96,0)_70%)]"
            initial={false}
            animate={{ opacity: status === 'right' ? 1 : 0, scale: status === 'right' ? 1 : 0.4 }}
            transition={{ duration: 0.8 }}
          />
          <Logo
            variant="mark"
            title={null}
            className={`relative h-full w-full transition-[filter,opacity] duration-700 ${status === 'right' ? 'opacity-100' : 'opacity-30 grayscale'}`}
          />
          {status === 'right' && !reduced && <Particles />}
        </div>

        <motion.ol
          data-reveal
          className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-2.5 md:max-w-2xl md:grid-cols-4"
          animate={status === 'wrong' && !reduced ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.45 }}
          aria-label={g.instrucao}
        >
          {g.ordem.map((_, i) => {
            const word = picked[i]
            const tone =
              status === 'right' ? 'border-gold bg-gold/20 text-gold-soft'
              : status === 'wrong' && word ? 'border-ember/70 bg-ember/15 text-paper'
              : word ? 'border-paper/40 bg-paper/10 text-paper'
              : 'border-dashed border-paper/25 text-paper/35'
            return (
              <li key={i} className={`flex min-h-[54px] items-center gap-2 rounded-btn border px-3 text-left transition-colors duration-300 ${tone}`}>
                <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-paper/10 text-xs font-bold">{i + 1}</span>
                <AnimatePresence mode="wait">
                  {word ? (
                    <motion.span key={word} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex min-w-0 items-center gap-1.5 font-semibold">
                      <StoryIcon word={word} className="h-4 w-4 flex-none opacity-80" />
                      <span className="truncate">{word}</span>
                    </motion.span>
                  ) : (
                    <span className="text-xs">{g.vaga}</span>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </motion.ol>

        <div data-reveal className="mx-auto mt-5 grid max-w-xl grid-cols-4 gap-1.5 sm:gap-2.5 md:max-w-2xl">
          {g.embaralhado.map((w) => {
            const used = picked.includes(w)
            return (
              <button
                key={w}
                type="button"
                data-sound
                onClick={() => tap(w)}
                disabled={used || status !== 'playing'}
                className="flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl bg-paper px-1 py-2 text-[12.5px] font-semibold text-ink shadow-[0_4px_0_#B79E78] transition-[opacity,transform] active:translate-y-[2px] active:shadow-[0_2px_0_#B79E78] disabled:opacity-25 sm:min-h-12 sm:flex-row sm:gap-2 sm:rounded-full sm:px-3 sm:py-0 sm:text-[15px]"
              >
                <StoryIcon word={w} className="h-5 w-5 flex-none text-gold-ink" />
                <span className="truncate sm:overflow-visible">{w}</span>
              </button>
            )
          })}
        </div>

        <div aria-live="polite" className="mx-auto mt-6 min-h-[4.5em] max-w-md">
          {status === 'wrong' && (
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[15px] text-paper/85">
              {g.erro}
            </motion.p>
          )}
          {status === 'right' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <p className="font-display text-[22px] font-semibold leading-snug text-gold-soft md:text-[26px]">{g.acerto}</p>
              <p className="mt-1 text-sm font-semibold text-gold">+{g.passos} passos</p>
              <a
                href="#oferta"
                className="lp-shine mt-5 inline-grid min-h-[52px] place-items-center rounded-btn bg-ember-button px-7 text-[15px] font-bold text-white shadow-[0_10px_30px_-8px_rgba(196,87,46,0.7)]"
              >
                {g.botaoAcerto}
              </a>
            </motion.div>
          )}
        </div>
      </div>
      <ScrollCue className="absolute bottom-3 left-1/2 z-[2] -translate-x-1/2 md:bottom-5" />
    </section>
  )
}

/** Soft burst of light dots rising from the lamp. */
function Particles() {
  const dots = Array.from({ length: 22 }, (_, i) => {
    const a = -Math.PI / 2 + ((i / 22) * 2 - 1) * 1.35
    const d = 60 + (i % 4) * 26
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: 3 + (i % 3) * 2, delay: (i % 5) * 0.05 }
  })
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/3">
      {dots.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-[#F6D98F] shadow-[0_0_10px_#F6D98F]"
          style={{ width: p.s, height: p.s, marginLeft: -p.s / 2, marginTop: -p.s / 2 }}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{ x: p.x, y: p.y, opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </span>
  )
}

/** A small line icon for each beat of the story. */
function StoryIcon({ word, className }: { word: string; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const paths: Record<string, React.ReactNode> = {
    // A sprout: life beginning.
    Criação: (
      <>
        <path d="M12 21v-9" {...common} />
        <path d="M12 12c0-4 2.6-6.6 7-7 .2 4.4-2.6 7-7 7z" {...common} fill="currentColor" fillOpacity={0.18} />
        <path d="M12 14c0-3.2-2.2-5.4-6-5.8-.2 3.6 2.2 5.8 6 5.8z" {...common} fill="currentColor" fillOpacity={0.18} />
      </>
    ),
    // A fruit with a bite taken out.
    Queda: (
      <>
        <path d="M15.5 8.6A3.2 3.2 0 0 0 18 14c-.9 3.4-3 6-5 6-.7 0-1.3-.4-2-.4s-1.3.4-2 .4c-2.6 0-5-4-5-7.6C4 9.6 5.8 8 7.8 8c1.3 0 2.2.7 3.2.7s1.9-.7 3.2-.7c.5 0 .9 0 1.3.6z" {...common} fill="currentColor" fillOpacity={0.18} />
        <path d="M11 8.6c0-2.2 1-3.8 3-4.6" {...common} />
      </>
    ),
    // The cross.
    Redenção: (
      <>
        <path d="M12 3v18M7 8h10" {...common} strokeWidth={2.2} />
      </>
    ),
    // The city with open gates and a rising light.
    Restauração: (
      <>
        <path d="M3 20h18" {...common} />
        <path d="M5 20v-7l3-2 3 2v7M13 20v-9l3-3 3 3v9" {...common} fill="currentColor" fillOpacity={0.18} />
        <path d="M8 20v-3M16 20v-3.5" {...common} />
        <path d="M12 3v2M7.5 4.5l1 1.4M16.5 4.5l-1 1.4" {...common} />
      </>
    ),
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {paths[word]}
    </svg>
  )
}
