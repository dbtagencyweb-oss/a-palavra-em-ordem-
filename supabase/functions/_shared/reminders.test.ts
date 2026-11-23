// Retention messages (docs/07, Prompt 11): the rules, and the service worker's plain-JS copy of
// them (public/reminder-sw.js), which must answer exactly like the shared TypeScript.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { markSent, mondayOf, pickReminder, type ReminderState } from './logic-reminders'
import { createProgress, type Progress } from '../../../src/game/progress'
import { buildReminderState, nextMilestone, weekData } from '../../../src/reminder/state'

// Load the worker's functions with a stand-in `self`.
const swCode = readFileSync('public/reminder-sw.js', 'utf8')
const sw = new Function('self', 'caches', `${swCode}; return { pickReminder }`)({ addEventListener() {}, registration: {} }, {}) as {
  pickReminder: typeof pickReminder
}

const base: ReminderState = {
  enabled: true,
  time: '20:00',
  lastCompleted: '2026-11-18',
  lastOpened: '2026-11-18',
  grace: 1,
  next: { n: 5, titulo: 'Jesus no deserto' },
  week: { semana: '2026-11-16', dias: 3, vistos: ['O Verbo', 'Nicodemos', 'A samaritana'], proximoMarco: 'Sermão do Monte (Dia 12)' },
  sent: {},
}
// 2026-11-19 is a Thursday, 2026-11-22 a Sunday.
const CASES: [string, ReminderState, string, string][] = [
  ['before the chosen time', base, '2026-11-19', '19:59'],
  ['daily, at the time', base, '2026-11-19', '20:00'],
  ['nothing after today’s lesson', { ...base, lastCompleted: '2026-11-19', lastOpened: '2026-11-19' }, '2026-11-19', '21:00'],
  ['once a day', { ...base, sent: { daily: '2026-11-19' } }, '2026-11-19', '21:00'],
  ['off', { ...base, enabled: false }, '2026-11-19', '21:00'],
  ['3 days away', base, '2026-11-21', '20:30'],
  ['3 days away, no grace', { ...base, grace: 0 }, '2026-11-21', '20:30'],
  ['comeback only once per absence', { ...base, sent: { comeback: '2026-11-21' } }, '2026-11-24', '20:30'],
  ['comeback again after a new absence', { ...base, lastOpened: '2026-11-25', lastCompleted: '2026-11-25', sent: { comeback: '2026-11-21' } }, '2026-11-28', '20:30'],
  ['Sunday summary', { ...base, lastOpened: '2026-11-21' }, '2026-11-22', '20:00'],
  ['Sunday summary of a week without opening', { ...base, week: { ...base.week, semana: '2026-11-09' } }, '2026-11-22', '20:00'],
  ['2 days away is still the daily', base, '2026-11-20', '20:00'],
]

describe('retention messages', () => {
  it('daily: "Sua lâmpada está esperando. Dia X: título."', () => {
    expect(pickReminder(base, '2026-11-19', '20:00')).toEqual({ kind: 'daily', title: 'Sua lâmpada está esperando.', body: 'Dia 5: Jesus no deserto.' })
    expect(pickReminder(base, '2026-11-19', '19:59')).toBeNull()
  })

  it('3 days away: where they stopped, and that Grace protected the lamp', () => {
    const m = pickReminder(base, '2026-11-21', '20:30')!
    expect(m.title).toBe('A jornada espera por você.')
    expect(m.body).toBe('Você parou em Dia 5: Jesus no deserto. Leva 5 minutos. Sua Graça protegeu a lâmpada enquanto você esteve fora.')
    expect(pickReminder({ ...base, grace: 0 }, '2026-11-21', '20:30')!.body).not.toMatch(/Graça/)
    // Sent once, then silence until the app is opened again.
    const after = markSent(base, m, '2026-11-21')
    expect(pickReminder(after, '2026-11-22', '20:30')?.kind).toBe('weekly')
    expect(pickReminder(after, '2026-11-23', '20:30')).toBeNull()
  })

  it('Sunday: days read, what was seen, the next milestone', () => {
    const m = pickReminder({ ...base, lastOpened: '2026-11-21' }, '2026-11-22', '20:00')!
    expect(m).toEqual({
      kind: 'weekly',
      title: 'Sua semana na Palavra',
      body: '3 dias lidos nesta semana. Você passou por: O Verbo, Nicodemos e A samaritana. Próximo marco: Sermão do Monte (Dia 12).',
    })
    const stale = pickReminder({ ...base, week: { ...base.week, semana: '2026-11-09' } }, '2026-11-22', '20:00')!
    expect(stale.body).toMatch(/^Nenhum dia lido nesta semana/)
  })

  it('the service worker answers exactly like the shared rules', () => {
    for (const [name, s, day, time] of CASES) expect(sw.pickReminder(s, day, time), name).toEqual(pickReminder(s, day, time))
  })
})

describe('the state the app builds', () => {
  const today = '2026-11-19'
  const withMap = (n: number): Progress => {
    const p = createProgress()
    for (let d = 1; d <= n; d++) p.completedDays[d] = `2026-11-${String(10 + d).padStart(2, '0')}`
    return p
  }

  it('next lesson in journey order, and the week from Monday', () => {
    expect(mondayOf(today)).toBe('2026-11-16')
    const s = buildReminderState(withMap(3), { enabled: true, time: '07:30' }, today, false)
    expect(s.next).toEqual({ n: 4, titulo: expect.any(String) })
    expect(s.lastCompleted).toBe('2026-11-13')
    expect(s.lastOpened).toBe(today)
    // Days 1–3 were before Monday the 16th.
    expect(s.week.dias).toBe(0)
    const w = weekData(withMap(7), today, false)
    expect(w.dias).toBe(2) // the 16th and the 17th
    expect(w.vistos).toHaveLength(2)
  })

  it('after the free map, the paid journey continues in Jesus em Ordem (with access)', () => {
    const s = buildReminderState(withMap(7), { enabled: true, time: '07:30' }, today, true)
    expect(s.next?.n).toBe(1)
    expect(buildReminderState(withMap(7), { enabled: true, time: '07:30' }, today, false).next).toBeNull()
  })

  it('next milestone: a symbol or a timeline milestone of the current trail', () => {
    expect(nextMilestone(withMap(2), false)).toMatch(/\(Dia 3\)$/)
  })
})
