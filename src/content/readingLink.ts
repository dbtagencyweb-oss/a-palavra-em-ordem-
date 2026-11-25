import { livros } from './index'
import type { Livro } from './types'

// USFM book codes (used by bible.com) keyed by the ids in content/livros.json.
const USFM: Record<string, string> = {
  gn: 'GEN', ex: 'EXO', lv: 'LEV', nm: 'NUM', dt: 'DEU', js: 'JOS', jz: 'JDG', rt: 'RUT',
  '1sm': '1SA', '2sm': '2SA', '1rs': '1KI', '2rs': '2KI', '1cr': '1CH', '2cr': '2CH',
  ed: 'EZR', ne: 'NEH', et: 'EST', job: 'JOB', sl: 'PSA', pv: 'PRO', ec: 'ECC', ct: 'SNG',
  is: 'ISA', jr: 'JER', lm: 'LAM', ez: 'EZK', dn: 'DAN', os: 'HOS', jl: 'JOL', am: 'AMO',
  ob: 'OBA', jn: 'JON', mq: 'MIC', na: 'NAM', hc: 'HAB', sf: 'ZEP', ag: 'HAG', zc: 'ZEC',
  ml: 'MAL', mt: 'MAT', mc: 'MRK', lc: 'LUK', jo: 'JHN', at: 'ACT', rm: 'ROM', '1co': '1CO',
  '2co': '2CO', gl: 'GAL', ef: 'EPH', fp: 'PHP', cl: 'COL', '1ts': '1TH', '2ts': '2TH',
  '1tm': '1TI', '2tm': '2TI', tt: 'TIT', fm: 'PHM', hb: 'HEB', tg: 'JAS', '1pe': '1PE',
  '2pe': '2PE', '1jo': '1JN', '2jo': '2JN', '3jo': '3JN', jd: 'JUD', ap: 'REV',
}

// Longest names first so "1 João" wins over "João".
const byName = [...livros].sort((a, b) => b.nome.length - a.nome.length)

function normalizeReference(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/\./g, '').replace(/^([1-3])\s+(?=[a-z])/, '$1').replace(/\s+/g, ' ').trim()
}

const bookAliases = livros.flatMap((book) =>
  [book.nome, book.sigla, book.id, ...(book.id === 'sl' ? ['Salmo'] : [])]
    .filter((name): name is string => Boolean(name))
    .map((name) => ({ alias: normalizeReference(name), book })),
).sort((a, b) => b.alias.length - a.alias.length)

export function findBibleBook(name: string): Livro | undefined {
  const normalized = normalizeReference(name)
  return bookAliases.find(({ alias }) => alias === normalized)?.book
}

export interface PassageChapter {
  book: Livro
  chapter: number
  firstVerse?: number
  lastVerse?: number
}

/** Resolves a lesson reference into the chapters and verse ranges shown by the reader. */
export function parsePassage(reference: string): PassageChapter[] | null {
  const chapters: PassageChapter[] = []
  let book: Livro | undefined
  for (const part of reference.split(/\s*;\s*|\s+e\s+/i)) {
    let clause = normalizeReference(part)
    const namedBook = bookAliases.find(({ alias }) => clause.startsWith(alias) && /^\s*\d/.test(clause.slice(alias.length)))
    if (namedBook) {
      book = namedBook.book
      clause = clause.slice(namedBook.alias.length).trim()
    }
    if (!book) return null

    let verseChapter: number | undefined
    for (const section of clause.split(/\s*,\s*/)) {
      const match = /^(\d+)(?:\s*:\s*(\d+))?(?:\s*[-–—]\s*(\d+)(?:\s*:\s*(\d+))?)?$/.exec(section.trim())
      if (!match) return null
      const [, first, verse, last, endVerse] = match
      const from = Number(first)
      const to = last ? Number(last) : from
      const startChapter = verse || !verseChapter ? from : verseChapter
      const endChapter = endVerse || (!verse && !verseChapter) ? to : startChapter
      const firstVerse = verse ? Number(verse) : verseChapter ? from : undefined
      const lastVerse = endVerse ? Number(endVerse) : firstVerse === undefined ? undefined : last ? to : firstVerse
      if (startChapter < 1 || endChapter > book.capitulos || endChapter < startChapter ||
        (firstVerse !== undefined && (firstVerse < 1 || (startChapter === endChapter && lastVerse! < firstVerse)))) return null
      for (let chapter = startChapter; chapter <= endChapter; chapter++) {
        chapters.push({
          book,
          chapter,
          firstVerse: chapter === startChapter ? firstVerse : undefined,
          lastVerse: chapter === endChapter ? lastVerse : undefined,
        })
      }
      verseChapter = firstVerse === undefined ? undefined : endChapter
    }
  }
  return chapters.length ? chapters : null
}

export function parseBibleLookup(input: string) {
  const value = input.trim()
    .replace(/^([^/]+)\s*\/\s*(\d+)\s*\/\s*(\d+(?:\s*[-–—]\s*\d+)?)$/, '$1 $2:$3')
    .replace(/^([^:;,]+\d)\s*,\s*(\d+(?:\s*[-–—]\s*\d+)?)$/, '$1:$2')
  const chapters = parsePassage(value)
  if (!chapters) return null
  if (chapters.length !== 1) return { reference: value, chapters }
  const [{ book, chapter, firstVerse, lastVerse }] = chapters
  const verses = firstVerse === undefined ? '' : `:${firstVerse}${lastVerse !== firstVerse ? `–${lastVerse}` : ''}`
  return { reference: `${book.nome} ${chapter}${verses}`, chapters }
}

/** Builds the external reading link for the first passage in a reference like "Lucas 24:13-27". */
export function buildReadingLink(referencia: string, modelo: string): string | null {
  const ref = referencia.trim()
  const livro = byName.find((l) => ref.startsWith(l.nome + ' '))
  if (!livro) return null
  const cap = ref.slice(livro.nome.length + 1).match(/^(\d+)/)?.[1]
  const code = USFM[livro.id]
  if (!cap || !code) return null
  return modelo.replace('{LIVRO}', code).replace('{CAP}', cap)
}
