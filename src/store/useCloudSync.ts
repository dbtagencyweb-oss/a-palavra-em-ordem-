import { useEffect, useRef, useState } from 'react'
import { tracker } from '../analytics/track'
import { useAuth } from '../auth/AuthContext'
import { mergeProgress } from '../game/merge'
import { refreshForToday, type Progress } from '../game/progress'
import { getSupabase } from '../lib/supabase'
import { useProgress } from './ProgressContext'
import { SupabaseProgressStore } from './SupabaseProgressStore'

const PUSH_DELAY_MS = 1500

/**
 * Local-first sync: the device copy (localStorage) is always the source the UI reads.
 * On login, the account copy is merged in (this is the localStorage → Supabase migration),
 * and every later change is pushed up shortly after it happens.
 */
export function useCloudSync() {
  const { session } = useAuth()
  const { progress, update, today } = useProgress()
  const storeRef = useRef<SupabaseProgressStore | null>(null)
  const [ready, setReady] = useState(false)
  const userId = session?.user.id ?? null

  useEffect(() => {
    tracker.setUser(userId)
    storeRef.current = null
    setReady(false)
    const sb = getSupabase()
    if (!sb || !userId) return
    let cancelled = false
    let store: SupabaseProgressStore
    sb.then((client) => {
      store = new SupabaseProgressStore(client, userId)
      return store.load()
    })
      .then((remote) => {
        if (cancelled) return
        let merged: Progress | null = null
        update((local) => {
          merged = refreshForToday(mergeProgress(local, remote), today).progress
          return merged
        })
        storeRef.current = store
        setReady(true)
        if (merged) void store.save(merged).catch(() => {})
      })
      .catch(() => {
        // Offline or not reachable: keep playing locally, try again on the next login/app start.
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (!ready || !storeRef.current) return
    const store = storeRef.current
    const t = window.setTimeout(() => void store.save(progress).catch(() => {}), PUSH_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [progress, ready])
}
