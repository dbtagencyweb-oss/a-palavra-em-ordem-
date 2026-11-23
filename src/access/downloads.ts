// Links to the files of the "Mapa da Bíblia para imprimir" bump.
//  - With Supabase: a signed link to the private "downloads" bucket, valid for 10 minutes. Supabase
//    only signs it when the storage policy lets this person read the file (mapa-impresso buyers).
//  - In development without Supabase: the local files made by npm run print:export.
import { cloudEnabled, getSupabase } from '../lib/supabase'

export const LINK_SECONDS = 600

export async function downloadUrl(file: string): Promise<string | null> {
  const sb = getSupabase()
  if (sb) {
    const { data, error } = await (await sb).storage.from('downloads').createSignedUrl(file, LINK_SECONDS, { download: true })
    return error || !data ? null : data.signedUrl
  }
  if (!cloudEnabled && import.meta.env.DEV) return `/private/downloads/${file}`
  return null
}
