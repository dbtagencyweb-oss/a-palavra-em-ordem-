import { useState, type FormEvent } from 'react'
import { formatDate } from '../access/MyPlan'
import { MAX_ACCOUNT_NAME, useAuth } from './AuthContext'
import { accountInput } from './PremiumAccountForm'

export function AccountSettings() {
  const auth = useAuth()
  const [mode, setMode] = useState<'view' | 'name' | 'password'>('view')
  const [name, setName] = useState(auth.name)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [recoverySent, setRecoverySent] = useState(false)
  const createdAt = auth.session?.user.created_at

  function changeMode(next: typeof mode) {
    setMode(next)
    setName(auth.name)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmation('')
    setMessage('')
    setError('')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || mode === 'view') return
    if (mode === 'name' && !name.trim()) return setError('Digite seu nome.')
    if (mode === 'password') {
      if (!currentPassword) return setError('Digite sua senha atual.')
      if (newPassword.length < 8) return setError('Use pelo menos 8 caracteres na nova senha.')
      if (newPassword === currentPassword) return setError('Escolha uma senha diferente da atual.')
      if (confirmation !== newPassword) return setError('As duas senhas precisam ser iguais.')
    }

    setBusy(true)
    setError('')
    try {
      const result = mode === 'name'
        ? await auth.updateName(name)
        : await auth.setPassword(newPassword, { currentPassword })
      if (result.error) {
        if (mode === 'name') return setError('Não foi possível salvar seu nome. Tente novamente.')
        if (('code' in result) && result.code === 'current_password_mismatch') return setError('A senha atual está incorreta.')
        return setError('Não foi possível alterar a senha. Confira sua senha atual ou use a recuperação por e-mail.')
      }
      changeMode('view')
      setMessage(mode === 'name' ? 'Nome atualizado.' : 'Senha alterada.')
    } catch {
      setError('O serviço de acesso está indisponível. Tente novamente em instantes.')
    } finally {
      setBusy(false)
    }
  }

  async function sendRecovery() {
    if (!auth.email || busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await auth.requestPasswordLink(auth.email, 'recovery')
      if (result.error) return setError('Não foi possível enviar o link. Tente novamente em instantes.')
      setRecoverySent(true)
      setMessage('Enviamos um link de recuperação para o e-mail da sua conta.')
    } catch {
      setError('Não foi possível enviar o link. Tente novamente em instantes.')
    } finally {
      setBusy(false)
    }
  }

  async function leave() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const result = await auth.signOut()
      if (result.error) setError('Não foi possível sair agora. Tente novamente.')
    } catch {
      setError('Não foi possível sair agora. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-card border border-line bg-card p-4">
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-ink-3">Nome</dt>
          <dd className="mt-0.5 break-words font-semibold">{auth.name || 'A preencher'}</dd>
        </div>
        <div>
          <dt className="text-ink-3">E-mail da conta</dt>
          <dd className="mt-0.5 break-all font-semibold">{auth.email}</dd>
        </div>
        {createdAt && (
          <div>
            <dt className="text-ink-3">Conta criada em</dt>
            <dd className="mt-0.5 font-semibold">{formatDate(createdAt)}</dd>
          </div>
        )}
      </dl>

      {mode === 'view' ? (
        <div className="mt-3 flex flex-wrap gap-x-4 border-t border-line pt-1 text-sm font-semibold">
          <button className="min-h-11 underline underline-offset-2" type="button" disabled={busy} onClick={() => changeMode('name')}>Editar nome</button>
          <button className="min-h-11 underline underline-offset-2" type="button" disabled={busy} onClick={() => changeMode('password')}>Alterar senha</button>
          <button className="ml-auto min-h-11 text-ember-ink underline underline-offset-2" type="button" disabled={busy} onClick={() => void leave()}>Sair</button>
        </div>
      ) : (
        <form className="mt-4 space-y-3 border-t border-line pt-4" onSubmit={(event) => void save(event)} noValidate>
          {mode === 'name' ? (
            <label className="block text-sm font-semibold">Seu nome
              <input className={accountInput} type="text" autoComplete="given-name" maxLength={MAX_ACCOUNT_NAME} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} />
            </label>
          ) : (
            <>
              <input type="email" autoComplete="username" value={auth.email ?? ''} readOnly hidden />
              <label className="block text-sm font-semibold">Senha atual
                <input className={accountInput} type="password" autoComplete="current-password" value={currentPassword} disabled={busy} onChange={(event) => setCurrentPassword(event.target.value)} />
              </label>
              <label className="block text-sm font-semibold">Nova senha
                <input className={accountInput} type="password" autoComplete="new-password" value={newPassword} disabled={busy} onChange={(event) => setNewPassword(event.target.value)} />
              </label>
              <label className="block text-sm font-semibold">Confirme a nova senha
                <input className={accountInput} type="password" autoComplete="new-password" value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} />
              </label>
            </>
          )}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Aguarde…' : mode === 'name' ? 'Salvar nome' : 'Salvar nova senha'}</button>
          <div className="flex flex-wrap gap-x-4 text-sm font-semibold">
            <button className="min-h-11 underline underline-offset-2" type="button" disabled={busy} onClick={() => changeMode('view')}>Cancelar</button>
            {mode === 'password' && (
              <button className="min-h-11 underline underline-offset-2 disabled:opacity-60" type="button" disabled={busy} onClick={() => void sendRecovery()}>
                {recoverySent ? 'Reenviar link de recuperação' : 'Esqueci a senha atual'}
              </button>
            )}
          </div>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-ember-ink">{error}</p>}
      {message && <p role="status" className="mt-2 text-sm font-semibold text-ink-2">{message}</p>}
    </div>
  )
}
