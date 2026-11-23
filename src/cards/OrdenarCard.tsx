import { OrderActivity } from '../activities/OrderActivity'
import type { CardOf, CardProps } from './types'

export function OrdenarCard({ card, api }: CardProps<CardOf<'ordenar'>>) {
  return (
    <>
      <h2 className="mb-4 text-2xl">{card.titulo}</h2>
      <p className="-mt-2 mb-4 text-[14.5px] text-ink-2">{card.instrucao}</p>
      <OrderActivity items={card.itens} acerto={card.acerto} erro={card.erro} onSolved={api.solve} solved={api.solved} />
    </>
  )
}
