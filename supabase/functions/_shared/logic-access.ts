// Access (entitlements) logic shared by the payment webhook (Deno Edge Function), the app's dev
// simulator and the tests. Pure TypeScript with no imports and no Deno/Node APIs (only the Web
// Crypto global for the Kiwify signature), so it runs the same everywhere.
//
// Flow: platform payload → parseHotmart / parseKiwify → PaymentEvent (normalized)
//       → applyPayment(event, existing entitlements) → rows to upsert.

// ---------- Products and entitlements ----------

export const PRODUCT_CODES = [
  'free',
  'fundador',
  'anual',
  'mapa-impresso',
  'familia',
  'vitalicio',
  'audio',
  'mensal',
  'estudo-romanos',
  'estudo-salmos',
  'estudo-apocalipse',
  'igreja',
  'igreja-100',
] as const
export type ProductCode = (typeof PRODUCT_CODES)[number]

export const isProductCode = (s: string): s is ProductCode => (PRODUCT_CODES as readonly string[]).includes(s)

export type Origem = 'compra' | 'convite_familia' | 'igreja' | 'cortesia'
export type EntitlementStatus = 'ativo' | 'cancelado' | 'reembolsado' | 'expirado'
export type Provider = 'hotmart' | 'kiwify' | 'dev'

export interface Entitlement {
  user_id: string | null
  /** Buyer e-mail (lowercase). A purchase made before the account exists waits here until signup. */
  email: string
  product_code: ProductCode
  origem: Origem
  status: EntitlementStatus
  starts_at: string
  /** null = no expiry (vitalício and most bumps). */
  expires_at: string | null
  provider: Provider
  /** Order / transaction id on the platform. */
  order_id: string
  /** Recurring subscription id (monthly plan), to find the entitlement again on renewal. */
  subscription_id: string | null
  grupo_id: string | null
  /** Monthly plan: when the last charge failed (null once a charge goes through). */
  cobranca_falhou_em?: string | null
  /** Campaign of the sale (docs/07, Prompt 11: sales by UTM in /admin). */
  src?: string | null
  /**
   * Founder seat (content/oferta.json): this purchase got one of the limited Founder places, so its
   * renewals keep the Founder price. false = sold past the limit (normal annual access).
   */
  preco_fundador?: boolean
}

const DAY = 86_400_000
export const FUNDADOR_DAYS = 365
export const MENSAL_DAYS = 31
/** A failed monthly charge keeps access for this many days before blocking (docs/07, Prompt 7). */
export const TOLERANCIA_DIAS = 3
/** Products that give the full journey (Founder level). */
export const FULL_ACCESS: ProductCode[] = ['fundador', 'anual', 'vitalicio', 'mensal', 'igreja', 'igreja-100']

// ---------- Founder seats (content/oferta.json) ----------

/** Holds a Founder seat: a Founder (or lifetime) purchase that got a seat, not refunded. */
export function hasFounderSeat(mine: Entitlement[]): boolean {
  return mine.some(
    (e) => (e.product_code === 'fundador' || e.product_code === 'vitalicio') && e.origem === 'compra' && e.preco_fundador !== false && e.status !== 'reembolsado',
  )
}

/**
 * Whether a Founder purchase gets a seat: someone who already holds one keeps it (renewals and
 * repeated webhooks never take a second place); anyone else only while sold < limit. Past the limit
 * the purchase still gives access (it was paid), as normal annual access, and goes to the review
 * queue (fundador_excedentes).
 */
export function founderSeatFor(mine: Entitlement[], sold: number, limit: number): boolean {
  return hasFounderSeat(mine) || sold < limit
}

/** Offer state for the landing page: seats left, or null when the count could not be read. */
export function seatsLeft(sold: number | null, limit: number): number | null {
  return sold === null || !Number.isFinite(sold) || sold < 0 ? null : Math.max(0, limit - sold)
}
/** Licença Igreja (docs/07, Prompt 10): seats of the group each product creates. */
export const CHURCH_SEATS: Partial<Record<ProductCode, number>> = { igreja: 30, 'igreja-100': 100 }
export const isChurchProduct = (p: ProductCode) => p in CHURCH_SEATS

/** An entitlement grants access now: active, or canceled monthly plan still inside its paid period. */
export function isLive(e: Entitlement, now: Date): boolean {
  if (e.status !== 'ativo' && e.status !== 'cancelado') return false
  return e.expires_at === null || new Date(e.expires_at).getTime() > now.getTime()
}

// ---------- Normalized payment events ----------

