// Small shared state of the landing page: the steps counter (a preview of the app's gamification)
// and the sound switch. Sound is off by default and is not remembered, so it never affects the app.
import { useSyncExternalStore } from 'react'
import { HowlerBackend } from '../sound/HowlerBackend'
import { SoundManager } from '../sound/SoundManager'

export const lpSound = new SoundManager(null)
lpSound.setMuted(true)
lpSound.setBackend(new HowlerBackend())

let steps = 0
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function addSteps(n: number) {
  steps += n
  listeners.forEach((fn) => fn())
}

export const useSteps = () => useSyncExternalStore(subscribe, () => steps)

export function useSoundOn() {
  return useSyncExternalStore(
    (fn) => lpSound.subscribe(fn),
    () => !lpSound.muted,
  )
}
