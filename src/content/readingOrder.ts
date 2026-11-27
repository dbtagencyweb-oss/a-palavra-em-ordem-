import order from '../../content/ordem-leitura.json'
import { completedOf, type Progress } from '../game/progress'
import { getLivro } from './index'
import { BIBLIA } from './trails'

export const readingSections = order.map(({ titulo, trechos }) => ({
  title: titulo,
  passages: trechos.map((reference) => {
    const [id, ranges] = reference.split(':')
    const book = getLivro(id)
    if (!book) throw new Error(`Livro inválido no roteiro: ${id}`)
    const chapters = (ranges ?? `1-${book.capitulos}`).split(',').flatMap((range) => {
      const [start, end = start] = range.split('-').map(Number)
      return Array.from({ length: end - start + 1 }, (_, index) => {
        const chapter = start + index
        return { book, chapter, id: `${id}:${chapter}` }
      })
    })
    return {
      id: reference,
      book,
      label: ranges ? `${book.nome} ${ranges.replaceAll('-', '–').replaceAll(',', ', ')}` : book.nome,
      chapters,
    }
  }),
}))

export const readingChapters = readingSections.flatMap((section) => section.passages.flatMap((passage) => passage.chapters))

const chapterIds = new Set(readingChapters.map(({ id }) => id))

export function readBibleChapters(progress: Progress): Set<string> {
  const read = new Set(progress.readChapters.filter((id) => chapterIds.has(id)))
  const completed = completedOf(progress, BIBLIA.id)
  for (const day of BIBLIA.outline) {
    if (!completed[day.n]) continue
    for (const { livro, de, ate } of day.capitulos ?? []) {
      for (let chapter = de; chapter <= ate; chapter++) {
        const id = `${livro}:${chapter}`
        if (chapterIds.has(id)) read.add(id)
      }
    }
  }
  return read
}
