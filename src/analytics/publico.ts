// The audience chosen on the landing page (content/lp-publicos.json) arrives with the link to the
// app, as publico=<id> or utm_content=publico-<id>. It is kept on the device so the diagnosis opens
// with the matching option already selected.
import publicos from '../../content/lp-publicos.json'

const KEY = 'pao:publico'
const IDS = ['inicio', 'crente'] as const
export type Publico = (typeof IDS)[number]

/** Landing page audience → diagnosis option to pre-select (content/lp-publicos.json → diagnosticoApp.mapaUtm). */
export const DIAGNOSIS_FOR = publicos.diagnosticoApp.mapaUtm as Record<Publico, string | null>

const asPublico = (v: string | null | undefined): Publico | null => ((IDS as readonly string[]).includes(v ?? '') ? (v as Publico) : null)

/** Reads the audience from the address (when there is one) and keeps it. Returns the kept one. */
export function capturePublico(search = typeof window !== 'undefined' ? window.location.search : ''): Publico | null {
  try {
    const q = new URLSearchParams(search)
    const found = asPublico(q.get('publico')) ?? asPublico(q.get('utm_content')?.match(/^publico-(\w+)$/)?.[1])
    if (found) localStorage.setItem(KEY, found)
    return asPublico(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

/** The diagnosis option to pre-select, if the person came from a landing page version. */
export function presetDiagnosis(): string | null {
  try {
    const p = asPublico(localStorage.getItem(KEY))
    return p ? (DIAGNOSIS_FOR[p] ?? null) : null
  } catch {
    return null
  }
}
