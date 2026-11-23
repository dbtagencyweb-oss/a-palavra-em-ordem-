// /igreja/<código>: someone opens the link a group leader shared (Licença Igreja, docs/07 Prompt 10).
// Signs in (or creates the account) and joins; from then on they have full access while the group
// is active. The code is kept on the device while the magic link / Google sign-in takes them away.
import { useEffect, useState } from 'react'
import { useAccess } from '../access/AccessContext'
import { joinChurchGroup } from '../access/group'
import { useAuth } from '../auth/AuthContext'
import { SignInForm } from '../auth/SignInForm'
import { CheckIcon } from '../ui/icons'

export const PENDING_GROUP = 'pao:grupo-pendente'

export function GroupJoinScreen({ codigo, onStart }: { codigo: string; onStart(): void }) {
  const auth = useAuth()
  const { refresh } = useAccess()
  const [state, setState] = useState<{ ok: true; grupo: string } | { ok: false; motivo: string } | null>(null)
  const signedIn = Boolean(auth.session)

  useEffect(() => {
    try {
      localStorage.setItem(PENDING_GROUP, codigo)
    } catch {
      /* ignore */
    }
  }, [codigo])

  useEffect(() => {
    if (!signedIn && auth.enabled) return
    let alive = true
    joinChurchGroup(codigo)
      .then((grupo) => {
        if (!alive) return
        try {
          localStorage.removeItem(PENDING_GROUP)
        } catch {
          /* ignore */
        }
        refresh()
        setState({ ok: true, grupo })
      })
      .catch((e: Error) => alive && setState({ ok: false, motivo: e.message }))
    return () => {
      alive = false
    }
  }, [codigo, signedIn, auth.enabled, refresh])

  return (
    <section className="screen bg-ink text-paper" data-testid="entrar-grupo">
      <div className="flex-none px-6 pb-10 pt-12">
        {state?.ok ? (
          <>
            <span className="grid h-14 w-14 place-items-center rounded-full bg-gold/20 text-gold-soft">
              <CheckIcon size={28} />
            </span>
            <h1 className="mt-5 text-[28px] leading-tight">Pronto. Agora você lê com {state.grupo}.</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-paper/75">
              Cada um no seu ritmo, com a sua lâmpada e o seu diário. O líder vê só o seu primeiro nome e o seu progresso, nunca o que você escreve.
            </p>
            <button type="button" onClick={onStart} className="btn mt-6">
              Começar a jornada
            </button>
          </>
        ) : (
          <>
            <h1 className="text-[28px] leading-tight">Seu grupo está lendo a Bíblia em ordem</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-paper/75">
              Entre com seu e-mail ou Google para ler junto. Cinco minutos por dia, cada um no seu app.
            </p>
            {state && !state.ok && <p className="mt-4 rounded-btn bg-ember/20 px-4 py-3 text-[14px]">Não deu para entrar no grupo: {state.motivo}.</p>}
            {auth.enabled && !signedIn && (
              <div className="mt-6">
                <SignInForm origem="convite_igreja" tone="dark" />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
