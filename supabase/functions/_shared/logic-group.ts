// Licença Igreja (docs/07, Prompt 10): the group rules and the leader's panel, as pure functions.
// The database enforces the same rules in supabase/migrations/*_church_groups.sql; these mirror
// them for the app, the dev simulator and the tests.
//
// Privacy (non-negotiable): the leader sees each member's first name and progress only — whether
// they read today, their lamp and where they are in the journey. Never the diary, reflections,
// quiz answers, e-mail or anything else. PANEL_FIELDS is the whole list, and the database function
// group_panel() returns exactly these fields.
import { CHURCH_SEATS, type ProductCode } from './logic-access'

export type GroupRole = 'lider' | 'membro'

export interface Group {
  id: string
  nome: string
  /** Seats for members (the leader doesn't take one). */
  vagas: number
  /** When the license ends (null = no expiry). */
  vencimento: string | null
  ativo: boolean
  codigo: string
}

/** One member as the leader's panel sees them. Nothing else is ever sent. */
export interface PanelMember {
  /** The membership (to remove someone). Never the user id. */
  id: string
  nome: string
  leu_hoje: boolean
  lampada: number
  /** Furthest trail with a completed day, and the last day completed there (null = not started). */
  trilha: string | null
  dia: number
}
export const PANEL_FIELDS = ['id', 'nome', 'leu_hoje', 'lampada', 'trilha', 'dia'] as const

export const seatsFor = (product: ProductCode) => CHURCH_SEATS[product] ?? 0

export function groupLive(g: Pick<Group, 'ativo' | 'vencimento'>, now = new Date()): boolean {
  return g.ativo && (g.vencimento === null || new Date(g.vencimento).getTime() > now.getTime())
}

export type JoinRefusal = 'grupo inativo' | 'grupo cheio' | 'já é membro' | 'é o líder'
export function joinRefusal(g: Group, membros: number, opts: { isLeader?: boolean; isMember?: boolean } = {}, now = new Date()): JoinRefusal | null {
  if (opts.isLeader) return 'é o líder'
  if (opts.isMember) return 'já é membro'
  if (!groupLive(g, now)) return 'grupo inativo'
  if (membros >= g.vagas) return 'grupo cheio'
  return null
}

// ---------- From a member's progress to the panel row ----------

/** The parts of the app's Progress the panel reads (see the progress table). */
export interface ProgressData {
  completedDays?: Record<string, string>
  trails?: Record<string, Record<string, string>>
  streak?: number
  lastStreakDate?: string | null
}

/** Journey order, furthest first: where a member "is" is the furthest trail they have reached. */
export const JOURNEY_ORDER = ['biblia-em-ordem', 'jesus-em-ordem', 'mapa-7-dias'] as const

const yesterdayOf = (today: string) => {
  const d = new Date(`${today}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function panelMember(id: string, nome: string, p: ProgressData | null, today: string): PanelMember {
  const map: Record<string, Record<string, string>> = { 'mapa-7-dias': p?.completedDays ?? {}, ...(p?.trails ?? {}) }
  const allDates = Object.values(map).flatMap((days) => Object.values(days))
  let trilha: string | null = null
  let dia = 0
  for (const t of JOURNEY_ORDER) {
    const days = Object.keys(map[t] ?? {}).map(Number).filter((n) => n > 0)
    if (days.length) {
      trilha = t
      dia = Math.max(...days)
      break
    }
  }
  const alive = Boolean(p?.lastStreakDate && p.lastStreakDate >= yesterdayOf(today))
  return { id, nome, leu_hoje: allDates.includes(today), lampada: alive ? p?.streak ?? 0 : 0, trilha, dia }
}

// ---------- The leader's panel ----------

export interface PanelSummary {
  total: number
  leramHoje: number
  /** Average lamp of the group (live streaks), one decimal. */
  sequenciaMedia: number
  /** How many people are at each point of the journey, furthest first. */
  distribuicao: { trilha: string; dia: number; pessoas: number }[]
  naoComecaram: number
}

export function panelSummary(rows: PanelMember[]): PanelSummary {
  const total = rows.length
  const leramHoje = rows.filter((r) => r.leu_hoje).length
  const sequenciaMedia = total ? Math.round((rows.reduce((s, r) => s + r.lampada, 0) / total) * 10) / 10 : 0
  const counts = new Map<string, { trilha: string; dia: number; pessoas: number }>()
  for (const r of rows) {
    if (!r.trilha) continue
    const k = `${r.trilha}:${r.dia}`
    const c = counts.get(k) ?? { trilha: r.trilha, dia: r.dia, pessoas: 0 }
    c.pessoas++
    counts.set(k, c)
  }
  const rank = (t: string) => JOURNEY_ORDER.indexOf(t as (typeof JOURNEY_ORDER)[number])
  const distribuicao = [...counts.values()].sort((a, b) => rank(a.trilha) - rank(b.trilha) || b.dia - a.dia)
  return { total, leramHoje, sequenciaMedia, distribuicao, naoComecaram: rows.filter((r) => !r.trilha).length }
}

/**
 * The lesson for this week's meeting: where most of the group is (ties go to the lesson further
 * behind, so nobody gets spoilers). The app takes that lesson's reflection question.
 */
export function weekLesson(s: PanelSummary): { trilha: string; dia: number } | null {
  if (!s.distribuicao.length) return null
  const rank = (t: string) => JOURNEY_ORDER.indexOf(t as (typeof JOURNEY_ORDER)[number])
  const best = [...s.distribuicao].sort((a, b) => b.pessoas - a.pessoas || rank(b.trilha) - rank(a.trilha) || a.dia - b.dia)[0]
  return { trilha: best.trilha, dia: best.dia }
}

/** The group's shared lamp, shown on every member's Home: lamps lit today out of everyone. */
export function collectiveLamp(rows: Pick<PanelMember, 'leu_hoje'>[]): { acesas: number; total: number } {
  return { acesas: rows.filter((r) => r.leu_hoje).length, total: rows.length }
}

/** The ready-made WhatsApp message for the group link. */
export function groupInviteMessage(nome: string, link: string): string {
  return `Vamos ler a Bíblia inteira, em ordem, juntos no grupo "${nome}". Cinco minutos por dia. Entre por este link: ${link}`
}
