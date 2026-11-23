import { SmartImage } from '../media/SmartImage'
import { Paragraphs } from './Paragraphs'
import type { CardOf, CardProps } from './types'

export function AberturaCard({ card, api }: CardProps<CardOf<'abertura'>>) {
  const deep = api.era.deep
  if (!card.midia) {
    return (
      <>
        <h2 className="mb-4 text-[28px]">{card.titulo}</h2>
        {/* Book-like opening: a drop cap in the color of the day's era. */}
        <div style={{ ['--drop-cap' as string]: api.era.mid }}>
          <Paragraphs items={card.paragrafos} className="l-text drop-cap" />
        </div>
      </>
    )
  }
  // With an image: background fills the card, light text over a dark gradient at the bottom.
  // The text stays in normal flow so long openings can still scroll on short screens.
  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <SmartImage id={card.midia} fill placeholderClassName="!content-start pt-12" />
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to top, ${deep} 35%, ${deep}b3 65%, transparent)` }}
      />
      <div className="relative mt-auto px-6 pb-4 pt-40">
        <h2 className="mb-4 text-[28px] text-paper">{card.titulo}</h2>
        <Paragraphs items={card.paragrafos} className="l-text !text-paper/90" />
      </div>
    </div>
  )
}
