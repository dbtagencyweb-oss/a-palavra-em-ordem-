import type { CardOf, CardProps } from './types'

/** Offer card: opens the Founder sheet but never blocks the lesson. */
export function OfertaCard({ card, api }: CardProps<CardOf<'oferta'>>) {
  return (
    <div className="rounded-card bg-gradient-to-br from-[#2B2F3D] to-ink p-6 text-paper">
      <p className="font-serif text-[19px] leading-[1.55] text-paper/90">{card.texto}</p>
      <button type="button" className="btn mt-5" onClick={api.openOffer}>
        {card.botao}
      </button>
      <button type="button" className="btn btn-ghost mt-1.5 !text-paper/70" onClick={api.next}>
        {card.botaoSecundario}
      </button>
    </div>
  )
}
