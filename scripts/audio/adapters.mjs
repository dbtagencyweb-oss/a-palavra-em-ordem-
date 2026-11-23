// Voice services for npm run audio:generate. Each adapter turns one text into MP3 bytes.
// Pick one with AUDIO_TTS_PROVIDER (default: elevenlabs). To use another service, add an adapter
// with the same shape: { name, check(): string | null, synthesize(text, voz): Promise<Buffer> }.

const env = (k) => process.env[k] ?? ''

/** ElevenLabs text-to-speech. Voices from docs/05-narracoes.md (principal and, optionally, orações). */
const elevenlabs = {
  name: 'elevenlabs',
  check() {
    if (!env('ELEVENLABS_API_KEY')) return 'defina ELEVENLABS_API_KEY'
    if (!env('ELEVENLABS_VOICE_ID')) return 'defina ELEVENLABS_VOICE_ID (voz principal)'
    return null
  },
  async synthesize(text, voz) {
    const voice = voz === 'oracao' && env('ELEVENLABS_VOICE_ID_ORACAO') ? env('ELEVENLABS_VOICE_ID_ORACAO') : env('ELEVENLABS_VOICE_ID')
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': env('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: env('ELEVENLABS_MODEL') || 'eleven_multilingual_v2',
        // Calm, close, story-teller (docs/05): steady and not theatrical.
        voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
      }),
    })
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`)
    return Buffer.from(await res.arrayBuffer())
  },
}

const ADAPTERS = { elevenlabs }

export function pickAdapter() {
  const name = env('AUDIO_TTS_PROVIDER') || 'elevenlabs'
  const a = ADAPTERS[name]
  if (!a) throw new Error(`serviço de voz desconhecido: ${name} (disponíveis: ${Object.keys(ADAPTERS).join(', ')})`)
  return a
}
