import { motion } from 'framer-motion'
import { useEffect } from 'react'
import type { MovimentosCard as Movimentos } from '../content/types'
import { soundManager } from '../sound/SoundManager'
import { STAGGER_S, useListItemMotion } from '../ui/motion'
import type { CardOf, CardProps } from './types'

const BASE_DELAY_S = 0.25

export function MovimentosCard({ card }: CardProps<CardOf<'movimentos'>>) {
  // One soft "tick" as each item lands.
  useEffect(() => {
    const timers = card.itens.map((_, i) =>
      window.setTimeout(() => soundManager.play('tick'), (BASE_DELAY_S + i * STAGGER_S) * 1000),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [card.itens])

  return (
    <>
      <h2 className="mb-4 text-[28px]">{card.titulo}</h2>
      <ol className="mt-1.5 grid gap-2.5">
        {card.itens.map((m, i) => (
          <Item key={m.n} item={m} index={i} />
        ))}
      </ol>
    </>
  )
}

function Item({ item, index }: { item: Movimentos['itens'][number]; index: number }) {
  const motionProps = useListItemMotion(index, BASE_DELAY_S)
  return (
    <motion.li {...motionProps} className="flex items-start gap-3.5 rounded-btn border border-line bg-card p-3.5">
      <b className="w-[22px] flex-none font-display text-xl leading-[1.2] text-ember">{item.n}</b>
      <div>
        <strong className="block text-[15px]">{item.nome}</strong>
        <span className="text-sm leading-[1.45] text-ink-2">{item.texto}</span>
      </div>
    </motion.li>
  )
}
