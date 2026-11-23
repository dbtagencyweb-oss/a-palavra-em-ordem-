import { motion, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { livros } from '../content'

/** One color per block of books, from the app's warm earth palette. */
export const BLOCK_COLORS: Record<string, string> = {
  Pentateuco: '#5D6B3B',
  Históricos: '#B8893A',
  'Poéticos e Sapienciais': '#8E5B6E',
  'Profetas Maiores': '#C4572E',
  'Profetas Menores': '#D98A5F',
  Evangelhos: '#2F4A6B',
  'Histórico do NT': '#4F7A8C',
  'Cartas de Paulo': '#7A5C3E',
  'Cartas Gerais': '#A38157',
  Apocalipse: '#8A672B',
}

const MAX_CHAPTERS = 150

interface Props {
  /** Book ids to light up; the rest stay as faint spines so the whole library is always visible. */
  highlight: string[]
  /** Tapping the shelf opens the nearest book. */
  onPick?(bookId: string): void
  height?: number
  label?: string
}

/**
 * The 66 books as spines on a shelf, in canonical order, height by number of chapters.
 * It turns "a Bíblia é uma biblioteca" into something you can see: the block of the day lights up.
 */
export function Bookshelf({ highlight, onPick, height = 64, label }: Props) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const lit = new Set(highlight)
  const firstLit = livros.findIndex((l) => lit.has(l.id))
  const testamentBreak = livros.findIndex((l) => l.testamento === 'NT')

  function pick(clientX: number) {
    if (!onPick || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const i = Math.max(0, Math.min(livros.length - 1, Math.floor(((clientX - r.left) / r.width) * livros.length)))
    onPick(livros[i].id)
  }

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label ?? `Estante da Bíblia: ${highlight.length} de ${livros.length} livros em destaque`}
      onClick={(e) => pick(e.clientX)}
      className={`relative flex items-end gap-px rounded-xl bg-paper-2 px-2 pb-2 pt-3 ${onPick ? 'cursor-pointer' : ''}`}
      style={{ height: height + 20 }}
    >
      {livros.map((l, i) => {
        const on = lit.has(l.id)
        const h = Math.round(height * (0.38 + 0.62 * Math.sqrt(l.capitulos / MAX_CHAPTERS)))
        const color = BLOCK_COLORS[l.bloco] ?? '#8A8D98'
        return (
          <motion.span
            key={l.id}
            title={l.nome}
            className={`block flex-1 rounded-t-[2px] ${i === testamentBreak ? 'ml-1.5' : ''}`}
            style={{ height: h, backgroundColor: color, transformOrigin: 'bottom' }}
            initial={reduced ? false : { opacity: 0.18, scaleY: on ? 0.55 : 1 }}
            animate={{ opacity: on ? 1 : 0.22, scaleY: 1 }}
            transition={{ duration: 0.45, delay: on && !reduced ? 0.15 + Math.max(0, i - firstLit) * 0.035 : 0, ease: [0.22, 1, 0.36, 1] }}
          />
        )
      })}
      {/* The shelf board */}
      <span className="pointer-events-none absolute inset-x-1 bottom-1.5 h-[3px] rounded-full bg-[#D8CCB4]" aria-hidden="true" />
    </div>
  )
}
