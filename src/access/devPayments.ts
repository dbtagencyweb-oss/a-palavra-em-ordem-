// Development only: a stand-in for the payment platforms and the database, so the whole access
// flow can be tried without Supabase. Builds real-shaped Hotmart/Kiwify payloads, runs them
// through the same logic as the server (parse → product mapping → applyPayment) and keeps the
// resulting entitlements in localStorage.
import {
  applyPayment,
  mergeEntitlements,
  parseHotmart,
  parseKiwify,
  productFor,
  type Entitlement,
  type PlatformMap,
} from '../../supabase/functions/_shared/logic-access'

const KEY = 'pao:dev-entitlements'
const LOG_KEY = 'pao:dev-webhook-log'
export const DEV_EMAIL = 'voce@exemplo.dev'

/** Fake platform ids for the simulator (the real ones live in config/produtos-plataforma.json). */
export const DEV_MAP: PlatformMap = {
  hotmart: {
    produtos: { 'DEV-FUNDADOR': 'fundador', 'DEV-MAPA': 'mapa-impresso', 'DEV-FAMILIA': 'familia', 'DEV-VITALICIO': 'vitalicio', 'DEV-AUDIO': 'audio', 'DEV-ESTUDO-ROMANOS': 'estudo-romanos', 'DEV-ESTUDO-SALMOS': 'estudo-salmos', 'DEV-ESTUDO-APOCALIPSE': 'estudo-apocalipse', 'DEV-IGREJA': 'igreja', 'DEV-IGREJA-100': 'igreja-100' },
    ofertas: { 'DEV-OFERTA-MENSAL': 'mensal', 'DEV-OFERTA-ROMANOS-FUNDADOR': 'estudo-romanos' },
  },
  kiwify: { produtos: { 'DEV-MENSAL': 'mensal' } },
}

const listeners = new Set<() => void>()
let cache: Entitlement[] | null = null

export function readDevEntitlements(): Entitlement[] {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Entitlement[]
  } catch {
    cache = []
  }
  return cache
}

function write(list: Entitlement[]) {
  cache = list
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn())
}

