import { useState, type CSSProperties } from 'react'
import { readingChapters, readingSections } from '../content/readingOrder'
import type { Livro } from '../content/types'
import { BLOCK_COLORS } from '../media/Bookshelf'
import { BibleReader } from '../ui/BibleReader'

const STORAGE_KEY = 'pao:ordem-leitura:v1'

function bookAccent(book: Livro): CSSProperties {
  return { '--book-color': BLOCK_COLORS[book.bloco] } as CSSProperties
}

function BookTag({ book }: { book: Livro }) {
  const abbreviation = (book.sigla ?? book.id).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  return (
    <span aria-hidden="true" className="library-book-abbreviation inline-flex min-w-9 shrink-0 items-center justify-center rounded-md px-1.5 py-1 text-[10px] font-bold tracking-wide">
      {abbreviation}
    </span>
  )
}

function loadReadChapters() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (Array.isArray(value)) {
      const saved = new Set(value)
      return new Set(readingChapters.filter(({ id }) => saved.has(id)).map(({ id }) => id))
    }
  } catch {
    // Reading still works when storage is unavailable.
  }
  return new Set<string>()
}

export function ReadingOrder() {
  const [read, setRead] = useState(loadReadChapters)
  const [active, setActive] = useState<(typeof readingChapters)[number] | null>(null)
  const [readerOpen, setReaderOpen] = useState(false)
  const next = readingChapters.find(({ id }) => !read.has(id))
  const nextSection = next && readingSections.find(({ passages }) => passages.some(({ chapters }) => chapters.includes(next)))
  const afterActive = active
    ? readingChapters.slice(readingChapters.indexOf(active) + 1).find(({ id }) => !read.has(id))
    : undefined

  function openChapter(chapter: (typeof readingChapters)[number]) {
    setActive(chapter)
    setReaderOpen(true)
  }

  function advance() {
    if (!active) return
    const updated = new Set(read).add(active.id)
    setRead(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...updated]))
    } catch {
      // Keep the current session usable even without storage.
    }
    if (afterActive) setActive(afterActive)
    else setReaderOpen(false)
  }

  return (
    <div role="tabpanel" className="px-5 pb-6 pt-4">
      <div className="rounded-card border border-line bg-card p-4 shadow-card" style={next ? bookAccent(next.book) : undefined}>
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow">{next ? nextSection?.title : 'Roteiro concluído'}</p>
          {next && <BookTag book={next.book} />}
        </div>
        <h3 className="mt-1 text-[25px]">{next ? `${next.book.nome} ${next.chapter}` : 'Você leu toda a Bíblia'}</h3>
        {next && (
          <>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">Leia um capítulo por vez. Ao marcar como lido, o próximo abre na sequência.</p>
            <button type="button" onClick={() => openChapter(next)} className="btn mt-4">
              {read.size ? 'Continuar leitura' : 'Começar por Gênesis 1'}
            </button>
          </>
        )}
        <p className="mt-3 text-xs text-ink-3">{read.size.toLocaleString('pt-BR')} de {readingChapters.length.toLocaleString('pt-BR')} capítulos lidos neste dispositivo</p>
        <progress className="mt-2 block h-2 w-full accent-amber-700" aria-label="Progresso da ordem de leitura" value={read.size} max={readingChapters.length} />
      </div>

      <details className="mt-4 rounded-card border border-line bg-card">
        <summary className="cursor-pointer px-4 py-3 text-[15px] font-semibold">Ver roteiro completo</summary>
        <div className="px-4 pb-4">
          <p className="mb-2 text-sm leading-relaxed text-ink-2">Abra uma etapa para ver os trechos em ordem. As cores das siglas correspondem aos grupos da estante.</p>
          {readingSections.map((section) => (
            <details key={section.title} className="border-t border-line">
              <summary className="cursor-pointer py-3 text-sm font-semibold">{section.title}</summary>
              <ul className="grid gap-1 pb-2">
                {section.passages.map((passage) => {
                  const unread = passage.chapters.find(({ id }) => !read.has(id))
                  return (
                    <li key={passage.id}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-start gap-2.5 rounded-lg border-l-[3px] border-l-[var(--book-color,#8a8d98)] bg-paper/45 px-2 py-2.5 text-left text-sm hover:bg-paper-2"
                        style={bookAccent(passage.book)}
                        onClick={() => openChapter(unread ?? passage.chapters[0])}
                      >
                        <BookTag book={passage.book} />
                        <span className="min-w-0 flex-1 break-words pt-0.5">{passage.label}</span>
                        {!unread && <span className="shrink-0 text-xs font-semibold text-ink-3">Lido</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </details>
          ))}
        </div>
      </details>

      {active && <BibleReader book={active.book} open={readerOpen} onClose={() => setReaderOpen(false)} guided={{ chapter: active.chapter, last: !afterActive, onAdvance: advance }} />}
    </div>
  )
}
