// The landing page's audiences, one door (content/lp-publicos.json):
//  - no parameter: the 'padrao' version, and the "Qual é o seu caso?" chooser right below the hero;
//  - ?p=inicio or ?p=crente: opens already in that version (its own eyebrow and title), chooser hidden.
// The choice swaps the subtitle, the pain list (section 2) and the objection (section 9); it is kept
// on the device, sent with the pixel events and passed on to the app (for the diagnosis).
import { useSyncExternalStore } from 'react'
import data from '../../content/lp-publicos.json'
import { ScrollTrigger } from './motion'

export type Publico = 'inicio' | 'crente'
export const PUBLICOS: Publico[] = ['inicio', 'crente']
const KEY = data.seletor.storageKey

export const asPublico = (v: string | null | undefined): Publico | null => ((PUBLICOS as string[]).includes(v ?? '') ? (v as Publico) : null)

/** The audience fixed by the address (?p=). */
export const publicoFromUrl: Publico | null = typeof window !== 'undefined' ? asPublico(new URLSearchParams(window.location.search).get('p')) : null

function stored(): Publico | null {
  try {
    return asPublico(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

let current: Publico | null = publicoFromUrl ?? stored()
const listeners = new Set<() => void>()

export const getPublico = () => current

export function setPublico(p: Publico) {
  if (p === current) return
  current = p
  try {
    localStorage.setItem(KEY, p)
  } catch {
    /* private mode */
  }
  listeners.forEach((fn) => fn())
  // The pain section is rebuilt with the new list, so its trigger is now the newest one. Put the
  // triggers back in page order before measuring, or it would count the pins below it as if they
  // came first (and start, and end, in the wrong place).
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      ScrollTrigger.sort()
      ScrollTrigger.refresh()
    }),
  )
}

export function usePublico(): Publico | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => current,
  )
}

export interface Versao {
  eyebrow: string
  /** *Bíblia* marks the highlighted word. */
  titulo: string
  subtitulo: string
  /** Label of the free-start button (the 7 days). */
  cta: string
  microcopy: string
  dores: { titulo: string; itens: string[] }
  promessa?: string
  objecao: { pergunta: string; resposta: string }
  pixelPublico: string
}

const versoes = data.publicos as Record<Publico | 'padrao', Versao>

/** The texts of a version (null = the standard one). */
export const copyFor = (p: Publico | null): Versao => versoes[p ?? 'padrao']

/** For analytics (pixel, events): the version's pixelPublico. */
export const publicoTag = () => copyFor(current).pixelPublico

export const seletor = data.seletor
