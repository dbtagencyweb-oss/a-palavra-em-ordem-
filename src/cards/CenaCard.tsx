import { Scene } from '../media/Scene'
import { narrationForCard } from '../sound/narration'
import type { CardOf, CardProps } from './types'

export function CenaCard({ card, api }: CardProps<CardOf<'cena'>>) {
  return (
    <Scene
      id={card.midia}
      legenda={card.legenda}
      referencia={card.referencia}
      onNext={api.next}
      tint={api.era.deep}
      narracao={narrationForCard(card.id)?.id}
    />
  )
}
