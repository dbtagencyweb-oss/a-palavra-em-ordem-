import { describe, expect, it } from 'vitest'
import configApp from '../../../config/produtos-plataforma.json?raw'
import configFn from './produtos-plataforma.json?raw'
import {
  applyPayment,
  FUNDADOR_DAYS,
  isLive,
  kiwifySignatureOk,
  MENSAL_DAYS,
  mergeEntitlements,
  parseHotmart,
  parseKiwify,
  productFor,
  type Entitlement,
  type PaymentEvent,
  type PlatformMap,
  type ProductCode,
} from './logic-access'

const DAY = 86_400_000
const T0 = new Date('2026-12-01T12:00:00Z')
const email = 'ana@exemplo.com'

const map: PlatformMap = {
  hotmart: { produtos: { '111': 'fundador', '222': 'mapa-impresso', '333': 'vitalicio', '444': 'audio', '555': 'familia' }, ofertas: { MENSAL1: 'mensal' } },
  kiwify: { produtos: { 'kw-fund': 'fundador', 'kw-mensal': 'mensal' } },
}

function hotmart(event: string, productId: string, over: { transaction?: string; offer?: string; sub?: string; recurrence?: number; at?: Date; xcod?: string } = {}) {
  return {
    event,
    version: '2.0.0',
    data: {
      product: { id: Number(productId) || productId },
      buyer: { email: 'Ana@Exemplo.com ' },
      purchase: {
        transaction: over.transaction ?? `HP-${productId}`,
        approved_date: (over.at ?? T0).getTime(),
        recurrence_number: over.recurrence,
        offer: over.offer ? { code: over.offer } : undefined,
        origin: over.xcod ? { xcod: over.xcod } : undefined,
      },
      subscription: over.sub ? { subscriber: { code: over.sub } } : undefined,
    },
  }
}

/** Runs a payload through parse → map → apply and returns the merged list. */
function deliver(list: Entitlement[], body: unknown, provider: 'hotmart' | 'kiwify' = 'hotmart', now = T0) {
  const parsed = provider === 'hotmart' ? parseHotmart(body) : parseKiwify(body)
  if (!parsed.ok) throw new Error(parsed.reason)
  const product = productFor(parsed.event, map)
  if (!product) throw new Error('sem mapeamento')
  return mergeEntitlements(list, applyPayment(parsed.event, product, list, now))
}

const find = (list: Entitlement[], code: ProductCode) => list.find((e) => e.product_code === code)!
const live = (list: Entitlement[], code: ProductCode, now = T0) => list.some((e) => e.product_code === code && isLive(e, now))

describe('parseHotmart', () => {
  it('normalizes an approved purchase', () => {
    const r = parseHotmart(hotmart('PURCHASE_APPROVED', '111', { xcod: '0b6f1a2e-1111-4222-8333-944455556666' }))
    expect(r.ok && r.event).toMatchObject({ kind: 'approved', email, orderId: 'HP-111', platformProductId: '111', userId: '0b6f1a2e-1111-4222-8333-944455556666' })
  })
  it('treats a later subscription charge as a renewal', () => {
    const r = parseHotmart(hotmart('PURCHASE_APPROVED', '111', { offer: 'MENSAL1', sub: 'S1', recurrence: 2 }))
    expect(r.ok && r.event.kind).toBe('renewed')
  })
  it('ignores events it does not handle', () => {
    expect(parseHotmart({ event: 'CLUB_FIRST_ACCESS' }).ok).toBe(false)
  })
})

