// "Nova etapa liberada: [nome]" for Founders (docs/07, Prompt 4, item 5).
// A stage counts as released once plano.json has its publicadaEm. When the app opens and finds a
// released stage the person hasn't been told about, it says so in the app and, if notifications
// are allowed, as a system notification. The first time this runs on a device it only records
// what is already out (those stages aren't news).
// Note: this reaches people when they open the app. A push to closed apps needs a Web Push server
// (VAPID keys and stored subscriptions), planned with the reminders.
import { ETAPAS } from '../content/trails'

const KEY = 'pao:etapas-avisadas'

/** Pure rule: which released stages to announce, and what to remember as seen. */
export function etapaNotices(released: string[], seen: string[] | null): { notify: string[]; seen: string[] } {
  if (seen === null) return { notify: [], seen: released }
  const notify = released.filter((id) => !seen.includes(id))
  return { notify, seen: [...seen, ...notify] }
}

export function announceNewEtapas(isFounder: boolean, toast: (msg: string) => void) {
  if (!isFounder) return
  let seen: string[] | null = null
  try {
    const raw = localStorage.getItem(KEY)
    seen = raw ? (JSON.parse(raw) as string[]) : null
  } catch {
    return
  }
  const released = ETAPAS.filter((e) => e.publicadaEm !== null).map((e) => e.id)
  const r = etapaNotices(released, seen)
  try {
    localStorage.setItem(KEY, JSON.stringify(r.seen))
  } catch {
    /* ignore */
  }
  for (const id of r.notify) {
    const etapa = ETAPAS.find((e) => e.id === id)!
    const title = `Nova etapa liberada: ${etapa.nome}`
    toast(title)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && 'serviceWorker' in navigator)
      void navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, { body: `A Bíblia em Ordem · Etapa ${etapa.n}: ${etapa.livros}.`, icon: '/icons/icon-192.png', tag: `etapa-${etapa.id}` }))
        .catch(() => {})
  }
}
