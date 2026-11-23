// npm run content:publish -- <trilha> <dias>   e.g. content:publish -- jesus-em-ordem 1-10
// Marks the days as "publicado", only if content:check passes for them.
import { loadTrail, mediaIdSet, parseDays, setStatus, trailIds, validateTrail } from './lib.mjs'

const [id, spec] = process.argv.slice(2)
if (!id || !spec || !trailIds().includes(id)) {
  console.error(`Uso: npm run content:publish -- <trilha> <dias>. Trilhas: ${trailIds().join(', ')}`)
  process.exit(1)
}
const t = loadTrail(id)
const days = parseDays(spec, t.dias.map((d) => d.ref.n))
// Publishing a draft that still has no cards makes no sense, so check as if already published.
const asPublished = { ...t, dias: t.dias.map((d) => (d.dia && days.includes(d.ref.n) ? { ...d, dia: { ...d.dia, status: 'publicado' } } : d)) }
const r = validateTrail(asPublished, days, mediaIdSet())
if (r.errors.length) {
  console.error(`Nada foi publicado. ${r.errors.length} erro(s):`)
  for (const e of r.errors) console.error(`  ERRO   ${e}`)
  process.exit(1)
}
for (const w of r.warnings) console.log(`  aviso  ${w}`)
const changed = setStatus(t, days, 'publicado')
console.log(changed.length ? `Publicado: ${t.trilha.titulo}, dia(s) ${changed.join(', ')}.` : 'Esses dias já estavam publicados.')
