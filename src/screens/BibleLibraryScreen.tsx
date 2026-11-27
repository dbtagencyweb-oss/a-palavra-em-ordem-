import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import biblioteca from '../../content/biblioteca.json'
import { BookCard, BookNavigation, type BookPassage } from '../cards/BookCard'
import { livros } from '../content'
import { parseBibleLookup } from '../content/readingLink'
import type { Livro } from '../content/types'
import { BLOCK_COLORS } from '../media/Bookshelf'
import { BackIcon } from '../ui/icons'
import { BibleReader } from '../ui/BibleReader'
import { BibliaScreen } from './BibliaScreen'
import { ReadingOrder } from './ReadingOrder'

interface Props {
  initialTab?: 'ordem' | 'progresso'
  onBack(): void
  onOpenDay(n: number): void
  onOffer(origem: string): void
}

type Tab = 'ordem' | 'mapa' | 'livros' | 'progresso'
type Testament = 'todos' | 'AT' | 'NT'
type Group = (typeof biblioteca.grupos)[number]

const BOOKS_KEY = 'pao:biblioteca:livros-explorados'
const GROUPS_KEY = 'pao:biblioteca:grupos-explorados'

const MAP_POSITION = [
  { left: 16, top: 25 },
  { left: 50, top: 8 },
  { left: 84, top: 25 },
  { left: 88, top: 50 },
  { left: 84, top: 75 },
  { left: 50, top: 92 },
  { left: 16, top: 75 },
  { left: 12, top: 50 },
] as const

function loadSet(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]')
    return new Set<string>(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])
  } catch {
    return new Set<string>()
  }
}

function saveSet(key: string, value: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...value]))
  } catch {
    /* Local progress is optional. */
  }
}

function booksFor(group: Group) {
  return livros.filter((book) => group.blocos.includes(book.bloco))
}

