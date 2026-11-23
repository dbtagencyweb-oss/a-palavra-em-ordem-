import { useEffect, useState } from 'react'
import { track } from '../analytics/track'
import { useAuth } from './AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** "Reenviar" unlocks after this many seconds. */
export const RESEND_AFTER_S = 30

/**
 * Sign-in without a password: the magic link by e-mail is the main way (Supabase signInWithOtp);
 * Google stays as a second option. Shared by "Salve sua jornada" and the Profile.
 */
export function SignInForm({ origem, tone = 'light' }: { origem: string; tone?: 'light' | 'dark' }) {
  const { sendMagicLink, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [wait, setWait] = useState(0)
  const dark = tone === 'dark'

  useEffect(() => {
    if (wait <= 0) return
    const t = window.setTimeout(() => setWait((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [wait])

  async function send() {
    if (!EMAIL_RE.test(email.trim())) return setState('error')
    setState('sending')
    const r = await sendMagicLink(email.trim())
    if (r.error) return setState('error')
    track('sign_in_requested', { metodo: 'email', origem })
    setState('sent')
    setWait(RESEND_AFTER_S)
  }

  if (state === 'sent')
    return (
      <div role="status" className={`rounded-btn p-4 text-[14.5px] leading-normal ${dark ? 'bg-white/10 text-paper' : 'bg-olive-soft text-[#3C4626]'}`}>
        <b className="mb-1 block">Pronto!</b>
        Abra o link que enviamos para <b>{email.trim()}</b>. Pode fechar esta tela.
        <span className={`mt-2 block text-[13px] ${dark ? 'text-paper/70' : 'text-[#3C4626]/80'}`}>Não chegou? Olhe também em Spam ou Promoções.</span>
        <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <button type="button" disabled={wait > 0} onClick={() => void send()} className="min-h-11 font-bold underline underline-offset-2 disabled:no-underline disabled:opacity-60">
            {wait > 0 ? `Reenviar em ${wait} s` : 'Reenviar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setState('idle')
              setWait(0)
            }}
            className="min-h-11 underline underline-offset-2"
          >
            Usar outro e-mail
          </button>
        </span>
      </div>
    )

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
        noValidate
      >
        <label htmlFor={`email-${origem}`} className="sr-only">
          Seu e-mail
        </label>
        <input
          id={`email-${origem}`}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (state === 'error') setState('idle')
          }}
          aria-invalid={state === 'error'}
          aria-describedby={state === 'error' ? `email-err-${origem}` : undefined}
          className="mb-2.5 min-h-[52px] w-full rounded-btn border-[1.5px] border-line bg-card px-4 text-[16px] text-ink outline-none focus:border-ink"
        />
        {state === 'error' && (
          <p id={`email-err-${origem}`} role="alert" className={`mb-2.5 text-[13px] ${dark ? 'text-ember-soft' : 'text-ember-ink'}`}>
            Confira o e-mail e tente de novo.
          </p>
        )}
        <button type="submit" disabled={state === 'sending'} className="btn">
          {state === 'sending' ? 'Enviando…' : 'Receber meu link de acesso'}
        </button>
        <p className={`mt-2 text-center text-[12.5px] ${dark ? 'text-paper/60' : 'text-ink-3'}`}>Sem senha: o acesso chega pelo seu e-mail.</p>
      </form>
      <div className={`my-4 flex items-center gap-3 text-xs ${dark ? 'text-paper/50' : 'text-ink-3'}`}>
        <span className="h-px flex-1 bg-current opacity-40" /> ou <span className="h-px flex-1 bg-current opacity-40" />
      </div>
      <button
        type="button"
        className={`btn btn-ghost border-[1.5px] ${dark ? 'border-white/25 !text-paper' : 'border-line'}`}
        onClick={() => {
          track('sign_in_requested', { metodo: 'google', origem })
          void signInWithGoogle()
        }}
      >
        <GoogleIcon /> Continuar com Google
      </button>
    </div>
  )
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
)
