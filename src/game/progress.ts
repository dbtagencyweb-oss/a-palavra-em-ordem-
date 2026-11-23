import { devUnlockAll } from '../dev/unlockAll'
import { addDays, daysBetween, weekKey, type DateKey } from './dates'

export const STEPS_PER_LESSON = 50
export const STEPS_PER_FIRST_TRY = 10
export const MAX_GRACE = 1

export interface DiaryEntry {
  id: string
  createdAt: string // ISO timestamp
  tag: string // e.g. "Dia 1 · Reflexão"
  fields: Record<string, string>
}

export interface Progress {
  version: 1
  started: boolean
  /** The first-time cinema intro was shown (or skipped). */
  introSeen: boolean
  diagnosis: string | null
  /** Day number -> date of first completion. */
  completedDays: Record<number, DateKey>
  /** Other trails (e.g. jesus-em-ordem): trail id → day number → date of first completion. */
  trails: Record<string, Record<number, DateKey>>
  streak: number
  /** Last calendar day covered by the lamp (a lesson or a grace). */
  lastStreakDate: DateKey | null
  grace: number
  /** Monday of the week in which grace was last renewed. */
  graceWeek: DateKey | null
  steps: number
  symbols: string[]
  milestones: string[]
  diary: DiaryEntry[]
}

export function createProgress(): Progress {
  return {
    version: 1,
    started: false,
    introSeen: false,
    diagnosis: null,
    completedDays: {},
    trails: {},
    streak: 0,
    lastStreakDate: null,
    grace: MAX_GRACE,
    graceWeek: null,
    steps: 0,
    symbols: [],
    milestones: [],
    diary: [],
  }
}

// ---------- Grace ----------

/** Grace: 1 per week, renewed on Monday, never above MAX_GRACE. */
export function renewGrace(p: Progress, today: DateKey): Progress {
  const week = weekKey(today)
  if (p.graceWeek === week) return p
  return { ...p, grace: MAX_GRACE, graceWeek: week }
}

// ---------- Lamp (streak) ----------

export interface RefreshResult {
  progress: Progress
  /** How many missed days grace covered during this refresh. */
  graceUsed: number
  /** True if the lamp went out during this refresh. */
  streakLost: boolean
}

/**
 * Brings the lamp up to date with the calendar: walks every missed day since the last
 * covered one, spending grace when available and putting the lamp out otherwise.
 * Idempotent for the same `today`.
 */
export function refreshForToday(input: Progress, today: DateKey): RefreshResult {
  let p = input
  let graceUsed = 0
  let streakLost = false

  if (p.streak > 0 && p.lastStreakDate) {
    const missed = daysBetween(p.lastStreakDate, today) - 1
    for (let i = 1; i <= missed; i++) {
      const day = addDays(p.lastStreakDate!, 1)
      p = renewGrace(p, day)
      if (p.grace > 0) {
        p = { ...p, grace: p.grace - 1, lastStreakDate: day }
        graceUsed++
      } else {
        p = { ...p, streak: 0, lastStreakDate: null }
        streakLost = true
        break
      }
    }
  }

  p = renewGrace(p, today)
  return { progress: p, graceUsed, streakLost }
}

// ---------- Unlock ----------

/** Trilha 1 (free). Its days live in completedDays; every other trail in trails[id]. */
export const MAIN_TRAIL = 'mapa-7-dias'

/** A follow-up trail starts the calendar day after this day of another trail was completed. */
export const TRAIL_STARTS_AFTER: Record<string, { trail: string; day: number }> = {
  'jesus-em-ordem': { trail: MAIN_TRAIL, day: 7 },
}

export function completedOf(p: Progress, trail = MAIN_TRAIL): Record<number, DateKey> {
  return trail === MAIN_TRAIL ? p.completedDays : (p.trails?.[trail] ?? {})
}

export function isDayCompleted(p: Progress, n: number, trail = MAIN_TRAIL): boolean {
  return completedOf(p, trail)[n] !== undefined
}

/**
 * Day 1 is always open. Day n opens at local midnight after day n-1 was completed.
 * Completed days stay open for free review.
 */
export function isDayUnlocked(p: Progress, n: number, today: DateKey, trail = MAIN_TRAIL): boolean {
  // DEV panel → "Liberar tudo": every day open, for testing (always off in production).
  if (devUnlockAll()) return true
  if (isDayCompleted(p, n, trail)) return true
  if (n === 1) {
    // A follow-up trail opens the day after the previous trail was finished.
    const after = TRAIL_STARTS_AFTER[trail]
    if (!after) return true
    const done = completedOf(p, after.trail)[after.day]
    return done !== undefined && done < today
  }
  const prev = completedOf(p, trail)[n - 1]
  return prev !== undefined && prev < today
}

/** The first day not yet completed, or null when the whole track is done. */
export function nextDay(p: Progress, totalDays: number, trail = MAIN_TRAIL): number | null {
  for (let n = 1; n <= totalDays; n++) if (!isDayCompleted(p, n, trail)) return n
  return null
}

// ---------- Steps ----------

export function stepsForLesson(firstTime: boolean, firstTryActivities: number): number {
  if (!firstTime) return 0
  return STEPS_PER_LESSON + STEPS_PER_FIRST_TRY * firstTryActivities
}

// ---------- Completing a day ----------

export interface DayRewards {
  n: number
  /** Not every day of every trail unlocks a symbol. */
  symbolId?: string
  milestoneId?: string
}

export interface CompletionResult {
  progress: Progress
  firstTime: boolean
  stepsGained: number
  streakIncreased: boolean
  graceUsed: number
  newSymbol: string | null
  newMilestone: string | null
}

export function completeDay(
  input: Progress,
  day: DayRewards,
  firstTryActivities: number,
  today: DateKey,
  trail = MAIN_TRAIL,
): CompletionResult {
  const refreshed = refreshForToday(input, today)
  let p = refreshed.progress
  const firstTime = !isDayCompleted(p, day.n, trail)

  if (!firstTime || !isDayUnlocked(p, day.n, today, trail)) {
    return {
      progress: p,
      firstTime: false,
      stepsGained: 0,
      streakIncreased: false,
      graceUsed: refreshed.graceUsed,
      newSymbol: null,
      newMilestone: null,
    }
  }

  const stepsGained = stepsForLesson(true, firstTryActivities)
  const streakIncreased = p.lastStreakDate !== today
  const newSymbol = day.symbolId && !p.symbols.includes(day.symbolId) ? day.symbolId : null
  const newMilestone =
    day.milestoneId && !p.milestones.includes(day.milestoneId) ? day.milestoneId : null

  p = {
    ...p,
    started: true,
    ...(trail === MAIN_TRAIL
      ? { completedDays: { ...p.completedDays, [day.n]: today } }
      : { trails: { ...p.trails, [trail]: { ...completedOf(p, trail), [day.n]: today } } }),
    steps: p.steps + stepsGained,
    streak: streakIncreased ? p.streak + 1 : p.streak,
    lastStreakDate: today,
    symbols: newSymbol ? [...p.symbols, newSymbol] : p.symbols,
    milestones: newMilestone ? [...p.milestones, newMilestone] : p.milestones,
  }

  return {
    progress: p,
    firstTime: true,
    stepsGained,
    streakIncreased,
    graceUsed: refreshed.graceUsed,
    newSymbol,
    newMilestone,
  }
}
