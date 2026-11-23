import { beforeEach, describe, expect, it } from 'vitest'
import { isIos } from '../pwa/install'
import {
  DEFAULT_REMINDER,
  isValidTime,
  lastCompletedDate,
  loadReminder,
  msUntilNext,
  saveReminder,
  shouldRemind,
} from './reminder'

describe('reminder', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to off at 20:00 and persists changes', () => {
    expect(loadReminder()).toEqual(DEFAULT_REMINDER)
    saveReminder({ enabled: true, time: '07:30' })
    expect(loadReminder()).toEqual({ enabled: true, time: '07:30' })
  })

  it('validates HH:MM', () => {
    expect(isValidTime('07:30')).toBe(true)
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('7:30')).toBe(false)
  })

  it('finds the next occurrence of the time, today or tomorrow', () => {
    const now = new Date(2026, 10, 19, 18, 0)
    expect(msUntilNext(now, '20:00')).toBe(2 * 60 * 60 * 1000)
    expect(msUntilNext(now, '07:00')).toBe(13 * 60 * 60 * 1000)
    expect(msUntilNext(now, '18:00')).toBe(24 * 60 * 60 * 1000)
  })

  it('reminds only when enabled and the lesson is not done today', () => {
    const on = { enabled: true, time: '20:00' }
    expect(shouldRemind(on, '2026-11-18', '2026-11-19')).toBe(true)
    expect(shouldRemind(on, '2026-11-19', '2026-11-19')).toBe(false)
    expect(shouldRemind({ ...on, enabled: false }, null, '2026-11-19')).toBe(false)
  })

  it('finds the last completion date', () => {
    expect(lastCompletedDate({})).toBeNull()
    expect(lastCompletedDate({ 1: '2026-11-16', 2: '2026-11-18', 3: '2026-11-17' })).toBe('2026-11-18')
  })
})

describe('install', () => {
  it('detects iPhone and iPadOS', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(true)
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
    expect(isIos('Mozilla/5.0 (Linux; Android 14)', 5)).toBe(false)
  })
})
