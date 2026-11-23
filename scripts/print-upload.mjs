// npm run print:upload: sends the files made by print:export (private/downloads/) to the private
// "downloads" bucket in Supabase Storage. Needs, in the terminal (never in .env files the app reads):
//   SUPABASE_URL=https://SEU-PROJETO.supabase.co  SUPABASE_SERVICE_ROLE_KEY=...
import { existsSync, readFileSync } from 'node:fs'

const FILES = ['mapa-a3.pdf', 'mapa-a4.pdf', 'wallpaper-1.png', 'wallpaper-2.png', 'wallpaper-3.png']
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no terminal antes de rodar.')
  process.exit(1)
}
const missing = FILES.filter((f) => !existsSync(`private/downloads/${f}`))
if (missing.length) {
  console.error(`Faltam arquivos (rode npm run print:export): ${missing.join(', ')}`)
  process.exit(1)
}
for (const f of FILES) {
  const res = await fetch(`${url.replace(/\/$/, '')}/storage/v1/object/downloads/${f}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': f.endsWith('.pdf') ? 'application/pdf' : 'image/png',
      'x-upsert': 'true',
    },
    body: readFileSync(`private/downloads/${f}`),
  })
  if (!res.ok) {
    console.error(`${f}: falhou (${res.status}) ${await res.text()}`)
    process.exit(1)
  }
  console.log(`${f}: enviado`)
}
