import { beforeEach, describe, expect, it } from 'vitest'
import { completeDay, createProgress } from '../game/progress'
import { LocalProgressStore, PROGRESS_KEY } from './LocalProgressStore'

describe('LocalProgressStore', () => {
  beforeEach(() => localStorage.clear())

  it('returns a fresh progress when nothing is saved', async () => {
    expect(await new LocalProgressStore().load()).toEqual(createProgress())
  })

  it('round-trips progress', async () => {
    const store = new LocalProgressStore()
    const p = completeDay(createProgress(), { n: 1, symbolId: 'lampada' }, 1, '2026-11-16').progress
    await store.save(p)
    expect(await store.load()).toEqual(p)
  })

  it('recovers from corrupted data', async () => {
    localStorage.setItem(PROGRESS_KEY, '{not json')
    expect(await new LocalProgressStore().load()).toEqual(createProgress())
  })

  it('resets', async () => {
    const store = new LocalProgressStore()
    await store.save({ ...createProgress(), steps: 99 })
    await store.reset()
    expect((await store.load()).steps).toBe(0)
  })
})
