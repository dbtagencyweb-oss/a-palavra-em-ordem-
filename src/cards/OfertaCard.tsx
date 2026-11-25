import { useId, useState } from 'react'
import preview from '../../content/jesus-previa.json'
import { track } from '../analytics/track'
import { Sheet } from '../ui/Sheet'
import type { CardOf, CardProps } from './types'

/** Offer card: opens the Founder sheet but never blocks the lesson. */
export function OfertaCard({ card, api }: CardProps<CardOf<'oferta'>>) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const titleId = useId()
  const sample = preview.cards[index]
  const last = index === preview.cards.length - 1
  return (
    <div className="rounded-card bg-gradient-to-br from-[#2B2F3D] to-ink p-6 text-paper">
      <p className="font-serif text-[19px] leading-[1.55] text-paper/90">{card.texto}</p>
      <button type="button" className="btn mt-5" aria-haspopup="dialog" onClick={() => {
        track('premium_preview', { dia: api.dayN })
        setIndex(0)
        setOpen(true)
      }}>
        Ver prévia de Jesus em Ordem
      </button>
      <button type="button" className="btn btn-ghost mt-1.5 !text-gold-soft" onClick={api.openOffer}>
        {card.botao}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} labelledBy={titleId}>
        <div className="text-ink">
          <p className="eyebrow">Prévia · Jesus em Ordem</p>
          <h2 id={titleId} className="mt-1.5 text-[24px]">{preview.titulo}</h2>
          <article key={index} className="mt-4 rounded-card border border-line bg-card p-4" aria-live="polite">
            <h3 className="text-lg">{sample.titulo}</h3>
            {sample.pontos && (
              <dl className="mt-2 divide-y divide-line">
                {sample.pontos.map(({ nome, texto }) => (
                  <div className="py-2 text-sm" key={nome}>
                    <dt className="font-semibold">{nome}</dt>
                    <dd className="text-ink-2">{texto}</dd>
                  </div>
                ))}
              </dl>
            )}
            {sample.texto && <p className="mt-2 font-serif text-[17px] leading-relaxed text-ink-2">{sample.texto}</p>}
          </article>
          <button type="button" className="btn mt-4" onClick={() => {
            if (last) {
              setOpen(false)
              api.openOffer()
            } else {
              setIndex(index + 1)
            }
          }}>{last ? card.botao : 'Próximo cartão da prévia'}</button>
          <button type="button" className="btn btn-ghost mt-1" onClick={() => setOpen(false)}>Voltar à lição</button>
        </div>
      </Sheet>
      <button type="button" className="btn btn-ghost mt-1.5 !text-paper/70" onClick={api.next}>
        {card.botaoSecundario}
      </button>
    </div>
  )
}
