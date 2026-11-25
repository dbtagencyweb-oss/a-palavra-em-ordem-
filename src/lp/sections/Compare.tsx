// 2b · "Sem mapa × Com mapa" (content/lp-comparacao.json, em revisão): the same passage read
// without and with the map, and made to play with.
//  - Entrance (once): the "without" card clears its blur; on the "with" card a point runs along the
//    timeline from Criação to Exílio, lighting each era as it passes, then the text fades in.
//  - The doubts of the "without" card are buttons: each one makes the "with" card answer (the
//    timeline focuses the era, or draws an arc between two eras); "Ver resumo" brings the text back.
//    On phones they sit between the two cards, so the answer shows without scrolling.
//  - All three answered: an invitation to the free 7 days (pixel ComparacaoCompleta).
//  - The timeline's points open a note with the era's line (the hero map's phrases).
// Reduced motion: everything in its final state, plain fades.
import { animate, AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import data from '../../../content/lp-comparacao.json'
import { desaturate, ERAS } from '../HeroBook'
import { freeHref } from '../links'
import { reducedMotion, scrollToEl } from '../motion'
import { pixelCustom } from '../pixel'
import { publicoTag } from '../publico'
import { lpSound } from '../state'
import { onFreeClick } from '../track'

type Pergunta = (typeof data.perguntas)[number] & { arco?: { de: string; ate: string; rotulo: string } }
const PERGUNTAS = data.perguntas as Pergunta[]
const SWEEP_S = 1.2

export function Compare() {
  const root = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(false)
  const [sweep, setSweep] = useState(0) // 0 → 1: the point from Criação to the active era
  const [current, setCurrent] = useState<string | null>(null)
  const [answered, setAnswered] = useState<string[]>([])
  const done = answered.length === PERGUNTAS.length
  const sent = useRef(false)
  const phoneQuestions = useRef<HTMLDivElement>(null)
  const answer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reducedMotion()) {
      setShown(true)
      setSweep(1)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        setShown(true)
        animate(0, 1, { duration: SWEEP_S, ease: 'linear', delay: 0.3, onUpdate: setSweep })
      },
      { threshold: 0.3 },
    )
    io.observe(root.current!)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!done || sent.current) return
    sent.current = true
    pixelCustom('ComparacaoCompleta', { publico: publicoTag() })
  }, [done])

  const ask = (id: string) => {
    lpSound.play('tap')
    setCurrent(id)
    setAnswered((a) => (a.includes(id) ? a : [...a, id]))
    // Phones: if the answer would sit under the fold (or the buy bar), bring the doubts to the top
    // of the screen: the answer card follows right below them.
    const box = answer.current?.getBoundingClientRect()
    if (phoneQuestions.current?.offsetParent && box && box.bottom > window.innerHeight - 96) scrollToEl(phoneQuestions.current, -72)
  }

  const { sem, com } = data
  const q = PERGUNTAS.find((p) => p.id === current) ?? null
  const textIn = sweep >= 1
  const fade = { duration: reduced ? 0.15 : 0.35 }

  const questions = (
    <div>
      <p className="mb-2.5 text-[12px] font-semibold text-ink-3">{sem.dica}</p>
      <ul className="flex flex-col gap-2">
        {PERGUNTAS.map((p) => {
          const isDone = answered.includes(p.id)
          const isOn = current === p.id
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => ask(p.id)}
                aria-pressed={isOn}
                className={`flex min-h-11 w-full items-center gap-2.5 rounded-full border px-2 py-1.5 pr-4 text-left text-[15px] leading-snug transition-colors ${
                  isOn ? 'border-gold bg-[#F5EFE3] text-ink' : isDone ? 'border-olive/40 bg-white/50 text-ink-2' : 'border-ink/15 bg-white/60 text-ink hover:border-ink/35'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-7 w-7 flex-none place-items-center rounded-full text-[14px] font-bold transition-colors ${isDone ? 'bg-olive text-white' : 'bg-ink/10 text-ink/60'}`}
                >
                  {isDone ? '✓' : '?'}
                </span>
                <span>{p.pergunta}</span>
                <span className="sr-only">{isDone ? ' (respondida)' : ''}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )

  return (
    <section id="com-e-sem-mapa" ref={root} className="relative bg-paper px-5 py-20 text-ink md:px-10 md:py-28">
      <h2 className="mx-auto max-w-2xl text-center font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] [text-wrap:balance] md:text-[42px]">
        {data.titulo}
      </h2>

      <div className="mx-auto mt-10 grid max-w-5xl items-stretch gap-5 md:grid-cols-[1fr_auto_1fr] md:gap-6">
        {/* Without the map: grey, a question mark, the doubts (as buttons). */}
        <article
          className={`rounded-card border border-line bg-[#ECE8E0] p-6 text-ink-2 transition-[opacity,filter] duration-[600ms] ease-out ${
            shown ? 'opacity-100 blur-0' : 'opacity-[0.85] blur-[2px]'
          }`}
        >
          <header className="flex items-center gap-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ink/10 font-display text-xl font-semibold text-ink/55" aria-hidden="true">
              ?
            </span>
            <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink-3">{sem.rotulo}</h3>
          </header>
          <p className="mt-5 text-xs font-bold tracking-[0.12em] text-ink-3">{sem.referencia.toUpperCase()}</p>
          <p className="mt-1.5 font-serif text-[19px] italic leading-snug text-ink/80">{sem.parafrase}</p>
          <div className="mt-5 hidden md:block">{questions}</div>
        </article>

        {/* The divider on desktop; on phones, the doubts sit here, right above the answers. */}
        <div className="hidden items-center justify-center md:flex md:flex-col" aria-hidden="true">
          <span className="h-full w-px bg-gold/50" />
        </div>
        <div ref={phoneQuestions} className="md:hidden">
          {questions}
        </div>

        {/* With the map: paper, gold detail, the era lit. */}
        <article className="flex flex-col rounded-card border border-gold/40 bg-[#F5EFE3] p-6 shadow-[0_18px_50px_-28px_rgba(138,100,32,0.55)]">
          <header className="flex items-center gap-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-gold text-ink" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
                <path d="M9 4v14M15 6v14" />
              </svg>
            </span>
            <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-gold-ink">{com.rotulo}</h3>
          </header>
          <EraLine active={com.eraAtiva} sweep={sweep} focus={q?.foco ?? null} arc={q?.arco ?? null} />
          <div ref={answer} aria-live="polite" className="mt-4 min-h-[7.5em]">
            <AnimatePresence mode="wait" initial={false}>
              {textIn && (
                <motion.div key={current ?? 'resumo'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
                  {q ? (
                    <>
                      <p className="text-[13px] font-bold text-gold-ink">{q.pergunta}</p>
                      <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink">{q.resposta}</p>
                      <button
                        type="button"
                        onClick={() => setCurrent(null)}
                        className="mt-2 min-h-11 text-[14px] font-semibold text-ink-2 underline underline-offset-4 hover:text-ink"
                      >
                        {com.verResumo}
                      </button>
                    </>
                  ) : (
                    <p className="text-[15.5px] leading-relaxed text-ink">{com.texto}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-auto border-t border-gold/30 pt-4 text-[14px] font-semibold text-gold-ink">{com.rodape}</p>
        </article>
      </div>

      {/* All three answered: the invitation. */}
      <div className="mx-auto mt-8 max-w-xl text-center" aria-live="polite">
        <AnimatePresence>
          {done && (
            <motion.div initial={{ opacity: 0, y: reduced ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <p className="font-display text-[22px] font-semibold leading-snug [text-wrap:balance] md:text-[26px]">{data.fim.texto}</p>
              <a
                href={freeHref()}
                onClick={() => onFreeClick('comparacao')}
                className="lp-shine mt-5 inline-grid min-h-[52px] place-items-center rounded-btn bg-ember-button px-7 text-[15px] font-bold text-white shadow-[0_10px_30px_-8px_rgba(196,87,46,0.7)]"
              >
                {data.fim.botao}
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

const W = 320
const H = 74
const PAD = 30 // room for the first and last names
const LINE_Y = 38
const STEP = (W - 2 * PAD) / (ERAS.length - 1)
const xOf = (id: string) => PAD + ERAS.findIndex((e) => e.id === id) * STEP

/**
 * The seven eras on one line (a compact, flat version of the hero map). The point runs from
 * Criação to the active era (`sweep` 0 → 1), lighting the eras it passes. `focus` pulses an era;
 * `arc` joins two eras with a label. Each point opens a note with the era's line.
 */
function EraLine({ active, sweep, focus, arc }: { active: string; sweep: number; focus: string | null; arc: { de: string; ate: string; rotulo: string } | null }) {
  const reduced = useReducedMotion()
  const [tip, setTip] = useState<string | null>(null)
  const x0 = PAD
  const xA = xOf(active)
  const head = x0 + (xA - x0) * sweep
  const activeName = ERAS.find((e) => e.id === active)?.nome
  const tipEra = ERAS.find((e) => e.id === tip)
  const tipIndex = ERAS.findIndex((e) => e.id === tip)

  return (
    <figure className="relative mt-5" onMouseLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={`Linha do tempo das sete eras, com ${activeName} em destaque`}>
        <path d={`M${PAD} ${LINE_Y} H${W - PAD}`} stroke="#5A3E1B" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" />
        {/* The way already travelled, in gold. */}
        {sweep > 0 && <path d={`M${x0} ${LINE_Y} H${head}`} stroke="#B8893A" strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round" />}

        {ERAS.map((e) => {
          const x = xOf(e.id)
          const on = e.id === active
          const lit = sweep > 0 && x <= head + 0.5
          const focused = focus === e.id
          return (
            <g key={e.id}>
              {on && <circle cx={x} cy={LINE_Y} r="14" fill="#E2C580" opacity={sweep >= 1 ? 0.45 : 0} className="transition-opacity duration-500" />}
              {focused && !reduced && (
                <motion.circle
                  key={`focus-${focus}-${arc?.rotulo ?? ''}`}
                  cx={x}
                  cy={LINE_Y}
                  r="10"
                  fill="none"
                  stroke="#B8893A"
                  strokeWidth="2"
                  initial={{ scale: 0.6, opacity: 0.9 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1.1, repeat: 2, ease: 'easeOut' }}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                />
              )}
              <circle
                cx={x}
                cy={LINE_Y}
                r={on ? 7.5 : 5}
                fill={lit ? (on ? e.color : desaturate(e.color, 0.35)) : desaturate(e.color, 0.75)}
                stroke="#5A3E1B"
                strokeWidth="1.2"
                opacity={lit ? 1 : 0.45}
                className="transition-[opacity,fill] duration-300"
              />
              <text
                x={x}
                y={LINE_Y + 28}
                textAnchor="middle"
                fontSize={on ? 11 : 9.5}
                fontWeight={on || focused ? 700 : 500}
                fill={on ? '#3B2A14' : lit ? '#5A4A35' : '#9A8C78'}
                fontFamily="Manrope, sans-serif"
              >
                {e.nome}
              </text>
            </g>
          )
        })}

        {/* The running point. */}
        {sweep > 0 && sweep < 1 && <circle cx={head} cy={LINE_Y} r="4" fill="#F6D98F" stroke="#8A6420" strokeWidth="1" />}

        {/* An arc between two eras, with its label. */}
        <AnimatePresence>
          {arc && (
            <motion.g key={`${arc.de}-${arc.ate}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.path
                d={`M${xOf(arc.de)} ${LINE_Y - 9} Q${(xOf(arc.de) + xOf(arc.ate)) / 2} ${LINE_Y - 40} ${xOf(arc.ate)} ${LINE_Y - 9}`}
                fill="none"
                stroke="#B8893A"
                strokeWidth="1.8"
                strokeLinecap="round"
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
              <motion.text
                x={(xOf(arc.de) + xOf(arc.ate)) / 2}
                y={LINE_Y - 28}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight={700}
                fill="#8A6420"
                fontFamily="Manrope, sans-serif"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduced ? 0 : 0.5 }}
              >
                {arc.rotulo}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Tap targets over the points, and the note. */}
      {ERAS.map((e) => (
        <button
          key={e.id}
          type="button"
          aria-label={`${e.nome}: ${e.linha}`}
          aria-expanded={tip === e.id}
          onClick={() => setTip((t) => (t === e.id ? null : e.id))}
          onMouseEnter={() => setTip(e.id)}
          onFocus={() => setTip(e.id)}
          onBlur={() => setTip((t) => (t === e.id ? null : t))}
          className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          style={{ left: `${(xOf(e.id) / W) * 100}%`, top: `${(LINE_Y / H) * 100}%` }}
        />
      ))}
      {tipEra && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-max max-w-[230px] rounded-[10px] bg-ink px-3 py-2 text-[12.5px] leading-snug text-paper shadow-lg"
          style={{
            left: `${(xOf(tipEra.id) / W) * 100}%`,
            bottom: `calc(${100 - (LINE_Y / H) * 100}% + 16px)`,
            translate: tipIndex < 2 ? '-18px 0' : tipIndex > ERAS.length - 3 ? 'calc(-100% + 18px) 0' : '-50% 0',
          }}
        >
          <strong className="font-semibold">{tipEra.nome}</strong> · {tipEra.linha}
        </div>
      )}
    </figure>
  )
}
