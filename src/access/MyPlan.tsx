// "Meu plano" in the Profile: what the person has, until when, and the Founder seal.
import { ui } from '../content'
import { useAccess } from './AccessContext'

const t = ui.plano

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function MyPlan({ onOffer, onDownloads }: { onOffer(): void; onDownloads?(): void }) {
  const { plano, extras, podeAcessar } = useAccess()
  const free = plano.kind === 'gratuito'
  // The seal is for Founder prices (annual or lifetime); the monthly plan has the same access but no seal.
  const seal = plano.kind === 'vitalicio' ? t.selos.vitalicio : plano.kind === 'fundador' ? t.selos.fundador : null

  return (
    <section className="mx-5 mt-6" aria-labelledby="meu-plano" data-testid="meu-plano" data-plano={plano.kind}>
      <h3 id="meu-plano" className="pb-2 text-lg">
        {t.titulo}
      </h3>
      <div className={`relative overflow-hidden rounded-card p-4 ${free ? 'border border-line bg-card' : 'bg-ink text-paper shadow-card'}`}>
        {plano.kind === 'vitalicio' && (
          <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(226,197,128,0.35),rgba(226,197,128,0)_70%)]" />
        )}
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <strong className="block font-display text-xl font-semibold">{t.nomes[plano.kind]}</strong>
            <span className={`mt-0.5 block text-[13px] ${free ? 'text-ink-3' : 'text-paper/70'}`}>
              {free
                ? t.gratuitoTexto
                : plano.expiresAt === null
                  ? t.semVencimento
                  : `${plano.canceled ? t.cancelado : t.vence} ${formatDate(plano.expiresAt)}`}
            </span>
          </div>
          {seal && (
            <span
              className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] ${
                plano.kind === 'vitalicio'
                  ? 'seal-shine bg-[linear-gradient(120deg,#9C7A43,#E2C580_45%,#BD9B5A)] text-ink shadow-[0_0_14px_rgba(226,197,128,0.5)]'
                  : 'bg-gold/20 text-gold-soft'
              }`}
            >
              {seal}
            </span>
          )}
        </div>

        {extras.length > 0 && (
          <div className={`relative mt-4 border-t pt-3 ${free ? 'border-line' : 'border-white/10'}`}>
            <small className={`text-[11px] font-bold uppercase tracking-[0.12em] ${free ? 'text-gold-ink' : 'text-gold-soft/80'}`}>{t.incluso}</small>
            <ul className="mt-1.5 space-y-1 text-[14px]">
              {extras.map((e) => (
                <li key={e.product_code} className="flex items-center justify-between gap-2">
                  {t.produtos[e.product_code] ?? e.product_code}
                  {e.product_code === 'mapa-impresso' && onDownloads && podeAcessar('download-mapa-impresso') && (
                    <button type="button" onClick={onDownloads} className={`min-h-11 text-[13px] font-bold underline underline-offset-2 ${free ? 'text-ember-ink' : 'text-gold-soft'}`}>
                      Baixar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {free && (
          <button type="button" onClick={onOffer} className="btn-shine mt-4 min-h-11 w-full rounded-btn px-4 text-sm font-bold">
            {t.verOferta}
          </button>
        )}
      </div>
    </section>
  )
}
