// Where the full narration of a lesson lives (Modo Áudio, docs/07 Prompt 8).
//  - With Supabase: a signed link to the private "lesson-audio" bucket. Supabase only signs it for
//    buyers of the "audio" bump (storage policy). Valid for 2 hours, so a lesson can be paused and resumed.
//  - In development without Supabase: the local file made by npm run audio:generate -- … --audio.
import { ETAPAS } from '../content/trails'
import { cloudEnabled, getSupabase } from '../lib/supabase'

export const AUDIO_LINK_SECONDS = 2 * 60 * 60
const pad = (n: number) => String(n).padStart(2, '0')

/** Path of a lesson's audio, as audio:generate writes it (the plan's stages have their own folder). */
export function lessonAudioPath(trailId: string, n: number): string {
  if (trailId === 'biblia-em-ordem') {
    const etapa = ETAPAS.find((e) => e.dias.some((d) => d.n === n))
    if (etapa) return `biblia-em-ordem/${etapa.id}/dia-${pad(n - etapa.offset)}.mp3`
  }
  return `${trailId}/dia-${pad(n)}.mp3`
}

export async function lessonAudioUrl(trailId: string, n: number): Promise<string | null> {
  const path = lessonAudioPath(trailId, n)
  const sb = getSupabase()
  if (sb) {
    const { data, error } = await (await sb).storage.from('lesson-audio').createSignedUrl(path, AUDIO_LINK_SECONDS)
    return error || !data ? null : data.signedUrl
  }
  if (!cloudEnabled && import.meta.env.DEV) return `/private/audio/lessons/${path}`
  return null
}
