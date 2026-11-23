// /convite/<código>: the person invited by a family owner. Signs in (or creates the account) and
// accepts; from then on they have the same access as the owner, for as long as the owner has it.
// The code is kept on the device while the magic link / Google sign-in takes them away and back.
import { useEffect, useState } from 'react'
import { useAccess } from '../access/AccessContext'
import { acceptInvite } from '../access/family'
import { useAuth } from '../auth/AuthContext'
import { SignInForm } from '../auth/SignInForm'
import { ui } from '../content'
import { CheckIcon } from '../ui/icons'

const t = ui.familia
export const PENDING_INVITE = 'pao:convite-pendente'
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '')

export function InviteScreen({ codigo, onStart }: { codigo: string; onStart(): void }) {
  const auth = useAuth()
  const { refresh } = useAccess()
  const [state, setState] = useState<{ ok: true; dono: string } | { ok: false; motivo: string } | null>(null)
  const signedIn = Boolean(auth.session)

  useEffect(() => {
    try {
      localStorage.setItem(PENDING_INVITE, codigo)
    } catch {
      /* ignore */
    }
  }, [codigo])

  useEffect(() => {
    if (!signedIn && auth.enabled) return
    let alive = true
    acceptInvite(codigo)
      .then((dono) => {
        if (!alive) return
        try {
          localStorage.removeItem(PENDING_INVITE)
        } catch {
          /* ignore */
        }
        refresh()
        setState({ ok: true, dono })
      })
      .catch((e: Error) => alive && setState({ ok: false, motivo: e.message }))
    return () => {
      alive = false
    }
  }, [codigo, signedIn, auth.enabled, refresh])

  return (
    <section className="screen bg-ink text-paper" data-testid="convite">
      <div className="flex-none px-6 pb-10 pt-12">
        {state?.ok ? (
          <>
            <span className="grid h-14 w-14 place-items-center rounded-full bg-gold/20 text-gold-soft">
              <CheckIcon size={28} />
            </span>
            <h1 className="mt-5 text-[28px] leading-tight">{fill(t.conviteAceito, { dono: state.dono })}</h1>
            <button type="button" onClick={onStart} className="btn mt-6">
              {t.comecar}
            </button>
          </>
        ) : (
          <>
            <h1 className="text-[28px] leading-tight">{t.conviteTitulo}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-paper/75">{t.conviteTexto}</p>
            {state && !state.ok && <p className="mt-4 rounded-btn bg-ember/20 px-4 py-3 text-[14px]">{fill(t.conviteErro, { motivo: state.motivo })}</p>}
            {auth.enabled && !signedIn && (
              <div className="mt-6">
                <SignInForm origem="convite_familia" tone="dark" />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
