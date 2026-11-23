// Voice narration (docs/05-narracoes.md): the catalog in content/narracoes.json, where each one
// plays, and the subtitle timing. Playback itself goes through the SoundManager's narration channel.
import narracoesJson from '../../content/narracoes.json'

export interface Narracao {
  id: string
  voz: 'principal' | 'oracao'
  onde: { card?: string; tela?: string; lp?: string }
  status: 'pronto' | 'pendente'
  texto: string
}

export const NARRACOES = (narracoesJson as unknown as { itens: Narracao[] }).itens

export const NARRATION_VOLUME = 1
/** Ambient level while a voice plays (fraction of its normal volume). */
export const DUCK_LEVEL = 0.2
export const DUCK_FADE_MS = 300
export const NARRATION_CUT_MS = 200
/** Scenes: the voice starts this long after scene_in. */
export const SCENE_NARRATION_DELAY_MS = 400
/** Files carry 0.3 s of silence at each end (docs/05). */
export const EDGE_SILENCE_MS = 300
/** Reading pace used to time subtitles when there is no audio to time them by. */
const WORDS_PER_SECOND = 2.4

export const narrationUrls = (id: string) => [`/audio/narr/${id}.mp3`, `/audio/narr/${id}.wav`]

const byId = new Map(NARRACOES.map((n) => [n.id, n]))
export const getNarracao = (id: string | undefined) => (id ? byId.get(id) : undefined)
export const narrationForCard = (cardId: string) => NARRACOES.find((n) => n.onde.card === cardId)
export const narrationForScreen = (tela: string) => NARRACOES.find((n) => n.onde.tela === tela)

export interface Cue {
  text: string
  start: number
  end: number
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length

/** Splits a narration into sentences (keeping the closing punctuation). */
export function sentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+["”]?|[^.!?]+$/g) ?? []).map((s) => s.trim()).filter(Boolean)
}

/** Time a reader needs for the text, when there is no audio duration. */
export function estimatedDurationMs(text: string): number {
  return Math.round((words(text) / WORDS_PER_SECOND) * 1000) + 2 * EDGE_SILENCE_MS
}

/**
 * Subtitle cues, one per sentence: the spoken time (duration minus the silent edges) is shared out
 * by each sentence's word count (docs/05 §3).
 */
export function subtitleCues(text: string, durationMs: number): Cue[] {
  const parts = sentences(text)
  const total = parts.reduce((n, s) => n + words(s), 0)
  if (!total) return []
  const edge = durationMs > 4 * EDGE_SILENCE_MS ? EDGE_SILENCE_MS : 0
  const spoken = durationMs - 2 * edge
  let at = edge
  return parts.map((s, i) => {
    const len = (words(s) / total) * spoken
    const cue = { text: s, start: Math.round(at), end: i === parts.length - 1 ? durationMs : Math.round(at + len) }
    at += len
    return cue
  })
}

/** The cue showing at a given time (the first before it starts, the last after it ends). */
export function cueAt(cues: Cue[], ms: number): Cue | undefined {
  if (!cues.length) return undefined
  return cues.find((c) => ms < c.end) ?? cues.at(-1)
}

/** Whether the recording is on the server (the landing page shows "Ouvir" only then, outside dev). */
export async function narrationAvailable(id: string): Promise<boolean> {
  for (const url of narrationUrls(id)) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok && /^audio\//.test(res.headers.get('content-type') ?? '')) return true
    } catch {
      /* offline */
    }
  }
  return false
}
