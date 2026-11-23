// Licença Igreja on the app side (docs/07, Prompt 10). With Supabase, everything goes through the
// database functions in supabase/migrations/*_church_groups.sql, which enforce the rules and the
// privacy (the leader's panel only ever receives first names and progress numbers). In development
// without Supabase, a local simulator follows the same rules (supabase/functions/_shared/logic-group.ts)
// and the DEV panel can add members or put you in someone else's group.
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { isChurchProduct, isLive } from '../../supabase/functions/_shared/logic-access'
import { collectiveLamp, panelMember, seatsFor, type PanelMember, type ProgressData } from '../../supabase/functions/_shared/logic-group'
import { useAuth } from '../auth/AuthContext'
import { cloudEnabled, getSupabase } from '../lib/supabase'
import { useProgress } from '../store/ProgressContext'
import { addDevEntitlement, readDevEntitlements, subscribeDevEntitlements } from './devPayments'

/** The person's group, as my_church_group() returns it. */
export interface MyGroup {
  papel: 'lider' | 'membro' | null
  id?: string
  nome?: string
  ativo?: boolean
  vencimento?: string | null
  vagas?: number
  membros?: number
  /** Invite code: leader only. */
  codigo?: string | null
  lampada?: { acesas: number; total: number }
}

const NONE: MyGroup = { papel: null }
export const groupLink = (codigo: string) => `${window.location.origin}/igreja/${codigo}`

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const sb = getSupabase()
  if (!sb) throw new Error('sem conta')
  const { data, error } = await (await sb).rpc(name, args)
  if (error) throw new Error(error.message)
  return data as T
}

// ---------- Development simulator ----------

interface DevMember {
  id: string
  nome: string
  progress: ProgressData
}
interface DevGroup {
  /** "lider": your purchase made the group; "membro": you joined someone else's (DEV panel). */
  membroDe: string | null
  nome: string
  codigo: string
  membros: DevMember[]
}
const DEV_KEY = 'pao:dev-group'
const devEmpty = (): DevGroup => ({ membroDe: null, nome: 'Meu grupo', codigo: Math.random().toString(36).slice(2, 12), membros: [] })
const listeners = new Set<() => void>()
let cache: DevGroup | null = null
function devRead(): DevGroup {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(DEV_KEY) ?? 'null') ?? devEmpty()
  } catch {
    cache = devEmpty()
  }
  return cache!
}
function devWrite(g: DevGroup) {
  cache = g
  try {
    localStorage.setItem(DEV_KEY, JSON.stringify(g))
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn())
}
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const useDev = !cloudEnabled && import.meta.env.DEV

