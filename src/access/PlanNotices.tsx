// The plan notices (docs/07, Prompt 7) in the app.
//  - PlanBanner (Home): a discreet line when a monthly charge failed (with the date access ends)
//    or when the annual Founder Access ends within 30 days (with the renewal checkout).
//  - AnnualSwitchOffer (Profile): for monthly subscribers of 2 months or more, shown once.
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { checkoutUrl } from '../auth/useFounder'
import { ui } from '../content'
import { useAccess } from './AccessContext'
import { formatDate } from './MyPlan'
import { links, planNotices, renewalLink } from './notices'
import { isFounderSeat } from './rules'

const t = ui.avisosPlano
const SEEN_KEY = 'pao:troca-anual-vista'

function open(base: string, userId: string | null, origem: string) {
  if (!base) return
  window.open(base.includes('hotmart.com/purchase') ? base : checkoutUrl(base, userId, origem), '_blank', 'noopener')
}

export function PlanBanner() {
  const { entitlements } = useAccess()
  const { session } = useAuth()
  const n = planNotices(entitlements)
  const uid = session?.user.id ?? null
  if (!n.atraso && !n.renovacao) return null
  return (
    <div className="mx-5 mt-2 flex-none space-y-2" role="status" data-testid="aviso-plano">
      {n.atraso && (
        <p className="flex items-center gap-3 rounded-btn border border-ember/30 bg-ember-soft/60 px-3.5 py-2.5 text-[13px] leading-snug text-ember-ink">
          <span className="flex-1">{t.atraso.replace('{data}', formatDate(n.atraso.ate))}</span>
          <button type="button" onClick={() => open(links.pagamento, uid, 'atraso')} className="min-h-11 flex-none font-bold underline underline-offset-2">
            {t.atrasoBotao}
          </button>
        </p>
      )}
      {n.renovacao && (
        <p className="flex items-center gap-3 rounded-btn border border-gold/40 bg-gold-soft/60 px-3.5 py-2.5 text-[13px] leading-snug text-gold-ink">
          <span className="flex-1">{n.renovacao.dias <= 0 ? t.renovacaoHoje : t.renovacao.replace('{data}', formatDate(n.renovacao.vence))}</span>
          <button type="button" onClick={() => open(renewalLink(isFounderSeat(entitlements)), uid, 'renovacao')} className="min-h-11 flex-none font-bold underline underline-offset-2">
            {t.renovacaoBotao}
          </button>
        </p>
      )}
    </div>
  )
}

export function AnnualSwitchOffer() {
  const { entitlements } = useAccess()
  const { session } = useAuth()
  const eligible = planNotices(entitlements).trocaAnual
  // Shown once: decided when the Profile opens, remembered so it never comes back.
  const [show] = useState(() => {
    try {
      return eligible && !localStorage.getItem(SEEN_KEY)
    } catch {
      return false
    }
  })
  const [open_, setOpen] = useState(show)
  useEffect(() => {
    if (!show) return
    try {
      localStorage.setItem(SEEN_KEY, new Date().toISOString())
    } catch {
      /* ignore */
    }
  }, [show])
  if (!open_) return null
  return (
    <section className="mx-5 mt-6 rounded-card bg-ink p-4 text-paper shadow-card" data-testid="troca-anual">
      <strong className="block font-display text-xl leading-tight text-gold-soft">{t.trocaTitulo}</strong>
      <p className="mt-1.5 text-[14px] leading-snug text-paper/80">{t.trocaTexto}</p>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={() => open(links.trocaAnual, session?.user.id ?? null, 'troca_anual')} className="btn-shine min-h-11 rounded-btn px-4 text-sm font-bold">
          {t.trocaBotao}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 px-2 text-sm font-semibold text-paper/70">
          {t.agoraNao}
        </button>
      </div>
    </section>
  )
}
