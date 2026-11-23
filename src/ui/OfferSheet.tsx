import { useEffect } from 'react'
import { track } from '../analytics/track'
import { useAuth } from '../auth/AuthContext'
import { checkoutUrl, useFounder } from '../auth/useFounder'
import { ui } from '../content'
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

const CHECKOUT = import.meta.env.VITE_HOTMART_CHECKOUT_URL as string | undefined

/** Founder Access sheet: opens the Hotmart checkout; the webhook grants access. */
export function OfferSheet({ open, origem, onClose }: Props) {
  const { session } = useAuth()
  const founder = useFounder()
  const toast = useToast()
  const t = ui.oferta
  useEffect(() => {
    if (open) track('offer_view', { origem })
  }, [open, origem])

  return (
    <Sheet open={open} onClose={onClose} labelledBy="offer-title">
      {/* Cover band: the Jesus em Ordem picture across the top of the sheet. */}
      <div className="relative -mx-6 -mt-[26px] mb-5 h-[180px] overflow-hidden rounded-t-[24px] bg-ink">
        <TrackCover id="capa-jesus-em-ordem" />
      </div>
      <div className="eyebrow">{t.rotulo}</div>
      <h3 id="offer-title" className="mb-2.5 mt-1.5 text-[23px]">
        {t.titulo}
      </h3>
      <div className="mb-1.5 flex items-baseline gap-2">
        <strong className="font-display text-[34px]">{t.preco}</strong>
        <span className="text-sm text-ink-3">{t.precoNota}</span>
      </div>
      <ul className="mb-[18px] mt-3.5">
        {t.itens.map((item) => (
          <li key={item} className="flex gap-2.5 py-[7px] text-[14.5px]">
            <CheckIcon size={18} className="mt-0.5 flex-none text-olive" />
            {item}
          </li>
        ))}
      </ul>
      {founder ? (
        <p role="status" className="mb-2 rounded-btn bg-olive-soft p-4 text-[14.5px] text-[#3C4626]">
          <b>Você já é Fundador.</b> Obrigado por caminhar com a gente desde o começo.
        </p>
      ) : (
        <button
          data-autofocus
          type="button"
          className="btn btn-ember"
          onClick={() => {
            track('offer_click', { origem })
            if (!CHECKOUT) {
              onClose()
              toast('Checkout ainda não configurado')
              return
            }
            window.open(checkoutUrl(CHECKOUT, session?.user.id ?? null, origem), '_blank', 'noopener')
          }}
        >
          {t.botao}
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
      <p className="mt-2.5 text-center text-[11.5px] text-ink-3">{t.aviso}</p>
    </Sheet>
  )
}
