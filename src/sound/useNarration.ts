// Plays one narration and drives its subtitle: one sentence at a time, timed by the audio's
// duration. With the sound or the narration off (or no file), the subtitles still run on a reading
// pace, because many people will watch without sound.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { cueAt, estimatedDurationMs, getNarracao, subtitleCues, type Cue } from './narration'
import { soundManager as appSound, type SoundManager } from './SoundManager'

export interface NarrationState {
  /** The sentence on screen now (null before it starts and after it ends). */
  cue: Cue | null
  /** The voice is speaking. */
  speaking: boolean
  /** Finished (spoken or read): scenes stop holding the video's last frame. */
  done: boolean
  /** Dev stand-in voice. */
  provisional: boolean
  /** Speak again from the start (the scene's speaker icon). */
  replay(): void
  /** Cut the voice now with a short fade (tapping to move on). */
  stop(): void
}

/** Narration preference (Perfil → Narração em voz). */
export function useNarrationOn(): boolean {
  return useSyncExternalStore(
    (fn) => appSound.subscribe(fn),
    () => appSound.narrationOn,
  )
}

/** Keep the subtitle on screen this long after the last sentence ends. */
const LINGER_MS = 1200

interface Options {
  delayMs?: number
  /** Start speaking (default true). */
  active?: boolean
  /** The landing page has its own SoundManager. */
  manager?: SoundManager
  /** Pressed a play button for it: plays even with the effects switched off. */
  explicit?: boolean
}

export function useNarration(id: string | undefined, { delayMs = 0, active = true, manager = appSound, explicit = false }: Options = {}): NarrationState {
  const soundManager = manager
  const narr = getNarracao(id)
  const [cue, setCue] = useState<Cue | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [done, setDone] = useState(!narr)
  const [provisional, setProvisional] = useState(false)
  const [run, setRun] = useState(0)
  const timers = useRef<number[]>([])
  const ticketRef = useRef(0)

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  useEffect(() => {
    if (!narr || !active) return
    let alive = true
    let ticket = 0
    setDone(false)
    setCue(null)
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))

    // Runs the subtitles from now, for a given duration.
    const show = (durationMs: number) => {
      const cues = subtitleCues(narr.texto, durationMs)
      const start = performance.now()
      for (const c of cues) at(c.start, () => alive && setCue(cueAt(cues, performance.now() - start) ?? c))
      setCue(cues[0] ?? null)
      return durationMs
    }
    const finish = () => {
      if (!alive) return
      setSpeaking(false)
      setDone(true)
      at(LINGER_MS, () => alive && setCue(null))
    }
    const silent = () => at(show(estimatedDurationMs(narr.texto)), finish)

    // Deferred so a quick mount/unmount (React StrictMode) doesn't speak twice.
    at(delayMs, () => {
      if (!alive) return
      ticket = soundManager.narrate(narr.id, narr.texto, {
        onStart: (ms, prov) => {
          if (!alive) return
          clear()
          setProvisional(!!prov)
          setSpeaking(true)
          show(ms)
        },
        onEnd: finish,
        onFail: () => alive && silent(),
      }, { explicit })
      ticketRef.current = ticket
      if (!ticket) silent()
    })

    return () => {
      alive = false
      clear()
      if (ticket) soundManager.stopNarration(undefined, ticket)
      setSpeaking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narr, active, delayMs, run])

  const replay = useCallback(() => setRun((n) => n + 1), [])
  const stop = useCallback(() => {
    if (ticketRef.current) soundManager.stopNarration(undefined, ticketRef.current)
    ticketRef.current = 0
    clear()
    setSpeaking(false)
    setCue(null)
    setDone(true)
  }, [soundManager])
  return { cue, speaking, done, provisional, replay, stop }
}
