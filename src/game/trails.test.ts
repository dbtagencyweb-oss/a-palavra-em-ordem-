import { describe, expect, it } from 'vitest'
import { reachedMilestones } from '../activities/LifeTimeline'
import { mergeProgress } from './merge'
import { completeDay, completedOf, createProgress, isDayCompleted, isDayUnlocked, nextDay, type Progress } from './progress'

const J = 'jesus-em-ordem'
const withMap = (days: Record<number, string>): Progress => ({ ...createProgress(), started: true, completedDays: days })
const fullMap = (lastOn: string) => withMap({ 1: '2026-12-01', 2: '2026-12-02', 3: '2026-12-03', 4: '2026-12-04', 5: '2026-12-05', 6: '2026-12-06', 7: lastOn })

describe('Trilha 2 unlock', () => {
  it('stays closed until the 7-day map is finished', () => {
    const p = withMap({ 1: '2026-12-01' })
    expect(isDayUnlocked(p, 1, '2026-12-20', J)).toBe(false)
  })
  it('opens the day after the map was finished, not the same day', () => {
    const p = fullMap('2026-12-07')
    expect(isDayUnlocked(p, 1, '2026-12-07', J)).toBe(false)
    expect(isDayUnlocked(p, 1, '2026-12-08', J)).toBe(true)
  })
  it('then one day per calendar day, like Trilha 1', () => {
    let p = fullMap('2026-12-07')
    p = completeDay(p, { n: 1 }, 0, '2026-12-08', J).progress
    expect(isDayCompleted(p, 1, J)).toBe(true)
    expect(isDayUnlocked(p, 2, '2026-12-08', J)).toBe(false)
    expect(isDayUnlocked(p, 2, '2026-12-09', J)).toBe(true)
    expect(nextDay(p, 30, J)).toBe(2)
  })
})

describe('completing a day of Trilha 2', () => {
  it('is stored apart from Trilha 1 and still lights the lamp and gives steps', () => {
    const p0 = fullMap('2026-12-07')
    const r = completeDay(p0, { n: 1 }, 2, '2026-12-08', J)
    expect(r.firstTime).toBe(true)
    expect(r.progress.completedDays).toEqual(p0.completedDays)
    expect(completedOf(r.progress, J)).toEqual({ 1: '2026-12-08' })
    expect(r.progress.steps).toBe(p0.steps + 70)
    expect(r.streakIncreased).toBe(true)
  })
  it('gives a symbol only on days that have one', () => {
    const p0 = fullMap('2026-12-07')
    expect(completeDay(p0, { n: 1 }, 0, '2026-12-08', J).newSymbol).toBeNull()
    expect(completeDay(p0, { n: 1, symbolId: 'manjedoura' }, 0, '2026-12-08', J).newSymbol).toBe('manjedoura')
  })
  it('does not complete a locked day', () => {
    const r = completeDay(withMap({}), { n: 1 }, 0, '2026-12-08', J)
    expect(r.firstTime).toBe(false)
  })
})

describe('merge', () => {
  it('joins the days of other trails, keeping the earliest date', () => {
    const a = { ...createProgress(), trails: { [J]: { 1: '2026-12-08', 2: '2026-12-10' } } }
    const b = { ...createProgress(), trails: { [J]: { 2: '2026-12-09', 3: '2026-12-11' } } }
    expect(mergeProgress(a, b).trails[J]).toEqual({ 1: '2026-12-08', 2: '2026-12-09', 3: '2026-12-11' })
  })
})

describe('life timeline', () => {
  it('lights the milestones of completed days', () => {
    const outline = [{ n: 5, marcoLinhaDoTempo: 'Nascimento' }, { n: 8, marcoLinhaDoTempo: 'Batismo' }, { n: 9 }]
    expect([...reachedMilestones(outline, { 5: 'x', 9: 'y' })]).toEqual(['Nascimento'])
  })
})
