// npm run content:review -- <trilha> <dias>   e.g. content:review -- mapa-7-dias 1-7
// Writes the review script (Markdown, same format as the 7-day script) to docs/revisao/.
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadTrail, parseDays, reviewMarkdown, trailIds } from './lib.mjs'

const [id, spec] = process.argv.slice(2)
if (!id || !trailIds().includes(id)) {
  console.error(`Uso: npm run content:review -- <trilha> <dias>. Trilhas: ${trailIds().join(', ')}`)
  process.exit(1)
}
const t = loadTrail(id)
const days = parseDays(spec, t.dias.filter((d) => d.dia).map((d) => d.ref.n))
if (!days.length) {
  console.error('Nenhum dia encontrado para esse intervalo.')
  process.exit(1)
}
const pad = (n) => String(n).padStart(2, '0')
const out = `docs/revisao/revisao-${id}-dias-${pad(days[0])}-${pad(days.at(-1))}.md`
mkdirSync('docs/revisao', { recursive: true })
writeFileSync(out, reviewMarkdown(t, days))
console.log(`Roteiro de revisão salvo em ${out} (${days.length} dia(s)).`)
