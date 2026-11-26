import { useState, type FormEvent } from 'react'
import { useAccess } from '../access/AccessContext'
import { MAX_ACCOUNT_NAME, useAuth, type PasswordPurpose } from '../auth/AuthContext'
import { accountInput, PremiumAccountForm } from '../auth/PremiumAccountForm'
import { Logo } from '../ui/Logo'

interface Props {
  purpose?: PasswordPurpose
  onBack(): void
  onDone(): void
}

export function AccountScreen({ purpose, onBack, onDone }: Props) {
  const auth = useAuth()
  const access = useAccess()
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get('token_hash'))
  const [verifiedUser, setVerifiedUser] = useState<string | null>(null)
  const [failure, setFailure] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const preview = import.meta.env.DEV && purpose === 'activation' && !token &&
    new URLSearchParams(window.location.search).get('preview') === 'cadastro'
  const accountEmail = preview ? 'comprador@exemplo.com' : auth.email
  const userId = auth.session?.user.id
  const activated = access.plano.kind !== 'gratuito' || access.extras.length > 0
  const needsName = preview || (purpose === 'activation' && !auth.name)
  const canSetPassword = !!userId && !token && !failure &&
    (purpose === 'activation' ? access.ready && activated : auth.recovery || verifiedUser === userId)

  async function confirmEmail() {
    if (!token || !purpose || busy) return
    setBusy(true)
    const url = new URL(window.location.href)
    url.searchParams.delete('token_hash')
    window.history.replaceState(null, '', url)
    try {
      const result = await auth.verifyPasswordLink(token, purpose)
      if (result.error || !result.userId) setFailure(true)
      else setVerifiedUser(result.userId)
    } catch {
      setFailure(true)
    } finally {
      setToken(null)
      setBusy(false)
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || (!preview && !canSetPassword)) return
    if (needsName && !name.trim()) return setError('Digite seu nome para completar a conta.')
    if (password.length < 8) return setError('Use pelo menos 8 caracteres na senha.')
    if (password !== confirmation) return setError('As duas senhas precisam ser iguais.')
    setError('')
    if (preview) {
      setPassword('')
      setConfirmation('')
      setSaved(true)
      return
    }
    setBusy(true)
    try {
      const result = await auth.setPassword(password, needsName ? { name } : undefined)
      if (result.code === 'current_password_required') setError('Esta conta já tem uma senha. Use a recuperação por e-mail se precisar redefini-la.')
      else if (result.error) setError('Não foi possível salvar a senha. Tente uma senha diferente ou solicite um novo link.')
      else setSaved(true)
    } catch {
      setError('O serviço de acesso está indisponível. Tente novamente em instantes.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="screen">
      <div className="mx-auto flex w-full max-w-sm flex-col px-7 pb-8 pt-8">
        <button type="button" className="mb-6 min-h-11 self-start text-sm font-semibold text-ink-2" onClick={onBack}>‹ Voltar</button>
        <Logo variant="full" title="A Palavra em Ordem" className="mb-5 h-14 w-auto self-start text-ink" />
        <h1 className="mb-2 text-[30px] leading-tight">{purpose === 'recovery' ? 'Recuperar senha' : purpose ? 'Ativar meu acesso' : 'Entrar na minha conta'}</h1>
        {preview && <p className="mb-2 text-sm text-ink-2">Prévia DEV com dados fictícios.</p>}
        {saved ? (
          <>
            <p role="status" className="mb-5 text-sm">{preview ? 'Validação do formulário concluída.' : 'Senha salva. Você já pode usá-la para entrar em outros aparelhos.'}</p>
            <button className="btn" type="button" onClick={preview ? () => setSaved(false) : onDone}>{preview ? 'Rever cadastro' : 'Continuar'}</button>
          </>
        ) : token && auth.enabled ? (
          <button className="btn mt-4" type="button" disabled={busy || !auth.ready} onClick={() => void confirmEmail()}>
            {busy ? 'Verificando…' : 'Confirmar e-mail'}
          </button>
        ) : !preview && !auth.ready && auth.enabled ? (
          <p role="status" className="mb-5 text-sm">Verificando seu acesso…</p>
        ) : preview || (purpose && canSetPassword) ? (
          <form className="mt-3 space-y-3" onSubmit={(event) => void save(event)} noValidate>
            <p className="text-sm text-ink-2">{accountEmail}</p>
            <input type="email" autoComplete="username" value={accountEmail ?? ''} readOnly hidden />
            {needsName && (
              <label className="block text-sm font-semibold">Seu nome
                <input type="text" autoComplete="given-name" maxLength={MAX_ACCOUNT_NAME} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} className={accountInput} />
              </label>
            )}
            <label className="block text-sm font-semibold">Nova senha
              <input type="password" autoComplete="new-password" value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} className={accountInput} />
            </label>
            <label className="block text-sm font-semibold">Confirme sua senha
              <input type="password" autoComplete="new-password" value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} className={accountInput} />
            </label>
            {error && <p role="alert" className="text-sm text-ember-ink">{error}</p>}
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar senha'}</button>
          </form>
        ) : purpose === 'activation' && userId && !failure ? (
          <>
            <p role="status" className="mb-5 text-sm text-ink-2">
              {access.ready ? `Ainda estamos aguardando a confirmação da compra para ${auth.email}.` : 'Verificando a confirmação da compra…'}
            </p>
            <button type="button" className="btn" onClick={access.refresh}>Verificar compra</button>
            <button type="button" className="btn btn-ghost mt-2" onClick={() => void auth.signOut()}>Usar outro e-mail</button>
          </>
        ) : !purpose && userId ? (
          <button type="button" className="btn mt-3" onClick={onDone}>Continuar para a jornada</button>
        ) : (
          <>
            <p className="mb-5 text-sm leading-relaxed text-ink-2">
              {failure ? 'Este link expirou ou já foi usado. Solicite um novo.'
                : purpose ? 'Peça um novo link no e-mail da sua conta.'
                : 'Use o e-mail da compra para entrar ou ativar seu primeiro acesso.'}
            </p>
            <PremiumAccountForm origem="conta" initialMode={purpose} />
          </>
        )}
      </div>
    </section>
  )
}
