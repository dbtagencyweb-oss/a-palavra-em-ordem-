// What the signed-in person has access to. Source of the entitlements:
//  - Supabase (when configured and signed in): the `entitlements` table, which RLS limits to the
//    person's own rows; refreshed when the app comes back to the foreground (e.g. from checkout).
//  - In development without Supabase: the payment simulator (src/access/devPayments.ts).
//  - Otherwise: none (free content only).
import { devUnlockAll } from '../dev/unlockAll'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { Entitlement } from '../../supabase/functions/_shared/logic-access'
import { useAuth } from '../auth/AuthContext'
import { cloudEnabled, getSupabase } from '../lib/supabase'
import { readDevEntitlements, subscribeDevEntitlements } from './devPayments'
import { canAccess, currentPlan, extras, type ContentKey, type Plan } from './rules'

interface AccessApi {
  ready: boolean
  entitlements: Entitlement[]
  podeAcessar(content: ContentKey): boolean
  plano: Plan
  /** Live bumps and studies. */
  extras: Entitlement[]
  refresh(): void
}

const Ctx = createContext<AccessApi | null>(null)
const cacheKey = (userId: string) => `pao:entitlements:${userId}`
const useDevStore = !cloudEnabled && import.meta.env.DEV

export function AccessProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id ?? null
  const dev = useSyncExternalStore(subscribeDevEntitlements, readDevEntitlements)
  const [cloud, setCloud] = useState<Entitlement[]>(() => readCache(userId))
  const [ready, setReady] = useState(!cloudEnabled)
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    setCloud(readCache(userId))
    const sb = getSupabase()
    if (!sb || !userId) {
      setReady(true)
      return
    }
    let cancelled = false
    const load = async () => {
      // my_entitlements: the person's rows, with family access marked expired once the owner's ends.
      const { data, error } = await (await sb).rpc('my_entitlements')
      if (cancelled) return
      setReady(true)
      if (error) return
      const list = (data ?? []) as Entitlement[]
      setCloud(list)
      try {
        localStorage.setItem(cacheKey(userId), JSON.stringify(list))
      } catch {
        /* ignore */
      }
    }
    void load()
    // Coming back from the checkout tab: check again.
    const onVisible = () => document.visibilityState === 'visible' && void load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, tick])

  const entitlements = useDevStore ? dev : userId ? cloud : []
  const api = useMemo<AccessApi>(() => {
    const now = new Date()
    return {
      ready,
      entitlements,
      podeAcessar: (content) => devUnlockAll() || canAccess(content, entitlements, new Date()),
      plano: currentPlan(entitlements, now),
      extras: extras(entitlements, now),
      refresh,
    }
  }, [ready, entitlements, refresh])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

/** Outside the provider (isolated component tests): free content only. */
const NONE: AccessApi = {
  ready: true,
  entitlements: [],
  podeAcessar: (content) => canAccess(content, []),
  plano: currentPlan([]),
  extras: [],
  refresh: () => {},
}

export function useAccess(): AccessApi {
  return useContext(Ctx) ?? NONE
}

function readCache(userId: string | null): Entitlement[] {
  if (!userId) return []
  try {
    return JSON.parse(localStorage.getItem(cacheKey(userId)) ?? '[]') as Entitlement[]
  } catch {
    return []
  }
}
