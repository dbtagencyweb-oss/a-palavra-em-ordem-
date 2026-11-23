import { useAccess } from '../access/AccessContext'

/** True while the person has Founder-level access (fundador, vitalício, mensal or igreja). */
export function useFounder(): boolean {
  return useAccess().podeAcessar('trilha-jesus-em-ordem')
}

/**
 * Checkout link with the account id and where the purchase started, so the payment webhook can
 * link the purchase to the account even if another e-mail is used: `xcod` on Hotmart, `s1` on
 * Kiwify. `sck` records the origin (e.g. app_home).
 */
export function checkoutUrl(base: string, userId: string | null, origem: string): string {
  const url = new URL(base)
  if (userId) url.searchParams.set(url.hostname.includes('kiwify') ? 's1' : 'xcod', userId)
  url.searchParams.set('sck', `app_${origem}`)
  return url.toString()
}
