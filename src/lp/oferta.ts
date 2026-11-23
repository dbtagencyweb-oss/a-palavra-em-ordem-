// The Founder offer on the landing page, with real scarcity only (content/oferta.json):
//  - the number of seats taken comes from the database (public function fundadores_vendidos, just a
//    number), read on load and every 60 s; if it can't be read, the counter and the strip hide —
//    never a made-up number;
//  - when taken >= limit, the Founder offer closes by itself: the price becomes precoApos and the
//    checkout points to the normal annual offer.
// Development: ?vendidos=499 (or 500) simulates the count, to see both states.
import { useSyncExternalStore } from 'react'
import oferta from '../../content/oferta.json'
import { seatsLeft } from '../../supabase/functions/_shared/logic-access'

export const OFERTA = oferta
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let sold: number | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())

async function readSold(): Promise<number | null> {
  if (import.meta.env.DEV) {
    const sim = new URLSearchParams(window.location.search).get('vendidos')
    if (sim !== null) return Number(sim)
  }
  if (!URL_ || !KEY) return null
  try {
    const res = await fetch(`${URL_.replace(/\/$/, '')}/rest/v1/rpc/fundadores_vendidos`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!res.ok) return null
    const n = Number(await res.json())
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/** Starts reading the count (on load, then every atualizarACadaSegundos). */
export function startSeats() {
  const tick = async () => {
    const n = await readSold()
    // A failed read hides the counter instead of keeping an old number on screen.
    if (n !== sold) {
      sold = n
      emit()
    }
  }
  void tick()
  window.setInterval(tick, oferta.atualizarACadaSegundos * 1000)
}

export interface OfferState {
  /** Seats taken, or null when the count is unknown (counter hidden). */
  vendidos: number | null
  restantes: number | null
  limite: number
  /** The Founder seats are gone: annual offer at precoApos. */
  fechada: boolean
  preco: number
}

function state(): OfferState {
  const restantes = seatsLeft(sold, oferta.fundadorLimite)
  const fechada = restantes === 0
  return { vendidos: restantes === null ? null : sold, restantes, limite: oferta.fundadorLimite, fechada, preco: fechada ? oferta.precoApos : oferta.fundadorPreco }
}

let snapshot = state()
listeners.add(() => (snapshot = state()))

export const getOffer = () => snapshot

export function useOffer(): OfferState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => snapshot,
  )
}

/**
 * The page's copy once the Founder seats are gone: "Acesso Fundador" becomes the annual access and
 * the Founder price the new one. While the offer is open, the copy is unchanged.
 */
export function offerText(s: string, o: OfferState = snapshot): string {
  if (!o.fechada) return s
  return s.replace(/Acesso Fundador/g, oferta.nomeApos).replace(new RegExp(`R\\$ ?${oferta.fundadorPreco}\\b`, 'g'), `R$ ${oferta.precoApos}`)
}

/** "{vendidos} de {limite}" style templates (singular when one seat is left). */
export function fill(tpl: string, o: OfferState): string {
  const out = tpl.replace('{vendidos}', String(o.vendidos ?? '')).replace('{limite}', String(o.limite)).replace('{restantes}', String(o.restantes ?? ''))
  return o.restantes === 1 ? out.replace('1 restantes', '1 restante').replace('1 vagas', '1 vaga') : out
}
