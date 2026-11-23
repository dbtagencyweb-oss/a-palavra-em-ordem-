import { MatchActivity } from '../activities/MatchActivity'
import type { CardOf, CardProps } from './types'

export function LigarCard({ card, api }: CardProps<CardOf<'ligar'>>) {
  return (
    <>
      <h2 className="mb-4 text-2xl">{card.titulo}</h2>
      <p className="-mt-2 mb-4 text-[14.5px] text-ink-2">{card.instrucao}</p>
      <MatchActivity pares={card.pares} acerto={card.acerto} onSolved={api.solve} solved={api.solved} />
    </>
  )
}
