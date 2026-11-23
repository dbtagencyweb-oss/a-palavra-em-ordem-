import { LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import { soundManager } from '../sound/SoundManager'
import { Feedback } from './Feedback'
import { shuffle } from './shuffle'

export const ORDER_RESET_MS = 1400

interface Props {
  items: string[] // correct order
  acerto: string
  erro: string
  /** `attempts` counts tries until right (1 = first try). */
  onSolved(firstTry: boolean, attempts: number): void
  /** Already solved earlier in this lesson (user went back): show the answer. */
  solved?: boolean
}

export function OrderActivity({ items, acerto, erro, onSolved, solved = false }: Props) {
  const [pool] = useState(() => shuffle(items))
  const [filled, setFilled] = useState<number[]>(() => (solved ? items.map((it) => pool.indexOf(it)) : [])) // indexes into pool
  const [result, setResult] = useState<'good' | 'bad' | null>(solved ? 'good' : null)
  // Long sequences (Dia 7 has 8 steps) use two columns so every option fits above the button.
  const twoCols = items.length > 6
  const compact = items.length >= 6
  const firstTry = useRef(true)
  const group = useId()
  const reduced = useReducedMotion()
  const attempts = useRef(0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function place(poolIndex: number) {
    if (result !== null || filled.includes(poolIndex)) return
    const next = [...filled, poolIndex]
    setFilled(next)
    soundManager.play('slot_place')
    if (next.length < items.length) return

    attempts.current += 1
    const right = next.every((pi, slot) => pool[pi] === items[slot])
    if (right) {
      setResult('good')
      soundManager.play('correct')
      soundManager.vibrate('correct')
      onSolved(firstTry.current, attempts.current)
    } else {
      firstTry.current = false
      setResult('bad')
      soundManager.play('wrong')
      soundManager.vibrate('wrong')
      timer.current = window.setTimeout(() => {
        setFilled([])
        setResult(null)
      }, ORDER_RESET_MS)
    }
  }

  // Pieces share a layoutId between the pool and the slots, so placing one makes it fly into its slot
  // (and a wrong sequence makes them fly back).
  const fly = { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 } as const

  return (
    <LayoutGroup id={group}>
    <div>
      <ol
        className={`relative mb-4 mt-1.5 grid gap-2 ${twoCols ? 'grid-flow-col grid-cols-2' : ''}`}
        style={twoCols ? { gridTemplateRows: `repeat(${Math.ceil(items.length / 2)}, auto)` } : undefined}
        aria-label="Sequência"
      >
        {items.map((_, slot) => {
          const pi = filled[slot]
          const text = pi === undefined ? '' : pool[pi]
          const state =
            pi === undefined
              ? 'border-dashed border-line text-ink-3'
              : result === null
                ? 'border-ink bg-white text-ink'
                : pool[pi] === items[slot]
                  ? 'pulse-ok border-olive bg-olive-soft text-ink'
                  : 'shake border-ember bg-ember-soft text-ink'
          return (
            <li
              key={slot}
              className={`relative flex items-center overflow-hidden rounded-xl border-[1.5px] font-semibold transition-colors ${compact ? 'h-[44px] gap-2 px-3 text-[14px]' : 'h-[50px] gap-3 px-3.5 text-[15px]'} ${state}`}
              style={result === 'good' ? { animationDelay: `${slot * 60}ms` } : undefined}
            >
              <b className={`w-4 font-display ${pi === undefined ? 'text-ink-3' : 'text-ember'}`}>
                {slot + 1}
              </b>
              {text && (
                <motion.span layoutId={`piece-${text}`} transition={fly} className="relative">
                  {text}
                </motion.span>
              )}
              {result === 'good' && !reduced && (
                // A light sweep runs down the finished sequence, one slot after another.
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent"
                  initial={{ left: '-40%' }}
                  animate={{ left: '120%' }}
                  transition={{ duration: 0.6, delay: 0.1 + slot * 0.06, ease: 'easeInOut' }}
                />
              )}
            </li>
          )
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        {pool.map((item, pi) => {
          const used = filled.includes(pi)
          // A used piece leaves an invisible twin behind so the pool doesn't reflow.
          if (used)
            return (
              <span key={item} className="pill invisible" aria-hidden="true">
                {item}
              </span>
            )
          return (
            <motion.button
              key={item}
              layoutId={`piece-${item}`}
              transition={fly}
              type="button"
              data-sound="slot_place"
              className="pill"
              onClick={() => place(pi)}
            >
              {item}
            </motion.button>
          )
        })}
      </div>
      <div className="mt-3">
        <Feedback kind={result} text={result === 'good' ? acerto : erro} />
      </div>
    </div>
    </LayoutGroup>
  )
}
