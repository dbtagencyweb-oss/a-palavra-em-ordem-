// npm run content:check [-- <trilha> [dias]]   e.g. content:check -- jesus-em-ordem 1-10
// Validates the trails in content/trilhas/. Exits with 1 when there is any error.
import { loadTrail, mediaIdSet, parseDays, trailIds, validateTrail } from './lib.mjs'

const [only, spec] = process.argv.slice(2)
const ids = only ? [only] : trailIds()
if (only && !trailIds().includes(only)) {
  console.error(`Trilha "${only}" não encontrada em content/trilhas/. Existentes: ${trailIds().join(', ') || 'nenhuma'}`)
  process.exit(1)
}
const media = mediaIdSet()
let errors = 0
for (const id of ids) {
  const t = loadTrail(id)
  const all = t.dias.map((d) => d.ref.n)
  const days = parseDays(spec, all)
  const r = validateTrail(t, days, media)
  const byStatus = t.dias.filter((d) => days.includes(d.ref.n)).reduce((m, d) => ((m[d.dia?.status ?? 'faltando'] = (m[d.dia?.status ?? 'faltando'] ?? 0) + 1), m), {})
  console.log(`\n${t.trilha.titulo} (${id}) · ${days.length} dia(s) · ${Object.entries(byStatus).map(([k, v]) => `${v} ${k}`).join(', ')}`)
  for (const e of r.errors) console.log(`  ERRO   ${e}`)
  for (const w of r.warnings) console.log(`  aviso  ${w}`)
  if (!r.errors.length) console.log('  ok')
  errors += r.errors.length
}
console.log(errors ? `\n${errors} erro(s).` : '\nTudo certo.')
process.exit(errors ? 1 : 0)
