// Install helpers: Android/desktop get the native prompt; iPhone gets a short guide.

export function isIos(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  maxTouchPoints: number = typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0,
): boolean {
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  // iPadOS reports itself as a Mac with touch.
  return /Macintosh/i.test(ua) && maxTouchPoints > 1
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true
}

export function needsIosInstallGuide(): boolean {
  return isIos() && !isStandalone()
}

// ---- Android/desktop native prompt ----

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((fn) => fn())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((fn) => fn())
  })
}

export const canPromptInstall = () => deferred !== null

export function onInstallAvailabilityChange(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  listeners.forEach((fn) => fn())
  return outcome === 'accepted'
}
