import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { track } from '../analytics/track'
import { getDay } from '../content'
import { MAPA, type Trail } from '../content/trails'
import {
  completeDay as completeDayRule,
  createProgress,
  refreshForToday,
  type CompletionResult,
  type DiaryEntry,
  type Progress,
} from '../game/progress'
import type { DateKey } from '../game/dates'
import { getDevDayOffset, setDevDayOffset, today as clockToday } from './clock'
import { LocalProgressStore } from './LocalProgressStore'
import type { ProgressStore } from './ProgressStore'

interface ProgressApi {
  progress: Progress
  today: DateKey
  /** Grace spent since the last time the UI showed it. */
  pendingGrace: number
  clearPendingGrace(): void
  update(change: (p: Progress) => Progress): void
  completeDay(n: number, firstTryActivities: number, trail?: Trail): CompletionResult
  /** Returns the new entry id. */
  addDiaryEntry(tag: string, fields: Record<string, string>): string
  updateDiaryEntry(id: string, fields: Record<string, string>): void
  devAdvanceDay(): void
  devReset(): Promise<void>
  devDayOffset: number
}

const Ctx = createContext<ProgressApi | null>(null)

export function ProgressProvider({
  children,
  store = new LocalProgressStore(),
}: {
  children: ReactNode
  store?: ProgressStore
}) {
  const storeRef = useRef(store)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [today, setToday] = useState(clockToday)
  const [pendingGrace, setPendingGrace] = useState(0)
  const [devDayOffset, setOffset] = useState(getDevDayOffset)

  const progressRef = useRef<Progress | null>(null)

  const commit = useCallback((p: Progress) => {
    progressRef.current = p
    setProgress(p)
    void storeRef.current.save(p)
  }, [])

  const refresh = useCallback(
    (p: Progress, day: DateKey) => {
      const r = refreshForToday(p, day)
      if (r.graceUsed) {
        setPendingGrace((g) => g + r.graceUsed)
        track('streak_saved_by_grace', { dias: r.graceUsed })
      }
      commit(r.progress)
      return r.progress
    },
    [commit],
  )

  useEffect(() => {
    void storeRef.current.load().then((p) => refresh(p, clockToday()))
  }, [refresh])

  // Catch midnight while the app stays open.
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = clockToday()
      if (t !== today) setToday(t)
    }, 60_000)
    return () => window.clearInterval(id)
  }, [today])

  // A new calendar day (midnight or the dev button): walk the lamp forward.
  useEffect(() => {
    if (progressRef.current) refresh(progressRef.current, today)
  }, [today, refresh])

  const api = useMemo<ProgressApi | null>(() => {
    if (!progress) return null
    return {
      progress,
      today,
      pendingGrace,
      devDayOffset,
      clearPendingGrace: () => setPendingGrace(0),
      update: (change) => commit(change(progressRef.current!)),
      completeDay: (n, firstTry, trail = MAPA) => {
        const rewards =
          trail.id === MAPA.id
            ? { n, symbolId: getDay(n).simbolo.id, milestoneId: getDay(n).marco?.id }
            : { n, symbolId: trail.outline.find((d) => d.n === n)?.simbolo?.id }
        const result = completeDayRule(progressRef.current!, rewards, firstTry, today, trail.id)
        commit(result.progress)
        if (result.graceUsed) track('streak_saved_by_grace', { dias: result.graceUsed })
        return result
      },
      addDiaryEntry: (tag, fields) => {
        const entry: DiaryEntry = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          tag,
          fields,
        }
        const current = progressRef.current!
        commit({ ...current, diary: [entry, ...current.diary] })
        return entry.id
      },
      updateDiaryEntry: (id, fields) => {
        const current = progressRef.current!
        commit({ ...current, diary: current.diary.map((e) => (e.id === id ? { ...e, fields } : e)) })
      },
      devAdvanceDay: () => {
        const next = devDayOffset + 1
        setDevDayOffset(next)
        setOffset(next)
        setToday(clockToday())
      },
      devReset: async () => {
        await storeRef.current.reset()
        setDevDayOffset(0)
        setOffset(0)
        setPendingGrace(0)
        const t = clockToday()
        setToday(t)
        refresh(createProgress(), t)
      },
    }
  }, [progress, today, pendingGrace, devDayOffset, commit, refresh])

  if (!api) return null
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useProgress(): ProgressApi {
  const api = useContext(Ctx)
  if (!api) throw new Error('useProgress must be used inside <ProgressProvider>')
  return api
}
