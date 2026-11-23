// Builds the retention state (docs/07, Prompt 11) from the person's progress, each time the app
// opens: where the journey continues, the week's numbers and the next milestone. The texts and the
// choice of message live in supabase/functions/_shared/logic-reminders.ts.
import { mondayOf, type NextLesson, type ReminderState, type WeekData } from '../../supabase/functions/_shared/logic-reminders'
import { BIBLIA, JESUS, MAPA, type Trail } from '../content/trails'
import type { DateKey } from '../game/dates'
import { completedOf, type Progress } from '../game/progress'
import type { ReminderPrefs } from './reminder'

/** The trails in journey order, with whether the person can open them. */
export function journeyTrails(paid: boolean): Trail[] {
  return paid ? [MAPA, JESUS, BIBLIA] : [MAPA]
}

/** The next lesson of the journey: the first trail not finished, its first day not done. */
export function journeyNext(p: Progress, paid: boolean): { trail: Trail; next: NextLesson } | null {
  for (const trail of journeyTrails(paid)) {
    const done = completedOf(p, trail.id)
    const day = trail.visible.find((d) => !done[d.n])
    if (day) return { trail, next: { n: day.n, titulo: day.titulo } }
  }
  return null
}

/** Date of the last lesson completed, in any trail. */
export function lastCompletedAny(p: Progress): DateKey | null {
  const dates = [...Object.values(p.completedDays), ...Object.values(p.trails ?? {}).flatMap((t) => Object.values(t))].sort()
  return dates.at(-1) ?? null
}

/** This week (from Monday): days read, lessons seen and the next milestone. */
export function weekData(p: Progress, today: DateKey, paid: boolean): WeekData {
  const semana = mondayOf(today)
  const seen: { date: DateKey; titulo: string }[] = []
  for (const trail of [MAPA, JESUS, BIBLIA]) {
    const done = completedOf(p, trail.id)
    for (const [n, date] of Object.entries(done))
      if (date >= semana && date <= today) seen.push({ date, titulo: trail.outline.find((d) => d.n === Number(n))?.titulo ?? `Dia ${n}` })
  }
  seen.sort((a, b) => a.date.localeCompare(b.date))
  return { semana, dias: new Set(seen.map((s) => s.date)).size, vistos: seen.map((s) => s.titulo), proximoMarco: nextMilestone(p, paid) }
}

/** The next day of the current trail that gives a symbol or a timeline milestone. */
export function nextMilestone(p: Progress, paid: boolean): string | null {
  const at = journeyNext(p, paid)
  if (!at) return null
  const done = completedOf(p, at.trail.id)
  const day = at.trail.outline.find((d) => d.n >= at.next.n && !done[d.n] && (d.marcoLinhaDoTempo || d.simbolo))
  if (!day) return `o fim de ${at.trail.titulo}`
  return `${day.marcoLinhaDoTempo ?? `o símbolo "${day.simbolo!.nome}"`} (Dia ${day.n})`
}

export function buildReminderState(p: Progress, prefs: ReminderPrefs, today: DateKey, paid: boolean, sent: ReminderState['sent'] = {}): ReminderState {
  return {
    enabled: prefs.enabled,
    time: prefs.time,
    lastCompleted: lastCompletedAny(p),
    lastOpened: today,
    grace: p.grace,
    next: journeyNext(p, paid)?.next ?? null,
    week: weekData(p, today, paid),
    sent,
  }
}
