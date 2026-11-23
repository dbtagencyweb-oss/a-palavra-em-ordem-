// SUBSTITUÍDA pela função `pagamento` (Hotmart e Kiwify, todos os produtos; docs/07, Prompt 1).
// Mantida só até a nova estar publicada; depois pode ser apagada.
// Supabase Edge Function (Deno): receives Hotmart purchase events and grants/revokes Founder Access.
// Deploy:  supabase functions deploy hotmart-webhook --no-verify-jwt
// Secrets: supabase secrets set HOTMART_HOTTOK=... HOTMART_PRODUCT_ID=...
// See docs/04-conta-e-venda.md.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleHotmartEvent, tokensMatch } from './logic.ts'

const HOTTOK = Deno.env.get('HOTMART_HOTTOK') ?? ''
const PRODUCT_ID = Deno.env.get('HOTMART_PRODUCT_ID') ?? ''

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
  if (!tokensMatch(req.headers.get('x-hotmart-hottok'), HOTTOK)) return new Response('unauthorized', { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response('bad json', { status: 400 })
  }

  const result = handleHotmartEvent(body, { productId: PRODUCT_ID })
  // Anything we don't handle still gets 200, so Hotmart doesn't keep retrying it.
  if (result.action === 'ignore') return Response.json({ ok: true, ignored: result.reason })

  const row = result.row
  // A refund or cancel event must not erase the link made at approval time.
  const { user_id, ...rest } = row
  const payload = user_id ? row : rest
  const { error } = await admin.from('subscriptions').upsert(payload, { onConflict: 'provider_transaction' })
  if (error) {
    console.error('subscriptions upsert failed', error)
    return new Response('db error', { status: 500 }) // Hotmart retries later
  }
  return Response.json({ ok: true, status: row.status })
})
