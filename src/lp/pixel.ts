// Meta Pixel for the landing page. Loads only when VITE_META_PIXEL_ID is set; otherwise every call
// is a no-op (in dev the events are logged to the console so the wiring can be checked).

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...a: unknown[]) => void; push?: unknown }

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined

declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
  }
}

export function initPixel() {
  if (!PIXEL_ID || window.fbq) return
  // Standard Meta snippet, written out.
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue!.push(args)
  } as Fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []
  window.fbq = fbq
  window._fbq = fbq
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(s)
  fbq('init', PIXEL_ID)
  fbq('track', 'PageView')
}

type StandardEvent = 'ViewContent' | 'Lead' | 'InitiateCheckout'

export function pixel(event: StandardEvent, params?: Record<string, unknown>) {
  if (import.meta.env.DEV) console.info('[pixel]', event, params ?? '')
  window.fbq?.('track', event, params)
}

export function pixelCustom(event: string, params?: Record<string, unknown>) {
  if (import.meta.env.DEV) console.info('[pixel]', event, params ?? '')
  window.fbq?.('trackCustom', event, params)
}

/** Fires ScrollDepth once at 25, 50, 75 and 100% of the page. */
export function trackScrollDepth() {
  const marks = [25, 50, 75, 100]
  const sent = new Set<number>()
  const check = () => {
    const doc = document.documentElement
    const max = doc.scrollHeight - window.innerHeight
    const pct = max <= 0 ? 100 : (window.scrollY / max) * 100
    for (const m of marks)
      if (pct >= m - 0.5 && !sent.has(m)) {
        sent.add(m)
        pixelCustom('ScrollDepth', { percent: m })
      }
    if (sent.size === marks.length) window.removeEventListener('scroll', check)
  }
  window.addEventListener('scroll', check, { passive: true })
}
