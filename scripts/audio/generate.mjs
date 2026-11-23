// npm run audio:generate -- <trilha> <dias> [--audio]
//   e.g. npm run audio:generate -- mapa-7-dias 1-7
// Without --audio: writes the spoken script of each lesson (to review and approve) next to where
// the audio will go: private/audio/lessons/<trilha>/dia-XX.roteiro.txt (+ .json with the segments).
// With --audio: also synthesizes it with the voice service (scripts/audio/adapters.mjs) and builds
// dia-XX.mp3 to the spec in docs/05-narracoes.md: MP3 mono, 44.1 kHz, 128 kbps, −16 LUFS, 0.3 s of
// silence at both ends, the pauses of the script between the parts.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import { loadTrail, parseDays, trailIds } from '../content/lib.mjs'
import { pickAdapter } from './adapters.mjs'
import { lessonScript, scriptText } from './roteiro.mjs'

const args = process.argv.slice(2)
const withAudio = args.includes('--audio')
const [id, spec] = args.filter((a) => !a.startsWith('--'))
if (!id || !trailIds().includes(id)) {
  console.error(`Uso: npm run audio:generate -- <trilha> <dias> [--audio]. Trilhas: ${trailIds().join(', ')}`)
  process.exit(1)
}
const t = loadTrail(id)
const days = parseDays(spec, t.dias.filter((d) => d.dia?.cards?.length).map((d) => d.ref.n))
if (!days.length) {
  console.error('Nenhum dia com cards nesse intervalo.')
  process.exit(1)
}
const title = t.trilha.titulo
const dir = join('private/audio/lessons', id)
mkdirSync(dir, { recursive: true })

let adapter = null
if (withAudio) {
  adapter = pickAdapter()
  const problem = adapter.check()
  if (problem) {
    console.error(`Áudio não gerado: ${problem}. Os roteiros em texto continuam sendo escritos.`)
    adapter = null
  }
}

const pad = (n) => String(n).padStart(2, '0')
const ff = (...a) => execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...a])

for (const n of days) {
  const d = t.dias.find((x) => x.ref.n === n).dia
  const segments = lessonScript(d, title)
  const base = join(dir, `dia-${pad(n)}`)
  writeFileSync(`${base}.roteiro.txt`, scriptText(d, title, segments) + '\n')
  writeFileSync(`${base}.roteiro.json`, JSON.stringify({ trilha: id, dia: n, status: d.status, segmentos: segments }, null, 2) + '\n')
  if (!adapter) {
    console.log(`roteiro: ${base}.roteiro.txt (${segments.length} partes)`)
    continue
  }
  // Each part synthesized, then joined with the script's pauses and normalized.
  const work = mkdtempSync(join(tmpdir(), 'licao-'))
  try {
    const parts = []
    for (const [i, s] of segments.entries()) {
      const raw = join(work, `p${i}.mp3`)
      writeFileSync(raw, await adapter.synthesize(s.texto, s.voz))
      const wav = join(work, `p${i}.wav`)
      // part + its pause, as mono 44.1 kHz
      ff('-i', raw, '-af', `apad=pad_dur=${s.pausa}`, '-ac', '1', '-ar', '44100', wav)
      parts.push(wav)
    }
    const list = join(work, 'list.txt')
    writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'))
    ff(
      '-f', 'concat', '-safe', '0', '-i', list,
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,adelay=300:all=1,apad=pad_dur=0.3',
      '-ac', '1', '-ar', '44100', '-b:a', '128k', `${base}.mp3`,
    )
    console.log(`áudio: ${base}.mp3`)
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}
