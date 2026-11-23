// Transparent renewal (no automatic charge): the annual access is a one-time payment for 12 months.
// 15 and 3 days before it ends, the person gets an e-mail with the renewal link — the R$ 47 one for
// a Founder seat (preco_fundador), the annual offer otherwise. Pure rules, shared by the scheduled
// Edge Function (renovacao-emails) and its tests. The app shows its own notice in the last 15 days
// (src/access/notices.ts).
import type { Entitlement } from './logic-access.ts'

/** Days before the end of the access when an e-mail goes out. */
export const RENEWAL_MARKS = [15, 3] as const
export type RenewalMark = (typeof RENEWAL_MARKS)[number]
const DAY = 86_400_000

export interface RenewalDue {
  entitlementId: string
  email: string
  mark: RenewalMark
  /** Whole days left (1 to the mark). */
  dias: number
  expiresAt: string
  founderSeat: boolean
}

type Row = Entitlement & { id: string }

/**
 * The e-mails due now: annual accesses (fundador or anual, bought, live, with an end date) whose
 * end is within a mark, not sent for that mark yet, and not covered by a later access of the same
 * person (a renewal already bought, or a lifetime access).
 */
export function renewalsDue(rows: Row[], sent: Set<string>, now = new Date()): RenewalDue[] {
  const t = now.getTime()
  const live = rows.filter((e) => e.origem === 'compra' && e.status === 'ativo' && (e.expires_at === null || new Date(e.expires_at).getTime() > t))
  const out: RenewalDue[] = []
  for (const e of live) {
    if ((e.product_code !== 'fundador' && e.product_code !== 'anual') || e.expires_at === null) continue
    const email = e.email.toLowerCase()
    const end = new Date(e.expires_at).getTime()
    // Already covered: lifetime, or another access of the same person that ends later.
    const covered = live.some(
      (o) =>
        o !== e &&
        o.email.toLowerCase() === email &&
        (o.product_code === 'vitalicio' || ((o.product_code === 'fundador' || o.product_code === 'anual') && (o.expires_at === null || new Date(o.expires_at).getTime() > end))),
    )
    if (covered) continue
    const dias = Math.ceil((end - t) / DAY)
    // The smallest mark reached: 3 days left sends the 3-day e-mail, not a late 15-day one.
    const mark = [...RENEWAL_MARKS].reverse().find((m) => dias <= m)
    if (!mark || sent.has(`${e.id}:${mark}`)) continue
    // After the 3-day e-mail, the 15-day one is never sent late.
    if (mark === 15 && sent.has(`${e.id}:3`)) continue
    out.push({ entitlementId: e.id, email, mark, dias, expiresAt: e.expires_at, founderSeat: e.preco_fundador !== false })
  }
  return out
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })

/** The e-mail: subject, plain text and HTML (paper background, ember button). */
export function renewalEmail(d: RenewalDue, link: string, price: number) {
  const quando = d.dias <= 1 ? 'amanhã' : `em ${d.dias} dias`
  const subject = d.mark === 3 ? `Seu acesso ao A Palavra em Ordem termina ${quando}` : `Seu acesso ao A Palavra em Ordem termina em ${d.dias} dias`
  const precoTxt = `R$ ${price}`
  const lines = [
    `Seu acesso anual termina ${quando}, em ${fmt(d.expiresAt)}.`,
    'Não existe cobrança automática: nada será cobrado se você não fizer nada. Se quiser continuar a jornada, é só renovar.',
    d.founderSeat ? `Como Fundador, você renova por ${precoTxt}, o mesmo preço de quando entrou.` : `A renovação é de ${precoTxt} por mais 12 meses.`,
  ]
  const text = `${lines.join('\n\n')}\n\nRenovar: ${link}\n\nA Palavra em Ordem`
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F5EFE3;font-family:Georgia,serif;color:#1E2230">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE3;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="font-size:13px;letter-spacing:.18em;color:#8A6420;font-family:Arial,sans-serif;font-weight:bold;padding-bottom:18px">A PALAVRA EM ORDEM</td></tr>
${lines.map((l) => `<tr><td style="font-size:17px;line-height:1.55;padding-bottom:14px">${l}</td></tr>`).join('\n')}
<tr><td style="padding:12px 0 22px"><a href="${link}" style="display:inline-block;background:#C0552D;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;font-size:16px;padding:14px 26px;border-radius:12px">Renovar meu acesso · ${precoTxt}</a></td></tr>
<tr><td style="font-size:13px;color:#6B6455;font-family:Arial,sans-serif;line-height:1.5">Garantia incondicional de 30 dias. Se não fizer sentido para você, devolvemos 100%, sem perguntas.</td></tr>
</table></td></tr></table></body></html>`
  return { subject, text, html }
}
