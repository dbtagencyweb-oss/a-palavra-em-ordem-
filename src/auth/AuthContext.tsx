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
  sendMagicLink(email: string): Promise<{ error?: string }>
  signInWithGoogle(): Promise<{ error?: string }>
  signOut(): Promise<void>
}

const Ctx = createContext<AuthApi | null>(null)

const redirectTo = () => window.location.origin + '/'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!cloudEnabled)

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    let unsubscribe = () => {}
    let cancelled = false
    void sb.then(async (client) => {
      const { data } = await client.auth.getSession()
      if (cancelled) return
      setSession(data.session)
      setReady(true)
      unsubscribe = client.auth.onAuthStateChange((_event, s) => setSession(s)).data.subscription.unsubscribe
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
        if (sb) await (await sb).auth.signOut()
      },
    }),
    [ready, session],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useAuth(): AuthApi {
  const api = useContext(Ctx)
  if (!api) throw new Error('useAuth must be used inside <AuthProvider>')
  return api
}
