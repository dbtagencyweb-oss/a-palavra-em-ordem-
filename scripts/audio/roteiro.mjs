// Spoken script of a lesson (docs/07, Prompt 8): the lesson's own cards, in order, turned into
// segments to be read aloud. Activities (ordenar, ligar, quiz) and the offer are left out; the
// passage is the card's own summary (never the Bible text). Linking phrases: content/audio-licao.json.
import { readFileSync } from 'node:fs'

const L = JSON.parse(readFileSync('content/audio-licao.json', 'utf8'))
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''))

// ---------- Bible references, spoken ----------

const ORDINAL_M = { 1: 'Primeiro', 2: 'Segundo', 3: 'Terceiro' }
const ORDINAL_F = { 1: 'Primeira', 2: 'Segunda', 3: 'Terceira' }
const FEMININE_BOOKS = ['João', 'Pedro', 'Coríntios', 'Tessalonicenses', 'Timóteo'] // "Primeira carta de João" read as "Primeira João"
/** "1 Reis" → "Primeiro Reis", "1 João" → "Primeira João". */
function spokenBook(name) {
  const m = name.match(/^([123]) (.+)$/)
  if (!m) return name
  return `${(FEMININE_BOOKS.includes(m[2]) ? ORDINAL_F : ORDINAL_M)[m[1]]} ${m[2]}`
}

/**
 * "Lucas 24:13-27" → "Lucas, capítulo 24, versículos 13 a 27"; "Gênesis 1–2" → "Gênesis, capítulos 1 a 2";
 * "Lucas 1:57–2:20" → "Lucas, do capítulo 1, versículo 57, ao capítulo 2, versículo 20";
 * "Mateus 1:1-17; Lucas 3:23-38" → both, joined by "e".
 */
export function spokenReference(ref) {
  // "Gênesis 12:1-3 e 15:5-6": the second part continues in the same book.
  const parts = String(ref).split(/;\s*|\s+e\s+/)
  let lastBook = ''
  const out = parts.map((p) => {
    const m = p.trim().match(/^((?:[123] )?\D+?)\s+(\d.*)$/)
    let book = lastBook
    let rest = p.trim()
    if (m) {
      book = m[1].trim()
      rest = m[2]
      lastBook = book
    }
    // A part that continues the previous book doesn't repeat its name.
    const b = m ? spokenBook(book) : ''
    if (!m && !lastBook) return rest
    const s = spokenPart(b, rest)
    return m ? s : s.replace(/^, /, '')
  })
  return out.join(' e ')
}

/** One reference, chapters and verses in full, after the (already spoken) book name. */
function spokenPart(b, rest) {
  let r
  if ((r = rest.match(/^(\d+):(\d+)[–-](\d+):(\d+)$/))) return `${b}, do capítulo ${r[1]}, versículo ${r[2]}, ao capítulo ${r[3]}, versículo ${r[4]}`
  if ((r = rest.match(/^(\d+):(\d+)[–-](\d+)$/))) return `${b}, capítulo ${r[1]}, versículos ${r[2]} a ${r[3]}`
  if ((r = rest.match(/^(\d+):(\d+)$/))) return `${b}, capítulo ${r[1]}, versículo ${r[2]}`
  if ((r = rest.match(/^(\d+)[–-](\d+)$/))) return `${b}, capítulos ${r[1]} a ${r[2]}`
  if ((r = rest.match(/^(\d+)$/))) return `${b}, capítulo ${r[1]}`
  return `${b} ${rest}`
}

// Book names of the Bible (longest first, so "1 João" wins over "João").
const BOOKS = JSON.parse(readFileSync('content/livros.json', 'utf8'))
  .livros.map((l) => l.nome)
  .sort((a, b) => b.length - a.length)
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const CHAP = String.raw`\d+(?::\d+)?(?:[–-]\d+(?::\d+)?)?`
const BARE_REF = new RegExp(String.raw`(?<![\wÀ-ú])(${BOOKS.map(esc).join('|')}) (${CHAP}(?: e ${CHAP})?)(?![\d:])`, 'g')

/**
 * References inside a text are said in full: in parentheses, "(João 20:31)", between dashes;
 * loose ones, "Gênesis 3:15" or "Gênesis 2", in place.
 */
export function spokenInline(text) {
  return text
    .replace(/\s*\(((?:[123] )?[A-ZÀ-Ú][^()\d]*\d+(?::\d+)?(?:[–-]\d+(?::\d+)?)?)\)/g, (_, ref) => ` — ${spokenReference(ref)} —`)
    .replace(BARE_REF, (_, book, rest) => spokenReference(`${book} ${rest}`))
}

// ---------- The script ----------

/**
 * Segments: { voz: 'principal' | 'oracao', texto, pausa (seconds of silence after) }.
 * `trilha` is the trail title (said at the start).
 */
export function lessonScript(dia, trilha) {
  const seg = []
  const say = (texto, pausa = 1.0, voz = 'principal') => texto && seg.push({ voz, texto: spokenInline(texto.trim()), pausa })
  const join = (...xs) => xs.filter(Boolean).join(' ')
  say(fill(L.abertura, { trilha, n: dia.n, titulo: dia.titulo }), 1.4)
  for (const c of dia.cards ?? []) {
    switch (c.tipo) {
      case 'cena':
        say(c.legenda, 1.2)
        break
      case 'abertura':
      case 'texto':
      case 'mapa':
        say(join(c.titulo, ...(c.paragrafos ?? [])), 1.2)
        break
      case 'movimentos':
        say(join(c.titulo, ...(c.itens ?? []).map((i) => `${i.nome}: ${i.texto}`)), 1.2)
        break
      case 'palavra':
        say(join(fill(L.palavra, { referencia: spokenReference(c.referencia) }), c.resumo, c.observar ? `${L.observar} ${c.observar}` : ''), 1.2)
        break
      case 'cristo':
        say(join(L.cristo, c.texto), 1.4)
        break
      case 'reflexao':
        say(join(L.reflexao, c.pergunta), 2.0)
        break
      case 'oracao':
        say(L.oracao, 0.8)
        say(c.texto, 1.4, 'oracao')
        break
      // leitura guiada
      case 'leitura':
        say(fill(L.leitura, { referencia: spokenReference(c.referencia) }), 2.0)
        break
      case 'contexto':
        say(join(L.contexto, c.texto), 1.2)
        break
      case 'observar':
        say(join(L.observarLeitura, c.texto), 1.2)
        break
      case 'pergunta':
        say(join(L.pergunta, c.texto), 2.0)
        break
      default:
        // ordenar, ligar, quiz, oferta: interactive, not part of the audio
        break
    }
  }
  say(fill(L.fim, { n: dia.n }), 0)
  return seg
}

/** Plain-text version for review (one block per segment, the voice marked when it changes). */
export function scriptText(dia, trilha, segments) {
  const lines = [`# ${trilha} · Dia ${dia.n} · ${dia.titulo}`, `# Roteiro falado (revisar antes de gerar o áudio)`, '']
  for (const s of segments) lines.push(`${s.voz === 'oracao' ? '[voz das orações] ' : ''}${s.texto}`, s.pausa >= 1.4 ? '[pausa longa]' : '', '')
  const words = segments.reduce((n, s) => n + s.texto.split(/\s+/).length, 0)
  lines.push(`# ${words} palavras · cerca de ${Math.round(words / 2.2 / 60 * 10) / 10} min a ritmo calmo`)
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n')
}
