import { addDays, toDateKey, type DateKey } from '../game/dates'

// Dev-only day offset, so the 7-day unlock can be tested in minutes.
const OFFSET_KEY = 'pao:dev-day-offset'

export function getDevDayOffset(): number {
  if (!import.meta.env.DEV) return 0
  try {
    return Number(localStorage.getItem(OFFSET_KEY)) || 0
  } catch {
    return 0
  }
}

export function setDevDayOffset(offset: number): void {
  if (!import.meta.env.DEV) return
  try {
    if (offset) localStorage.setItem(OFFSET_KEY, String(offset))
    else localStorage.removeItem(OFFSET_KEY)
  } catch {
    /* ignore */
  }
}

export function today(): DateKey {
  return addDays(toDateKey(new Date()), getDevDayOffset())
}
