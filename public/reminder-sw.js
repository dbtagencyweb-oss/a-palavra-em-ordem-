/* Imported by the generated service worker (vite-plugin-pwa, workbox importScripts).
 * Retention messages (docs/07, Prompt 11) while the app is closed:
 *  - "periodicsync" (installed app on Android/Chrome): picks the message from the state the app
 *    wrote into the Cache API (src/reminder/notifications.ts) and shows it.
 *  - "push": a message sent by the server (supabase/functions/lembretes), shown as it comes.
 * pickReminder below is a plain-JS copy of supabase/functions/_shared/logic-reminders.ts; the test
 * supabase/functions/_shared/reminders.test.ts checks that both answer the same. */

const SETTINGS_CACHE = 'pao-settings'
const STATE_URL = '/__reminder-state.json'
const COMEBACK_AFTER_DAYS = 3

function todayKey(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function hhmmOf(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function at(k) {
  return new Date(`${k}T12:00:00Z`)
}
function daysBetweenKeys(a, b) {
  return Math.round((at(b).getTime() - at(a).getTime()) / 86400000)
}
function mondayOf(k) {
  const d = at(k)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}
function listPt(xs) {
  return xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`
}
function dailyMessage(next) {
  return { kind: 'daily', title: 'Sua lâmpada está esperando.', body: next ? `Dia ${next.n}: ${next.titulo}.` : 'Revise um dia do mapa ou continue na próxima trilha.' }
}
function comebackMessage(next, grace) {
  const where = next ? `Você parou em Dia ${next.n}: ${next.titulo}.` : 'Sua próxima lição está pronta.'
  const protectedLamp = grace > 0 ? ' Sua Graça protegeu a lâmpada enquanto você esteve fora.' : ''
  return { kind: 'comeback', title: 'A jornada espera por você.', body: `${where} Leva 5 minutos.${protectedLamp}` }
}
function weeklyMessage(week, today) {
  const current = week.semana === mondayOf(today)
  const dias = current ? week.dias : 0
  const vistos = current ? week.vistos : []
  const parts = [dias === 0 ? 'Nenhum dia lido nesta semana. Dá tempo de começar de novo hoje.' : `${dias} ${dias === 1 ? 'dia lido' : 'dias lidos'} nesta semana.`]
  if (vistos.length) parts.push(`Você passou por: ${listPt(vistos.slice(0, 4))}${vistos.length > 4 ? ' e mais' : ''}.`)
  if (week.proximoMarco) parts.push(`Próximo marco: ${week.proximoMarco}.`)
  return { kind: 'weekly', title: 'Sua semana na Palavra', body: parts.join(' ') }
}
function pickReminder(s, today, hhmm) {
  if (!s.enabled || hhmm < s.time) return null
  const sent = s.sent || {}
  if (sent.daily === today || sent.comeback === today || sent.weekly === today) return null
  if (at(today).getUTCDay() === 0) return weeklyMessage(s.week, today)
  const away = s.lastOpened ? daysBetweenKeys(s.lastOpened, today) : 0
  if (away >= COMEBACK_AFTER_DAYS && !(sent.comeback && s.lastOpened && sent.comeback > s.lastOpened)) return comebackMessage(s.next, s.grace)
  if (s.lastCompleted !== today && away < COMEBACK_AFTER_DAYS) return dailyMessage(s.next)
  return null
}

async function maybeRemind() {
  const cache = await caches.open(SETTINGS_CACHE)
  const res = await cache.match(STATE_URL)
  if (!res) return
  const state = await res.json()
  if (!state || !state.week) return // state from an older app version: wait for the next open
  const now = new Date()
  const today = todayKey(now)
  const msg = pickReminder(state, today, hhmmOf(now))
  if (!msg) return
  state.sent = Object.assign({}, state.sent, { [msg.kind]: today })
  await cache.put(STATE_URL, new Response(JSON.stringify(state), { headers: { 'content-type': 'application/json' } }))
  await self.registration.showNotification(msg.title, { body: msg.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: `lembrete-${msg.kind}` })
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-reminder') event.waitUntil(maybeRemind())
})

self.addEventListener('push', (event) => {
  let msg = null
  try {
    msg = event.data ? event.data.json() : null
  } catch (e) {
    msg = null
  }
  if (!msg || !msg.title) return
  event.waitUntil(
    (async () => {
      // Record it, so the local delivery doesn't repeat it today.
      try {
        const cache = await caches.open(SETTINGS_CACHE)
        const res = await cache.match(STATE_URL)
        const state = res ? await res.json() : null
        if (state && msg.kind) {
          state.sent = Object.assign({}, state.sent, { [msg.kind]: todayKey(new Date()) })
          await cache.put(STATE_URL, new Response(JSON.stringify(state), { headers: { 'content-type': 'application/json' } }))
        }
      } catch (e) {
        /* ignore */
      }
      await self.registration.showNotification(msg.title, { body: msg.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: `lembrete-${msg.kind || 'push'}` })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus()
      return self.clients.openWindow('/')
    }),
  )
})
