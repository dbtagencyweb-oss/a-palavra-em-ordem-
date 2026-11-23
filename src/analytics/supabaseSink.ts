import type { SupabaseClient } from '@supabase/supabase-js'
import type { Sink } from './track'

export function supabaseSink(client: SupabaseClient): Sink {
  return async (events) => {
    const { error } = await client.from('events').insert(events)
    if (error) throw error
  }
}
