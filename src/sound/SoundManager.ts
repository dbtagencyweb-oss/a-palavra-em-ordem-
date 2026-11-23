import { DEFAULT_VOLUME, type AmbientId, type SfxId } from './sounds'
import { NARRATION_CUT_MS } from './narration'

export interface NarrationHandlers {
  /** The voice started; durationMs is the file's length. provisional = dev stand-in voice. */
  onStart(durationMs: number, provisional?: boolean): void
  onEnd(): void
  /** No voice will play (no file, or it failed to load): show the subtitles on their own. */
  onFail(): void
}

/** Where sounds actually come from (Howler files with a Web Audio fallback, or a fake in tests). */
export interface SoundBackend {
  unlock(): void
  setVolume(volume: number): void
  play(id: SfxId): void
  startAmbient(id: AmbientId): void
  stopAmbient(): void
  /** Narration channel: its own volume; ducks the ambient to 20% while it speaks. */
  narrate(id: string, text: string, handlers: NarrationHandlers): void
  stopNarration(fadeMs: number): void
  preloadNarration(id: string): void
}

export type Haptic = 'correct' | 'wrong'

const PREFS_KEY = 'pao:sound:v1'
const HAPTICS: Record<Haptic, number | number[]> = { correct: 12, wrong: [8, 40, 8] }

interface Prefs {
  muted: boolean
  volume: number
  /** Voice narration (Perfil → Narração em voz), separate from the effects. */
  narration: boolean
}

/**
 * The single entry point for audio. Nothing plays before the first user interaction
 * (iOS requirement), and nothing plays or vibrates while muted.
 */
export class SoundManager {
  private backend: SoundBackend | null = null
  private unlocked = false
  private prefs: Prefs
  private ambient: AmbientId | null = null
  private listeners = new Set<() => void>()
  private narrationTicket = 0

  constructor(private readonly storage: Storage | null = safeStorage()) {
    this.prefs = this.readPrefs()
  }

  setBackend(backend: SoundBackend) {
    this.backend = backend
    backend.setVolume(this.prefs.volume)
    if (this.unlocked) backend.unlock()
  }

  /** Call from the first pointer/key event. */
  unlock() {
    if (this.unlocked) return
    this.unlocked = true
    this.backend?.unlock()
  }

  get isUnlocked() {
    return this.unlocked
  }

  get muted() {
    return this.prefs.muted
  }

  get volume() {
    return this.prefs.volume
  }

  get narrationOn() {
    return this.prefs.narration
  }

  setNarration(on: boolean) {
    this.prefs = { ...this.prefs, narration: on }
    this.writePrefs()
    if (!on) this.stopNarration()
    this.emit()
  }

  /**
   * Speaks a narration. Returns a ticket for stopping it, or 0 (and plays nothing) when muted,
   * before the first touch, or with narration off; the caller then shows the subtitles on their own.
   */
  narrate(id: string, text: string, handlers: NarrationHandlers, opts: { explicit?: boolean } = {}): number {
    // explicit: the person pressed a play button for this voice (landing page "Ouvir"), so it plays
    // even with the effects switched off. Never before the first touch.
    if (!this.unlocked || !this.backend) return 0
    if (!opts.explicit && (this.prefs.muted || !this.prefs.narration)) return 0
    this.backend!.narrate(id, text, handlers)
    return ++this.narrationTicket
  }

  /** Stops the voice with a short fade. With a ticket, only if that narration is still the current one. */
  stopNarration(fadeMs = NARRATION_CUT_MS, ticket?: number) {
    if (ticket !== undefined && ticket !== this.narrationTicket) return
    this.backend?.stopNarration(fadeMs)
  }

  preloadNarration(id: string | undefined) {
    if (id && this.unlocked && this.prefs.narration) this.backend?.preloadNarration(id)
  }

  setMuted(muted: boolean) {
    this.prefs = { ...this.prefs, muted }
    this.writePrefs()
    if (muted) {
      this.backend?.stopAmbient()
      this.backend?.stopNarration(NARRATION_CUT_MS)
    } else if (this.ambient && this.unlocked) this.backend?.startAmbient(this.ambient)
    this.emit()
  }

  toggleMuted() {
    this.setMuted(!this.prefs.muted)
  }

  play(id: SfxId) {
    if (!this.canPlay()) return
    this.backend!.play(id)
  }

  startAmbient(id: AmbientId) {
    this.ambient = id
    if (this.canPlay()) this.backend!.startAmbient(id)
  }

  stopAmbient() {
    this.ambient = null
    this.backend?.stopAmbient()
  }

  /** Light vibration on Android; follows the sound switch. */
  vibrate(kind: Haptic) {
    if (this.prefs.muted) return
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(HAPTICS[kind])
      } catch {
        /* ignore */
      }
    }
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private canPlay() {
    return this.unlocked && !this.prefs.muted && this.backend !== null
  }

  private emit() {
    this.listeners.forEach((fn) => fn())
  }

  private readPrefs(): Prefs {
    const defaults: Prefs = { muted: false, volume: DEFAULT_VOLUME, narration: true }
    try {
      const raw = this.storage?.getItem(PREFS_KEY)
      return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Prefs>) } : defaults
    } catch {
      return defaults
    }
  }

  private writePrefs() {
    try {
      this.storage?.setItem(PREFS_KEY, JSON.stringify(this.prefs))
    } catch {
      /* ignore */
    }
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export const soundManager = new SoundManager()
