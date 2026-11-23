// Paid lessons are not bundled with the app: they come from the `premium_lessons` table, whose
// RLS policy (can_access) only returns rows to people with access. Without access the query
// simply returns nothing, so locked content never reaches the browser.
import { getSupabase } from '../lib/supabase'
import type { ContentKey } from './rules'

export async function fetchPremiumLesson<T = unknown>(trilha: ContentKey, dia: number): Promise<T | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await (await sb).from('premium_lessons').select('data').eq('trilha', trilha).eq('dia', dia).maybeSingle()
  if (error || !data) return null
  return (data as { data: T }).data
}
