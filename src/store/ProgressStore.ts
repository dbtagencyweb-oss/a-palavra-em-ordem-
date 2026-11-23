import type { Progress } from '../game/progress'

/**
 * Persistence boundary for the user's journey. Screens only talk to this interface,
 * so the localStorage version can be swapped for Supabase in Sprint 4.
 */
export interface ProgressStore {
  load(): Promise<Progress>
  save(progress: Progress): Promise<void>
  reset(): Promise<void>
}
