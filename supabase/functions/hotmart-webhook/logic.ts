// Pure Hotmart webhook (postback v2.0.0) handling. No Deno or Node APIs, so it's unit-tested with Vitest.

export type SubscriptionStatus = 'active' | 'canceled' | 'refunded' | 'chargeback' | 'disputed' | 'expired'

export interface SubscriptionRow {
  email: string
  user_id: string | null
  product: 'fundador'
  provider: 'hotmart'
  provider_transaction: string
  status: SubscriptionStatus
  purchased_at: string | null
  expires_at: string | null
  raw: unknown
  updated_at: string
}

export type WebhookResult =
  | { action: 'upsert'; row: SubscriptionRow }
  | { action: 'ignore'; reason: string }

const EVENT_STATUS: Record<string, SubscriptionStatus> = {
  PURCHASE_APPROVED: 'active',
  PURCHASE_COMPLETE: 'active',
  PURCHASE_CANCELED: 'canceled',
  PURCHASE_REFUNDED: 'refunded',
  PURCHASE_CHARGEBACK: 'chargeback',
  PURCHASE_PROTEST: 'disputed',
  PURCHASE_EXPIRED: 'expired',
}

/** Founder Access lasts one year from approval (R$ 47/ano). */
export const ACCESS_DAYS = 365

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface HotmartPayload {
  event?: string
  data?: {
    product?: { id?: number | string }
    buyer?: { email?: string }
    purchase?: {
      transaction?: string
      approved_date?: number
      order_date?: number
      origin?: { xcod?: string; sck?: string }
    }
  }
}

/** Constant-time comparison for the X-HOTMART-HOTTOK header. */
export function tokensMatch(given: string | null, expected: string): boolean {
  if (!given || !expected || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export function handleHotmartEvent(body: unknown, opts: { productId: string; now?: Date }): WebhookResult {
  const p = (body ?? {}) as HotmartPayload
  const status = p.event ? EVENT_STATUS[p.event] : undefined
  if (!status) return { action: 'ignore', reason: `event ${p.event ?? '(none)'}` }

  const productId = p.data?.product?.id
  if (String(productId ?? '') !== opts.productId) return { action: 'ignore', reason: `product ${productId}` }

  const email = p.data?.buyer?.email?.trim().toLowerCase()
  const transaction = p.data?.purchase?.transaction
  if (!email || !transaction) return { action: 'ignore', reason: 'missing buyer email or transaction' }

  // The app sends the account id as `xcod` in the checkout link, so the purchase links even with another e-mail.
  const xcod = p.data?.purchase?.origin?.xcod
  const userId = xcod && UUID_RE.test(xcod) ? xcod : null

  const approvedMs = p.data?.purchase?.approved_date ?? p.data?.purchase?.order_date ?? null
  const purchasedAt = approvedMs ? new Date(approvedMs) : null
  const expiresAt = status === 'active' && purchasedAt ? new Date(purchasedAt.getTime() + ACCESS_DAYS * 86_400_000) : null

  return {
    action: 'upsert',
    row: {
      email,
      user_id: userId,
      product: 'fundador',
      provider: 'hotmart',
      provider_transaction: transaction,
      status,
      purchased_at: purchasedAt?.toISOString() ?? null,
      expires_at: expiresAt?.toISOString() ?? null,
      raw: body,
      updated_at: (opts.now ?? new Date()).toISOString(),
    },
  }
}
