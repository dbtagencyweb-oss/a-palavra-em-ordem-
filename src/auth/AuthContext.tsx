import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { cloudEnabled, getSupabase } from '../lib/supabase'

interface AuthApi {
  /** False when Supabase isn't configured: account features stay hidden. */
  enabled: boolean
  ready: boolean
  session: Session | null
  email: string | null
  name: string
  recovery: boolean
  sendMagicLink(email: string): Promise<{ error?: string }>
  signInWithPassword(email: string, password: string): Promise<{ error?: string }>
  requestPasswordLink(email: string, purpose: PasswordPurpose): Promise<{ error?: string }>
  verifyPasswordLink(tokenHash: string, purpose: PasswordPurpose): Promise<{ error?: string; userId?: string }>
  updateName(name: string): Promise<{ error?: string }>
  setPassword(password: string, options?: { currentPassword?: string; name?: string }): Promise<{ error?: string; code?: string }>
  signInWithGoogle(): Promise<{ error?: string }>
  signOut(): Promise<{ error?: string }>
}

const Ctx = createContext<AuthApi | null>(null)
export type PasswordPurpose = 'activation' | 'recovery'
const passwordPath = { activation: '/ativar-conta', recovery: '/recuperar-senha' }
export const MAX_ACCOUNT_NAME = 80

/**
 * Where the sign-in link comes back to: the app, keeping the audience and campaign the person came
 * with (publico, utm_*), so the flow continues where it was (diagnosis pre-selected, or Home), even
 * when the e-mail is opened on another device.
 */
export function redirectTo(search = window.location.search, pathname = window.location.pathname): string {
  const keep = new URLSearchParams()
  new URLSearchParams(search).forEach((v, k) => {
    if (k === 'publico' || k.startsWith('utm_')) keep.set(k, v)
  })
  const q = keep.toString()
  const returnPath = pathname.replace(/\/$/, '') === '/obrigado' ? '/obrigado' : '/'
  return window.location.origin + returnPath + (q ? `?${q}` : '')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!cloudEnabled)
  const [recoveryUser, setRecoveryUser] = useState<string | null>(null)

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    let unsubscribe = () => {}
    let cancelled = false
    void sb.then((client) => {
      if (cancelled) return
      const { data } = client.auth.onAuthStateChange((event, nextSession) => {
        setSession(nextSession)
        if (event === 'PASSWORD_RECOVERY') setRecoveryUser(nextSession?.user.id ?? null)
        if (event === 'SIGNED_OUT') setRecoveryUser(null)
        setReady(true)
      })
      unsubscribe = () => data.subscription.unsubscribe()
    }).catch(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const api = useMemo<AuthApi>(
    () => ({
      enabled: cloudEnabled,
      ready,
      session,
      email: session?.user.email ?? null,
      name: readName(session),
      recovery: !!session && recoveryUser === session.user.id,
      signInWithPassword: async (email, password) => {
        const sb = getSupabase()
        if (!sb) return { error: 'indisponível' }
        const { error } = await (await sb).auth.signInWithPassword({ email, password })
        return error ? { error: error.message } : {}
      },
      requestPasswordLink: async (email, purpose) => {
        const sb = getSupabase()
        if (!sb) return { error: 'indisponível' }
        const { auth } = await sb
        const callback = new URL(passwordPath[purpose], window.location.origin)
        const { error } = purpose === 'recovery'
          ? await auth.resetPasswordForEmail(email, { redirectTo: callback.href })
          : await auth.signInWithOtp({ email, options: { emailRedirectTo: callback.href } })
        return error ? { error: error.message } : {}
      },
      verifyPasswordLink: async (tokenHash, purpose) => {
        const sb = getSupabase()
        if (!sb) return { error: 'indisponível' }
        const { data, error } = await (await sb).auth.verifyOtp({
          token_hash: tokenHash,
          type: purpose === 'activation' ? 'email' : 'recovery',
        })
        return error ? { error: error.message } : { userId: data.session?.user.id }
      },
      updateName: async (name) => {
        const sb = getSupabase()
        const trimmed = name.trim()
        if (!sb || !session || !trimmed || trimmed.length > MAX_ACCOUNT_NAME) return { error: 'Nome inválido ou sessão indisponível.' }
        const { error } = await (await sb).auth.updateUser({ data: { name: trimmed } })
        return error ? { error: error.message } : {}
      },
      setPassword: async (password, { currentPassword, name } = {}) => {
        const sb = getSupabase()
        if (!sb || !session) return { error: 'indisponível' }
        const trimmed = name?.trim()
        if (name !== undefined && (!trimmed || trimmed.length > MAX_ACCOUNT_NAME)) return { error: 'Nome inválido.' }
        const { error } = await (await sb).auth.updateUser({
          password,
          ...(currentPassword === undefined ? {} : { current_password: currentPassword }),
          ...(trimmed ? { data: { name: trimmed } } : {}),
        })
        if (error) return { error: error.message, code: error.code }
        setRecoveryUser(null)
        return {}
      },
      sendMagicLink: async (email) => {
        const sb = getSupabase()
        if (!sb) return { error: 'indisponível' }
        const { error } = await (await sb).auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } })
        return error ? { error: error.message } : {}
      },
      signInWithGoogle: async () => {
        const sb = getSupabase()
        if (!sb) return { error: 'indisponível' }
        const { error } = await (await sb).auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
        return error ? { error: error.message } : {}
      },
      signOut: async () => {
        const sb = getSupabase()
        if (!sb) return {}
        const { error } = await (await sb).auth.signOut({ scope: 'local' })
        return error ? { error: error.message } : {}
      },
    }),
    [ready, recoveryUser, session],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

function readName(session: Session | null): string {
  const metadata = session?.user.user_metadata
  const name = metadata?.name ?? metadata?.full_name
  return typeof name === 'string' ? name.trim() : ''
}

export function useAuth(): AuthApi {
  const api = useContext(Ctx)
  if (!api) throw new Error('useAuth must be used inside <AuthProvider>')
  return api
}
