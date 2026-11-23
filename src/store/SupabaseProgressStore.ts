import type { SupabaseClient } from '@supabase/supabase-js'
import { createProgress, type DiaryEntry, type Progress } from '../game/progress'
import type { ProgressStore } from './ProgressStore'

interface DiaryRow {
  id: string
  tag: string
  fields: Record<string, string>
  created_at: string
}

/** Progress in the user's Supabase account (tables `progress` and `diary_entries`, protected by RLS). */
export class SupabaseProgressStore implements ProgressStore {
  private syncedDiary = new Set<string>()

  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  async load(): Promise<Progress> {
    const [progressRes, diaryRes] = await Promise.all([
      this.client.from('progress').select('data').eq('user_id', this.userId).maybeSingle(),
      this.client.from('diary_entries').select('id, tag, fields, created_at').eq('user_id', this.userId).order('created_at', { ascending: false }),
    ])
    if (progressRes.error) throw progressRes.error
    if (diaryRes.error) throw diaryRes.error

    const diary: DiaryEntry[] = ((diaryRes.data ?? []) as DiaryRow[]).map((r) => ({
      id: r.id,
      tag: r.tag,
      fields: r.fields,
      createdAt: r.created_at,
    }))
    diary.forEach((e) => this.syncedDiary.add(e.id))
    const data = (progressRes.data?.data ?? {}) as Partial<Progress>
    return { ...createProgress(), ...data, version: 1, diary }
  }

  async save(progress: Progress): Promise<void> {
    const { diary, ...data } = progress
    const { error } = await this.client
      .from('progress')
      .upsert({ user_id: this.userId, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error

    const fresh = diary.filter((e) => !this.syncedDiary.has(e.id))
    if (fresh.length) {
      const rows = fresh.map((e) => ({ id: e.id, user_id: this.userId, tag: e.tag, fields: e.fields, created_at: e.createdAt }))
      const res = await this.client.from('diary_entries').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
      if (res.error) throw res.error
      fresh.forEach((e) => this.syncedDiary.add(e.id))
    }
  }

  async reset(): Promise<void> {
    await this.client.from('diary_entries').delete().eq('user_id', this.userId)
    await this.client.from('progress').delete().eq('user_id', this.userId)
    this.syncedDiary.clear()
  }
}
