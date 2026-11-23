import { trilha } from '../content'
import { buildReadingLink } from '../content/readingLink'
import { SmartImage } from '../media/SmartImage'
import type { CardOf, CardProps } from './types'

export function PalavraCard({ card }: CardProps<CardOf<'palavra'>>) {
  const link = card.link ?? buildReadingLink(card.referencia, trilha.linkLeitura.modelo)
  return (
    <>
      {card.midia && <SmartImage id={card.midia} gradient className="mb-5" />}
      {card.titulo && <h2 className="mb-4 text-2xl">{card.titulo}</h2>}
      <div className="rounded-card border-l-4 border-gold bg-card p-5 shadow-card">
        <div className="font-display text-xl font-semibold">
          <small className="mb-1 block font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3">
            Leia em sua Bíblia
          </small>
          {card.referencia}
        </div>
        <p className="mt-2.5 font-serif text-[17px] leading-normal text-ink-2">{card.resumo}</p>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-[44px] items-center text-[13px] font-bold text-ember-ink"
          >
            Abrir o texto →
          </a>
        )}
      </div>
      <div className="mt-4 rounded-btn bg-olive-soft p-4 text-[14.5px] leading-normal text-[#3C4626]">
        <b className="mb-1 block text-[11px] uppercase tracking-[0.12em]">O que observar</b>
        {card.observar}
      </div>
    </>
  )
}
