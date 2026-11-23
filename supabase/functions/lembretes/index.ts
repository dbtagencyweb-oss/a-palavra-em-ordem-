// Supabase Edge Function (Deno): retention messages by Web Push (docs/07, Prompt 11).
// Runs every 15 minutes (pg_cron, see docs/04 section 11). For each person with reminders on, it
// takes the state the app saved (reminder_state), the person's local date and time (their time
// zone), picks the message with the same rules as the app (_shared/logic-reminders.ts) and sends it
// to each of their devices. Subscriptions the browser has dropped (404/410) are removed.
// Deploy:  npx supabase functions deploy lembretes
// Secrets: npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:...
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { markSent, pickReminder, type ReminderState } from '../_shared/logic-reminders.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@example.com', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

/** Local date (YYYY-MM-DD) and time (HH:MM) in a time zone. */
function localNow(tz: string, now = new Date()): { today: string; hhmm: string } {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  } catch {
    return localNow('America/Sao_Paulo', now)
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return { today: `${get('year')}-${get('month')}-${get('day')}`, hhmm: `${get('hour')}:${get('minute')}` }
}

Deno.serve(async (req) => {
  // Only the scheduler (service role) may run it.
  if (req.headers.get('authorization') !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) return new Response('unauthorized', { status: 401 })

  const { data: rows, error } = await admin.from('reminder_state').select('user_id, state, tz').eq('state->>enabled', 'true')
  if (error) return new Response(error.message, { status: 500 })

  let sent = 0
  for (const row of rows ?? []) {
    const state = row.state as ReminderState
    if (!state?.week) continue
    const { today, hhmm } = localNow(row.tz)
    const msg = pickReminder(state, today, hhmm)
    if (!msg) continue
    const { data: subs } = await admin.from('push_subscriptions').select('endpoint, keys').eq('user_id', row.user_id)
    let delivered = false
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(msg), { TTL: 6 * 60 * 60 })
        delivered = true
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      }
    }
    if (delivered) {
      await admin.from('reminder_state').update({ state: markSent(state, msg, today), updated_at: new Date().toISOString() }).eq('user_id', row.user_id)
      sent++
    }
  }
  return Response.json({ ok: true, enviados: sent })
})
