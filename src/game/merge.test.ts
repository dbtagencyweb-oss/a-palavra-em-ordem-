import { describe, expect, it } from 'vitest'
import { mergeProgress } from './merge'
import { createProgress, type Progress } from './progress'

const p = (over: Partial<Progress>): Progress => ({ ...createProgress(), ...over })

describe('mergeProgress (device + account)', () => {
  it('moves a device-only journey into an empty account', () => {
    const local = p({
      started: true,
      diagnosis: 'perco',
      completedDays: { 1: '2026-11-16' },
      streak: 1,
      lastStreakDate: '2026-11-16',
      steps: 60,
      symbols: ['lampada'],
      milestones: ['mapa-nas-maos'],
      diary: [{ id: 'a', createdAt: '2026-11-16T10:00:00Z', tag: 'Dia 1 · Reflexão', fields: { resposta: 'x' } }],
    })
    expect(mergeProgress(local, createProgress())).toEqual({ ...local })
  })

  it('unions days, symbols and diary, keeping the earliest completion date', () => {
    const local = p({
      completedDays: { 1: '2026-11-16', 2: '2026-11-18' },
      symbols: ['lampada', 'arvore'],
      diary: [{ id: 'b', createdAt: '2026-11-18T10:00:00Z', tag: 't', fields: {} }],
    })
    const remote = p({
      completedDays: { 1: '2026-11-15', 2: '2026-11-17', 3: '2026-11-18' },
      symbols: ['lampada', 'arvore', 'estrelas'],
      diary: [
        { id: 'a', createdAt: '2026-11-15T10:00:00Z', tag: 't', fields: {} },
        { id: 'b', createdAt: '2026-11-18T10:00:00Z', tag: 't', fields: {} },
      ],
    })
    const m = mergeProgress(local, remote)
    expect(m.completedDays).toEqual({ 1: '2026-11-15', 2: '2026-11-17', 3: '2026-11-18' })
    expect(m.symbols).toEqual(['lampada', 'arvore', 'estrelas'])
    expect(m.diary.map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('takes the lamp from the side lit most recently and keeps the most steps', () => {
    const local = p({ streak: 2, lastStreakDate: '2026-11-18', steps: 120 })
    const remote = p({ streak: 5, lastStreakDate: '2026-11-17', steps: 300 })
    const m = mergeProgress(local, remote)
    expect(m.streak).toBe(2)
    expect(m.lastStreakDate).toBe('2026-11-18')
    expect(m.steps).toBe(300)
  })

  it('merges separately marked Bible chapters across devices', () => {
    const m = mergeProgress(p({ readChapters: ['gn:1', 'gn:2'] }), p({ readChapters: ['gn:2', 'gn:3'] }))
    expect(new Set(m.readChapters)).toEqual(new Set(['gn:1', 'gn:2', 'gn:3']))
  })

  it('keeps a spent grace spent within the same week', () => {
    const local = p({ grace: 1, graceWeek: '2026-11-16' })
    const remote = p({ grace: 0, graceWeek: '2026-11-16' })
    expect(mergeProgress(local, remote).grace).toBe(0)
    expect(mergeProgress(p({ grace: 1, graceWeek: '2026-11-23' }), remote).grace).toBe(1)
  })
})
