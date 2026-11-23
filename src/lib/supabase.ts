import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * True once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local.
 * Without them the app keeps working fully on the device (localStorage) and hides account features.
 */
export const cloudEnabled = Boolean(url && anonKey)

let client: Promise<SupabaseClient> | null = null

/**
 * The Supabase client, loaded on demand (its own JS chunk), so the first screen stays light.
 * Returns null when cloud features are off.
 */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (!cloudEnabled) return null
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    }),
  )
  return client
}
