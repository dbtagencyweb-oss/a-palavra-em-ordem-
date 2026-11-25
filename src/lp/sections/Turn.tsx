// 3 · A virada. On paper: the Bible is not in chronological order, then a one-tap quiz
// ("Quem veio primeiro?"). Right card: it flips, glows and shows the answer, +10 steps.
// Wrong card: it shakes gently and a hint appears, +5 steps for trying; the right card can still
// be tapped. Each card gives its steps only once.
import { motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import landing from '../../../content/landing.json'
import { imageSmallPath } from '../../media/paths'
import { addSteps, lpSound } from '../state'
import { pixelCustom } from '../pixel'
import { useReveal } from '../useReveal'

const v = landing.virada
const quiz = v.quiz

type Opt = (typeof quiz.opcoes)[number]
const isRight = (o: Opt) => 'certa' in o && o.certa === true

export function Turn() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)
  const reduced = useReducedMotion()
  const [right, setRight] = useState(false)
  const [wrongTries, setWrongTries] = useState(0)
  const [shaking, setShaking] = useState<string | null>(null)

  function pick(o: Opt) {
    if (right) return
    if (isRight(o)) {
      setRight(true)
      addSteps(quiz.passosAcerto)
      lpSound.play('correct')
      lpSound.vibrate('correct')
      pixelCustom('QuizAnswered', { acertou: true, tentativa: wrongTries + 1 })
    } else {
      if (wrongTries === 0) {
        addSteps(quiz.passosTentativa)
        pixelCustom('QuizAnswered', { acertou: false, tentativa: 1 })
      }
      setWrongTries((n) => n + 1)
      setShaking(o.id)
      lpSound.play('tap')
      lpSound.vibrate('wrong')
      window.setTimeout(() => setShaking(null), 500)
    }
  }

  const feedback = right ? quiz.acerto : wrongTries > 0 ? quiz.erro : ''

  return (
    <section id="virada" ref={root} className="relative overflow-hidden bg-paper px-5 py-20 text-ink md:py-28">
      <div className="mx-auto max-w-3xl">
        <h2 data-reveal className="font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] md:text-center md:text-[44px]">
          {v.titulo}
        </h2>
        <p data-reveal className="mt-5 text-[16px] leading-[1.65] text-ink-2 md:mx-auto md:max-w-[40em] md:text-center md:text-lg">
          {v.texto}
        </p>

        <div data-reveal className="mt-12 text-center">
          <h3 className="font-display text-2xl font-semibold md:text-3xl">{quiz.pergunta}</h3>
          <p className="mt-1 text-sm text-ink-3">{quiz.instrucao}</p>
        </div>

        <div data-reveal className="mx-auto mt-6 grid max-w-[460px] grid-cols-2 gap-3.5 md:gap-5" style={{ perspective: 900 }}>
          {quiz.opcoes.map((o) => {
            const correct = isRight(o)
            const flipped = right && correct
            const dimmed = right && !correct
            return (
              <motion.button
                key={o.id}
                type="button"
                data-sound
                onClick={() => pick(o)}
                aria-label={o.nome}
                aria-pressed={flipped}
                disabled={right}
                animate={shaking === o.id && !reduced ? { x: [0, -9, 8, -6, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.45 }}
                className={`relative aspect-[3/4] w-full rounded-card text-left transition-opacity duration-500 disabled:cursor-default ${dimmed ? 'opacity-45' : ''}`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <motion.span
                  className="absolute inset-0 block"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: flipped && !reduced ? 180 : 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Front: the name over the era picture. */}
                  <span
                    className={`absolute inset-0 flex flex-col justify-end overflow-hidden rounded-card bg-ink p-4 text-paper shadow-card ring-1 ring-black/5 ${flipped && reduced ? 'opacity-0' : ''}`}
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <img src={imageSmallPath(o.imagem)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-80" />
                    <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(30,34,48,0.92)_0%,rgba(30,34,48,0.3)_50%,rgba(30,34,48,0)_75%)]" />
                    <strong className="relative font-display text-[26px] font-semibold leading-none md:text-3xl">{o.nome}</strong>
                  </span>
                  {/* Back (right answer): the explanation, in gold light. */}
                  {correct && (
                    <span
                      className={`absolute inset-0 flex flex-col justify-center rounded-card bg-[linear-gradient(160deg,#FFF8E8,#F1E3C4)] p-4 text-ink shadow-[0_0_0_2px_#B8893A,0_18px_40px_-12px_rgba(184,137,58,0.7)] ${reduced ? (flipped ? '' : 'opacity-0') : ''}`}
                      style={{ backfaceVisibility: 'hidden', transform: reduced ? undefined : 'rotateY(180deg)' }}
                    >
                      <strong className="font-display text-xl font-semibold text-gold-ink">{o.nome}</strong>
                      <span className="mt-2 text-[13.5px] leading-snug md:text-[15px]">{quiz.acerto}</span>
                    </span>
                  )}
                </motion.span>
                {flipped && <Sparks reduced={!!reduced} />}
              </motion.button>
            )
          })}
        </div>

        <p aria-live="polite" className="mx-auto mt-5 min-h-[3em] max-w-[460px] text-center text-[15px] leading-snug text-ink-2">
          {/* The right answer is also on the card's back; screen readers get it here. */}
          {feedback && (
            <motion.span key={feedback} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={right ? 'sr-only' : 'block'}>
              {feedback}
            </motion.span>
          )}
          {right && (
            <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="block font-semibold text-gold-ink">
              +{quiz.passosAcerto} passos
            </motion.span>
          )}
        </p>
      </div>
    </section>
  )
}

/** A soft burst of light dots around the card that was right. */
function Sparks({ reduced }: { reduced: boolean }) {
  if (reduced) return null
  const dots = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2
    const d = 70 + (i % 3) * 22
    return { x: Math.cos(a) * d, y: Math.sin(a) * d * 1.2, s: 4 + (i % 3) * 2 }
  })
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2">
      {dots.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-[#F6D98F] shadow-[0_0_10px_#F6D98F]"
          style={{ width: p.s, height: p.s, marginLeft: -p.s / 2, marginTop: -p.s / 2 }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
          transition={{ duration: 1.1, delay: 0.35 + (i % 4) * 0.03, ease: 'easeOut' }}
        />
      ))}
    </span>
  )
}
