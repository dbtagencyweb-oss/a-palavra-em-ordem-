import { createProgress, type Progress } from '../game/progress'
import type { ProgressStore } from './ProgressStore'

export const PROGRESS_KEY = 'pao:progress:v1'

export class LocalProgressStore implements ProgressStore {
  constructor(
    private readonly storage: Storage = window.localStorage,
    private readonly key: string = PROGRESS_KEY,
  ) {}

  async load(): Promise<Progress> {
    try {
      const raw = this.storage.getItem(this.key)
      if (!raw) return createProgress()
      const parsed = JSON.parse(raw) as Partial<Progress>
      if (parsed.version !== 1) return createProgress()
      return { ...createProgress(), ...parsed }
    } catch {
      return createProgress()
    }
  }

  async save(progress: Progress): Promise<void> {
    try {
      this.storage.setItem(this.key, JSON.stringify(progress))
    } catch {
      // Private mode or full storage: keep running in memory.
    }
  }

  async reset(): Promise<void> {
    try {
      this.storage.removeItem(this.key)
    } catch {
      /* ignore */
    }
  }
}
