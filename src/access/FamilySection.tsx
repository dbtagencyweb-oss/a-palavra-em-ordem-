// "Minha família" in the Profile (docs/07, Prompt 6).
//  - Owner (bought the "familia" bump): 2 slots. Free → "Convidar" (link + ready WhatsApp message);
//    pending → resend or cancel; accepted → the person's first name and "Remover" (a swap, 2/year).
//  - Owner and members: the family's lamps (only of those who share it) and the switch to share one's own.
import { canRevoke, FAMILY_SLOTS, inviteMessage, lampSentence, SWAPS_PER_YEAR } from '../../supabase/functions/_shared/logic-family'
import { ui } from '../content'
import { LampIcon } from '../ui/icons'
import { useToast } from '../ui/Toast'
import { inviteLink, useFamily } from './family'

const t = ui.familia
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''))

function whatsapp(codigo: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage(inviteLink(codigo)))}`, '_blank', 'noopener')
}

export function FamilySection() {
  const { family, create, revoke, setShare } = useFamily()
  const toast = useToast()
  if (!family.papel) return null
  const owner = family.papel === 'dono'
  const active = family.convites.filter((i) => i.status !== 'revogado')
  const slots = Array.from({ length: FAMILY_SLOTS }, (_, k) => active[k] ?? null)

  async function invite() {
    try {
      const inv = await create()
      whatsapp(inv.codigo)
    } catch (e) {
      toast((e as Error).message)
    }
  }
  async function copy(codigo: string) {
    try {
      await navigator.clipboard.writeText(inviteLink(codigo))
      toast(t.copiado)
    } catch {
      toast(inviteLink(codigo))
    }
  }
  async function remove(id: string, nome: string | null | undefined, accepted: boolean) {
    if (accepted && !window.confirm(fill(t.confirmarRemover, { nome: nome ?? 'esta pessoa' }))) return
    try {
      await revoke(id)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <section className="mx-5 mt-6" aria-labelledby="minha-familia" data-testid="minha-familia" data-papel={family.papel}>
      <h3 id="minha-familia" className="pb-1 text-lg">
        {t.titulo}
      </h3>
      <p className="pb-3 text-[13.5px] leading-snug text-ink-2">{owner ? t.textoDono : fill(t.textoMembro, { dono: family.dono_nome ?? '' })}</p>

      {owner && (
        <>
          <ul className="space-y-2.5">
            {slots.map((inv, k) => (
              <li key={inv?.id ?? `livre-${k}`} className="rounded-card border border-line bg-card p-3.5" data-vaga={k + 1} data-status={inv?.status ?? 'livre'}>
                <small className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold-ink">{fill(t.vaga, { n: k + 1 })}</small>
                {!inv ? (
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="text-[14.5px] text-ink-3">{t.vagaLivre}</span>
                    <button type="button" onClick={() => void invite()} className="btn-shine min-h-11 rounded-btn px-4 text-sm font-bold">
                      {t.convidar}
                    </button>
                  </div>
                ) : inv.status === 'pendente' ? (
                  <>
                    <p className="mt-1 text-[14.5px]">{t.convitePendente}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => whatsapp(inv.codigo)} className="min-h-11 rounded-btn bg-olive px-3.5 text-[13px] font-bold text-white">
                        {t.enviarDeNovo}
                      </button>
                      <button type="button" onClick={() => void copy(inv.codigo)} className="min-h-11 rounded-btn border border-line px-3.5 text-[13px] font-bold">
                        {t.copiar}
                      </button>
                      <button type="button" onClick={() => void remove(inv.id, null, false)} className="min-h-11 px-2 text-[13px] font-semibold text-ink-3 underline">
                        {t.cancelar}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <strong className="text-[15px]">{inv.membro_nome ?? 'Convidado'}</strong>
                    <button
                      type="button"
                      disabled={!canRevoke(inv, family.convites)}
                      onClick={() => void remove(inv.id, inv.membro_nome, true)}
                      className="min-h-11 px-2 text-[13px] font-semibold text-ember-ink underline disabled:text-ink-3 disabled:no-underline"
                    >
                      {t.remover}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-ink-3">{fill(t.trocas, { n: Math.min(family.trocas_usadas, SWAPS_PER_YEAR) })}</p>
        </>
      )}

      {family.lampadas.length > 0 && (
        <div className="mt-4 rounded-card bg-card p-3.5 shadow-card" aria-live="polite">
          <small className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold-ink">{t.lampadasTitulo}</small>
          <ul className="mt-1.5 space-y-1.5">
            {family.lampadas.map((l) => (
              <li key={`${l.nome}-${l.eu}`} className="flex items-center gap-2 text-[14px]">
                <LampIcon className={`h-4 w-4 flex-none ${l.lampada > 0 ? 'text-ember' : 'text-ink-3'}`} />
                {l.eu ? `Você: ${l.lampada} ${l.lampada === 1 ? 'dia' : 'dias'}` : lampSentence(l.nome, l.lampada)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Same switch as the other Profile preferences. */}
      <div className="mt-3 flex min-h-[64px] items-center justify-between gap-4 border-b border-line py-3">
        <div>
          <div className="text-[14.5px]">{t.compartilhar}</div>
          <div className="mt-0.5 text-xs text-ink-3">{t.compartilharDica}</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={family.compartilhar}
          aria-label={t.compartilhar}
          data-sound="none"
          onClick={() => void setShare(!family.compartilhar)}
          className={`relative h-[30px] w-[52px] flex-none rounded-full transition-colors ${family.compartilhar ? 'bg-olive' : 'bg-line'}`}
        >
          <span className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-[left] ${family.compartilhar ? 'left-[25px]' : 'left-[3px]'}`} />
        </button>
      </div>
    </section>
  )
}
