import { SmartImage } from '../media/SmartImage'
import { Paragraphs } from './Paragraphs'
import type { CardOf, CardProps } from './types'

export function TextoCard({ card }: CardProps<CardOf<'texto'>>) {
  return (
    <>
      {card.midia && <SmartImage id={card.midia} gradient className="mb-5" />}
      <h2 className="mb-4 text-[28px]">{card.titulo}</h2>
      <Paragraphs items={card.paragrafos} />
    </>
  )
}
