// npm run audio:upload [-- <trilha>]: sends the lesson audio made by audio:generate --audio
// (private/audio/lessons/**/dia-XX.mp3) to the private "lesson-audio" bucket, same paths.
// Needs, in the terminal: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = 'private/audio/lessons'
const only = process.argv[2]
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no terminal antes de rodar.')
  process.exit(1)
}
function* mp3s(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) yield* mp3s(p)
    else if (/^dia-\d+\.mp3$/.test(f)) yield p
  }
}
let sent = 0
for (const file of mp3s(only ? join(ROOT, only) : ROOT)) {
  const path = relative(ROOT, file).replace(/\\/g, '/')
  const res = await fetch(`${url.replace(/\/$/, '')}/storage/v1/object/lesson-audio/${path}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' },
    body: readFileSync(file),
  })
  if (!res.ok) {
    console.error(`${path}: falhou (${res.status}) ${await res.text()}`)
    process.exit(1)
  }
  console.log(`${path}: enviado`)
  sent++
}
console.log(sent ? `${sent} arquivo(s) enviados.` : 'Nenhum áudio encontrado (rode audio:generate com --audio).')