function normalized(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

export function BibleLibraryScreen({ initialTab = 'ordem', onBack, onOpenDay, onOffer }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [activeGroupId, setActiveGroupId] = useState(biblioteca.grupos[0].id)
  const [bookIndex, setBookIndex] = useState<number | null>(null)
  const [bookReading, setBookReading] = useState<{ passage?: BookPassage } | null>(null)
  const [query, setQuery] = useState('')
  const [passage, setPassage] = useState<ReturnType<typeof parseBibleLookup>>(null)
  const lookup = useMemo(() => parseBibleLookup(query), [query])
  const [testament, setTestament] = useState<Testament>('todos')
  const [exploredBooks, setExploredBooks] = useState<Set<string>>(() => loadSet(BOOKS_KEY))
  const [exploredGroups, setExploredGroups] = useState<Set<string>>(() => loadSet(GROUPS_KEY))

  const activeGroup = biblioteca.grupos.find((group) => group.id === activeGroupId) ?? biblioteca.grupos[0]
  const activeBooks = useMemo(() => booksFor(activeGroup), [activeGroup])
  const visibleBooks = useMemo(() => {
    const term = normalized(query.trim())
    return livros.filter((book) => {
      const matchesTestament = testament === 'todos' || book.testamento === testament
      const matchesQuery = !term || normalized(`${book.nome} ${book.sigla ?? ''} ${book.bloco}`).includes(term)
      return matchesTestament && matchesQuery
    })
  }, [query, testament])

  useEffect(() => saveSet(BOOKS_KEY, exploredBooks), [exploredBooks])
  useEffect(() => saveSet(GROUPS_KEY, exploredGroups), [exploredGroups])

  function selectGroup(group: Group) {
    setActiveGroupId(group.id)
    setExploredGroups((current) => new Set(current).add(group.id))
  }

  function openBook(book: Livro) {
    const index = livros.findIndex((item) => item.id === book.id)
    if (index < 0) return
    setExploredBooks((current) => new Set(current).add(book.id))
    setBookIndex(index)
  }

  function goToBook(index: number) {
    const book = livros[index]
    if (!book) return
    setExploredBooks((current) => new Set(current).add(book.id))
    setBookIndex(index)
  }

  const selectedBook = bookIndex !== null ? livros[bookIndex] : null

  if (selectedBook && bookIndex !== null) {
    return (
      <section className="screen bg-paper pb-[calc(90px+env(safe-area-inset-bottom))]" data-testid="biblioteca-livro">
        <header className="flex items-center gap-2 px-3 pt-3">
          <button type="button" onClick={() => setBookIndex(null)} aria-label="Voltar à Biblioteca da Bíblia" className="grid h-11 w-11 place-items-center rounded-full text-ink-2">
            <BackIcon />
          </button>
          <span className="text-[13px] font-semibold text-ink-3">Biblioteca da Bíblia</span>
        </header>
        <div className="px-5 pb-6 pt-2">
          <BookCard key={selectedBook.id} livro={selectedBook} onRead={(passage) => setBookReading({ passage })} />
          <BookNavigation index={bookIndex} total={livros.length} onIndex={goToBook}
            onClose={() => setBookIndex(null)} closeLabel="Voltar à Biblioteca" className="mt-6" />
        </div>
        <BibleReader key={selectedBook.id} book={selectedBook} open={!!bookReading}
          onClose={() => setBookReading(null)} passage={bookReading?.passage} />
      </section>
    )
  }

  return (
    <section className="screen bg-paper pb-[calc(90px+env(safe-area-inset-bottom))]" data-testid="biblioteca-da-biblia">
      <header className="flex items-center gap-2 px-3 pt-3">
        <button type="button" onClick={onBack} aria-label="Voltar" className="grid h-11 w-11 place-items-center rounded-full text-ink-2">
          <BackIcon />
        </button>
      </header>

      <div className="px-5 pb-2">
        <h2 className="text-[28px] leading-tight">{biblioteca.titulo}</h2>
        <p className="mt-1 text-[15px] leading-normal text-ink-2">Siga a história capítulo por capítulo ou encontre um livro para consultar.</p>
      </div>

      <div className="mx-5 mt-3 grid grid-cols-4 rounded-[15px] bg-paper-2 p-1" role="tablist" aria-label="Seções da Biblioteca da Bíblia">
        <TabButton active={tab === 'ordem'} onClick={() => setTab('ordem')}>Ordem de leitura</TabButton>
        <TabButton active={tab === 'livros'} onClick={() => setTab('livros')}>Livros</TabButton>
        <TabButton active={tab === 'mapa'} onClick={() => setTab('mapa')}>Mapa</TabButton>
        <TabButton active={tab === 'progresso'} onClick={() => setTab('progresso')}>Lições</TabButton>
      </div>

      {tab === 'ordem' && <ReadingOrder />}

      {tab === 'mapa' && (
        <div role="tabpanel" className="px-5 pb-6 pt-4">
          <p className="text-center text-xs font-semibold text-ink-2">{exploredGroups.size} de {biblioteca.grupos.length} grupos explorados</p>

          <div className="relative mx-auto mt-3 h-[350px] max-w-[350px]" aria-label="Mapa dos oito grupos de livros da Bíblia">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              {biblioteca.grupos.map((group, index) => {
                const position = MAP_POSITION[index]
                const active = group.id === activeGroup.id
                return <line key={group.id} x1="50" y1="50" x2={position.left} y2={position.top} stroke={active ? group.cor : '#CFC3AC'} strokeWidth={active ? 1.2 : 0.55} />
              })}
            </svg>

            <div className="absolute left-1/2 top-1/2 z-[2] grid h-[118px] w-[118px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-gold bg-[radial-gradient(circle_at_40%_32%,#FFF9EB,#EFE1C4)] text-center shadow-card">
              <span>
                <strong className="block font-display text-[22px] leading-none">BÍBLIA</strong>
                <span className="mt-1 block text-[13px] font-bold text-gold-ink">66 livros</span>
              </span>
            </div>

            {biblioteca.grupos.map((group, index) => {
              const position = MAP_POSITION[index]
              const active = group.id === activeGroup.id
              const visited = exploredGroups.has(group.id)
              return (
                <button
                  key={group.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectGroup(group)}
                  className={`absolute z-[3] min-h-[48px] w-[88px] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card px-1.5 py-2 text-center shadow-card transition-transform active:scale-95 ${active ? 'font-bold' : ''}`}
                  style={{ left: `${position.left}%`, top: `${position.top}%`, borderColor: active ? group.cor : `${group.cor}48`, color: active ? group.cor : undefined }}
                >
                  <span className="block text-[12px] leading-tight">{group.nome}</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-ink-3">{booksFor(group).length} {booksFor(group).length === 1 ? 'livro' : 'livros'}</span>
                  {visited && !active && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: group.cor }} aria-label="Explorado" />}
                </button>
              )
            })}
          </div>

          <article className="mt-4 overflow-hidden rounded-card border border-line bg-card shadow-card" aria-live="polite">
            <div className="h-1.5" style={{ backgroundColor: activeGroup.cor }} />
            <div className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.13em]" style={{ color: activeGroup.cor }}>{activeGroup.rotulo}</p>
              <div className="mt-0.5 flex items-baseline justify-between gap-3">
                <h3 className="text-[24px]">{activeGroup.nome}</h3>
                <span className="text-[12px] font-semibold text-ink-3">{activeBooks.length} {activeBooks.length === 1 ? 'livro' : 'livros'}</span>
              </div>
              <p className="mt-2 text-[15px] leading-normal text-ink-2">{activeGroup.funcao}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {activeBooks.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => openBook(book)}
                    className="min-h-11 rounded-xl border bg-paper px-3 py-2 text-[13px] font-semibold text-ink"
                    style={{ borderColor: exploredBooks.has(book.id) ? activeGroup.cor : `${activeGroup.cor}3D` }}
                  >
                    {book.nome}
                  </button>
                ))}
              </div>
            </div>
          </article>
        </div>
      )}

      {tab === 'livros' && (
        <div role="tabpanel" className="px-5 pb-6 pt-4">
          <form onSubmit={(event) => {
            event.preventDefault()
            if (lookup) setPassage(lookup)
          }}>
            <label className="block">
              <span className="sr-only">Buscar livro ou referência bíblica</span>
              <input
                type="search"
                enterKeyHint="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Livro ou referência, ex.: Êxodo 20:12"
                className="min-h-12 w-full rounded-btn border border-line bg-card px-4 text-[16px] outline-none focus:border-gold"
              />
            </label>
            {lookup && <button type="submit" className="btn mt-3">Abrir {lookup.reference}</button>}
          </form>
          {!lookup && <>
          <div className="mt-3 flex gap-2" aria-label="Filtrar por testamento">
            <FilterButton active={testament === 'todos'} onClick={() => setTestament('todos')}>Todos</FilterButton>
            <FilterButton active={testament === 'AT'} onClick={() => setTestament('AT')}>Antigo Testamento</FilterButton>
            <FilterButton active={testament === 'NT'} onClick={() => setTestament('NT')}>Novo Testamento</FilterButton>
          </div>
          <p className="mt-4 text-[13px] font-semibold text-ink-3">Ordem do índice · {visibleBooks.length} {visibleBooks.length === 1 ? 'livro' : 'livros'}</p>
          <ul className="mt-3 grid grid-cols-2 gap-2.5">
            {visibleBooks.map((book) => (
              <li key={book.id}>
                <button
                  type="button"
                  onClick={() => openBook(book)}
                  className="relative flex h-full min-h-[80px] w-full items-center gap-2.5 overflow-hidden rounded-card border border-line bg-card px-3 pb-2.5 pt-5 text-left shadow-card"
                  style={{ '--book-color': BLOCK_COLORS[book.bloco] } as CSSProperties}
                >
                  {book.sigla && (
                    <span aria-hidden="true" className="library-book-abbreviation absolute right-0 top-0 rounded-bl-lg px-2.5 py-0.5 text-[10px] font-bold tracking-wider">
                      {normalized(book.sigla).toUpperCase()}
                    </span>
                  )}
                  <span className="library-book-number grid h-10 w-10 flex-none place-items-center rounded-xl font-display text-[17px] font-semibold">{book.ordem}</span>
                  <span className="min-w-0">
                    <strong className="block break-words text-[14px] leading-tight">{book.nome}</strong>
                    <span className="mt-0.5 block text-[11px] text-ink-3">{book.capitulos} capítulos</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {visibleBooks.length === 0 && <p className="rounded-card bg-paper-2 p-5 text-center text-[15px] text-ink-2">
            Não encontrei esse livro ou referência. Tente “Êxodo”, “Êxodo 20” ou “Ex 20:12”.
          </p>}
          </>}
          {passage && (
            <BibleReader
              book={passage.chapters[0].book}
              open
              passage={passage}
              onClose={() => setPassage(null)}
              onBackToSearch={() => setPassage(null)}
            />
          )}
        </div>
      )}

      {tab === 'progresso' && (
        <div role="tabpanel" className="pt-4">
          <BibliaScreen embedded onBack={onBack} onOpenDay={onOpenDay} onOffer={onOffer} />
        </div>
      )}

    </section>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick(): void; children: React.ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`min-h-11 rounded-xl px-1 text-[12px] font-bold ${active ? 'bg-card text-ink shadow-card' : 'text-ink-3'}`}>
      {children}
    </button>
  )
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick(): void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-11 flex-1 rounded-xl border px-2 text-[11px] font-bold leading-tight ${active ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink-2'}`}>
      {children}
    </button>
  )
}
