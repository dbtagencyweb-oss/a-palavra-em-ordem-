import { useCallback, useState } from 'react'
import { getLivro, livros } from '../content'
import { BLOCK_COLORS, Bookshelf } from '../media/Bookshelf'
import { SmartImage } from '../media/SmartImage'
import { BookSheet } from './BookCard'
import { Paragraphs } from './Paragraphs'
import type { CardOf, CardProps } from './types'

const VISIBLE = 6

export function MapaCard({ card }: CardProps<CardOf<'mapa'>>) {
  const books = (card.livros ?? []).map(getLivro).filter((l) => l !== undefined)
  // The sheet browses the whole library, so the arrows walk through the Bible in order.
  const [open, setOpen] = useState<number | null>(null)
  // Long blocks (17 prophets, 21 letters) start collapsed so the card stays one screen.
  const [all, setAll] = useState(false)
  const shown = all ? books : books.slice(0, VISIBLE)
  const close = useCallback(() => setOpen(null), [])
  const openBook = (id: string) => setOpen(livros.findIndex((l) => l.id === id))
  const blocks = [...new Set(books.map((b) => b.bloco))]

  return (
    <>
      {card.midia && <SmartImage id={card.midia} gradient className="mb-5" />}
      <h2 className="mb-4 text-[28px]">{card.titulo}</h2>
      {books.length > 0 && (
        <figure className="mb-5">
          <Bookshelf highlight={books.map((b) => b.id)} onPick={openBook} />
          <figcaption className="mt-1.5 flex justify-between text-[12px] text-ink-3">
            <span>{blocks.join(' · ')}</span>
            <span>
              {books.length} de {livros.length} livros
            </span>
          </figcaption>
        </figure>
      )}
      <Paragraphs items={card.paragrafos} />
      {books.length > 0 && (
        <>
          <p className="mt-5 text-[12.5px] text-ink-3">Toque num livro, ou na estante, para ver a ficha.</p>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Livros deste bloco">
            {shown.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => openBook(l.id)}
                  className="flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-[13px] font-semibold text-ink-2 active:scale-95"
                >
                  <span className="h-3 w-1 rounded-sm" style={{ backgroundColor: BLOCK_COLORS[l.bloco] }} aria-hidden="true" />
                  {l.nome}
                </button>
              </li>
            ))}
            {books.length > VISIBLE && (
              <li>
                <button
                  type="button"
                  aria-expanded={all}
                  onClick={() => setAll(!all)}
                  className="min-h-[44px] rounded-full px-3 text-[13px] font-bold text-ember-ink"
                >
                  {all ? 'Mostrar menos' : `Ver todos os ${books.length}`}
                </button>
              </li>
            )}
          </ul>
          <BookSheet livros={livros} index={open} onClose={close} onIndex={setOpen} />
        </>
      )}
    </>
  )
}
