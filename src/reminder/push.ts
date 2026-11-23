// Web Push (docs/07, Prompt 11): with an account, the app saves its reminder state and this
// device's push subscription in Supabase. The `lembretes` function (supabase/functions/lembretes)
// runs every 15 minutes, picks the message with the same rules as the app and sends it, so it
// arrives even with the app closed (Android, and iPhone with the app on the home screen).
// Needs VITE_VAPID_PUBLIC_KEY (see docs/04, section 11). Without it, only local delivery is used.
import type { ReminderState } from '../../supabase/functions/_shared/logic-reminders'
import { getSupabase } from '../lib/supabase'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function syncPush(state: ReminderState) {
  const sbp = getSupabase()
  if (!sbp) return
  try {
    const sb = await sbp
    const { data } = await sb.auth.getSession()
    const user = data.session?.user
    if (!user) return
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
    await sb.from('reminder_state').upsert({ user_id: user.id, state, tz, updated_at: new Date().toISOString() })
    if (!state.enabled || !VAPID || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker?.getRegistration()
    if (!reg?.pushManager) return
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) }))
    const json = sub.toJSON()
    await sb.from('push_subscriptions').upsert({ user_id: user.id, endpoint: sub.endpoint, keys: json.keys ?? {}, updated_at: new Date().toISOString() }, { onConflict: 'endpoint' })
  } catch {
    // Push is a bonus: the local reminder keeps working.
  }
}
