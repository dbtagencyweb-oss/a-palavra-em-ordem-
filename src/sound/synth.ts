// Provisional sounds made with Web Audio, used until the real files land in public/audio/sfx/.
// Each recipe follows the "Caráter" column in docs/02-design-som-midia.md.
import type { AmbientId, SfxId } from './sounds'

type Ctx = AudioContext

let noiseBuffer: AudioBuffer | null = null
function noise(ctx: Ctx): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buf
  return buf
}

/** One enveloped oscillator note. */
function tone(
  ctx: Ctx,
  out: AudioNode,
  opts: { type?: OscillatorType; freq: number; to?: number; at?: number; dur: number; gain?: number; attack?: number },
) {
  const t = ctx.currentTime + (opts.at ?? 0)
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(opts.freq, t)
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + opts.dur)
  const peak = opts.gain ?? 0.3
  const attack = opts.attack ?? 0.005
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur)
  osc.connect(g).connect(out)
  osc.start(t)
  osc.stop(t + opts.dur + 0.05)
}

/** A burst of filtered noise (whooshes, strikes, page turns). */
function hiss(
  ctx: Ctx,
  out: AudioNode,
  opts: { at?: number; dur: number; filter?: BiquadFilterType; from: number; to?: number; q?: number; gain?: number; attack?: number },
) {
  const t = ctx.currentTime + (opts.at ?? 0)
  const src = ctx.createBufferSource()
  src.buffer = noise(ctx)
  const f = ctx.createBiquadFilter()
  f.type = opts.filter ?? 'bandpass'
  f.Q.value = opts.q ?? 1
  f.frequency.setValueAtTime(opts.from, t)
  if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + opts.dur)
  const g = ctx.createGain()
  const peak = opts.gain ?? 0.3
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + (opts.attack ?? opts.dur * 0.3))
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur)
  src.connect(f).connect(g).connect(out)
  src.start(t, Math.random())
  src.stop(t + opts.dur + 0.05)
}

const NOTE = {
  C4: 261.63, E4: 329.63, G4: 392, A4: 440,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880,
  C6: 1046.5, E6: 1318.5, G6: 1568, C7: 2093,
}

// Soft "air" around every sound: a short filtered echo, so nothing ends dry.
const airBus = new WeakMap<Ctx, AudioNode>()
function air(ctx: Ctx, out: AudioNode): AudioNode {
  const cached = airBus.get(ctx)
  if (cached) return cached
  const input = ctx.createGain()
  const dry = ctx.createGain()
  dry.gain.value = 0.85
  const delay = ctx.createDelay(1)
  delay.delayTime.value = 0.13
  const feedback = ctx.createGain()
  feedback.gain.value = 0.32
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 4500
  const wet = ctx.createGain()
  wet.gain.value = 0.35
  input.connect(dry).connect(out)
  input.connect(delay)
  delay.connect(tone).connect(feedback).connect(delay)
  tone.connect(wet).connect(out)
  airBus.set(ctx, input)
  return input
}

/** Bell / glass tone: sine plus a quiet inharmonic partial, gentle attack, long soft tail. */
function bell(ctx: Ctx, out: AudioNode, freq: number, opts: { at?: number; dur?: number; gain?: number; attack?: number } = {}) {
  const dur = opts.dur ?? 0.6
  const gain = opts.gain ?? 0.12
  const attack = opts.attack ?? 0.012
  tone(ctx, out, { freq, at: opts.at, dur, gain, attack })
  tone(ctx, out, { freq: freq * 2.76, at: opts.at, dur: dur * 0.5, gain: gain * 0.18, attack })
  tone(ctx, out, { freq: freq * 2, at: opts.at, dur: dur * 0.7, gain: gain * 0.25, attack })
}

/** A few tiny high glints scattered in time. */
function sparkle(ctx: Ctx, out: AudioNode, opts: { at?: number; count?: number; spread?: number; gain?: number } = {}) {
  const count = opts.count ?? 4
  for (let i = 0; i < count; i++) {
    const f = 2400 + Math.random() * 2600
    tone(ctx, out, { freq: f, at: (opts.at ?? 0) + Math.random() * (opts.spread ?? 0.3), dur: 0.35, gain: opts.gain ?? 0.025, attack: 0.01 })
  }
}

