// Retention messages (docs/07, Prompt 11), as pure functions shared by the app, the service worker's
// copy (public/reminder-sw.js, kept in step by a test) and the push function on the server.
//
// The app writes a ReminderState each time it opens: the texts it can only build itself (lesson
// titles) and the numbers behind them. Whoever delivers (the app's timer, the service worker or
// the server) calls pickReminder() with the local date and time and shows what it returns.
//
// Rules, at or after the person's chosen time, at most one message a day:
//  1. Sunday: the weekly summary (days read, what was seen, the next milestone).
//  2. 3 days or more without opening the app: "A jornada espera por você", once per absence.
//  3. Otherwise, if today's lesson isn't done: "Sua lâmpada está esperando. Dia X: título."

export type DateKey = string // YYYY-MM-DD, local

export interface NextLesson {
  n: number
  titulo: string
}

export interface WeekData {
  /** Monday of the week these numbers are about. */
  semana: DateKey
  dias: number
  /** Lessons (events) seen this week, in order. */
  vistos: string[]
  /** "Sermão do Monte (Dia 12)", or null at the end of the journey. */
  proximoMarco: string | null
}

export interface ReminderState {
  enabled: boolean
  /** Local "HH:MM". */
  time: string
  lastCompleted: DateKey | null
  lastOpened: DateKey | null
  /** Grace available when the app was last opened (it protects the lamp while away). */
  grace: number
  next: NextLesson | null
  week: WeekData
  /** Day each kind was last sent. */
  sent: { daily?: DateKey | null; comeback?: DateKey | null; weekly?: DateKey | null }
}

export type ReminderKind = 'daily' | 'comeback' | 'weekly'
export interface ReminderMessage {
  kind: ReminderKind
  title: string
  body: string
}

export const COMEBACK_AFTER_DAYS = 3

// ---------- Dates (no Date parsing quirks: everything at noon UTC) ----------

const at = (k: DateKey) => new Date(`${k}T12:00:00Z`)
export const daysBetweenKeys = (a: DateKey, b: DateKey) => Math.round((at(b).getTime() - at(a).getTime()) / 86_400_000)
/** Monday of the week of `k`. */
export function mondayOf(k: DateKey): DateKey {
  const d = at(k)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}
export const isSunday = (k: DateKey) => at(k).getUTCDay() === 0

// ---------- Texts ----------

export function dailyMessage(next: NextLesson | null): ReminderMessage {
  return {
    kind: 'daily',
    title: 'Sua lâmpada está esperando.',
    body: next ? `Dia ${next.n}: ${next.titulo}.` : 'Revise um dia do mapa ou continue na próxima trilha.',
  }
}

export function comebackMessage(next: NextLesson | null, grace: number): ReminderMessage {
  const where = next ? `Você parou em Dia ${next.n}: ${next.titulo}.` : 'Sua próxima lição está pronta.'
  const protectedLamp = grace > 0 ? ' Sua Graça protegeu a lâmpada enquanto você esteve fora.' : ''
  return { kind: 'comeback', title: 'A jornada espera por você.', body: `${where} Leva 5 minutos.${protectedLamp}` }
}

/** Sunday summary. Numbers from another week (the app wasn't opened since) count as a week without reading. */
export function weeklyMessage(week: WeekData, today: DateKey): ReminderMessage {
  const current = week.semana === mondayOf(today)
  const dias = current ? week.dias : 0
  const vistos = current ? week.vistos : []
  const parts = [dias === 0 ? 'Nenhum dia lido nesta semana. Dá tempo de começar de novo hoje.' : `${dias} ${dias === 1 ? 'dia lido' : 'dias lidos'} nesta semana.`]
  if (vistos.length) parts.push(`Você passou por: ${listPt(vistos.slice(0, 4))}${vistos.length > 4 ? ' e mais' : ''}.`)
  if (week.proximoMarco) parts.push(`Próximo marco: ${week.proximoMarco}.`)
  return { kind: 'weekly', title: 'Sua semana na Palavra', body: parts.join(' ') }
}

const listPt = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs.at(-1)}`)

// ---------- Which one, now ----------

export function pickReminder(s: ReminderState, today: DateKey, hhmm: string): ReminderMessage | null {
  if (!s.enabled || hhmm < s.time) return null
  const sent = s.sent ?? {}
  if (sent.daily === today || sent.comeback === today || sent.weekly === today) return null
  if (isSunday(today)) return weeklyMessage(s.week, today)
  const away = s.lastOpened ? daysBetweenKeys(s.lastOpened, today) : 0
  // Once per absence: not again until the app is opened (lastOpened moves past the last send).
  if (away >= COMEBACK_AFTER_DAYS && !(sent.comeback && s.lastOpened && sent.comeback > s.lastOpened)) return comebackMessage(s.next, s.grace)
  if (s.lastCompleted !== today && away < COMEBACK_AFTER_DAYS) return dailyMessage(s.next)
  return null
}

/** The state after a message was shown. */
export const markSent = (s: ReminderState, m: ReminderMessage, today: DateKey): ReminderState => ({ ...s, sent: { ...s.sent, [m.kind]: today } })
