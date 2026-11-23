// Checkout of the Estudos por livro (docs/07, Prompt 9). Links live in config/checkout.json:
// `checkout` is the full price, `checkoutFundador` the offer with the Founder discount. The
// purchase reaches the app through the payment webhook (Prompt 1), like every other product.
import checkout from '../../config/checkout.json'
import { checkoutUrl } from '../auth/useFounder'

type Links = { checkout: string; checkoutFundador: string }
const LINKS = (checkout as { estudos?: Record<string, Links> }).estudos ?? {}

/** The checkout for this study and price, or null while it isn't on sale yet. */
export function studyCheckout(id: string, founderPrice: boolean, userId: string | null): string | null {
  const l = LINKS[id]
  const base = (founderPrice && l?.checkoutFundador) || l?.checkout
  return base ? checkoutUrl(base, userId, `loja_${id}`) : null
}

export const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