// All recipes are shimmering and soft: rounded attacks, no dry knocks (feedback from Diego).
export const SFX: Record<SfxId, (ctx: Ctx, out: AudioNode) => void> = {
  tap: (c, o) => bell(c, air(c, o), NOTE.E6, { dur: 0.22, gain: 0.07, attack: 0.008 }),
  card_next: (c, o) => {
    const a = air(c, o)
    hiss(c, a, { dur: 0.35, filter: 'highpass', from: 2500, to: 6000, q: 0.5, gain: 0.05, attack: 0.15 })
    bell(c, a, NOTE.G6, { at: 0.05, dur: 0.3, gain: 0.04 })
  },
  slot_place: (c, o) => {
    const a = air(c, o)
    bell(c, a, NOTE.A5, { dur: 0.35, gain: 0.08 })
    bell(c, a, NOTE.E6, { at: 0.04, dur: 0.3, gain: 0.04 })
  },
  match: (c, o) => {
    const a = air(c, o)
    bell(c, a, NOTE.E6, { dur: 0.6, gain: 0.08 })
    bell(c, a, NOTE.G6, { at: 0.12, dur: 0.8, gain: 0.08 })
  },
  correct: (c, o) => {
    const a = air(c, o)
    ;[NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].forEach((f, i) => bell(c, a, f, { at: i * 0.075, dur: 1.1, gain: 0.08 }))
    sparkle(c, a, { at: 0.35, count: 5, spread: 0.5 })
  },
  // Never harsh: a soft, slightly lower two-note sigh instead of a thud.
  wrong: (c, o) => {
    const a = air(c, o)
    tone(c, a, { freq: NOTE.A4, dur: 0.45, gain: 0.07, attack: 0.04 })
    tone(c, a, { freq: NOTE.E4, at: 0.14, dur: 0.6, gain: 0.07, attack: 0.05 })
  },
  tick: (c, o) => bell(c, air(c, o), NOTE.C7, { dur: 0.12, gain: 0.025, attack: 0.006 }),
  scene_in: (c, o) => {
    const a = air(c, o)
    hiss(c, a, { dur: 1.3, filter: 'bandpass', from: 600, to: 3500, q: 0.4, gain: 0.08, attack: 0.6 })
    tone(c, a, { freq: NOTE.C4, dur: 1.4, gain: 0.06, attack: 0.5 })
    tone(c, a, { freq: NOTE.G4, dur: 1.4, gain: 0.04, attack: 0.6 })
    sparkle(c, a, { at: 0.5, count: 6, spread: 0.7 })
  },
  lamp_ignite: (c, o) => {
    const a = air(c, o)
    hiss(c, a, { dur: 0.3, from: 3000, to: 5000, q: 0.8, gain: 0.06, attack: 0.08 }) // soft strike
    hiss(c, a, { at: 0.2, dur: 1.2, filter: 'lowpass', from: 300, to: 800, q: 0.5, gain: 0.08, attack: 0.5 }) // flame breath
    tone(c, a, { at: 0.25, freq: NOTE.C4, dur: 1.3, gain: 0.06, attack: 0.5 })
    sparkle(c, a, { at: 0.35, count: 6, spread: 0.8 })
  },
  day_complete: (c, o) => {
    const a = air(c, o)
    ;[NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5].forEach((f) => tone(c, a, { freq: f, dur: 2.5, gain: 0.05, attack: 0.7 }))
    ;[NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].forEach((f, i) => bell(c, a, f, { at: 0.35 + i * 0.15, dur: 1.2, gain: 0.06 }))
    sparkle(c, a, { at: 1.2, count: 6, spread: 0.8 })
  },
  symbol_unlock: (c, o) => {
    const a = air(c, o)
    sparkle(c, a, { count: 10, spread: 0.6, gain: 0.035 })
    bell(c, a, NOTE.C6, { at: 0.05, dur: 1, gain: 0.07 })
    bell(c, a, NOTE.G6, { at: 0.2, dur: 1, gain: 0.05 })
  },
  grace_used: (c, o) => {
    const a = air(c, o)
    tone(c, a, { freq: 220, dur: 1, gain: 0.06, attack: 0.3 })
    tone(c, a, { freq: 330, dur: 1, gain: 0.04, attack: 0.3 })
    bell(c, a, NOTE.G5, { at: 0.35, dur: 0.9, gain: 0.06 })
  },
  offer_open: (c, o) => {
    const a = air(c, o)
    hiss(c, a, { dur: 0.35, filter: 'highpass', from: 1500, to: 5000, q: 0.5, gain: 0.05, attack: 0.15 })
    sparkle(c, a, { at: 0.1, count: 3, spread: 0.2 })
  },
  // A soft step on sand: two grains of low, muffled noise, no click.
  footstep_sand: (c, o) => {
    hiss(c, o, { dur: 0.11, filter: 'lowpass', from: 700 + Math.random() * 250, to: 300, q: 0.7, gain: 0.07, attack: 0.025 })
    hiss(c, o, { at: 0.035, dur: 0.08, filter: 'bandpass', from: 1500 + Math.random() * 500, q: 1.2, gain: 0.018, attack: 0.02 })
  },
}

