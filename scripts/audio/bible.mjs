import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import ffmpeg from 'ffmpeg-static'
import { transcribeWordCues } from './bible-word-cues.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const api = 'http://127.0.0.1:3900'
const sampleRate = 24000
const gap = Buffer.alloc(sampleRate * 2 * 0.18)

const { positionals: [book, selection], values } = parseArgs({
  allowPositionals: true,
  options: {
    voice: { type: 'string', default: 'SENHOR' },
    model: { type: 'string', default: 'omnivoice' },
    'replace-verse': { type: 'string' },
    'align-only': { type: 'boolean' },
  },
})

async function request(path, options = {}) {
  const response = await fetch(api + path, { signal: AbortSignal.timeout(300_000), ...options }).catch((cause) => {
    throw new Error('Sem resposta do VoiceStudio. Abra o app e confira o motor em 127.0.0.1:3900.', { cause })
  })
  if (!response.ok) throw new Error(`VoiceStudio retornou HTTP ${response.status}: ${(await response.text()).slice(0, 320)}`)
  return response
}

async function synthesize(text, voice) {
  const response = await request('/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: values.model, voice, input: text, language: 'pt', response_format: 'pcm' }),
  })
  const type = response.headers.get('content-type') ?? ''
  const pcm = Buffer.from(await response.arrayBuffer())
  if (!/^(audio\/|application\/octet-stream)/i.test(type) || pcm.length < 2 || pcm.length % 2 !== 0) {
    throw new Error(`Resposta de áudio inválida (${type}, ${pcm.length} bytes).`)
  }
  return pcm
}

function writeAtomic(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  const pending = `${path}.${process.pid}.tmp`
  try {
    writeFileSync(pending, data)
    renameSync(pending, path)
  } finally {
    rmSync(pending, { force: true })
  }
}

function encode(parts) {
  const work = mkdtempSync(join(tmpdir(), 'pao-bible-'))
  const output = join(work, 'chapter.mp3')
  try {
    // A seekable output lets the encoder store gapless playback and seek metadata.
    execFileSync(ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-f', 's16le', '-ar', String(sampleRate), '-ac', '1',
      '-i', 'pipe:0', '-codec:a', 'libmp3lame', '-b:a', '64k', output,
    ], { input: Buffer.concat(parts) })
    return readFileSync(output)
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

function decode(path) {
  return execFileSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-i', path, '-f', 's16le',
    '-ar', String(sampleRate), '-ac', '1', 'pipe:1',
  ], { maxBuffer: 128 * 1024 * 1024 })
}

