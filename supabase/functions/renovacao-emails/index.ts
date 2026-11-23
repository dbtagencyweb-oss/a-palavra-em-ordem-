// Supabase Edge Function (Deno): renewal reminders by e-mail, 15 and 3 days before the annual
// access ends (no automatic charge: the person decides). Runs once a day (pg_cron, see
// docs/04-conta-e-venda.md). Rules in ../_shared/logic-renewal.ts; each e-mail is sent once per
// access and mark (table renovacao_avisos).
// Deploy:  npm run config:sync && npx supabase functions deploy renovacao-emails
// Secrets: npx supabase secrets set RESEND_API_KEY=... EMAIL_FROM="A Palavra em Ordem <ola@seudominio>"
//          and, while config/checkout.json has no renewal links: FUNDADOR_CHECKOUT_URL=... ANUAL_CHECKOUT_URL=...
import { createClient } from 'npm:@supabase/supabase-js@2'
import checkout from '../_shared/checkout.json' with { type: 'json' }
import oferta from '../_shared/oferta.json' with { type: 'json' }
import type { Entitlement } from '../_shared/logic-access.ts'
import { renewalEmail, renewalsDue } from '../_shared/logic-renewal.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? ''
const LINK_FUNDADOR = checkout.renovacaoFundador || Deno.env.get('FUNDADOR_CHECKOUT_URL') || ''
const LINK_ANUAL = checkout.renovacaoAnual || Deno.env.get('ANUAL_CHECKOUT_URL') || ''

async function send(to: string, mail: { subject: string; text: string; html: string }): Promise<string | null> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject: mail.subject, text: mail.text, html: mail.html }),
  })
  return res.ok ? null : `${res.status} ${await res.text()}`
}

Deno.serve(async (req) => {
  // Only the scheduler (service role) may run it.
  if (req.headers.get('authorization') !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) return new Response('unauthorized', { status: 401 })
  if (!RESEND_API_KEY || !EMAIL_FROM) return new Response('e-mail não configurado (RESEND_API_KEY, EMAIL_FROM)', { status: 500 })

  // Annual accesses ending within the largest mark (plus the person's other accesses, to skip those
  // already renewed or lifetime).
  const horizon = new Date(Date.now() + 16 * 86_400_000).toISOString()
  const { data: ending, error } = await admin
    .from('entitlements')
    .select('email')
    .in('product_code', ['fundador', 'anual'])
    .eq('origem', 'compra')
    .eq('status', 'ativo')
    .not('expires_at', 'is', null)
    .lte('expires_at', horizon)
  if (error) return new Response(`leitura falhou: ${error.message}`, { status: 500 })
  const emails = [...new Set((ending ?? []).map((r) => (r.email as string).toLowerCase()))]
  if (!emails.length) return Response.json({ ok: true, enviados: 0 })

  const { data: rows, error: rowsError } = await admin.from('entitlements').select('*').in('email', emails)
  if (rowsError) return new Response(`leitura falhou: ${rowsError.message}`, { status: 500 })
  const { data: sentRows } = await admin.from('renovacao_avisos').select('entitlement_id, marco').in('entitlement_id', (rows ?? []).map((r) => r.id))
  const sent = new Set((sentRows ?? []).map((s) => `${s.entitlement_id}:${s.marco}`))

  const due = renewalsDue((rows ?? []) as (Entitlement & { id: string })[], sent)
  let enviados = 0
  const falhas: string[] = []
  for (const d of due) {
    const link = d.founderSeat ? LINK_FUNDADOR : LINK_ANUAL
    if (!link) {
      falhas.push(`${d.entitlementId}: sem link de renovação`)
      continue
    }
    const err = await send(d.email, renewalEmail(d, link, d.founderSeat ? oferta.fundadorPreco : oferta.precoApos))
    if (err) {
      falhas.push(`${d.entitlementId}: ${err}`)
      continue
    }
    await admin.from('renovacao_avisos').insert({ entitlement_id: d.entitlementId, marco: d.mark })
    enviados++
  }
  return Response.json({ ok: falhas.length === 0, enviados, falhas })
})
