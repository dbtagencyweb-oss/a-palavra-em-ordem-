// Outgoing links of the landing page. Purchase buttons go to the checkout, free buttons to the app.
// Campaign parameters the visitor arrived with (utm_*, fbclid, src…) are carried over to both.

import { getOffer, offerCheckoutBase } from './oferta'
import { getPublico } from './publico'

const APP_URL = ((import.meta.env.VITE_APP_URL as string | undefined) || window.location.origin).replace(/\/$/, '')

const KEEP = /^(utm_[a-z_]+|fbclid|gclid|src|sck|xcod)$/

/** Campaign params from the current address. */
export function campaignParams(search = window.location.search): URLSearchParams {
  const out = new URLSearchParams()
  new URLSearchParams(search).forEach((v, k) => {
    if (KEEP.test(k)) out.set(k, v)
  })
  return out
}

function withParams(base: string, extra: Record<string, string> = {}): string {
  if (!base) return '#oferta'
  const url = new URL(base, window.location.origin)
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v)
  campaignParams().forEach((v, k) => {
    if (!url.searchParams.has(k)) url.searchParams.set(k, v)
  })
  return url.toString()
}

/**
 * Checkout for the Acesso Fundador. Without VITE_HOTMART_CHECKOUT_URL it points at the offer.
 * The platforms only send back `src` (not utm_*), so src carries the campaign source: that's how
 * /admin shows sales by UTM.
 */
export const checkoutHref = () => {
  const source = campaignParams().get('utm_source')
  return withParams(offerCheckoutBase(getOffer().fechada), source && !campaignParams().has('src') ? { src: source } : {})
}
/**
 * The free 7 days: the app, straight into the journey. The chosen audience goes along so the app's
 * diagnosis opens pre-selected: as publico=, and as utm_content=publico-<id> when the visitor's own
 * campaign doesn't already use utm_content (the app reads either).
 */
export const freeHref = () => {
  const p = getPublico()
  const extra: Record<string, string> = { start: '1' }
  if (p) {
    extra.publico = p
    if (!campaignParams().has('utm_content')) extra.utm_content = `publico-${p}`
  }
  return withParams(`${APP_URL}/`, extra)
}
export const hasCheckout = () => Boolean(offerCheckoutBase(getOffer().fechada))