async function main() {
  if (!/^[a-z0-9]+$/.test(book ?? '') || !/^(all|[1-9]\d*(-[1-9]\d*)?)$/.test(selection ?? '')) {
    throw new Error('Uso: npm run audio:bible -- <livro> <capítulo|início-fim|all> [--voice NOME] [--model ID] [--replace-verse N]')
  }
  if (!ffmpeg || !existsSync(ffmpeg)) throw new Error('O executável do FFmpeg está indisponível.')
  const input = join(root, 'public/biblia-livre/2018', `${book}.json`)
  if (!existsSync(input)) throw new Error(`Livro não encontrado: ${book}`)
  const chapters = JSON.parse(readFileSync(input, 'utf8'))
  const available = Object.keys(chapters).map(Number).sort((a, b) => a - b)
  const [first, last = first] = selection.split('-').map(Number)
  const selected = selection === 'all' ? available : available.filter((n) => n >= first && n <= last)
  if (!selected.length || (selection !== 'all' && (selected[0] !== first || selected.at(-1) !== last))) {
    throw new Error(`Capítulos inexistentes em ${book}: ${selection}`)
  }
  const replacement = values['replace-verse']
  if (replacement !== undefined && (selected.length !== 1 || !/^[1-9]\d*$/.test(replacement))) {
    throw new Error('Use --replace-verse com um único capítulo e o número do versículo.')
  }

  const catalogPath = join(root, 'content/bible-audio', `${book}.json`)
  const readCatalog = () => existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, 'utf8')) : {}
  const audioDir = join(root, 'public/audio/bible/2018', book)
  async function align(audio, verses, cues) {
    const result = await transcribeWordCues(audio, verses, cues)
    console.log(`  Sincronia: ${result.matched}/${result.total} palavras reconhecidas`)
    return result.cues
  }

  if (values['align-only']) {
    if (replacement !== undefined) throw new Error('Use --align-only ou --replace-verse separadamente.')
    for (const chapter of selected) {
      const catalog = readCatalog()
      const recording = catalog[chapter]
      if (!recording) throw new Error(`Gere a gravação de ${book} ${chapter} antes de sincronizar.`)
      if (recording.cues.every((cue) => cue[2]?.length)) continue
      console.log(`${book} ${chapter} · sincronizando a narração existente`)
      recording.cues = await align(readFileSync(join(audioDir, recording.file)), chapters[chapter], recording.cues)
      writeAtomic(catalogPath, JSON.stringify(catalog, null, 2) + '\n')
    }
    return
  }

  const { voices } = await (await request('/v1/audio/voices')).json()
  const matches = voices.filter((v) => v.type === 'profile' && (
    v.voice_id === values.voice || v.name.localeCompare(values.voice, 'pt-BR', { sensitivity: 'accent' }) === 0
  ))
  if (matches.length !== 1) throw new Error(`Selecione um perfil salvo e único com --voice (recebido: ${values.voice}).`)
  const voice = matches[0]

  for (const chapter of selected) {
    const original = chapters[chapter]
    const verses = original.map(([number, text]) => [number, text.replace(/\bSENHOR\b/g, 'Senhor')])
    const fingerprint = (lines) => createHash('sha256').update(JSON.stringify([voice.voice_id, values.model, lines])).digest('hex')
    const source = fingerprint(verses)
    const existing = readCatalog()[chapter]
    if (replacement === undefined && existing?.source === source && existsSync(join(audioDir, existing.file))) {
      console.log(`${book} ${chapter}: já gerado.`)
      continue
    }
    let previous
    if (replacement !== undefined) {
      if (!verses.some(([number]) => number === Number(replacement)) ||
        existing?.cues.length !== verses.length ||
        !existing.cues.every(([number], index) => number === verses[index][0]) ||
        !existsSync(join(audioDir, existing.file))) {
        throw new Error('Para corrigir um versículo, o capítulo e suas marcações precisam estar disponíveis.')
      }
      if (![source, fingerprint(original)].includes(existing.source)) {
        throw new Error('Use o mesmo perfil, modelo e texto do capítulo gravado para corrigir somente um versículo.')
      }
      previous = decode(join(audioDir, existing.file))
    }
    console.log(`${book} ${chapter} · ${voice.name} · ${verses.length} versículos`)
    const checkpoint = join(root, 'private/audio/bible-work', book, `${chapter}-${source}`)
    const parts = []
    const cues = []
    let bytes = 0
    for (const [index, [number, spoken]] of verses.entries()) {
      cues.push([number, bytes / (sampleRate * 2)])
      const path = join(checkpoint, `${number}.pcm`)
      let part
      if (previous && number !== Number(replacement)) {
        const start = Math.round(existing.cues[index][1] * sampleRate) * 2
        const next = existing.cues[index + 1]
        const end = next ? Math.round(next[1] * sampleRate) * 2 : previous.length
        part = previous.subarray(start, end)
      } else if (replacement === undefined && existsSync(path)) {
        part = readFileSync(path)
        console.log(`  Versículo ${number} · retomado`)
      } else {
        part = Buffer.concat([await synthesize(spoken, voice.voice_id), gap])
        if (replacement === undefined) writeAtomic(path, part)
        console.log(`  Versículo ${number} (${index + 1}/${verses.length})`)
      }
      parts.push(part)
      bytes += part.length
    }
    const audio = encode(parts)
    // Cached apps can still load the file that matches their copy of the cues.
    const hash = createHash('sha256').update(audio).digest('hex').slice(0, 12)
    const file = `${chapter}-${hash}.mp3`
    const timedCues = await align(audio, original, cues).catch((error) => {
      console.warn(`  ${error.message} Use --align-only para sincronizar depois.`)
      return cues
    })
    writeAtomic(join(audioDir, file), audio)
    const catalog = readCatalog()
    catalog[chapter] = { file, cues: timedCues, source }
    writeAtomic(catalogPath, JSON.stringify(catalog, null, 2) + '\n')
    if (replacement === undefined && existsSync(checkpoint)) {
      for (const [number] of verses) rmSync(join(checkpoint, `${number}.pcm`), { force: true })
    }
    console.log(`  ${file} · ${Math.round(bytes / (sampleRate * 2))} s`)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
