import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { soundManager } from '../sound/SoundManager'
import { Feedback } from './Feedback'
import { shuffle } from './shuffle'

interface Props {
  pares: { a: string; b: string }[]
  acerto: string
  /** `attempts` counts tries until right (1 = first try). */
  onSolved(firstTry: boolean, attempts: number): void
  solved?: boolean
}

type Side = 'a' | 'b'
type Pt = { x: number; y: number }

// Interface microcopy: the JSON has no "erro" for ligar, so the hint is short and gentle.
export const MATCH_MISS_HINT = 'Esse par não combina. Tente outro.'

const DRAG_THRESHOLD = 8
const OLIVE = '#5D6B3B'
const EMBER = '#C4572E'

/** A soft S-curve from the right edge of a left item to the left edge of a right item. */
const thread = (p: Pt, q: Pt) => {
  const mid = (p.x + q.x) / 2
  return `M${p.x} ${p.y} C${mid} ${p.y}, ${mid} ${q.y}, ${q.x} ${q.y}`
}

/**
 * "Ligar": tap one side then the other, or drag a thread from one item to its pair.
 * Every right pair stays joined by a drawn thread, so the activity literally links things.
 */
export function MatchActivity({ pares, acerto, onSolved, solved = false }: Props) {
  const reduced = useReducedMotion()
  const [right] = useState(() => shuffle(pares.map((p) => p.b)))
  const [selected, setSelected] = useState<{ side: Side; value: string } | null>(null)
  const [matched, setMatched] = useState<string[]>(() => (solved ? pares.map((p) => p.a) : [])) // "a" values already matched
  const [miss, setMiss] = useState<{ a: string; b: string } | null>(null)
  const [drag, setDrag] = useState<{ side: Side; value: string; to: Pt } | null>(null)
  const [, setLayoutTick] = useState(0)
  const firstTry = useRef(true)
  const misses = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  const box = useRef<HTMLDivElement>(null)
  const items = useRef(new Map<string, HTMLButtonElement>())
  const pointer = useRef<{ side: Side; value: string; x: number; y: number; dragging: boolean } | null>(null)
  const suppressClick = useRef(false)
  const done = matched.length === pares.length

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Re-measure thread anchors when the layout changes (fonts loading, rotation).
  useLayoutEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setLayoutTick((t) => t + 1))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const isMatched = (side: Side, v: string) =>
    side === 'a' ? matched.includes(v) : pares.some((p) => p.b === v && matched.includes(p.a))

  /** Where a thread attaches: right edge of left items, left edge of right items. */
  const anchor = useCallback((side: Side, value: string): Pt | null => {
    const el = items.current.get(`${side}:${value}`)
    const root = box.current
    if (!el || !root) return null
    const r = el.getBoundingClientRect()
    const b = root.getBoundingClientRect()
    return { x: (side === 'a' ? r.right : r.left) - b.left, y: r.top + r.height / 2 - b.top }
  }, [])

  function attempt(a: string, b: string) {
    setSelected(null)
    if (pares.some((p) => p.a === a && p.b === b)) {
      const next = [...matched, a]
      setMatched(next)
      setMiss(null)
      if (next.length === pares.length) {
        soundManager.play('correct')
        soundManager.vibrate('correct')
        onSolved(firstTry.current, misses.current + 1)
      } else {
        soundManager.play('match')
      }
    } else {
      firstTry.current = false
      misses.current += 1
      setMiss({ a, b })
      soundManager.play('wrong')
      soundManager.vibrate('wrong')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setMiss(null), 1400)
    }
  }

  function tap(side: Side, value: string) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (done || isMatched(side, value)) return
    if (!selected || selected.side === side) {
      soundManager.play('tap')
      setSelected(selected?.value === value ? null : { side, value })
      return
    }
    attempt(side === 'a' ? value : selected.value, side === 'b' ? value : selected.value)
  }

  // ---- drag a thread ----
  function onPointerDown(side: Side, value: string, e: React.PointerEvent) {
    if (done || isMatched(side, value) || e.button > 0) return
    pointer.current = { side, value, x: e.clientX, y: e.clientY, dragging: false }
  }

  useEffect(() => {
    function move(e: PointerEvent) {
      const p = pointer.current
      if (!p || !box.current) return
      if (!p.dragging && Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_THRESHOLD) return
      if (!p.dragging) {
        p.dragging = true
        soundManager.play('tap')
        setSelected({ side: p.side, value: p.value })
      }
      const b = box.current.getBoundingClientRect()
      setDrag({ side: p.side, value: p.value, to: { x: e.clientX - b.left, y: e.clientY - b.top } })
    }
    function up(e: PointerEvent) {
      const p = pointer.current
      pointer.current = null
      if (!p?.dragging) return
      setDrag(null)
      suppressClick.current = true
      window.setTimeout(() => (suppressClick.current = false), 0)
      const target = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-match-side]')
      const side = target?.dataset.matchSide as Side | undefined
      const value = target?.dataset.matchValue
      if (!side || !value || side === p.side || isMatched(side, value)) {
        setSelected(null)
        return
      }
      attempt(p.side === 'a' ? p.value : value, p.side === 'b' ? p.value : value)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  })

  function cls(side: Side, value: string) {
    if (isMatched(side, value)) return 'pulse-ok border-olive bg-olive-soft text-[#3C4626]'
    if (miss && miss[side] === value) return 'shake border-ember bg-ember-soft'
    if (selected?.side === side && selected.value === value) return 'border-ink bg-white'
    return 'border-line bg-card'
  }

  const column = (side: Side, values: string[]) => (
    <div className="relative z-[1] grid content-start gap-2">
      {values.map((v) => (
        <button
          key={v}
          ref={(el) => {
            if (el) items.current.set(`${side}:${v}`, el)
            else items.current.delete(`${side}:${v}`)
          }}
          type="button"
          data-sound="match"
          data-match-side={side}
          data-match-value={v}
          onClick={() => tap(side, v)}
          onPointerDown={(e) => onPointerDown(side, v, e)}
          disabled={isMatched(side, v)}
          aria-pressed={selected?.side === side && selected.value === v}
          className={`min-h-[52px] touch-none select-none rounded-xl border-[1.5px] px-3 py-2.5 text-left text-[14px] font-semibold leading-snug shadow-pill transition-colors ${cls(side, v)}`}
        >
          {v}
        </button>
      ))}
    </div>
  )

  const threads = pares
    .filter((p) => matched.includes(p.a))
    .map((p) => ({ key: p.a, from: anchor('a', p.a), to: anchor('b', p.b) }))
  const missFrom = miss && anchor('a', miss.a)
  const missTo = miss && anchor('b', miss.b)
  const dragFrom = drag && anchor(drag.side, drag.value)

  return (
    <div>
      <div ref={box} className="relative grid grid-cols-[0.8fr_1.2fr] gap-x-10">
        {column(
          'a',
          pares.map((p) => p.a),
        )}
        {column('b', right)}
        <svg className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-visible" aria-hidden="true">
          {threads.map(
            (t) =>
              t.from &&
              t.to && (
                <motion.path
                  key={t.key}
                  d={thread(t.from, t.to)}
                  fill="none"
                  stroke={OLIVE}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  initial={reduced || solved ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              ),
          )}
          {missFrom && missTo && (
            <path d={thread(missFrom, missTo)} fill="none" stroke={EMBER} strokeWidth={2} strokeDasharray="4 5" strokeLinecap="round" />
          )}
          {drag && dragFrom && (
            <>
              <path
                d={drag.side === 'a' ? thread(dragFrom, drag.to) : thread(drag.to, dragFrom)}
                fill="none"
                stroke="#1E2230"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <circle cx={drag.to.x} cy={drag.to.y} r={5} fill="#1E2230" />
            </>
          )}
        </svg>
      </div>
      <p className="mt-2 text-[12px] text-ink-3">Dica: você também pode arrastar o dedo de um item até o par.</p>
      <div className="mt-3">
        <Feedback kind={done ? 'good' : miss ? 'bad' : null} text={done ? acerto : MATCH_MISS_HINT} />
      </div>
    </div>
  )
}
