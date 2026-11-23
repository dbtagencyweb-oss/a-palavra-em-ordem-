import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tracker } from './track'

describe('Tracker', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('keeps one anonymous id per device', () => {
    expect(new Tracker(localStorage).anonId).toBe(new Tracker(localStorage).anonId)
  })

  it('batches events and sends them with the current user', async () => {
    const sink = vi.fn().mockResolvedValue(undefined)
    const t = new Tracker(localStorage)
    t.setSink(sink)
    t.track('day_start', { dia: 1, revisao: false })
    t.setUser('user-1')
    t.track('day_complete', { dia: 1, primeiraVez: true })
    expect(sink).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(3000)
    expect(sink).toHaveBeenCalledTimes(1)
    const batch = sink.mock.calls[0][0]
    expect(batch.map((e: { name: string }) => e.name)).toEqual(['day_start', 'day_complete'])
    expect(batch[0].user_id).toBeNull()
    expect(batch[1].user_id).toBe('user-1')
    expect(batch[1].anon_id).toBe(t.anonId)
  })

  it('keeps events queued until a sink exists and swallows sink errors', async () => {
    const t = new Tracker(localStorage)
    t.track('onboarding_start')
    await vi.advanceTimersByTimeAsync(3000)
    expect(t.pending).toHaveLength(1)
    t.setSink(vi.fn().mockRejectedValue(new Error('offline')))
    await expect(t.flush()).resolves.toBeUndefined()
  })
})
