// What each piece of content requires. The single place for these rules in the app; the server
// has the same table in supabase/migrations/*_entitlements.sql (function can_access). Keep both in step.
import { FULL_ACCESS, isChurchProduct, isLive, type Entitlement, type ProductCode } from '../../supabase/functions/_shared/logic-access'

export type ContentKey =
  | 'trilha-mapa-7-dias'
  | 'trilha-jesus-em-ordem'
  | 'biblia-em-ordem'
  | 'download-mapa-impresso'
  | 'modo-audio-completo'
  | `estudo-${string}`

/** null = free for everyone; otherwise any one of these products (live) unlocks it. */
export function requiredProducts(content: ContentKey): ProductCode[] | null {
  switch (content) {
    case 'trilha-mapa-7-dias':
      return null
    case 'trilha-jesus-em-ordem':
    case 'biblia-em-ordem':
      return FULL_ACCESS
    case 'download-mapa-impresso':
      return ['mapa-impresso']
    case 'modo-audio-completo':
      return ['audio']
    default:
      // estudo-X: that study. Founders get a discount on it (see founderDiscount), not free access.
      return [content as ProductCode]
  }
}

export function canAccess(content: ContentKey, entitlements: Entitlement[], now = new Date()): boolean {
  const need = requiredProducts(content)
  if (!need) return true
  return entitlements.some((e) => need.includes(e.product_code) && isLive(e, now))
}

/** Founders pay 30% less for the studies (docs/06). */
export const FOUNDER_STUDY_DISCOUNT = 0.3
export function founderDiscount(entitlements: Entitlement[], now = new Date()): number {
  return canAccess('trilha-jesus-em-ordem', entitlements, now) ? FOUNDER_STUDY_DISCOUNT : 0
}

/** The plan shown in the Profile: the strongest live access, with its expiry. */
export interface Plan {
  kind: 'gratuito' | 'fundador' | 'anual' | 'vitalicio' | 'mensal' | 'igreja'
  /** null = no expiry. */
  expiresAt: string | null
  /** Monthly plan canceled: access until expiresAt, no renewal. */
  canceled: boolean
}

export function currentPlan(entitlements: Entitlement[], now = new Date()): Plan {
  const live = entitlements.filter((e) => isLive(e, now))
  const pick = (code: ProductCode) => live.filter((e) => e.product_code === code)
  if (pick('vitalicio').length) return { kind: 'vitalicio', expiresAt: null, canceled: false }
  // A Founder purchase sold past the seat limit (preco_fundador false) is normal annual access.
  const fund = pick('fundador').filter((e) => e.preco_fundador !== false)
  if (fund.length) {
    const lifetime = fund.some((e) => e.expires_at === null)
    return { kind: lifetime ? 'vitalicio' : 'fundador', expiresAt: lifetime ? null : latest(fund), canceled: false }
  }
  const anual = [...pick('anual'), ...pick('fundador').filter((e) => e.preco_fundador === false)]
  if (anual.length) return { kind: 'anual', expiresAt: latest(anual), canceled: false }
  const igreja = live.filter((e) => isChurchProduct(e.product_code))
  if (igreja.length) return { kind: 'igreja', expiresAt: latest(igreja), canceled: false }
  const mensal = pick('mensal')
  if (mensal.length) return { kind: 'mensal', expiresAt: latest(mensal), canceled: mensal.every((e) => e.status === 'cancelado') }
  return { kind: 'gratuito', expiresAt: null, canceled: false }
}

const latest = (list: Entitlement[]) =>
  list.some((e) => e.expires_at === null) ? null : list.map((e) => e.expires_at!).sort().at(-1) ?? null

/** Live extras (bumps and studies) to list under the plan. */
export function extras(entitlements: Entitlement[], now = new Date()): Entitlement[] {
  const main: ProductCode[] = [...FULL_ACCESS, 'free']
  const seen = new Set<string>()
  return entitlements.filter((e) => {
    if (main.includes(e.product_code) || !isLive(e, now) || seen.has(e.product_code)) return false
    seen.add(e.product_code)
    return true
  })
}

/** Price of a study for this person: 30% less for Founders, rounded to the cent. */
export function studyPrice(fullPrice: number, discount: number): number {
  return Math.round(fullPrice * (1 - discount) * 100) / 100
}

/** Holds one of the limited Founder seats (Founder medal and badge, Founder renewal price). */
export function isFounderSeat(entitlements: Entitlement[], now = new Date()): boolean {
  return entitlements.some(
    (e) => (e.product_code === 'fundador' || e.product_code === 'vitalicio') && e.origem === 'compra' && e.preco_fundador !== false && isLive(e, now),
  )
}