const NAMES = ['Ana', 'Bruno', 'Carla', 'Davi', 'Elisa', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João', 'Lívia', 'Marcos', 'Natália', 'Otávio', 'Paula', 'Rafael']
const dayKey = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** A believable member: somewhere in the map or in Jesus em Ordem, read today or a few days ago. */
function fakeMember(i: number): DevMember {
  const readToday = Math.random() < 0.6
  const lastOffset = readToday ? 0 : 1 + Math.floor(Math.random() * 3)
  const inJesus = Math.random() < 0.65
  const last = inJesus ? 1 + Math.floor(Math.random() * 10) : 1 + Math.floor(Math.random() * 7)
  // n consecutive days, the last one `end` days ago.
  const seq = (n: number, end: number) => Object.fromEntries(Array.from({ length: n }, (_, k) => [k + 1, dayKey(end + (n - 1 - k))]))
  const streak = lastOffset <= 1 ? 1 + Math.floor(Math.random() * 12) : 0
  const lamp = { streak, lastStreakDate: streak ? dayKey(lastOffset) : null }
  return {
    id: crypto.randomUUID(),
    nome: NAMES[i % NAMES.length],
    progress: inJesus
      ? { completedDays: seq(7, lastOffset + last + 2), trails: { 'jesus-em-ordem': seq(last, lastOffset) }, ...lamp }
      : { completedDays: seq(last, lastOffset), trails: {}, ...lamp },
  }
}

/** DEV panel: someone joins your group with the link. */
export function devAddChurchMember(): string {
  const g = devRead()
  const leader = devLeaderProduct()
  if (!leader || g.membroDe) return 'Compre a Licença Igreja primeiro (Simular pagamento)'
  if (g.membros.length >= seatsFor(leader)) return 'O grupo está cheio'
  const m = fakeMember(g.membros.length)
  devWrite({ ...g, membros: [...g.membros, m] })
  return `${m.nome} entrou no grupo`
}
/** DEV panel: you join a group led by someone else (and get the access it gives). */
export function devJoinChurchGroup(): string {
  const g = devRead()
  devWrite({ ...g, membroDe: 'Célula Esperança', nome: 'Célula Esperança', membros: Array.from({ length: 11 }, (_, i) => fakeMember(i + 3)) })
  addDevEntitlement({ product_code: 'igreja', origem: 'igreja', grupo_id: 'dev-grupo' })
  return 'Você entrou no grupo Célula Esperança'
}
export function devResetGroup() {
  devWrite(devEmpty())
}
function devLeaderProduct() {
  const now = new Date()
  return readDevEntitlements().find((e) => e.origem === 'compra' && isChurchProduct(e.product_code) && isLive(e, now))?.product_code ?? null
}

// ---------- Hook ----------

export function useChurchGroup() {
  const { session } = useAuth()
  const { progress, today } = useProgress()
  const dev = useSyncExternalStore(subscribe, devRead)
  useSyncExternalStore(subscribeDevEntitlements, readDevEntitlements)
  const [cloud, setCloud] = useState<{ group: MyGroup; panel: PanelMember[] }>({ group: NONE, panel: [] })
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    if (useDev || !session) return
    let alive = true
    void (async () => {
      try {
        const group = { ...NONE, ...((await rpc<MyGroup>('my_church_group')) ?? {}) }
        const panel = group.papel === 'lider' ? await rpc<PanelMember[]>('church_group_panel') : []
        if (alive) setCloud({ group, panel })
      } catch {
        /* no group */
      }
    })()
    return () => {
      alive = false
    }
  }, [session, tick])

  let group = cloud.group
  let panel = cloud.panel
  if (useDev) {
    const leader = devLeaderProduct()
    const role = dev.membroDe ? 'membro' : leader ? 'lider' : null
    panel = role ? dev.membros.map((m) => panelMember(m.id, m.nome, m.progress, today)) : []
    const me = panelMember('eu', 'Você', progress, today)
    const lamp = collectiveLamp([...panel, me])
    group = role
      ? {
          papel: role,
          id: 'dev-grupo',
          nome: dev.nome,
          ativo: true,
          vencimento: readDevEntitlements().find((e) => isChurchProduct(e.product_code))?.expires_at ?? null,
          vagas: leader ? seatsFor(leader) : 30,
          membros: dev.membros.length,
          codigo: role === 'lider' ? dev.codigo : null,
          lampada: lamp,
        }
      : NONE
    if (role !== 'lider') panel = []
  }

  return {
    group,
    panel,
    refresh,
    async rename(nome: string) {
      if (useDev) return devWrite({ ...devRead(), nome })
      await rpc('set_church_group_name', { p_nome: nome })
      refresh()
    },
    async newLink() {
      if (useDev) return devWrite({ ...devRead(), codigo: Math.random().toString(36).slice(2, 12) })
      await rpc('new_church_group_code')
      refresh()
    },
    async remove(id: string) {
      if (useDev) return devWrite({ ...devRead(), membros: devRead().membros.filter((m) => m.id !== id) })
      await rpc('remove_church_member', { p_membro: id })
      refresh()
    },
    async leave() {
      if (useDev) return devResetGroup()
      await rpc('leave_church_group')
      refresh()
    },
  }
}

/** Someone opens the group link (with Supabase). Returns the group's name. */
export async function joinChurchGroup(codigo: string): Promise<string> {
  if (useDev) throw new Error('No modo dev, use o painel DEV: "Igreja: entrar num grupo".')
  return rpc<string>('join_church_group', { p_code: codigo })
}
