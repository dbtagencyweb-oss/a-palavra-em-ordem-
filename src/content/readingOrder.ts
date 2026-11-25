import order from '../../content/ordem-leitura.json'
import { getLivro } from './index'

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
