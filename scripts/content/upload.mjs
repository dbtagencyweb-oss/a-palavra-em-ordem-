// npm run content:upload -- <trilha>   e.g. content:upload -- jesus-em-ordem
// Sends the PUBLISHED days of a paid trail to the premium_lessons table, where the server only
// hands them to people with access. Paid lessons never go into the app bundle.
// Needs, in the terminal (never in .env files that reach the app):
//   SUPABASE_URL=https://SEU-PROJETO.supabase.co  SUPABASE_SERVICE_ROLE_KEY=...
import { readFileSync } from 'node:fs'
import { loadTrail, mediaIdSet, trailIds, validateTrail } from './lib.mjs'

const [id] = process.argv.slice(2)
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!id || !trailIds().includes(id)) {
  console.error(`Uso: npm run content:upload -- <trilha>. Trilhas: ${trailIds().join(', ')}`)
  process.exit(1)
}
if (id === 'mapa-7-dias') {
  console.error('A Trilha 1 é grátis e vai no próprio app; não precisa de upload.')
  process.exit(1)
}
if (!url || !key) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no terminal antes de rodar.')
  process.exit(1)
}
const t = loadTrail(id)
const published = t.dias.filter((d) => d.dia?.status === 'publicado')
const r = validateTrail(t, published.map((d) => d.ref.n), mediaIdSet())
if (r.errors.length) {
  console.error('Nada foi enviado. Erros:\n' + r.errors.map((e) => `  ERRO   ${e}`).join('\n'))
  process.exit(1)
}
// Same key the access rules use (src/access/rules.ts, can_access in the database).
// Stages of a plan (biblia-em-ordem/etapa-XX) share the plan's key and number days across the
// whole plan: Etapa 2 starts after the last day of Etapa 1.
const [planId, stageId] = id.split('/')
let offset = 0
if (stageId) {
  const plano = JSON.parse(readFileSync(`content/trilhas/${planId}/plano.json`, 'utf8'))
  for (const e of plano.etapas) {
    if (e.id === stageId) break
    if (trailIds().includes(`${planId}/${e.id}`)) offset += loadTrail(`${planId}/${e.id}`).dias.length
  }
}
const content = stageId ? planId : id.startsWith('estudo-') ? id : `trilha-${id}`
const rows = published.map((d) => ({ trilha: content, dia: offset + d.ref.n, data: d.dia, updated_at: new Date().toISOString() }))
if (!rows.length) {
  console.log('Nenhum dia publicado para enviar.')
  process.exit(0)
}
const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/premium_lessons?on_conflict=trilha,dia`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify(rows),
})
if (!res.ok) {
  console.error(`Falhou (${res.status}): ${await res.text()}`)
  process.exit(1)
}
console.log(`Enviado: ${t.trilha.titulo}, dia(s) ${rows.map((r) => r.dia).join(', ')} → premium_lessons (${content}).`)
