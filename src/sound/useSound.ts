import { useSyncExternalStore } from 'react'
import { soundManager } from './SoundManager'

/** Current mute state, re-rendering when it changes. */
export function useMuted(): boolean {
  return useSyncExternalStore(
    (fn) => soundManager.subscribe(fn),
    () => soundManager.muted,
  )
}

export { soundManager }
