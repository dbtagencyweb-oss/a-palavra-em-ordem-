// Acesso Família on the app side. With Supabase, everything goes through the database functions in
// supabase/migrations/*_family.sql (they enforce the rules). In development without Supabase, a
// local simulator follows the same rules (supabase/functions/_shared/logic-family.ts), and the DEV
// panel can play the invited person accepting.
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { isLive } from '../../supabase/functions/_shared/logic-access'
import {
  canInvite,
  canRevoke,
  familyLamp,
  ownerSharesAccess,
  swapsUsed,
  type FamilyInvite,
} from '../../supabase/functions/_shared/logic-family'
import { useAuth } from '../auth/AuthContext'
import { cloudEnabled, getSupabase } from '../lib/supabase'
import { useProgress } from '../store/ProgressContext'
import { readDevEntitlements, subscribeDevEntitlements } from './devPayments'

export interface Family {
  papel: 'dono' | 'membro' | null
  dono_nome: string | null
  compartilhar: boolean
  convites: (FamilyInvite & { membro_nome?: string | null })[]
  trocas_usadas: number
  lampadas: { nome: string; eu: boolean; lampada: number }[]
}

const EMPTY: Family = { papel: null, dono_nome: null, compartilhar: true, convites: [], trocas_usadas: 0, lampadas: [] }

export const inviteLink = (codigo: string) => `${window.location.origin}/convite/${codigo}`

// ---------- Supabase ----------

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const sb = getSupabase()
  if (!sb) throw new Error('sem conta')
  const { data, error } = await (await sb).rpc(name, args)
  if (error) throw new Error(error.message)
  return data as T
}

// ---------- Development simulator ----------

const DEV_KEY = 'pao:dev-family'
interface DevFamily {
  convites: (FamilyInvite & { membro_nome?: string | null; lampada?: number })[]
  compartilhar: boolean
}
const devListeners = new Set<() => void>()
let devCache: DevFamily | null = null
function devRead(): DevFamily {
  if (devCache) return devCache
  try {
    devCache = JSON.parse(localStorage.getItem(DEV_KEY) ?? 'null') ?? { convites: [], compartilhar: true }
  } catch {
    devCache = { convites: [], compartilhar: true }
  }
  return devCache!
}
function devWrite(f: DevFamily) {
  devCache = f
  try {
    localStorage.setItem(DEV_KEY, JSON.stringify(f))
  } catch {
    /* ignore */
  }
  devListeners.forEach((fn) => fn())
}
const devSubscribe = (fn: () => void) => {
  devListeners.add(fn)
  return () => devListeners.delete(fn)
}
const useDev = !cloudEnabled && import.meta.env.DEV

/** DEV panel: the invited person accepts the oldest pending invite. */
export function devAcceptInvite(nome = 'Ana', lampada = 5): string {
  const f = devRead()
  const inv = f.convites.find((i) => i.status === 'pendente')
  if (!inv) return 'Nenhum convite pendente'
  devWrite({ ...f, convites: f.convites.map((i) => (i === inv ? { ...i, status: 'aceito', aceito_por: `dev-${nome}`, membro_nome: nome, lampada } : i)) })
  return `${nome} aceitou o convite`
}
export function devResetFamily() {
  devWrite({ convites: [], compartilhar: true })
}

// ---------- Hook ----------

export function useFamily() {
  const { session } = useAuth()
  const { progress, today } = useProgress()
  const dev = useSyncExternalStore(devSubscribe, devRead)
  const devEnts = useSyncExternalStore(subscribeDevEntitlements, readDevEntitlements)
  const [cloud, setCloud] = useState<Family>(EMPTY)
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    if (useDev || !session) return
    let alive = true
    void rpc<Family>('my_family')
      .then((f) => alive && setCloud({ ...EMPTY, ...(f ?? {}) }))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [session, tick])

  let family: Family = cloud
  if (useDev) {
    const owner = ownerSharesAccess(devEnts, new Date())
    const hasBump = devEnts.some((e) => e.product_code === 'familia' && e.origem === 'compra' && isLive(e, new Date()))
    family = {
      papel: hasBump ? 'dono' : null,
      dono_nome: 'Você',
      compartilhar: dev.compartilhar,
      convites: owner || hasBump ? dev.convites : [],
      trocas_usadas: swapsUsed(dev.convites),
      lampadas: [
        ...(dev.compartilhar ? [{ nome: 'Você', eu: true, lampada: familyLamp(progress.streak, progress.lastStreakDate, today) }] : []),
        ...dev.convites.filter((i) => i.status === 'aceito').map((i) => ({ nome: i.membro_nome ?? 'Convidado', eu: false, lampada: i.lampada ?? 0 })),
      ],
    }
  }

  const api = {
    family,
    refresh,
    async create(email?: string): Promise<FamilyInvite> {
      if (useDev) {
        const f = devRead()
        if (!canInvite(f.convites)) throw new Error('As 2 vagas já estão em uso')
        const inv: FamilyInvite = { id: crypto.randomUUID(), codigo: Math.random().toString(36).slice(2, 12), email: email ?? null, status: 'pendente', aceito_por: null, created_at: new Date().toISOString(), revogado_em: null }
        devWrite({ ...f, convites: [...f.convites, inv] })
        return inv
      }
      const inv = await rpc<FamilyInvite>('create_family_invite', { p_email: email ?? null })
      refresh()
      return inv
    },
    async revoke(id: string) {
      if (useDev) {
        const f = devRead()
        const inv = f.convites.find((i) => i.id === id)
        if (!inv || !canRevoke(inv, f.convites)) throw new Error('Limite de 2 trocas por ano atingido')
        devWrite({ ...f, convites: f.convites.map((i) => (i.id === id ? { ...i, status: 'revogado', revogado_em: new Date().toISOString() } : i)) })
        return
      }
      await rpc('revoke_family_invite', { p_id: id })
      refresh()
    },
    async setShare(share: boolean) {
      if (useDev) return devWrite({ ...devRead(), compartilhar: share })
      await rpc('set_family_lamp_share', { p_share: share })
      refresh()
    },
  }
  return api
}

/** The invited person accepts (with Supabase). Returns the owner's first name. */
export async function acceptInvite(codigo: string): Promise<string> {
  if (useDev) throw new Error('No modo dev, use o painel DEV para simular o aceite.')
  return rpc<string>('accept_family_invite', { p_code: codigo })
}