describe('parseKiwify', () => {
  it('normalizes an approved order and a renewal', () => {
    const base = { order_id: 'K1', Product: { product_id: 'kw-mensal' }, Customer: { email }, Subscription: { id: 'SUB9' }, approved_date: T0.toISOString() }
    const a = parseKiwify({ ...base, webhook_event_type: 'order_approved' })
    const r = parseKiwify({ ...base, webhook_event_type: 'subscription_renewed' })
    expect(a.ok && a.event).toMatchObject({ provider: 'kiwify', kind: 'approved', subscriptionId: 'SUB9' })
    expect(r.ok && r.event.kind).toBe('renewed')
  })
  it('checks the HMAC-SHA1 signature of the raw body', async () => {
    const raw = JSON.stringify({ order_id: 'K1' })
    // HMAC-SHA1(raw, 'segredo'), computed with Node's crypto.
    const sig = '75bfd1ccb6c47e59970e7c47bb55d40cc27dbe53'
    expect(await kiwifySignatureOk(raw, sig, 'segredo')).toBe(true)
    expect(await kiwifySignatureOk(raw, sig, 'outro')).toBe(false)
    expect(await kiwifySignatureOk(raw + ' ', sig, 'segredo')).toBe(false)
  })
})

describe('productFor', () => {
  it('prefers the offer code over the product id', () => {
    const ev = { provider: 'hotmart', platformProductId: '111', offerCode: 'MENSAL1' } as PaymentEvent
    expect(productFor(ev, map)).toBe('mensal')
    expect(productFor({ ...ev, offerCode: 'OUTRA' }, map)).toBe('fundador')
    expect(productFor({ ...ev, platformProductId: '999', offerCode: null }, map)).toBeNull()
  })
})

describe('applyPayment', () => {
  it('fundador lasts 365 days', () => {
    const l = deliver([], hotmart('PURCHASE_APPROVED', '111'))
    expect(find(l, 'fundador').expires_at).toBe(new Date(T0.getTime() + FUNDADOR_DAYS * DAY).toISOString())
    expect(live(l, 'fundador')).toBe(true)
  })

  it('bumps never expire; audio follows the fundador', () => {
    let l = deliver([], hotmart('PURCHASE_APPROVED', '111'))
    l = deliver(l, hotmart('PURCHASE_APPROVED', '222'))
    l = deliver(l, hotmart('PURCHASE_APPROVED', '444'))
    expect(find(l, 'mapa-impresso').expires_at).toBeNull()
    expect(find(l, 'audio').expires_at).toBe(find(l, 'fundador').expires_at)
  })

  it('vitalicio removes the expiry of the fundador (and of audio)', () => {
    let l = deliver([], hotmart('PURCHASE_APPROVED', '111'))
    l = deliver(l, hotmart('PURCHASE_APPROVED', '444'))
    l = deliver(l, hotmart('PURCHASE_APPROVED', '333'))
    expect(find(l, 'vitalicio').expires_at).toBeNull()
    expect(find(l, 'fundador').expires_at).toBeNull()
    expect(find(l, 'audio').expires_at).toBeNull()
  })

  it('refund and chargeback remove access at once', () => {
    let l = deliver([], hotmart('PURCHASE_APPROVED', '111'))
    l = deliver(l, hotmart('PURCHASE_REFUNDED', '111'))
    expect(find(l, 'fundador').status).toBe('reembolsado')
    expect(live(l, 'fundador')).toBe(false)
    let c = deliver([], hotmart('PURCHASE_APPROVED', '222'))
    c = deliver(c, hotmart('PURCHASE_CHARGEBACK', '222'))
    expect(live(c, 'mapa-impresso')).toBe(false)
  })

  it('an unpaid canceled purchase gives no access', () => {
    const l = deliver([], hotmart('PURCHASE_CANCELED', '111'))
    expect(l).toHaveLength(0)
  })

  it('mensal: 31 days, extended on each renewal, kept until the end after canceling', () => {
    const k = (type: string, at: Date, order = 'K1') => ({
      order_id: order,
      webhook_event_type: type,
      approved_date: at.toISOString(),
      Product: { product_id: 'kw-mensal' },
      Customer: { email },
      Subscription: { id: 'SUB9' },
    })
    let l = deliver([], k('order_approved', T0), 'kiwify')
    const first = new Date(T0.getTime() + MENSAL_DAYS * DAY)
    expect(find(l, 'mensal').expires_at).toBe(first.toISOString())

    const renewAt = new Date(T0.getTime() + 30 * DAY)
    l = deliver(l, k('subscription_renewed', renewAt, 'K2'), 'kiwify', renewAt)
    expect(l.filter((e) => e.product_code === 'mensal')).toHaveLength(1)
    expect(find(l, 'mensal').expires_at).toBe(new Date(first.getTime() + MENSAL_DAYS * DAY).toISOString())

    const cancelAt = new Date(T0.getTime() + 40 * DAY)
    l = deliver(l, k('subscription_canceled', cancelAt, 'K3'), 'kiwify', cancelAt)
    expect(find(l, 'mensal').status).toBe('cancelado')
    expect(live(l, 'mensal', cancelAt)).toBe(true) // still paid
    expect(live(l, 'mensal', new Date(T0.getTime() + 63 * DAY))).toBe(false) // after the paid period
  })

  it('links by account id when the checkout carried it', () => {
    const uid = '0b6f1a2e-1111-4222-8333-944455556666'
    const l = deliver([], hotmart('PURCHASE_APPROVED', '111', { xcod: uid }))
    expect(find(l, 'fundador').user_id).toBe(uid)
  })
})

