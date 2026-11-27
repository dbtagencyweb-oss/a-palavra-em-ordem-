import { createProgress, type Progress } from '../game/progress'
import type { ProgressStore } from './ProgressStore'

export const PROGRESS_KEY = 'pao:progress:v1'
const LEGACY_READING_KEY = 'pao:ordem-leitura:v1'

export class LocalProgressStore implements ProgressStore {
  constructor(
    private readonly storage: Storage = window.localStorage,
    private readonly key: string = PROGRESS_KEY,
  ) {}

  async load(): Promise<Progress> {
    let progress = createProgress()
    try {
      const raw = this.storage.getItem(this.key)
      const parsed = raw ? JSON.parse(raw) as Partial<Progress> | null : null
      if (parsed?.version === 1) progress = { ...progress, ...parsed }
    } catch {
      // An invalid progress record can still have a separate reading history.
    }
    if (!Array.isArray(progress.readChapters)) progress.readChapters = []
    if (this.key === PROGRESS_KEY) {
      try {
        const legacy: unknown = JSON.parse(this.storage.getItem(LEGACY_READING_KEY) ?? '[]')
        if (Array.isArray(legacy)) {
          const ids = legacy.filter((id): id is string => typeof id === 'string')
          progress.readChapters = [...new Set([...progress.readChapters, ...ids])]
        }
      } catch {
        // Keep the current progress if the old reading history is unavailable.
      }
    }
    return progress
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
      if (this.key === PROGRESS_KEY) this.storage.removeItem(LEGACY_READING_KEY)
    } catch {
      /* ignore */
    }
  }
}
