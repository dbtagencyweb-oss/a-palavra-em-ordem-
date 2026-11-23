// Development only: "Liberar tudo" in the DEV panel. While on, every day of every trail is open
// (no waiting for tomorrow, no order) and every paid content counts as bought, so any screen can be
// tested right away. Never on in production builds (import.meta.env.DEV is false there).
const KEY = 'pao:dev-liberar-tudo'

export function devUnlockAll(): boolean {
  if (!import.meta.env.DEV) return false
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setDevUnlockAll(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
