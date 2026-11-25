import { useId, useState, type FormEvent } from 'react'
import { track } from '../analytics/track'
import { useAuth, type PasswordPurpose } from './AuthContext'

type Mode = 'login' | PasswordPurpose
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const titles = { login: 'Entrar', activation: 'Receber link de primeiro acesso', recovery: 'Receber link de recuperação' }

export function PremiumAccountForm({ origem, initialMode = 'login', dark = false }: {
  origem: string
  initialMode?: Mode
  dark?: boolean
}) {
  const auth = useAuth()
  const id = useId()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  function changeMode(next: Mode) {
    setMode(next)
    setPassword('')
    setError('')
    setSent(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !auth.enabled) return
    const address = email.trim().toLowerCase()
    if (!validEmail.test(address)) return setError('Confira o e-mail e tente novamente.')
    if (mode === 'login' && !password) return setError('Digite sua senha para entrar.')
    setError('')
    setBusy(true)
    try {
      const result = mode === 'login'
        ? await auth.signInWithPassword(address, password)
        : await auth.requestPasswordLink(address, mode)
      if (result.error) {
        setError(mode === 'login'
          ? 'Não foi possível entrar. Confira o e-mail e a senha ou use o primeiro acesso.'
          : 'Não foi possível enviar o link agora. Confira o e-mail e tente em instantes.')
        return
      }
      track('sign_in_requested', { metodo: 'email', origem })
      if (mode !== 'login') setSent(true)
    } catch {
      setError('O serviço de acesso está indisponível. Tente novamente em instantes.')
    } finally {
      setBusy(false)
    }
  }

  if (!auth.enabled) return <p role="status" className="text-sm">O acesso por conta está indisponível neste ambiente.</p>

  return (
    <div>
      {sent ? (
        <p role="status" className="rounded-btn border border-current/20 p-4 text-sm leading-relaxed">
          {mode === 'activation' ? 'Enviamos um link para confirmar seu e-mail e criar sua senha.' : 'Se houver uma conta nesse e-mail, você receberá um link para redefinir a senha.'}
          {' '}Confira sua caixa de entrada e a pasta de spam.
        </p>
      ) : (
        <form className="space-y-3" onSubmit={(event) => void submit(event)} noValidate>
          <label htmlFor={id + '-email'} className="block text-sm font-semibold">
            {mode === 'recovery' ? 'E-mail da sua conta' : 'E-mail da compra'}
            <input id={id + '-email'} type="email" autoComplete="username" inputMode="email" required value={email} disabled={busy}
              onChange={(event) => setEmail(event.target.value)} className={accountInput} placeholder="seu@email.com" />
          </label>
          {mode === 'login' && (
            <label htmlFor={id + '-password'} className="block text-sm font-semibold">
              Senha
              <input id={id + '-password'} type="password" autoComplete="current-password" required value={password} disabled={busy}
                onChange={(event) => setPassword(event.target.value)} className={accountInput} />
            </label>
          )}
          {error && <p role="alert" className={dark ? 'text-sm text-ember-soft' : 'text-sm text-ember-ink'}>{error}</p>}
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Aguarde…' : titles[mode]}</button>
        </form>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 text-sm font-semibold">
        {mode !== 'login' && <button type="button" className="min-h-11 underline underline-offset-2" disabled={busy} onClick={() => changeMode('login')}>Entrar com senha</button>}
        {mode === 'login' && <button type="button" className="min-h-11 underline underline-offset-2" disabled={busy} onClick={() => changeMode('activation')}>Primeiro acesso</button>}
        {mode === 'login' && <button type="button" className="min-h-11 underline underline-offset-2" disabled={busy} onClick={() => changeMode('recovery')}>Esqueci minha senha</button>}
        {sent && <button type="button" className="min-h-11 underline underline-offset-2" onClick={() => changeMode(mode)}>Usar outro e-mail</button>}
      </div>
    </div>
  )
}

export const accountInput = 'mt-1.5 min-h-[52px] w-full rounded-btn border border-line bg-card px-4 text-base font-normal text-ink outline-none focus:border-gold'
