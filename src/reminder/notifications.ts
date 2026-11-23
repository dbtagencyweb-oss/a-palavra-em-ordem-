// Delivering the retention messages (docs/07, Prompt 11). Which message and when is decided by
// pickReminder() (supabase/functions/_shared/logic-reminders.ts); this file only delivers it:
// 1. Web Push from the server (src/reminder/push.ts): works with the app closed, on Android and on
//    the iPhone with the app on the home screen.
// 2. Periodic Background Sync (installed app on Android/Chrome) via public/reminder-sw.js.
// 3. A timer while the app is open or in the background.
// All three share the "already sent today" marks, so the person never gets the same day twice.
import { markSent, pickReminder, type ReminderMessage, type ReminderState } from '../../supabase/functions/_shared/logic-reminders'
import { toDateKey } from '../game/dates'
import { isIos, isStandalone } from '../pwa/install'
import { syncPush } from './push'
import { SW_CACHE, SW_STATE_URL, msUntilNext } from './reminder'

export type NotificationStatus = 'unsupported' | 'needs-install' | NotificationPermission

/** iPhone only allows web notifications for apps added to the home screen. */
export function notificationStatus(): NotificationStatus {
  if (isIos() && !isStandalone()) return 'needs-install'
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return 'unsupported'
  return Notification.permission
}

export async function requestPermission(): Promise<NotificationStatus> {
  const status = notificationStatus()
  if (status !== 'default') return status
  return Notification.requestPermission()
}

let timer: number | undefined
let current: ReminderState | null = null
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

export async function syncReminder(state: ReminderState) {
  // The worker (and the server) may have sent something since: keep their marks.
  const stored = await readStored()
  current = { ...state, sent: { ...state.sent, ...(stored?.sent ?? {}) } }
  await writeStored(current)
  scheduleLocal()
  await registerPeriodicSync(state.enabled)
  void syncPush(current)
}

function scheduleLocal() {
  window.clearTimeout(timer)
  if (!current?.enabled) return
  timer = window.setTimeout(async () => {
    const now = new Date()
    const today = toDateKey(now)
    const msg = current && pickReminder(current, today, hhmm(now))
    if (current && msg) {
      await show(msg)
      current = markSent(current, msg, today)
      await writeStored(current)
    }
    scheduleLocal()
  }, msUntilNext(new Date(), current.time))
}

async function show(m: ReminderMessage) {
  if (notificationStatus() !== 'granted') return
  const reg = await navigator.serviceWorker.getRegistration()
  const opts: NotificationOptions = { body: m.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: `lembrete-${m.kind}` }
  if (reg) await reg.showNotification(m.title, opts)
  else new Notification(m.title, opts)
}

async function readStored(): Promise<ReminderState | null> {
  if (!('caches' in window)) return null
  try {
    return ((await (await (await caches.open(SW_CACHE)).match(SW_STATE_URL))?.json()) ?? null) as ReminderState | null
  } catch {
    return null
  }
}

async function writeStored(state: ReminderState) {
  if (!('caches' in window)) return
  try {
    const cache = await caches.open(SW_CACHE)
    await cache.put(SW_STATE_URL, new Response(JSON.stringify(state), { headers: { 'content-type': 'application/json' } }))
  } catch {
    /* ignore */
  }
}

type PeriodicSyncRegistration = ServiceWorkerRegistration & {
  periodicSync?: { register(tag: string, o: { minInterval: number }): Promise<void>; unregister(tag: string): Promise<void> }
}

async function registerPeriodicSync(enabled: boolean) {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) as PeriodicSyncRegistration | undefined
    if (!reg?.periodicSync) return
    if (enabled) await reg.periodicSync.register('daily-reminder', { minInterval: 60 * 60 * 1000 })
    else await reg.periodicSync.unregister('daily-reminder')
  } catch {
    // Permission for background sync not granted: the local timer and push still work.
  }
}
