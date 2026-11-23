import { Howl, Howler } from 'howler'
import { DUCK_FADE_MS, DUCK_LEVEL, estimatedDurationMs, NARRATION_VOLUME, narrationUrls } from './narration'
import type { NarrationHandlers, SoundBackend } from './SoundManager'
import { AMBIENT_FADE_MS, AMBIENT_IDS, AMBIENT_VOLUME, SFX_IDS, soundUrls, type AmbientId, type SfxId } from './sounds'
import { SFX, startSynthAmbient } from './synth'

type Source = { kind: 'file'; howl: Howl } | { kind: 'synth' }

/**
 * Plays the real file from public/audio/sfx when it exists, otherwise the Web Audio stand-in.
 * Files are probed once after the first interaction, so dropping a file in is enough.
 */
export class HowlerBackend implements SoundBackend {
  private sources = new Map<string, Source>()
  private probing = false
  private ambient: { id: AmbientId; stop: () => void; level: (f: number) => void } | null = null
  private ducked = false
  private narrations = new Map<string, Promise<Howl | null>>()
  private voice: { stop: (fadeMs: number) => void } | null = null
  private voiceToken = 0

  unlock() {
    // Respect the iPhone silent switch (Safari 16.4+).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'ambient'
    this.ctx()?.resume().catch(() => {})
    this.probeAll()
  }

  setVolume(volume: number) {
    Howler.volume(volume)
  }

  play(id: SfxId) {
    const src = this.sources.get(id)
    if (src?.kind === 'file') {
      src.howl.play()
      return
    }
    const ctx = this.ctx()
    if (ctx) SFX[id](ctx, this.out(ctx))
  }

  startAmbient(id: AmbientId) {
    if (this.ambient?.id === id) return
    this.stopAmbient()
    const src = this.sources.get(id)
    if (src?.kind === 'file') {
      const howl = src.howl
      howl.loop(true)
      howl.volume(0)
      const soundId = howl.play()
      howl.fade(0, this.ambientLevel(), AMBIENT_FADE_MS, soundId)
      this.ambient = {
        id,
        level: (f) => howl.fade(howl.volume(soundId) as number, AMBIENT_VOLUME * f, DUCK_FADE_MS, soundId),
        stop: () => {
          howl.fade(howl.volume(soundId) as number, 0, AMBIENT_FADE_MS, soundId)
          window.setTimeout(() => howl.stop(soundId), AMBIENT_FADE_MS)
        },
      }
      return
    }
    const ctx = this.ctx()
    if (!ctx) return
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.linearRampToValueAtTime(this.ambientLevel(), ctx.currentTime + AMBIENT_FADE_MS / 1000)
    g.connect(this.out(ctx))
    const stopSynth = startSynthAmbient(ctx, g, id)
    this.ambient = {
      id,
      level: (f) => {
        const t = ctx.currentTime
        g.gain.cancelScheduledValues(t)
        g.gain.setValueAtTime(g.gain.value, t)
        g.gain.linearRampToValueAtTime(Math.max(0.0001, AMBIENT_VOLUME * f), t + DUCK_FADE_MS / 1000)
      },
      stop: () => {
        const t = ctx.currentTime
        g.gain.cancelScheduledValues(t)
        g.gain.setValueAtTime(g.gain.value, t)
        g.gain.linearRampToValueAtTime(0.0001, t + AMBIENT_FADE_MS / 1000)
        window.setTimeout(() => {
          stopSynth()
          g.disconnect()
        }, AMBIENT_FADE_MS + 50)
      },
    }
  }

  stopAmbient() {
    this.ambient?.stop()
    this.ambient = null
  }

  preloadNarration(id: string) {
    void this.loadNarration(id)
  }

  narrate(id: string, text: string, h: NarrationHandlers) {
    this.stopNarration(0)
    const token = ++this.voiceToken
    const live = () => token === this.voiceToken
    const finish = () => {
      if (!live()) return
      this.voice = null
      this.duck(false)
      h.onEnd()
    }
    void this.loadNarration(id).then((howl) => {
      if (!live()) return
      if (!howl) {
        if (import.meta.env.DEV && this.speak(text, h, live, finish)) return
        h.onFail()
        return
      }
      const soundId = howl.play()
      howl.volume(NARRATION_VOLUME, soundId)
      this.duck(true)
      howl.once('end', finish, soundId)
      this.voice = {
        stop: (fadeMs) => {
          if (fadeMs <= 0) return void howl.stop(soundId)
          howl.fade(howl.volume(soundId) as number, 0, fadeMs, soundId)
          window.setTimeout(() => howl.stop(soundId), fadeMs)
        },
      }
      h.onStart(howl.duration(soundId) * 1000)
    })
  }

  stopNarration(fadeMs: number) {
    this.voiceToken++
    this.voice?.stop(fadeMs)
    this.voice = null
    this.duck(false)
  }

  /** Development only: the system's pt-BR voice stands in for a missing recording (provisional). */
  private speak(text: string, h: NarrationHandlers, live: () => boolean, finish: () => void): boolean {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    if (!synth) return false
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'pt-BR'
    u.rate = 0.92
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('pt-br'))
    if (voice) u.voice = voice
    u.onstart = () => live() && h.onStart(estimatedDurationMs(text), true)
    u.onend = finish
    u.onerror = finish
    synth.cancel()
    synth.speak(u)
    this.duck(true)
    this.voice = { stop: () => synth.cancel() }
    return true
  }

  private loadNarration(id: string): Promise<Howl | null> {
    let p = this.narrations.get(id)
    if (!p) {
      p = findFile(narrationUrls(id)).then(
        (url) =>
          url
            ? new Promise<Howl | null>((resolve) => {
                const howl = new Howl({ src: [url], preload: true })
                howl.once('load', () => resolve(howl))
                howl.once('loaderror', () => resolve(null))
              })
            : null,
      )
      this.narrations.set(id, p)
    }
    return p
  }

  private ambientLevel() {
    return AMBIENT_VOLUME * (this.ducked ? DUCK_LEVEL : 1)
  }

  private duck(on: boolean) {
    if (this.ducked === on) return
    this.ducked = on
    this.ambient?.level(on ? DUCK_LEVEL : 1)
  }

  private ctx(): AudioContext | null {
    if (!Howler.ctx) Howler.volume(Howler.volume()) // forces Howler to create its AudioContext
    return Howler.ctx ?? null
  }

  /** Synth goes through Howler's master gain, so one volume and one unlock rule apply to both. */
  private out(ctx: AudioContext): AudioNode {
    return (Howler as unknown as { masterGain?: GainNode }).masterGain ?? ctx.destination
  }

  private probeAll() {
    if (this.probing) return
    this.probing = true
    for (const id of [...SFX_IDS, ...AMBIENT_IDS]) {
      this.sources.set(id, { kind: 'synth' })
      void probe(id).then((ok) => {
        if (ok) this.sources.set(id, { kind: 'file', howl: new Howl({ src: soundUrls(id), preload: true }) })
      })
    }
  }
}

async function probe(id: string): Promise<boolean> {
  return (await findFile(soundUrls(id))) !== null
}

/** First URL that answers with an audio file. */
async function findFile(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      const type = res.headers.get('content-type') ?? ''
      // The dev server answers missing files with index.html, so check the type too.
      if (res.ok && /^(audio|video)\//.test(type)) return url
    } catch {
      /* offline or blocked */
    }
  }
  return null
}