describe('config/produtos-plataforma.json', () => {
  it('is the same file the payment function reads (run npm run config:sync after editing)', () => {
    expect(configFn).toBe(configApp)
  })
  it('only maps to known product codes', () => {
    const cfg = JSON.parse(configApp) as PlatformMap & { nota?: string }
    const codes = ['hotmart', 'kiwify'].flatMap((p) => Object.values({ ...cfg[p as 'hotmart']?.produtos, ...cfg[p as 'hotmart']?.ofertas }))
    const ev = (code: string) => productFor({ provider: 'hotmart', platformProductId: 'x', offerCode: null } as PaymentEvent, { hotmart: { produtos: { x: code } } })
    for (const c of codes) expect(ev(c)).toBe(c)
  })
})

describe('mensal: failed charge (Prompt 7)', () => {
  const k = (type: string, at: Date, order: string) => ({
    order_id: order,
    webhook_event_type: type,
    approved_date: at.toISOString(),
    Product: { product_id: 'kw-mensal' },
    Customer: { email },
    Subscription: { id: 'SUB9' },
  })
  it('keeps access 3 days after the failure, then blocks', () => {
    let l = deliver([], k('order_approved', T0, 'K1'), 'kiwify')
    const end = new Date(T0.getTime() + MENSAL_DAYS * DAY)
    l = deliver(l, k('subscription_late', end, 'K2'), 'kiwify', end)
    const m = l.find((e) => e.product_code === 'mensal')!
    expect(m.cobranca_falhou_em).toBe(end.toISOString())
    expect(m.expires_at).toBe(new Date(end.getTime() + 3 * DAY).toISOString())
    expect(isLive(m, new Date(end.getTime() + 2 * DAY))).toBe(true)
    expect(isLive(m, new Date(end.getTime() + 4 * DAY))).toBe(false)
  })
  it('a charge that goes through clears the warning and counts from the paid period', () => {
    let l = deliver([], k('order_approved', T0, 'K1'), 'kiwify')
    const end = new Date(T0.getTime() + MENSAL_DAYS * DAY)
    l = deliver(l, k('subscription_late', end, 'K2'), 'kiwify', end)
    const paid = new Date(end.getTime() + DAY)
    l = deliver(l, k('subscription_renewed', paid, 'K3'), 'kiwify', paid)
    const m = l.find((e) => e.product_code === 'mensal')!
    expect(m.cobranca_falhou_em).toBeNull()
    expect(m.expires_at).toBe(new Date(paid.getTime() + MENSAL_DAYS * DAY).toISOString())
  })
  it('Hotmart reports it as PURCHASE_DELAYED', () => {
    const r = parseHotmart(hotmart('PURCHASE_DELAYED', '111', { offer: 'MENSAL1', sub: 'S1' }))
    expect(r.ok && r.event.kind).toBe('charge_failed')
  })
})
