// Lists every media id in content/midia.json with its file status and weight.
// Limits from docs/02-design-som-midia.md. Run: node scripts/check-media.mjs
import { existsSync, readFileSync, statSync } from 'node:fs'

const { itens } = JSON.parse(readFileSync('content/midia.json', 'utf8'))
const KB = 1024
const rules = {
  imagem: [{ file: (id) => `public/media/img/${id}.webp`, max: 250 * KB }, { file: (id) => `public/media/img/${id}-540.webp`, max: 120 * KB, optional: true }],
  simbolo: [{ file: (id) => `public/media/img/${id}.webp`, max: 120 * KB }],
  get fundo() { return this.imagem },
  video: [
    { file: (id) => `public/media/video/${id}.mp4`, max: 1.5 * KB * KB },
    { file: (id) => `public/media/video/${id}.webm`, max: 1.5 * KB * KB },
    { file: (id) => `public/media/video/${id}.poster.webp`, max: 250 * KB },
  ],
}

const studyCover = [{ file: (id) => `public/estudos/${id}.webp`, max: 250 * KB }, { file: (id) => `public/estudos/${id}-640.webp`, max: 120 * KB }]

let missing = 0, heavy = 0, ok = 0
for (const item of itens) {
  // Study covers live in public/estudos/ (1280×720 + 640×360), not in public/media/img/.
  const list = item.id.startsWith('capa-estudo-') ? studyCover : rules[item.tipo] ?? []
  for (const r of list) {
    const path = r.file(item.id)
    if (!existsSync(path)) {
      if (!r.optional) { missing++; console.log(`FALTA   ${path}`) }
      continue
    }
    const size = statSync(path).size
    if (size > r.max) { heavy++; console.log(`PESADO  ${path}  ${(size / KB).toFixed(0)} KB (limite ${(r.max / KB).toFixed(0)} KB)`) }
    else ok++
  }
}
// Narrations (docs/05): public/audio/narr/<id>.mp3 (a .wav plays too, but weighs 3 to 5 times more).
const { itens: narracoes } = JSON.parse(readFileSync('content/narracoes.json', 'utf8'))
const NARR_MAX = 300 * KB
for (const n of narracoes) {
  const mp3 = `public/audio/narr/${n.id}.mp3`, wav = `public/audio/narr/${n.id}.wav`
  const path = existsSync(mp3) ? mp3 : existsSync(wav) ? wav : null
  if (!path) {
    if (n.status === 'pronto') { missing++; console.log(`FALTA   ${mp3}  (status pronto)`) }
    else console.log(`PENDENTE ${mp3}`)
    continue
  }
  if (n.status !== 'pronto') console.log(`AVISO   ${path} existe, mas o status em content/narracoes.json é ${n.status}`)
  if (path === wav) console.log(`AVISO   ${wav}: converta para MP3 mono 128 kbps (docs/05)`)
  const size = statSync(path).size
  if (size > NARR_MAX) { heavy++; console.log(`PESADO  ${path}  ${(size / KB).toFixed(0)} KB (limite ${NARR_MAX / KB} KB)`) }
  else ok++
}

console.log(`\n${ok} ok · ${heavy} acima do limite · ${missing} faltando`)
process.exitCode = heavy ? 1 : 0
