import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, toDateKey, weekKey } from './dates'
import {
  completeDay,
  createProgress,
  isDayUnlocked,
  nextDay,
  refreshForToday,
  stepsForLesson,
  type DayRewards,
  type Progress,
} from './progress'

// 2026-11-16 is a Monday.
const MON = '2026-11-16'
const TUE = '2026-11-17'
const WED = '2026-11-18'
const THU = '2026-11-19'
const FRI = '2026-11-20'
const SUN = '2026-11-22'
const NEXT_MON = '2026-11-23'

const day = (n: number, milestoneId?: string): DayRewards => ({
  n,
  symbolId: `simbolo-${n}`,
  milestoneId,
})

/** Completes days 1..k on consecutive calendar days starting at `start`. */
function completeConsecutive(k: number, start: string, p: Progress = createProgress()) {
  for (let n = 1; n <= k; n++) p = completeDay(p, day(n), 0, addDays(start, n - 1)).progress
  return p
}

describe('dates', () => {
  it('formats local dates and does calendar math', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(daysBetween(MON, THU)).toBe(3)
    expect(daysBetween(THU, MON)).toBe(-3)
  })

  it('finds the Monday of the week', () => {
    expect(weekKey(MON)).toBe(MON)
    expect(weekKey(THU)).toBe(MON)
    expect(weekKey(SUN)).toBe(MON)
    expect(weekKey(NEXT_MON)).toBe(NEXT_MON)
  })
})

describe('passos (steps)', () => {
  it('gives +50 per first completion and +10 per first-try activity', () => {
    expect(stepsForLesson(true, 0)).toBe(50)
    expect(stepsForLesson(true, 2)).toBe(70)
  })

  it('gives nothing for a review', () => {
    expect(stepsForLesson(false, 3)).toBe(0)
  })

  it('adds steps on completion, none on review', () => {
    const r1 = completeDay(createProgress(), day(1), 2, MON)
    expect(r1.stepsGained).toBe(70)
    expect(r1.progress.steps).toBe(70)

    const review = completeDay(r1.progress, day(1), 2, TUE)
    expect(review.firstTime).toBe(false)
    expect(review.stepsGained).toBe(0)
    expect(review.progress.steps).toBe(70)
  })
})

describe('desbloqueio diário (unlock)', () => {
  it('opens day 1 from the start and nothing else', () => {
    const p = createProgress()
    expect(isDayUnlocked(p, 1, MON)).toBe(true)
    expect(isDayUnlocked(p, 2, MON)).toBe(false)
  })

  it('opens the next day only after local midnight', () => {
    const p = completeDay(createProgress(), day(1), 0, MON).progress
    expect(isDayUnlocked(p, 2, MON)).toBe(false)
    expect(isDayUnlocked(p, 2, TUE)).toBe(true)
    expect(isDayUnlocked(p, 3, TUE)).toBe(false)
  })

  it('opens only one new day even after several days away', () => {
    const p = completeDay(createProgress(), day(1), 0, MON).progress
    expect(isDayUnlocked(p, 2, FRI)).toBe(true)
    expect(isDayUnlocked(p, 3, FRI)).toBe(false)
  })

  it('keeps completed days open for review', () => {
    const p = completeConsecutive(2, MON)
    expect(isDayUnlocked(p, 1, WED)).toBe(true)
    expect(isDayUnlocked(p, 2, WED)).toBe(true)
  })

  it('refuses to complete a locked day', () => {
    const p = completeDay(createProgress(), day(1), 0, MON).progress
    const r = completeDay(p, day(2), 0, MON)
    expect(r.firstTime).toBe(false)
    expect(r.progress.completedDays[2]).toBeUndefined()
  })

  it('reports the next day to do', () => {
    expect(nextDay(createProgress(), 7)).toBe(1)
    expect(nextDay(completeConsecutive(3, MON), 7)).toBe(4)
    expect(nextDay(completeConsecutive(7, MON), 7)).toBeNull()
  })
})

