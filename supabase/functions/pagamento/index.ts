// Supabase Edge Function (Deno): payment webhook for Hotmart and Kiwify → entitlements.
// URL: https://SEU-PROJETO.supabase.co/functions/v1/pagamento?plataforma=hotmart  (or =kiwify)
// Deploy:  npm run config:sync && npx supabase functions deploy pagamento --no-verify-jwt
// Secrets: npx supabase secrets set HOTMART_HOTTOK=... KIWIFY_TOKEN=...
// Product ids: config/produtos-plataforma.json (copied to ../_shared by `npm run config:sync`).
// See docs/04-conta-e-venda.md.
import { createClient } from 'npm:@supabase/supabase-js@2'
import map from '../_shared/produtos-plataforma.json' with { type: 'json' }
import oferta from '../_shared/oferta.json' with { type: 'json' }
import {
  applyPayment,
  founderSeatFor,
  kiwifySignatureOk,
  parseHotmart,
  parseKiwify,
  productFor,
  tokensMatch,
  type Entitlement,
  type ParseResult,
  type PlatformMap,
} from '../_shared/logic-access.ts'

const HOTMART_HOTTOK = Deno.env.get('HOTMART_HOTTOK') ?? ''
const KIWIFY_TOKEN = Deno.env.get('KIWIFY_TOKEN') ?? ''

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

async function log(provider: string, event: string | null, ok: boolean, detail: string, payload: unknown) {
  const { error } = await admin.from('webhook_log').insert({ provider, event, ok, detail, payload })
  if (error) console.error('webhook_log insert failed', error)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
  const url = new URL(req.url)
  const plataforma = url.searchParams.get('plataforma')
  const raw = await req.text()
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    await log(plataforma ?? '?', null, false, 'json inválido', { raw: raw.slice(0, 2000) })
    return new Response('bad json', { status: 400 })
  }

  // Authenticity: each platform's own check.
  let parsed: ParseResult
  if (plataforma === 'hotmart') {
    if (!tokensMatch(req.headers.get('x-hotmart-hottok'), HOTMART_HOTTOK)) {
      await log('hotmart', null, false, 'hottok inválido', body)
      return new Response('unauthorized', { status: 401 })
    }
    parsed = parseHotmart(body)
  } else if (plataforma === 'kiwify') {
    if (!(await kiwifySignatureOk(raw, url.searchParams.get('signature'), KIWIFY_TOKEN))) {
      await log('kiwify', null, false, 'assinatura inválida', body)
      return new Response('unauthorized', { status: 401 })
    }
    parsed = parseKiwify(body)
  } else {
    return new Response('plataforma desconhecida', { status: 400 })
  }

  // Anything not handled still gets 200, so the platform doesn't keep retrying it.
  if (!parsed.ok) {
    await log(plataforma, null, true, parsed.reason, body)
    return Response.json({ ok: true, ignorado: parsed.reason })
  }
  const ev = parsed.event
  const product = productFor(ev, map as PlatformMap)
  if (!product) {
    const reason = `produto/oferta sem mapeamento: ${ev.platformProductId} / ${ev.offerCode ?? '-'}`
    await log(plataforma, ev.kind, true, reason, body)
    return Response.json({ ok: true, ignorado: reason })
  }

  // The buyer's current entitlements (by e-mail and, when present, by account).
  const filter = ev.userId ? `email.eq.${ev.email},user_id.eq.${ev.userId}` : `email.eq.${ev.email}`
  const { data: existing, error: readError } = await admin.from('entitlements').select('*').or(filter)
  if (readError) {
    await log(plataforma, ev.kind, false, `leitura falhou: ${readError.message}`, body)
    return new Response('db error', { status: 500 }) // the platform retries later
  }

  // Founder seats (content/oferta.json): a new Founder purchase gets a seat only while there is one.
  // Past the limit it still gives access (it was paid), as annual access without the Founder price,
  // and goes to the safety queue for someone to review.
  let seat = true
  if (product === 'fundador' && ev.kind === 'approved') {
    const { data: sold, error: countError } = await admin.rpc('fundadores_vendidos')
    if (countError) {
      await log(plataforma, ev.kind, false, `contagem de fundadores falhou: ${countError.message}`, body)
      return new Response('db error', { status: 500 }) // retried later; never guess the count
    }
    seat = founderSeatFor((existing ?? []) as Entitlement[], Number(sold), oferta.fundadorLimite)
    if (!seat) {
      const { error: queueError } = await admin
        .from('fundador_excedentes')
        .upsert({ email: ev.email, provider: ev.provider, order_id: ev.orderId, vendidos: Number(sold), limite: oferta.fundadorLimite }, { onConflict: 'provider,order_id' })
      if (queueError) await log(plataforma, ev.kind, false, `fila de excedentes falhou: ${queueError.message}`, body)
    }
  }

  const rows = applyPayment(ev, product, (existing ?? []) as Entitlement[], new Date(), seat)
  for (const row of rows) {
    // A refund or renewal must not erase the account link made earlier.
    const { user_id, ...rest } = row
    const payload = { ...(user_id ? row : rest), updated_at: new Date().toISOString() }
    const { error } = await admin.from('entitlements').upsert(payload, { onConflict: 'provider,order_id,product_code' })
    if (error) {
      await log(plataforma, ev.kind, false, `gravação falhou: ${error.message}`, body)
      return new Response('db error', { status: 500 })
    }
  }
  await log(plataforma, ev.kind, true, `${product}: ${rows.map((r) => `${r.product_code}=${r.status}`).join(', ') || 'nada a mudar'}`, body)
  return Response.json({ ok: true, produto: product, linhas: rows.length })
})