// ---------- Ambients (loops) ----------

interface AmbientRecipe {
  filter: BiquadFilterType
  freq: number
  q: number
  /** Slow swell of the noise bed. */
  lfoRate: number
  lfoDepth: number
  gain: number
  /** Optional little events on top (crickets, birds, crackles). */
  event?: { every: number; play: (ctx: Ctx, out: AudioNode) => void }
  drone?: number[]
}

const AMBIENTS: Record<AmbientId, AmbientRecipe> = {
  amb_desert_wind: { filter: 'bandpass', freq: 600, q: 0.6, lfoRate: 0.12, lfoDepth: 0.5, gain: 0.5 },
  amb_water_sea: { filter: 'lowpass', freq: 700, q: 0.4, lfoRate: 0.09, lfoDepth: 0.7, gain: 0.6 },
  amb_city_morning: { filter: 'lowpass', freq: 450, q: 0.5, lfoRate: 0.05, lfoDepth: 0.2, gain: 0.35 },
  amb_temple_reverb: { filter: 'lowpass', freq: 250, q: 0.5, lfoRate: 0.07, lfoDepth: 0.3, gain: 0.25, drone: [98, 147] },
  amb_fire_soft: {
    filter: 'lowpass', freq: 500, q: 0.5, lfoRate: 0.3, lfoDepth: 0.3, gain: 0.35,
    event: { every: 0.35, play: (c, o) => hiss(c, o, { dur: 0.08, from: 2000 + Math.random() * 2000, q: 2, gain: 0.05, attack: 0.02 }) },
  },
  amb_night_crickets: {
    filter: 'lowpass', freq: 300, q: 0.4, lfoRate: 0.05, lfoDepth: 0.2, gain: 0.15,
    event: {
      every: 0.9,
      play: (c, o) => {
        for (let i = 0; i < 3; i++) tone(c, o, { freq: 4200, at: i * 0.06, dur: 0.04, gain: 0.05 })
      },
    },
  },
  amb_garden_birds: {
    filter: 'lowpass', freq: 500, q: 0.4, lfoRate: 0.08, lfoDepth: 0.3, gain: 0.2,
    event: {
      every: 1.6,
      play: (c, o) => {
        const base = 2200 + Math.random() * 1200
        tone(c, o, { freq: base, to: base * 1.4, dur: 0.12, gain: 0.06 })
        tone(c, o, { freq: base * 1.2, to: base * 0.9, at: 0.15, dur: 0.1, gain: 0.05 })
      },
    },
  },
}

/** Starts a looping ambient; returns a stop function. */
export function startSynthAmbient(ctx: Ctx, out: AudioNode, id: AmbientId): () => void {
  const r = AMBIENTS[id]
  const src = ctx.createBufferSource()
  src.buffer = noise(ctx)
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = r.filter
  f.frequency.value = r.freq
  f.Q.value = r.q
  const bed = ctx.createGain()
  bed.gain.value = r.gain
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.frequency.value = r.lfoRate
  lfoGain.gain.value = r.gain * r.lfoDepth
  lfo.connect(lfoGain).connect(bed.gain)
  src.connect(f).connect(bed).connect(out)
  src.start()
  lfo.start()

  const drones = (r.drone ?? []).map((freq) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = freq
    g.gain.value = 0.06
    o.connect(g).connect(out)
    o.start()
    return o
  })

  const timer = r.event
    ? window.setInterval(() => r.event!.play(ctx, out), r.event.every * 1000 * (0.7 + Math.random() * 0.6))
    : undefined

  return () => {
    window.clearInterval(timer)
    const t = ctx.currentTime + 0.05
    for (const n of [src, lfo, ...drones]) {
      try {
        n.stop(t)
      } catch {
        /* already stopped */
      }
    }
  }
}
