import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SoundManager, type SoundBackend } from './SoundManager'
import { DEFAULT_VOLUME } from './sounds'

function fakeBackend() {
  return {
    unlock: vi.fn<() => void>(),
    setVolume: vi.fn<(v: number) => void>(),
    play: vi.fn<SoundBackend['play']>(),
    startAmbient: vi.fn<SoundBackend['startAmbient']>(),
    stopAmbient: vi.fn<() => void>(),
    narrate: vi.fn<SoundBackend['narrate']>(),
    stopNarration: vi.fn<SoundBackend['stopNarration']>(),
    preloadNarration: vi.fn<SoundBackend['preloadNarration']>(),
  }
}

describe('SoundManager', () => {
  beforeEach(() => localStorage.clear())

  it('starts unmuted at volume 0.6', () => {
    const sm = new SoundManager(localStorage)
    const be = fakeBackend()
    sm.setBackend(be)
    expect(sm.muted).toBe(false)
    expect(be.setVolume).toHaveBeenCalledWith(DEFAULT_VOLUME)
  })

  it('plays nothing before the first interaction', () => {
    const sm = new SoundManager(localStorage)
    const be = fakeBackend()
    sm.setBackend(be)
    sm.play('tap')
    expect(be.play).not.toHaveBeenCalled()
    sm.unlock()
    sm.play('tap')
    expect(be.unlock).toHaveBeenCalledTimes(1)
    expect(be.play).toHaveBeenCalledWith('tap')
  })

  it('plays nothing while muted and persists the choice', () => {
    const sm = new SoundManager(localStorage)
    const be = fakeBackend()
    sm.setBackend(be)
    sm.unlock()
    sm.setMuted(true)
    sm.play('correct')
    expect(be.play).not.toHaveBeenCalled()
    expect(new SoundManager(localStorage).muted).toBe(true)
  })

  it('stops the ambient on mute and resumes it on unmute', () => {
    const sm = new SoundManager(localStorage)
    const be = fakeBackend()
    sm.setBackend(be)
    sm.unlock()
    sm.startAmbient('amb_fire_soft')
    expect(be.startAmbient).toHaveBeenCalledTimes(1)
    sm.setMuted(true)
    expect(be.stopAmbient).toHaveBeenCalled()
    sm.setMuted(false)
    expect(be.startAmbient).toHaveBeenCalledTimes(2)
    sm.stopAmbient()
    sm.setMuted(true)
    sm.setMuted(false)
    expect(be.startAmbient).toHaveBeenCalledTimes(2)
  })

  it('vibrates only with sound on', () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    const sm = new SoundManager(localStorage)
    sm.vibrate('correct')
    sm.vibrate('wrong')
    expect(vibrate).toHaveBeenNthCalledWith(1, 12)
    expect(vibrate).toHaveBeenNthCalledWith(2, [8, 40, 8])
    sm.setMuted(true)
    sm.vibrate('correct')
    expect(vibrate).toHaveBeenCalledTimes(2)
  })

  it('notifies subscribers when mute changes', () => {
    const sm = new SoundManager(localStorage)
    const fn = vi.fn()
    sm.subscribe(fn)
    sm.toggleMuted()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  describe('narration channel', () => {
    const h = { onStart: () => {}, onEnd: () => {}, onFail: () => {} }

    it('speaks only after the first touch, with sound and narration on', () => {
      const sm = new SoundManager(localStorage)
      const be = fakeBackend()
      sm.setBackend(be)
      expect(sm.narrate('narr-d6-tumulo', 'x', h)).toBe(0)
      sm.unlock()
      expect(sm.narrate('narr-d6-tumulo', 'x', h)).toBeGreaterThan(0)
      sm.setNarration(false)
      expect(sm.narrate('narr-d6-tumulo', 'x', h)).toBe(0)
      sm.setNarration(true)
      sm.setMuted(true)
      expect(sm.narrate('narr-d6-tumulo', 'x', h)).toBe(0)
      expect(be.narrate).toHaveBeenCalledTimes(1)
    })

    it('narration is on by default, remembered, and turning it off cuts the voice', () => {
      const sm = new SoundManager(localStorage)
      const be = fakeBackend()
      sm.setBackend(be)
      expect(sm.narrationOn).toBe(true)
      sm.setNarration(false)
      expect(be.stopNarration).toHaveBeenCalled()
      expect(new SoundManager(localStorage).narrationOn).toBe(false)
    })

    it('muting cuts the voice too', () => {
      const sm = new SoundManager(localStorage)
      const be = fakeBackend()
      sm.setBackend(be)
      sm.unlock()
      sm.setMuted(true)
      expect(be.stopNarration).toHaveBeenCalled()
    })

    it('a stale ticket does not stop a newer narration', () => {
      const sm = new SoundManager(localStorage)
      const be = fakeBackend()
      sm.setBackend(be)
      sm.unlock()
      const first = sm.narrate('narr-d6-tumulo', 'x', h)
      sm.narrate('narr-d6-sinagoga', 'y', h)
      sm.stopNarration(200, first)
      expect(be.stopNarration).not.toHaveBeenCalled()
    })
  })
})