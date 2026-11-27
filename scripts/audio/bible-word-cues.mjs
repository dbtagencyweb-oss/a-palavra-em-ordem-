import { execFileSync } from 'node:child_process'
import ffmpeg from 'ffmpeg-static'
import { bibleWords, estimatedWordStarts } from '../../src/sound/bibleWords.ts'

const normalize = (word) => word.toLowerCase().normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '')
const SAMPLE_RATE = 24_000
const MAX_BLOCK_SECONDS = 65

function wav(pcm) {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(2 * SAMPLE_RATE, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

// Match the transcript against the printed text. Known verse boundaries keep
// repeated words and recognition errors from moving the highlight into another verse.
function matchWords(expected, heard) {
  const width = heard.length + 1
  const directions = new Uint8Array((expected.length + 1) * width)
  let previous = Float64Array.from({ length: width }, (_, i) => i)
  let current = new Float64Array(width)

  for (let i = 1; i <= expected.length; i++) {
    current[0] = i
    const word = expected[i - 1]
    for (let j = 1; j < width; j++) {
      const candidate = heard[j - 1]
      const match = word.text === candidate.text && candidate.start >= word.start - 0.65 && candidate.start <= word.end + 0.4
      const deletion = previous[j] + 1
      const insertion = current[j - 1] + 1
      const exact = match ? previous[j - 1] : Infinity
      const direction = exact <= deletion && exact <= insertion ? 0 : deletion <= insertion ? 1 : 2
      directions[i * width + j] = direction
      current[j] = direction === 0 ? exact : direction === 1 ? deletion : insertion
    }
    const swap = previous
    previous = current
    current = swap
  }

  const matches = new Map()
  for (let i = expected.length, j = heard.length; i > 0 && j > 0;) {
    const direction = directions[i * width + j]
    if (direction === 0) {
      matches.set(--i, heard[--j].start)
    } else if (direction === 1) i--
    else j--
  }
  return matches
}

function fillMissing(starts, estimates, duration) {
  let previous = -1
  for (let next = 0; next <= starts.length; next++) {
    const right = next === starts.length ? duration : starts[next]
    if (right === undefined) continue
    const left = starts[previous] ?? 0
    const low = estimates[previous] ?? 0
    const high = estimates[next] ?? duration
    for (let i = previous + 1; i < next; i++) {
      const fraction = high > low ? (estimates[i] - low) / (high - low) : 0
      starts[i] = left + (right - left) * fraction
    }
    previous = next
  }
  return starts.map((start) => Math.round(start * 1000) / 1000)
}

async function transcribe(audio) {
  const form = new FormData()
  form.set('file', new Blob([audio], { type: 'audio/wav' }), 'bible.wav')
  form.set('model', 'whisper-1')
  form.set('language', 'pt')
  form.set('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'word')
  const response = await fetch('http://127.0.0.1:3900/v1/audio/transcriptions', {
    method: 'POST', body: form, signal: AbortSignal.timeout(300_000),
  })
  if (!response.ok) throw new Error(`Transcrição do VoiceStudio retornou HTTP ${response.status}.`)
  const { words } = await response.json()
  if (!words?.length) {
    throw new Error('O VoiceStudio não retornou as marcações de tempo por palavra.')
  }

  return words
}

export async function transcribeWordCues(audio, verses, cues) {
  const pcm = execFileSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-f', 's16le',
    '-ar', String(SAMPLE_RATE), '-ac', '1', 'pipe:1',
  ], { input: audio, maxBuffer: 128 * 1024 * 1024 })
  const duration = pcm.length / (SAMPLE_RATE * 2)
  if (duration <= cues.at(-1)[1]) throw new Error('A duração do áudio não cobre o último versículo.')

  const transcript = []
  // Split on verse boundaries so the transcription service can finish long chapters
  // within the same time budget as a short chapter.
  for (let first = 0; first < cues.length;) {
    const start = cues[first][1]
    let next = first + 1
    while (next < cues.length && (cues[next + 1]?.[1] ?? duration) - start <= MAX_BLOCK_SECONDS) next++
    const end = cues[next]?.[1] ?? duration
    const toByte = (seconds) => Math.round(seconds * SAMPLE_RATE) * 2
    const words = await transcribe(wav(pcm.subarray(toByte(start), toByte(end))))
    transcript.push(...words.map((word) => ({ ...word, start: word.start + start })))
    first = next
  }
  return alignBibleTranscript(verses, cues, duration, transcript)
}

export function alignBibleTranscript(verses, cues, duration, transcript) {
  const heard = transcript.flatMap(({ word, start }) => typeof word === 'string' && Number.isFinite(start)
    ? bibleWords(word).map((token) => ({ text: normalize(token.word), start }))
    : [])
  heard.sort((a, b) => a.start - b.start)
  const textByVerse = new Map(verses)
  const lines = cues.map(([verse, start], i) => {
    const text = textByVerse.get(verse) ?? ''
    const end = cues[i + 1]?.[1] ?? duration
    return { verse, start, end, text, words: bibleWords(text).map(({ word }) => ({ text: normalize(word), start, end })) }
  })
  const expected = lines.flatMap((line) => line.words)
  const matches = matchWords(expected, heard)
  let index = 0
  const timed = lines.map(({ verse, start, end, text, words: tokens }) => {
    const window = Math.max(0, end - start - 0.01)
    const estimates = estimatedWordStarts(text, window)
    const starts = tokens.map(() => {
      const time = matches.get(index++)
      return time === undefined ? undefined : Math.max(0, Math.min(time - start, window))
    })
    return [verse, start, fillMissing(starts, estimates, window)]
  })
  return { cues: timed, matched: matches.size, total: expected.length }
}
