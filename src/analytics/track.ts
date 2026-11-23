// Single analytics entry point (docs/01-produto.md → Analytics). Destination: Supabase `events` table.
// Every event carries the first-touch campaign (utm), for the /admin funnel.
// Events are queued and sent in small batches; nothing blocks the UI and failures are dropped quietly.

import { captureUtm } from './utm'

export interface EventProps {
  onboarding_start: Record<string, never>
  diagnosis_answered: { opcao: string }
  day_start: { dia: number; revisao: boolean; trilha?: string }
  card_view: { dia: number; card: string; trilha?: string }
  activity_result: { dia: number; card: string; acertou: boolean; tentativas: number }
  day_complete: { dia: number; primeiraVez: boolean; trilha?: string }
  streak_saved_by_grace: { dias: number }
  offer_view: { origem: string }
  offer_click: { origem: string }
  diary_entry_saved: { origem: 'diario' | 'reflexao' }
  sound_toggled: { ligado: boolean }
  // Extra, for the account funnel.
  sign_in_requested: { metodo: 'google' | 'email'; origem: string }
  // Landing page (sent by src/lp/track.ts, same table).
  lp_view: Record<string, never>
  lp_click: { tipo: 'compra' | 'gratis'; origem: string }
}
export type EventName = keyof EventProps

export interface QueuedEvent {
  name: EventName
  props: Record<string, unknown>
  anon_id: string
  user_id: string | null
  created_at: string
}

export type Sink = (events: QueuedEvent[]) => Promise<void>

const ANON_KEY = 'pao:anon-id'
const FLUSH_MS = 3000
const MAX_BATCH = 50

export class Tracker {
  private queue: QueuedEvent[] = []
  private timer: ReturnType<typeof setTimeout> | undefined
  private userId: string | null = null
  private sink: Sink | null = null
  readonly anonId: string

  constructor(storage: Storage | null = safeStorage()) {
    this.anonId = readAnonId(storage)
  }

  setSink(sink: Sink | null) {
    this.sink = sink
  }

  setUser(id: string | null) {
    this.userId = id
  }

  track<N extends EventName>(name: N, ...args: EventProps[N] extends Record<string, never> ? [] : [EventProps[N]]) {
    const utm = captureUtm()
    const props = { ...((args[0] ?? {}) as Record<string, unknown>), ...(utm ? { utm } : {}) }
    if (import.meta.env.DEV) console.debug('[track]', name, props)
    this.queue.push({ name, props, anon_id: this.anonId, user_id: this.userId, created_at: new Date().toISOString() })
    if (this.queue.length >= MAX_BATCH) void this.flush()
    else if (!this.timer) this.timer = setTimeout(() => void this.flush(), FLUSH_MS)
  }

  async flush() {
    clearTimeout(this.timer)
    this.timer = undefined
    if (!this.sink || this.queue.length === 0) return
    const batch = this.queue.splice(0, MAX_BATCH)
    try {
      await this.sink(batch)
    } catch {
      // Analytics never gets in the user's way.
    }
    if (this.queue.length) this.timer = setTimeout(() => void this.flush(), FLUSH_MS)
  }

  /** For tests. */
  get pending() {
    return [...this.queue]
  }
}

function readAnonId(storage: Storage | null): string {
  try {
    const existing = storage?.getItem(ANON_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    storage?.setItem(ANON_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export const tracker = new Tracker()
export const track: Tracker['track'] = (...args) => tracker.track(...args)