export type PaymentKind =
  | 'approved' // a purchase (or the first charge of a subscription) was approved
  | 'renewed' // a subscription charge after the first one
  | 'refunded'
  | 'chargeback'
  | 'canceled' // the purchase was canceled before being paid (e.g. boleto/Pix not paid)
  | 'subscription_canceled' // the buyer canceled the monthly plan: access stays until the end of the period
  | 'charge_failed' // a subscription charge did not go through: 3 days of tolerance
  | 'expired'

export interface PaymentEvent {
  provider: Provider
  kind: PaymentKind
  email: string
  orderId: string
  /** Product id on the platform and offer/plan code, used to find the product_code. */
  platformProductId: string
  offerCode: string | null
  subscriptionId: string | null
  /** Account id passed in the checkout link (xcod on Hotmart, s1 on Kiwify), when present. */
  userId: string | null
  at: Date
  /** Campaign the sale came from (src on the checkout link: the landing page sets it to utm_source). */
  src?: string | null
}

export type ParseResult = { ok: true; event: PaymentEvent } | { ok: false; reason: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const uuidOrNull = (v: unknown) => (typeof v === 'string' && UUID_RE.test(v) ? v : null)
const str = (v: unknown) => (v === undefined || v === null || v === '' ? null : String(v))

// ---------- Hotmart (postback 2.0.0) ----------

const HOTMART_KIND: Record<string, PaymentKind> = {
  PURCHASE_APPROVED: 'approved',
  PURCHASE_COMPLETE: 'approved',
  PURCHASE_REFUNDED: 'refunded',
  PURCHASE_CHARGEBACK: 'chargeback',
  PURCHASE_PROTEST: 'chargeback',
  PURCHASE_CANCELED: 'canceled',
  PURCHASE_EXPIRED: 'expired',
  SUBSCRIPTION_CANCELLATION: 'subscription_canceled',
  PURCHASE_DELAYED: 'charge_failed',
}

interface HotmartPayload {
  event?: string
  creation_date?: number
  data?: {
    product?: { id?: number | string }
    buyer?: { email?: string }
    subscriber?: { email?: string }
    purchase?: {
      transaction?: string
      approved_date?: number
      order_date?: number
      recurrence_number?: number
      offer?: { code?: string }
      origin?: { xcod?: string; src?: string; sck?: string }
    }
    subscription?: { subscriber?: { code?: string }; plan?: { id?: number | string } }
  }
}

export function parseHotmart(body: unknown): ParseResult {
  const p = (body ?? {}) as HotmartPayload
  const kind0 = p.event ? HOTMART_KIND[p.event] : undefined
  if (!kind0) return { ok: false, reason: `evento hotmart ignorado: ${p.event ?? '(nenhum)'}` }
  const d = p.data ?? {}
  const email = (d.buyer?.email ?? d.subscriber?.email ?? '').trim().toLowerCase()
  const subscriptionId = str(d.subscription?.subscriber?.code)
  // A cancellation has no transaction; use the subscription code to find it.
  const orderId = str(d.purchase?.transaction) ?? (subscriptionId ? `sub:${subscriptionId}` : null)
  const productId = str(d.product?.id)
  if (!email || !orderId || !productId) return { ok: false, reason: 'faltam e-mail, transação ou produto' }
  const recurrence = d.purchase?.recurrence_number ?? 1
  const kind: PaymentKind = kind0 === 'approved' && recurrence > 1 ? 'renewed' : kind0
  const ms = d.purchase?.approved_date ?? d.purchase?.order_date ?? p.creation_date
  return {
    ok: true,
    event: {
      provider: 'hotmart',
      kind,
      email,
      orderId,
      platformProductId: productId,
      offerCode: str(d.purchase?.offer?.code) ?? str(d.subscription?.plan?.id),
      subscriptionId,
      userId: uuidOrNull(d.purchase?.origin?.xcod),
      at: ms ? new Date(ms) : new Date(),
      src: str(d.purchase?.origin?.src),
    },
  }
}

/** Constant-time comparison for the X-HOTMART-HOTTOK header. */
export function tokensMatch(given: string | null, expected: string): boolean {
  if (!given || !expected || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

// ---------- Kiwify ----------

interface KiwifyPayload {
  order_id?: string
  order_status?: string
  webhook_event_type?: string
  approved_date?: string
  created_at?: string
  updated_at?: string
  Product?: { product_id?: string; product_offer_id?: string }
  Customer?: { email?: string }
  Subscription?: { id?: string; charges?: { completed?: unknown[] } }
  subscription_id?: string
  TrackingParameters?: { s1?: string; src?: string; sck?: string; utm_source?: string }
}

const KIWIFY_KIND: Record<string, PaymentKind> = {
  order_approved: 'approved',
  order_refunded: 'refunded',
  chargeback: 'chargeback',
  subscription_renewed: 'renewed',
  subscription_canceled: 'subscription_canceled',
  subscription_late: 'charge_failed',
  order_rejected: 'canceled',
}

export function parseKiwify(body: unknown): ParseResult {
  const p = (body ?? {}) as KiwifyPayload
  const type = p.webhook_event_type ?? (p.order_status === 'paid' ? 'order_approved' : p.order_status === 'refunded' ? 'order_refunded' : undefined)
  const kind = type ? KIWIFY_KIND[type] : undefined
  if (!kind) return { ok: false, reason: `evento kiwify ignorado: ${type ?? '(nenhum)'}` }
  const email = (p.Customer?.email ?? '').trim().toLowerCase()
  const subscriptionId = str(p.Subscription?.id ?? p.subscription_id)
  const orderId = str(p.order_id) ?? (subscriptionId ? `sub:${subscriptionId}` : null)
  const productId = str(p.Product?.product_id)
  if (!email || !orderId || !productId) return { ok: false, reason: 'faltam e-mail, pedido ou produto' }
  const when = p.approved_date ?? p.updated_at ?? p.created_at
  return {
    ok: true,
    event: {
      provider: 'kiwify',
      kind,
      email,
      orderId,
      platformProductId: productId,
      offerCode: str(p.Product?.product_offer_id),
      subscriptionId,
      userId: uuidOrNull(p.TrackingParameters?.s1),
      at: when ? new Date(when) : new Date(),
      src: str(p.TrackingParameters?.src ?? p.TrackingParameters?.utm_source),
    },
  }
}

/** Kiwify signs the raw body with HMAC-SHA1 (hex) using the account token, sent as ?signature=. */
export async function kiwifySignatureOk(rawBody: string, signature: string | null, token: string): Promise<boolean> {
  if (!signature || !token) return false
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(token), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(rawBody)))
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('')
  return tokensMatch(signature.toLowerCase(), hex)
}

// ---------- Platform ids → product codes ----------

/** Shape of config/produtos-plataforma.json. */
export interface PlatformMap {
  hotmart?: { produtos?: Record<string, string>; ofertas?: Record<string, string> }
  kiwify?: { produtos?: Record<string, string>; ofertas?: Record<string, string> }
  dev?: { produtos?: Record<string, string>; ofertas?: Record<string, string> }
}

/** The offer code wins over the product id (one product can have several offers: annual, monthly). */
export function productFor(event: PaymentEvent, map: PlatformMap): ProductCode | null {
  const m = map[event.provider]
  const code = (event.offerCode && m?.ofertas?.[event.offerCode]) || m?.produtos?.[event.platformProductId]
  return code && isProductCode(code) ? code : null
}

// ---------- Applying a payment to the entitlements ----------

const iso = (d: Date) => d.toISOString()
const plus = (d: Date, days: number) => new Date(d.getTime() + days * DAY)

const sameBuyer = (e: Entitlement, ev: PaymentEvent) => e.email === ev.email || (ev.userId !== null && e.user_id === ev.userId)

/**
 * Returns the entitlement rows to upsert (new or changed) for one payment event.
 * `existing` = the buyer's current entitlements (by e-mail and/or account).
 * Rules (docs/07, Prompt 1): fundador 365 days; mensal 31 days, renewed on every charge;
 * vitalicio has no expiry and removes the expiry of the fundador; bumps have no expiry, except
 * audio, which follows the fundador's. Refund/chargeback revoke at once; canceling the monthly
 * plan keeps access until the paid period ends.
 */
export function applyPayment(event: PaymentEvent, product: ProductCode, existing: Entitlement[], now = new Date(), founderSeat = true): Entitlement[] {
  const mine = existing.filter((e) => sameBuyer(e, event))
  const ofOrder = mine.filter((e) => e.provider === event.provider && e.order_id === event.orderId)
  const ofSubscription = event.subscriptionId ? mine.filter((e) => e.subscription_id === event.subscriptionId) : []
  const at = event.at
  const out: Entitlement[] = []

  const base = (code: ProductCode, expires: Date | null): Entitlement => ({
    user_id: event.userId,
    email: event.email,
    product_code: code,
    origem: 'compra',
    status: 'ativo',
    starts_at: iso(at),
    expires_at: expires ? iso(expires) : null,
    provider: event.provider,
    order_id: event.orderId,
    subscription_id: event.subscriptionId,
    grupo_id: null,
    ...(event.src ? { src: event.src } : {}),
  })

  switch (event.kind) {
    case 'approved': {
      if (product === 'fundador') {
        // Already lifetime: the yearly purchase adds nothing that expires.
        const lifetime = mine.some((e) => e.product_code === 'vitalicio' && isLive(e, now))
        out.push({ ...base('fundador', lifetime ? null : plus(at, FUNDADOR_DAYS)), preco_fundador: founderSeat })
      } else if (product === 'anual') {
        // The annual access after the Founder seats are gone: same journey, 365 days, no Founder price.
        out.push({ ...base('anual', plus(at, FUNDADOR_DAYS)), preco_fundador: false })
      } else if (product === 'mensal') {
        out.push(base('mensal', plus(at, MENSAL_DAYS)))
      } else if (product === 'vitalicio') {
        out.push(base('vitalicio', null))
        // The yearly access (and the audio bump that follows it) stops expiring.
        for (const e of mine)
          if ((e.product_code === 'fundador' || e.product_code === 'audio') && isLive(e, now) && e.expires_at !== null) out.push({ ...e, expires_at: null })
      } else if (product === 'audio') {
        out.push(base('audio', fullAccessExpiry(mine, now, at)))
      } else {
        // mapa-impresso, familia, estudos, igreja (igreja gets its group in Prompt 10).
        out.push(base(product, isChurchProduct(product) ? plus(at, FUNDADOR_DAYS) : null))
      }
      break
    }
    case 'renewed': {
      const current = ofSubscription.find((e) => e.product_code === product) ?? ofOrder.find((e) => e.product_code === product)
      const days = product === 'mensal' ? MENSAL_DAYS : FUNDADOR_DAYS
      if (current) {
        // After a failed charge the expiry was pushed by the tolerance: count from the paid period.
        const paidUntil = current.cobranca_falhou_em ? new Date(current.cobranca_falhou_em) : current.expires_at ? new Date(current.expires_at) : at
        const from = paidUntil > at ? paidUntil : at
        out.push({ ...current, status: 'ativo', expires_at: iso(plus(from, days)), cobranca_falhou_em: null })
      } else out.push(base(product, plus(at, days)))
      break
    }
    case 'charge_failed': {
      // Keep access for the tolerance days (from the failure), with a warning in the app.
      const hit = ofSubscription.length ? ofSubscription : ofOrder
      for (const e of hit) {
        if (e.status !== 'ativo') continue
        const until = plus(at, TOLERANCIA_DIAS)
        const keep = e.expires_at && new Date(e.expires_at) > until ? e.expires_at : iso(until)
        out.push({ ...e, cobranca_falhou_em: iso(at), expires_at: keep })
      }
      break
    }
    case 'refunded':
    case 'chargeback': {
      const hit = ofOrder.length ? ofOrder : ofSubscription
      for (const e of hit) out.push({ ...e, status: 'reembolsado', expires_at: iso(at < now ? at : now) })
      break
    }
    case 'canceled': {
      // Never paid: no access at all.
      for (const e of ofOrder) out.push({ ...e, status: 'cancelado', expires_at: iso(at) })
      break
    }
    case 'subscription_canceled': {
      // Access stays until the end of what was paid (expires_at unchanged).
      for (const e of ofSubscription.length ? ofSubscription : ofOrder) if (e.status === 'ativo') out.push({ ...e, status: 'cancelado' })
      break
    }
    case 'expired': {
      for (const e of ofOrder) out.push({ ...e, status: 'expirado' })
      break
    }
  }
  return out
}

/** Latest expiry among the buyer's full-access entitlements (null = lifetime); 365 days if none. */
function fullAccessExpiry(mine: Entitlement[], now: Date, at: Date): Date | null {
  const live = mine.filter((e) => FULL_ACCESS.includes(e.product_code) && isLive(e, now))
  if (live.some((e) => e.expires_at === null)) return null
  const latest = live.reduce<number>((m, e) => Math.max(m, new Date(e.expires_at!).getTime()), 0)
  return latest ? new Date(latest) : plus(at, FUNDADOR_DAYS)
}

/** Stable key of an entitlement row (matches the unique index in the database). */
export const entitlementKey = (e: Pick<Entitlement, 'provider' | 'order_id' | 'product_code'>) => `${e.provider}:${e.order_id}:${e.product_code}`

/** Merges upserts into a list by key (what the database does; used by the dev simulator and tests). */
export function mergeEntitlements(list: Entitlement[], upserts: Entitlement[]): Entitlement[] {
  const map = new Map(list.map((e) => [entitlementKey(e), e]))
  for (const u of upserts) map.set(entitlementKey(u), u)
  return [...map.values()]
}
