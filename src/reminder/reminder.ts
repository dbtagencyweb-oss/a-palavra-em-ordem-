import type { DateKey } from '../game/dates'

export interface ReminderPrefs {
  enabled: boolean
  /** Local time, "HH:MM". */
  time: string
}

export const DEFAULT_REMINDER: ReminderPrefs = { enabled: false, time: '20:00' }
const KEY = 'pao:reminder:v1'

/** Shared with public/reminder-sw.js through the Cache API (service workers can't read localStorage). */
export const SW_CACHE = 'pao-settings'
export const SW_STATE_URL = '/__reminder-state.json'

export function loadReminder(storage: Storage | null = safeStorage()): ReminderPrefs {
  try {
    const raw = storage?.getItem(KEY)
    return raw ? { ...DEFAULT_REMINDER, ...(JSON.parse(raw) as Partial<ReminderPrefs>) } : DEFAULT_REMINDER
  } catch {
    return DEFAULT_REMINDER
  }
}

export function saveReminder(prefs: ReminderPrefs, storage: Storage | null = safeStorage()) {
  try {
    storage?.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

export function isValidTime(time: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(time)
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60
}

/** Milliseconds from `now` until the next local HH:MM (tomorrow if it already passed today). */
export function msUntilNext(now: Date, time: string): number {
  const [h, m] = time.split(':').map(Number)
  const next = new Date(now)
  next.setHours(h, m, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}

/** Remind only when enabled and today's lesson isn't done yet. */
export function shouldRemind(prefs: ReminderPrefs, lastCompleted: DateKey | null, today: DateKey): boolean {
  return prefs.enabled && lastCompleted !== today
}

export function lastCompletedDate(completedDays: Record<number, DateKey>): DateKey | null {
  const dates = Object.values(completedDays).sort()
  return dates.length ? dates[dates.length - 1] : null
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}
