import { useEffect, useId, useRef, useState } from 'react'
import { livros } from '../content'
import { findBibleBook, parseBibleLookup } from '../content/readingLink'
import type { Livro } from '../content/types'
import { BibleReader } from './BibleReader'
import { CloseIcon } from './icons'
import { Sheet } from './Sheet'

interface Props {
  open: boolean
  onClose(): void
  onToday(): void
}

export function BibleLookup({ open, onClose, onToday }: Props) {
  const [book, setBook] = useState('')
  const [chapter, setChapter] = useState('')
  const [verse, setVerse] = useState('')
  const [result, setResult] = useState<{ book: Livro; passage?: NonNullable<ReturnType<typeof parseBibleLookup>> } | null>(null)
  const [invalid, setInvalid] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const fieldClass = 'min-h-11 w-full min-w-0 rounded-lg border border-paper/25 bg-black/25 px-2 text-base text-paper placeholder:text-paper/55'

  useEffect(() => {
    if (open && !result) input.current?.focus()
  }, [open, result])

  function close() {
    onClose()
    setInvalid(false)
    setResult(null)
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      label={result ? `Leitor da Bíblia: ${result.passage?.reference ?? result.book.nome}` : 'Buscar na Bíblia'}
      animateLayout
      className={result
        ? '!flex h-[88%] flex-col !overflow-hidden !p-0'
        : 'mx-3 mb-[calc(42px+env(safe-area-inset-bottom))] rounded-[22px] border border-gold/20 !bg-[#252A3B] !px-3.5 !py-3 text-paper shadow-[0_8px_22px_rgba(12,14,22,0.30)]'}
    >
      {result ? (
        <BibleReader book={result.book} open={open} onClose={close} passage={result.passage} embedded onBackToSearch={() => setResult(null)} />
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-[23px]">Buscar na Bíblia</h2>
            <button type="button" onClick={close} aria-label="Fechar busca" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10"><CloseIcon /></button>
          </div>
          <form onSubmit={(event) => {
            event.preventDefault()
            const parts = `${book.trim()} ${chapter.trim()}${verse.trim() ? `:${verse.trim()}` : ''}`
            const passage = parseBibleLookup(book) ?? (chapter.trim() ? parseBibleLookup(parts) : null)
            const matchedBook = passage?.chapters[0].book ?? (!chapter.trim() && !verse.trim() ? findBibleBook(book) : undefined)
            setInvalid(!matchedBook)
            if (matchedBook) setResult({ book: matchedBook, passage: passage ?? undefined })
          }}>
            <div className="grid grid-cols-[minmax(0,1fr)_2.75rem_2.75rem_auto] items-end gap-1.5">
              <label htmlFor={inputId} className="relative min-w-0 text-xs font-semibold text-paper/85 after:absolute after:-right-[4px] after:bottom-3.5 after:text-paper/65 after:content-[':']">
                Livro
                <input
                  ref={input}
                  id={inputId}
                  data-autofocus
                  list={`${inputId}-books`}
                  enterKeyHint="search"
                  autoComplete="off"
                  placeholder="Êxodo"
                  value={book}
                  onChange={(event) => { setBook(event.target.value); setInvalid(false) }}
                  aria-describedby={`${inputId}-hint`}
                  className={`mt-1 ${fieldClass}`}
                />
              </label>
              <datalist id={`${inputId}-books`}>
                {livros.map((entry) => <option key={entry.id} value={entry.nome} />)}
              </datalist>
              <label className="relative text-xs font-semibold text-paper/85 after:absolute after:-right-[4px] after:bottom-3.5 after:text-paper/65 after:content-[':']">
                Cap.
                <input aria-label="Capítulo" inputMode="numeric" enterKeyHint="search" placeholder="20" value={chapter}
                  onChange={(event) => { setChapter(event.target.value); setInvalid(false) }}
                  className={`mt-1 text-center ${fieldClass}`} />
              </label>
              <label className="text-xs font-semibold text-paper/85">
                Vers.
                <input aria-label="Versículo (opcional)" inputMode="numeric" enterKeyHint="search" placeholder="12" value={verse}
                  onChange={(event) => { setVerse(event.target.value); setInvalid(false) }}
                  className={`mt-1 text-center ${fieldClass}`} />
              </label>
              <button type="submit" className="btn !min-h-11 !w-auto !px-2.5 !py-2 text-sm" disabled={!book.trim()}>Buscar</button>
            </div>
            <p id={`${inputId}-hint`} role={invalid ? 'alert' : undefined} className="mt-2 text-xs leading-relaxed text-paper/75">
              {invalid ? 'Confira a referência. Digite “Esdras” ou preencha os campos como em Êxodo 20:12.' : 'Só o livro abre no capítulo 1. Sem versículo, abre o capítulo inteiro.'}
            </p>
          </form>
          <button type="button" className="mt-1 min-h-11 text-sm font-semibold text-gold-soft" onClick={() => {
            close()
            onToday()
          }}>Abrir a lição de hoje</button>
        </>
      )}
    </Sheet>
  )
}
