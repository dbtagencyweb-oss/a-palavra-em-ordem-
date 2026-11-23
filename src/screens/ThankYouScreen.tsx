// /obrigado: where the payment platform sends the buyer after checkout. Finds what was bought
// (the person's live entitlements) and shows the next step for each item. Signed out: asks to
// sign in with the purchase e-mail, since that is how the purchase reaches the account.
import { useAccess } from '../access/AccessContext'
import { useAuth } from '../auth/AuthContext'
import { SignInForm } from '../auth/SignInForm'
import { ui } from '../content'
import { CheckIcon } from '../ui/icons'

const t = ui.obrigado

interface Props {
  onEnter(): void
  onDownloads(): void
}

export function ThankYouScreen({ onEnter, onDownloads }: Props) {
  const auth = useAuth()
  const { plano, extras, refresh, ready } = useAccess()
  const needsSignIn = auth.enabled && !auth.session
  const hasMain = plano.kind !== 'gratuito'
  const items = extras.filter((e) => e.product_code in t.passos)
  const found = hasMain || items.length > 0

  return (
    <section className="screen bg-ink text-paper" data-testid="obrigado">
      <div className="px-6 pb-10 pt-12">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-gold/20 text-gold-soft">
          <CheckIcon size={28} />
        </span>
        <h1 className="mt-5 text-[28px] leading-tight">{t.titulo}</h1>

        {needsSignIn ? (
          <div className="mt-4">
            <h2 className="text-lg text-gold-soft">{t.entrarTitulo}</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-paper/75">{t.entrarTexto}</p>
            <div className="mt-5">
              <SignInForm origem="obrigado" tone="dark" />
            </div>
          </div>
        ) : !found ? (
          <div className="mt-4" aria-live="polite">
            <p className="text-[15px] leading-relaxed text-paper/75">{ready ? t.aguardando : '…'}</p>
            <button type="button" onClick={refresh} className="mt-5 min-h-11 rounded-btn border border-white/20 px-5 text-sm font-bold">
              {t.verificar}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-[15px] leading-relaxed text-paper/75">{t.texto}</p>
            <ul className="mt-6 space-y-3">
              {hasMain && <Step step={t.passos.principal} onClick={onEnter} />}
              {items.map((e) => {
                const key = e.product_code as keyof typeof t.passos
                const step = t.passos[key]
                return <Step key={key} step={step} onClick={key === 'audio' ? onEnter : key === 'mapa-impresso' ? onDownloads : undefined} />
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}

function Step({ step, onClick }: { step: (typeof t.passos)['principal']; onClick?: () => void }) {
  return (
    <li className="rounded-card border border-white/10 bg-white/[0.05] p-4">
      <strong className="block font-display text-lg font-semibold">{step.titulo}</strong>
      <span className="mt-0.5 block text-[14px] text-paper/70">{step.texto}</span>
      {onClick ? (
        <button type="button" onClick={onClick} className="mt-3 min-h-11 w-full rounded-btn bg-paper px-4 text-sm font-bold text-ink">
          {step.botao}
        </button>
      ) : (
        <span className="mt-3 block text-[13px] text-gold-soft/80">{step.emBreve}</span>
      )}
    </li>
  )
}
