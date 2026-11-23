// What the landing page reports.
//  - Meta Pixel: InitiateCheckout for purchase, Lead for the free start.
//  - Our own events table (docs/07, Prompt 11, for /admin): lp_view on arrival and lp_click on
//    each button, with the first-touch utm and the same visitor id the app uses. Sent with a plain
//    request to Supabase (no client library on the landing page). Without Supabase, nothing is sent.
import { anonId, captureUtm } from '../analytics/utm'
import { pixel } from './pixel'
import { getOffer } from './oferta'
import { publicoTag } from './publico'

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function lpEvent(name: 'lp_view' | 'lp_click', props: Record<string, unknown> = {}) {
  if (!URL_ || !KEY) return
  const utm = captureUtm()
  const body = JSON.stringify([{ name, props: { publico: publicoTag(), ...props, ...(utm ? { utm } : {}) }, anon_id: anonId(), user_id: null }])
  try {
    void fetch(`${URL_.replace(/\/$/, '')}/rest/v1/events`, {
      method: 'POST',
      keepalive: true, // still sent when the click leaves the page
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body,
    }).catch(() => {})
  } catch {
    /* analytics never gets in the way */
  }
}

export const onBuyClick = (origem: string) => {
  const o = getOffer()
  pixel('InitiateCheckout', { content_name: o.fechada ? 'Acesso anual' : 'Acesso Fundador', value: o.preco, currency: 'BRL', origem, publico: publicoTag() })
  lpEvent('lp_click', { tipo: 'compra', origem })
}
export const onFreeClick = (origem: string) => {
  pixel('Lead', { content_name: '7 dias grátis', origem, publico: publicoTag() })
  lpEvent('lp_click', { tipo: 'gratis', origem })
}
