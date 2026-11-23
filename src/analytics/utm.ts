// First-touch campaign (docs/07, Prompt 11): the utm_* the person first arrived with (the landing
// page passes them on to the app). Kept on the device and sent with every analytics event, so the
// /admin funnel can be filtered by campaign. Shared by the app and the landing page.
const KEY = 'pao:utm'
const FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
export type Utm = Partial<Record<(typeof FIELDS)[number], string>>

/** Reads utm_* from the address the first time there are any; returns the stored first touch. */
export function captureUtm(search = typeof window !== 'undefined' ? window.location.search : ''): Utm | null {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored) return JSON.parse(stored) as Utm
    const q = new URLSearchParams(search)
    const utm: Utm = {}
    for (const f of FIELDS) {
      const v = q.get(f)
      if (v) utm[f] = v.slice(0, 120)
    }
    if (!Object.keys(utm).length) return null
    localStorage.setItem(KEY, JSON.stringify(utm))
    return utm
  } catch {
    return null
  }
}

/** The same visitor id as the app's analytics (same origin: the landing page lives at /lp/). */
export function anonId(): string {
  try {
    const existing = localStorage.getItem('pao:anon-id')
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem('pao:anon-id', id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}
