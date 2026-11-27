import type { DiaryEntry, Progress } from './progress'

/**
 * Combines the progress on this device with the one in the account (first login, or a second device).
 * Nothing the user earned is lost: days, symbols, milestones and diary entries are unions.
 */
export function mergeProgress(local: Progress, remote: Progress): Progress {
  const completedDays: Progress['completedDays'] = { ...remote.completedDays }
  for (const [n, date] of Object.entries(local.completedDays)) {
    const k = Number(n)
    completedDays[k] = completedDays[k] && completedDays[k] < date ? completedDays[k] : date
  }

  // The lamp follows whichever side lit it most recently.
  const a = local.lastStreakDate ?? ''
  const b = remote.lastStreakDate ?? ''
  const lamp = a > b ? local : b > a ? remote : local.streak >= remote.streak ? local : remote

  // Grace: the most recent week wins; within the same week, a spent grace stays spent.
  const ga = local.graceWeek ?? ''
  const gb = remote.graceWeek ?? ''
  const grace =
    ga > gb ? { grace: local.grace, graceWeek: local.graceWeek }
    : gb > ga ? { grace: remote.grace, graceWeek: remote.graceWeek }
    : { grace: Math.min(local.grace, remote.grace), graceWeek: local.graceWeek }

  return {
    version: 1,
    started: local.started || remote.started,
    introSeen: local.introSeen || remote.introSeen,
    diagnosis: local.diagnosis ?? remote.diagnosis,
    completedDays,
    trails: mergeTrails(local.trails ?? {}, remote.trails ?? {}),
    readChapters: union(remote.readChapters ?? [], local.readChapters ?? []),
    streak: lamp.streak,
    lastStreakDate: lamp.lastStreakDate,
    ...grace,
    steps: Math.max(local.steps, remote.steps),
    symbols: union(remote.symbols, local.symbols),
    milestones: union(remote.milestones, local.milestones),
    diary: mergeDiary(local.diary, remote.diary),
  }
}

function union(a: string[], b: string[]) {
  return [...new Set([...a, ...b])]
}

function mergeDiary(a: DiaryEntry[], b: DiaryEntry[]): DiaryEntry[] {
  const byId = new Map<string, DiaryEntry>()
  for (const e of [...b, ...a]) byId.set(e.id, e)
  return [...byId.values()].sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1))
}

/** Other trails: union of days, keeping the earliest completion date. */
function mergeTrails(local: Progress['trails'], remote: Progress['trails']): Progress['trails'] {
  const out: Progress['trails'] = {}
  for (const id of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const days = { ...(remote[id] ?? {}) }
    for (const [n, date] of Object.entries(local[id] ?? {})) {
      const k = Number(n)
      days[k] = days[k] && days[k] < date ? days[k] : date
    }
    out[id] = days
  }
  return out
}