describe('lâmpada (streak)', () => {
  it('lights +1 per day completed on consecutive days', () => {
    expect(completeConsecutive(3, MON).streak).toBe(3)
  })

  it('does not count twice on the same day', () => {
    // A review on the same day keeps the lamp as is.
    const p = completeDay(createProgress(), day(1), 0, MON).progress
    const r = completeDay(p, day(1), 0, MON)
    expect(r.progress.streak).toBe(1)
  })

  it('stays lit through the rest of the day it was lit', () => {
    const p = completeDay(createProgress(), day(1), 0, MON).progress
    const r = refreshForToday(p, TUE)
    expect(r.progress.streak).toBe(1)
    expect(r.graceUsed).toBe(0)
  })

  it('uses grace to protect one missed day', () => {
    const p = completeDay(createProgress(), day(1), 0, MON).progress
    expect(p.grace).toBe(1)
    // Tuesday missed, back on Wednesday.
    const r = completeDay(p, day(2), 0, WED)
    expect(r.graceUsed).toBe(1)
    expect(r.progress.grace).toBe(0)
    expect(r.progress.streak).toBe(2)
  })

  it('puts the lamp out after two missed days in the same week', () => {
    const p = completeDay(createProgress(), day(1), 0, MON).progress
    // Tuesday and Wednesday missed.
    const r = refreshForToday(p, THU)
    expect(r.graceUsed).toBe(1)
    expect(r.streakLost).toBe(true)
    expect(r.progress.streak).toBe(0)

    const after = completeDay(r.progress, day(2), 0, THU)
    expect(after.progress.streak).toBe(1)
  })

  it('gives only one grace per week', () => {
    let p = completeDay(createProgress(), day(1), 0, MON).progress
    p = completeDay(p, day(2), 0, WED).progress // grace covers Tuesday
    expect(p.streak).toBe(2)
    const r = completeDay(p, day(3), 0, FRI) // Thursday missed, no grace left
    expect(r.graceUsed).toBe(0)
    expect(r.progress.streak).toBe(1)
  })

  it('renews grace on Monday, capped at 1', () => {
    let p = completeDay(createProgress(), day(1), 0, MON).progress
    p = completeDay(p, day(2), 0, WED).progress // spends this week's grace
    expect(p.grace).toBe(0)
    const r = refreshForToday(p, NEXT_MON)
    // Thu..Sun missed with no grace: lamp out, but Monday brings a fresh grace.
    expect(r.progress.streak).toBe(0)
    expect(r.progress.grace).toBe(1)

    const idle = refreshForToday(createProgress(), NEXT_MON)
    expect(idle.progress.grace).toBe(1)
  })

  it('uses the new week grace for a missed Monday', () => {
    // Lesson on Sunday, Monday missed, back on Tuesday of the next week.
    let p = createProgress()
    p = { ...p, streak: 5, lastStreakDate: SUN, grace: 0, graceWeek: MON }
    const r = refreshForToday(p, addDays(NEXT_MON, 1))
    expect(r.graceUsed).toBe(1)
    expect(r.progress.streak).toBe(5)
    expect(r.progress.grace).toBe(0)
  })

  it('is idempotent when refreshed twice on the same day', () => {
    const p = completeDay(createProgress(), day(1), 0, MON).progress
    const once = refreshForToday(p, WED)
    const twice = refreshForToday(once.progress, WED)
    expect(twice.graceUsed).toBe(0)
    expect(twice.progress).toEqual(once.progress)
  })

  it('does not spend grace when the lamp is already out', () => {
    const r = refreshForToday(createProgress(), FRI)
    expect(r.graceUsed).toBe(0)
    expect(r.progress.grace).toBe(1)
  })
})

describe('símbolos e marcos', () => {
  it('unlocks the day symbol once', () => {
    const r1 = completeDay(createProgress(), day(1), 0, MON)
    expect(r1.newSymbol).toBe('simbolo-1')
    expect(r1.progress.symbols).toEqual(['simbolo-1'])

    const review = completeDay(r1.progress, day(1), 0, TUE)
    expect(review.newSymbol).toBeNull()
    expect(review.progress.symbols).toEqual(['simbolo-1'])
  })

  it('unlocks a milestone only on days that have one', () => {
    const r1 = completeDay(createProgress(), day(1, 'mapa-nas-maos'), 0, MON)
    expect(r1.newMilestone).toBe('mapa-nas-maos')
    const r2 = completeDay(r1.progress, day(2), 0, TUE)
    expect(r2.newMilestone).toBeNull()
    expect(r2.progress.milestones).toEqual(['mapa-nas-maos'])
  })

  it('collects one symbol per day across the whole track', () => {
    const p = completeConsecutive(7, MON)
    expect(p.symbols).toHaveLength(7)
    expect(Object.keys(p.completedDays)).toHaveLength(7)
    expect(p.steps).toBe(7 * 50)
    expect(p.streak).toBe(7)
  })
})
