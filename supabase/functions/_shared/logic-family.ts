// Acesso Família (docs/07, Prompt 6): the rules, as pure functions. The database enforces the same
// rules in supabase/migrations/*_family.sql; these mirror them for the app, the dev simulator and
// the tests. No imports besides the access logic.
import { FULL_ACCESS, isLive, type Entitlement } from './logic-access'

/** Invites per buyer of the "familia" bump. */
export const FAMILY_SLOTS = 2
/** A slot can be revoked and given to someone else at most this many times in 365 days. */
export const SWAPS_PER_YEAR = 2

export type InviteStatus = 'pendente' | 'aceito' | 'revogado'

export interface FamilyInvite {
  id: string
  codigo: string
  email: string | null
  status: InviteStatus
  aceito_por: string | null
  created_at: string
  revogado_em: string | null
}

/** The owner shares access while both the bump and a full-access product (bought) are live. */
export function ownerSharesAccess(ownerEntitlements: Entitlement[], now = new Date()): boolean {
  const bought = ownerEntitlements.filter((e) => e.origem === 'compra' && isLive(e, now))
  return bought.some((e) => e.product_code === 'familia') && bought.some((e) => FULL_ACCESS.includes(e.product_code))
}

/** Invites that take a slot: waiting for an answer, or accepted. */
export const activeInvites = (invites: FamilyInvite[]) => invites.filter((i) => i.status !== 'revogado')

/** Swaps used in the last 365 days: accepted people removed from the family. */
export function swapsUsed(invites: FamilyInvite[], now = new Date()): number {
  const yearAgo = now.getTime() - 365 * 86_400_000
  return invites.filter((i) => i.status === 'revogado' && i.aceito_por !== null && i.revogado_em && new Date(i.revogado_em).getTime() > yearAgo).length
}

export function canInvite(invites: FamilyInvite[]): boolean {
  return activeInvites(invites).length < FAMILY_SLOTS
}

/**
 * Canceling an invite nobody accepted is always fine. Removing someone who accepted is a swap,
 * limited to SWAPS_PER_YEAR.
 */
export function canRevoke(invite: FamilyInvite, invites: FamilyInvite[], now = new Date()): boolean {
  if (invite.status === 'revogado') return false
  if (invite.status === 'pendente') return true
  return swapsUsed(invites, now) < SWAPS_PER_YEAR
}

/** The ready-made WhatsApp message (docs/07, Prompt 6). */
export function inviteMessage(link: string): string {
  return `Estou lendo a Bíblia inteira em ordem e quero que você venha comigo. Entre por este link: ${link}`
}

/** Lamp shown to the family: the streak only while it is alive (lit today or yesterday). */
export function familyLamp(streak: number, lastStreakDate: string | null, today: string): number {
  if (!lastStreakDate) return 0
  const y = new Date(`${today}T12:00:00Z`)
  y.setUTCDate(y.getUTCDate() - 1)
  const yesterday = y.toISOString().slice(0, 10)
  return lastStreakDate >= yesterday ? streak : 0
}

/** "Ana está com 5 dias de lâmpada acesa." */
export function lampSentence(nome: string, dias: number): string {
  if (dias <= 0) return `${nome} está com a lâmpada apagada hoje.`
  return `${nome} está com ${dias} ${dias === 1 ? 'dia' : 'dias'} de lâmpada acesa.`
}
