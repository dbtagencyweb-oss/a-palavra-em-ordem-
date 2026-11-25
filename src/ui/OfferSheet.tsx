import { useEffect } from 'react'
import { track } from '../analytics/track'
import { useAuth } from '../auth/AuthContext'
import { checkoutUrl, useFounder } from '../auth/useFounder'
import { ui } from '../content'
import { OFERTA, offerCheckoutBase, startSeats, useOffer } from '../lp/oferta'
import { TrackCover } from '../media/TrackCover'
import { CheckIcon } from './icons'
import { Sheet } from './Sheet'
import { useToast } from './Toast'

interface Props {
  open: boolean
  /** Where the sheet was opened from (analytics + Hotmart sck). */
  origem: string
  onClose(): void
}

/** Founder Access sheet: opens the Hotmart checkout; the webhook grants access. */
export function OfferSheet({ open, origem, onClose }: Props) {
  const { session } = useAuth()
  const founder = useFounder()
  const offer = useOffer()
  const display = offer.fechada ? OFERTA.blocoFechado : OFERTA.bloco
  const toast = useToast()
  const t = ui.oferta
  useEffect(() => {
    if (!open) return
    track('offer_view', { origem })
    return startSeats()
  }, [open, origem])

  return (
    <Sheet open={open} onClose={onClose} labelledBy="offer-title">
      {/* Cover band: the Jesus em Ordem picture across the top of the sheet. */}
      <div className="relative -mx-6 -mt-[26px] mb-5 h-[180px] overflow-hidden rounded-t-[24px] bg-ink">
        <TrackCover id="capa-jesus-em-ordem" />
      </div>
      <div className="eyebrow">{display.selo}</div>
      <h3 id="offer-title" className="mb-2.5 mt-1.5 text-[23px]">
        {display.titulo}
      </h3>
      <div className="mb-1.5 flex items-baseline gap-2">
        <strong className="font-display text-[34px]">{display.preco}</strong>
      </div>
      <p className="text-sm text-ink-3">{display.texto}</p>
      <ul className="mb-[18px] mt-3.5">
        {OFERTA.bloco.recebe.map((item) => (
          <li key={item} className="flex gap-2.5 py-[7px] text-[14.5px]">
            <CheckIcon size={18} className="mt-0.5 flex-none text-olive" />
            {item}
          </li>
        ))}
      </ul>
      {!founder && !offer.fechada && OFERTA.bumps.ativos && (
        <div className="mb-4 rounded-btn border border-line p-3 text-sm text-ink-2">
          <p className="mb-1 font-semibold">Adicionais opcionais no checkout</p>
          <ul>
            {OFERTA.bumps.itens.map((item) => <li key={item.produto}>{item.titulo} · {item.preco}</li>)}
          </ul>
        </div>
      )}
      {founder ? (
        <p role="status" className="mb-2 rounded-btn bg-olive-soft p-4 text-[14.5px] text-[#3C4626]">
          <b>Você já tem acesso às trilhas pagas.</b>
        </p>
      ) : (
        <button
          data-autofocus
          type="button"
          className="btn btn-ember"
          onClick={() => {
            track('offer_click', { origem })
            const checkout = offerCheckoutBase(offer.fechada)
            if (!checkout) {
              onClose()
              toast('Checkout ainda não configurado')
              return
            }
            window.open(checkoutUrl(checkout, session?.user.id ?? null, origem), '_blank', 'noopener')
          }}
        >
          {display.botao}
        </button>
      )}
      <button type="button" className="btn btn-ghost" onClick={onClose}>
        {founder ? 'Fechar' : t.botaoSecundario}
      </button>
      {!founder && (
        <p className="mt-1 text-center text-[12px] text-ink-2">
          {session ? 'A compra fica ligada à sua conta.' : 'Compre com o mesmo e-mail que você vai usar na sua conta.'}
        </p>
      )}
      <p className="mt-2.5 text-center text-[11.5px] text-ink-3">{OFERTA.bloco.precoNota}</p>
    </Sheet>
  )
}
