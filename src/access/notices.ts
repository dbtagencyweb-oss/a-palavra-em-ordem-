// Plan notices (docs/07, Prompt 7), as a pure rule over the person's entitlements:
//  - atraso:    a monthly charge failed; access stays for the tolerance days, with a discreet warning.
//  - renovacao: annual Founder Access ending within 30 days (lifetime never gets it).
//  - trocaAnual: on the monthly plan for 2 months or more; offered once, in the Profile.
import { isLive, type Entitlement } from '../../supabase/functions/_shared/logic-access'
import checkout from '../../config/checkout.json'

const DAY = 86_400_000
export const RENOVACAO_DIAS = 30
export const TROCA_APOS_DIAS = 60

export interface PlanNotices {
  atraso: { ate: string } | null
  renovacao: { vence: string; dias: number } | null
  trocaAnual: boolean
}

export function planNotices(entitlements: Entitlement[], now = new Date()): PlanNotices {
  const live = entitlements.filter((e) => isLive(e, now) && e.origem === 'compra')
  const lifetime = live.some((e) => e.product_code === 'vitalicio' || (e.product_code === 'fundador' && e.expires_at === null))

  const late = live.find((e) => e.product_code === 'mensal' && e.cobranca_falhou_em)
  const atraso = late?.expires_at ? { ate: late.expires_at } : null

  let renovacao: PlanNotices['renovacao'] = null
  if (!lifetime) {
    const fund = live.filter((e) => (e.product_code === 'fundador' || e.product_code === 'anual') && e.expires_at).sort((a, b) => b.expires_at!.localeCompare(a.expires_at!))[0]
    if (fund) {
      const dias = Math.ceil((new Date(fund.expires_at!).getTime() - now.getTime()) / DAY)
      if (dias <= RENOVACAO_DIAS) renovacao = { vence: fund.expires_at!, dias }
    }
  }

  // Monthly for 2 months or more (counted from the first charge of the subscription), not annual yet.
  const mensal = live.filter((e) => e.product_code === 'mensal')
  const since = mensal.map((e) => new Date(e.starts_at).getTime()).sort((a, b) => a - b)[0]
  const annual = live.some((e) => e.product_code === 'fundador' || e.product_code === 'vitalicio')
  const trocaAnual = Boolean(since && !annual && now.getTime() - since >= TROCA_APOS_DIAS * DAY)

  return { atraso, renovacao, trocaAnual }
}

const MAIN = (import.meta.env.VITE_HOTMART_CHECKOUT_URL as string | undefined) || ''
const ANUAL = (import.meta.env.VITE_HOTMART_CHECKOUT_ANUAL_URL as string | undefined) || ''
/** Renewal: a Founder seat renews at the Founder price (R$ 47); anyone else, at the annual offer. */
export const renewalLink = (founderSeat: boolean) => (founderSeat ? checkout.renovacaoFundador || MAIN : checkout.renovacaoAnual || ANUAL || MAIN)
export const links = {
  renovacao: checkout.renovacaoFundador || MAIN,
  trocaAnual: checkout.trocaParaAnual || MAIN,
  pagamento: checkout.atualizarPagamento,
}
