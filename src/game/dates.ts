/** A calendar day in the device's local time zone, formatted YYYY-MM-DD. */
export type DateKey = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12) // noon avoids DST edge cases
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

/** Whole calendar days from `a` to `b` (positive when b is later). */
export function daysBetween(a: DateKey, b: DateKey): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

/** Monday of the week that contains `key`. Grace renews on Mondays. */
export function weekKey(key: DateKey): DateKey {
  const dow = fromDateKey(key).getDay() // 0 = Sunday
  return addDays(key, -((dow + 6) % 7))
}