export function subscribeDevEntitlements(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** An entitlement that doesn't come from a payment (e.g. joining a church group in the simulator). */
export function addDevEntitlement(e: Pick<Entitlement, 'product_code' | 'origem' | 'grupo_id'>) {
  const row: Entitlement = { ...e, user_id: null, email: DEV_EMAIL, status: 'ativo', starts_at: new Date().toISOString(), expires_at: null, provider: 'dev', order_id: `dev-${e.origem}-${e.grupo_id}`, subscription_id: null }
  write(mergeEntitlements(readDevEntitlements(), [row]))
}

export function resetDevEntitlements() {
  write([])
  try {
    localStorage.removeItem(LOG_KEY)
  } catch {
    /* ignore */
  }
}

export function devWebhookLog(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function log(line: string) {
  try {
    const all = [line, ...devWebhookLog()].slice(0, 30)
    localStorage.setItem(LOG_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

/** Runs one platform payload through the server logic and stores the result. Returns a short summary. */
export function deliverDevWebhook(plataforma: 'hotmart' | 'kiwify', body: unknown, now = new Date()): string {
  const parsed = plataforma === 'hotmart' ? parseHotmart(body) : parseKiwify(body)
  if (!parsed.ok) {
    log(`ignorado · ${parsed.reason}`)
    return parsed.reason
  }
  const product = productFor(parsed.event, DEV_MAP)
  if (!product) {
    log(`sem mapeamento · ${parsed.event.platformProductId}`)
    return 'produto sem mapeamento'
  }
  const rows = applyPayment(parsed.event, product, readDevEntitlements(), now)
  write(mergeEntitlements(readDevEntitlements(), rows))
  const summary = `${plataforma} ${parsed.event.kind} ${product} → ${rows.map((r) => `${r.product_code}:${r.status}`).join(', ') || 'nada a mudar'}`
  log(summary)
  return summary
}

// ---------- Payload builders (shapes from each platform's docs) ----------

let seq = 0
const tx = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`

export function hotmartPurchase(productId: string, opts: { event?: string; transaction?: string; offer?: string; subscriber?: string; recurrence?: number; at?: Date } = {}) {
  const at = (opts.at ?? new Date()).getTime()
  return {
    id: tx('evt'),
    event: opts.event ?? 'PURCHASE_APPROVED',
    version: '2.0.0',
    creation_date: at,
    data: {
      product: { id: productId },
      buyer: { email: DEV_EMAIL },
      purchase: {
        transaction: opts.transaction ?? tx('HP'),
        approved_date: at,
        recurrence_number: opts.recurrence,
        offer: opts.offer ? { code: opts.offer } : undefined,
      },
      subscription: opts.subscriber ? { subscriber: { code: opts.subscriber } } : undefined,
    },
  }
}

export function kiwifyEvent(type: string, productId: string, opts: { orderId?: string; subscriptionId?: string; at?: Date } = {}) {
  return {
    order_id: opts.orderId ?? tx('KW'),
    webhook_event_type: type,
    approved_date: (opts.at ?? new Date()).toISOString(),
    Product: { product_id: productId },
    Customer: { email: DEV_EMAIL },
    Subscription: opts.subscriptionId ? { id: opts.subscriptionId } : undefined,
  }
}

// ---------- The simulator's buttons ----------

const SUB = 'DEV-ASSINATURA-1'
const lastOrder = (code: string) =>
  readDevEntitlements()
    .filter((e) => e.product_code === code && e.provider === 'hotmart')
    .at(-1)?.order_id

/** One button per webhook type, as listed in docs/07 (Prompt 1, item 7). */
export const DEV_PAYMENTS: { label: string; run(): string }[] = [
  { label: 'Compra: Acesso Fundador', run: () => deliverDevWebhook('hotmart', hotmartPurchase('DEV-FUNDADOR')) },
  { label: 'Bump: Mapa para imprimir', run: () => deliverDevWebhook('hotmart', hotmartPurchase('DEV-MAPA')) },
  { label: 'Bump: Acesso Família', run: () => deliverDevWebhook('hotmart', hotmartPurchase('DEV-FAMILIA')) },
  { label: 'Upsell: Vitalício', run: () => deliverDevWebhook('hotmart', hotmartPurchase('DEV-VITALICIO')) },
  { label: 'Bump: Modo Áudio', run: () => deliverDevWebhook('hotmart', hotmartPurchase('DEV-AUDIO')) },
  { label: 'Estudo: Romanos (preço de Fundador)', run: () => deliverDevWebhook('hotmart', hotmartPurchase('DEV-ESTUDO-ROMANOS', { offer: 'DEV-OFERTA-ROMANOS-FUNDADOR' })) },
  { label: 'Estudo: Salmos', run: () => deliverDevWebhook('hotmart', hotmartPurchase('DEV-ESTUDO-SALMOS')) },
  { label: 'Licença Igreja (30 vagas)', run: () => deliverDevWebhook('hotmart', hotmartPurchase('DEV-IGREJA')) },
  { label: 'Licença Igreja (100 vagas)', run: () => deliverDevWebhook('hotmart', hotmartPurchase('DEV-IGREJA-100')) },
  {
    label: 'Reembolso do Fundador',
    run: () => {
      const order = lastOrder('fundador')
      return order ? deliverDevWebhook('hotmart', hotmartPurchase('DEV-FUNDADOR', { event: 'PURCHASE_REFUNDED', transaction: order })) : 'nenhuma compra de Fundador'
    },
  },
  { label: 'Mensal: assinatura', run: () => deliverDevWebhook('kiwify', kiwifyEvent('order_approved', 'DEV-MENSAL', { subscriptionId: SUB })) },
  { label: 'Mensal: renovação', run: () => deliverDevWebhook('kiwify', kiwifyEvent('subscription_renewed', 'DEV-MENSAL', { subscriptionId: SUB })) },
  { label: 'Mensal: cancelamento', run: () => deliverDevWebhook('kiwify', kiwifyEvent('subscription_canceled', 'DEV-MENSAL', { subscriptionId: SUB })) },
  { label: 'Mensal: cobrança falhou', run: () => deliverDevWebhook('kiwify', kiwifyEvent('subscription_late', 'DEV-MENSAL', { subscriptionId: SUB })) },
  {
    label: 'Mensal há 2 meses',
    run: () => {
      const ago = (d: number) => new Date(Date.now() - d * 86_400_000)
      deliverDevWebhook('kiwify', kiwifyEvent('order_approved', 'DEV-MENSAL', { subscriptionId: SUB, at: ago(62) }))
      deliverDevWebhook('kiwify', kiwifyEvent('subscription_renewed', 'DEV-MENSAL', { subscriptionId: SUB, at: ago(31) }))
      return deliverDevWebhook('kiwify', kiwifyEvent('subscription_renewed', 'DEV-MENSAL', { subscriptionId: SUB }))
    },
  },
  {
    label: 'Fundador perto de vencer',
    run: () => deliverDevWebhook('hotmart', hotmartPurchase('DEV-FUNDADOR', { at: new Date(Date.now() - 340 * 86_400_000) })),
  },
]
