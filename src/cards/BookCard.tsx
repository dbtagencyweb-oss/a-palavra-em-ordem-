import { useEffect, useRef, useState } from 'react'
import { trilha } from '../content'
import { buildReadingLink, parsePassage, type PassageChapter } from '../content/readingLink'
import type { Livro } from '../content/types'
import { soundManager } from '../sound/SoundManager'
import { BLOCK_COLORS, Bookshelf } from '../media/Bookshelf'
import { Sheet } from '../ui/Sheet'
import { BibleReader } from '../ui/BibleReader'
import { BackIcon } from '../ui/icons'

const has = (v: unknown) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)

/** Book fact sheet. Shows only the fields already filled in content/livros.json. */
export type BookPassage = { reference: string; chapters: PassageChapter[] }

export function BookCard({ livro, onRead, firstChapter = false }: {
  livro: Livro
  onRead(passage?: BookPassage): void
  firstChapter?: boolean
}) {
  const [openEvent, setOpenEvent] = useState<number | null>(null)
  const numbers = [
    { label: 'capítulos', value: livro.capitulos },
    has(livro.versiculos) && { label: 'versículos', value: livro.versiculos },
    has(livro.tempoLeitura) && { label: 'de leitura', value: livro.tempoLeitura },
  ].filter(Boolean) as { label: string; value: string | number }[]
  const facts = [
    has(livro.autorTradicional) && { label: 'Autor (tradição)', value: livro.autorTradicional! },
    has(livro.dataAproximada) && { label: 'Data aproximada', value: livro.dataAproximada! },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <article>
      <div className="eyebrow">
        {livro.testamento === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'} · {livro.bloco}
      </div>
      <h3 className="mb-4 mt-1.5 text-[28px]">{livro.nome}</h3>

      {has(livro.resumo) && <p className="mb-4 font-serif text-[17px] leading-normal text-ink-2">{livro.resumo}</p>}

      {/* Where this book sits among the 66 */}
      <div className="mb-4">
        <Bookshelf highlight={[livro.id]} height={40} label={`${livro.nome}: livro ${livro.ordem} de 66, bloco ${livro.bloco}`} />
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-3">
          <span className="h-3 w-1 rounded-sm" style={{ backgroundColor: BLOCK_COLORS[livro.bloco] }} aria-hidden="true" />
          Livro {livro.ordem} de 66 · {livro.bloco}
        </p>
      </div>

      <dl className="mb-4 grid grid-cols-3 gap-2">
        {numbers.map((n) => (
          <div key={n.label} className="rounded-btn bg-card px-2 py-3 text-center">
            <dd className="font-display text-[22px] font-semibold text-gold-ink">{n.value}</dd>
            <dt className="text-[11px] font-semibold text-ink-3">{n.label}</dt>
          </div>
        ))}
      </dl>

      {has(livro.diasDoMapa) && (
        <p className="mb-4 text-[13.5px] text-ink-2">
          No mapa: {livro.diasDoMapa!.map((d) => `Dia ${d} (${trilha.dias[d - 1]?.lugar ?? ''})`).join(', ')}
        </p>
      )}

      {has(livro.ondeSeEncaixa) && (
        <Section title="Onde se encaixa">
          <p className="font-serif text-[17px] leading-normal">{livro.ondeSeEncaixa}</p>
        </Section>
      )}

      {facts.length > 0 && (
        <dl className="mb-4">
          {facts.map((f) => (
            <div key={f.label} className="flex justify-between gap-4 border-b border-line py-2.5 text-sm">
              <dt className="text-ink-2">{f.label}</dt>
              <dd className="text-right font-semibold">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {has(livro.eventos) && (
        <Section title="Linha do tempo">
          <ol className="relative ml-2 border-l-2 border-line pl-4">
            {livro.eventos!.map((e, i) => {
              const chapters = parsePassage(e.referencia)
              const link = chapters ? null : buildReadingLink(e.referencia, trilha.linkLeitura.modelo)
              const open = openEvent === i
              return (
                <li key={e.titulo + e.referencia} className="relative pb-3">
                  <span className={`absolute -left-[23px] top-3 h-3 w-3 rounded-full border-2 border-paper ${open ? 'bg-ember' : 'bg-gold'}`} />
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenEvent(open ? null : i)}
                    className="min-h-[44px] w-full rounded-btn bg-card px-3.5 py-2.5 text-left"
                  >
                    <strong className="block text-[14.5px]">{e.titulo}</strong>
                    <span className="text-xs font-bold uppercase tracking-[0.08em] text-ink-3">{e.referencia}</span>
                  </button>
                  {open && (
                    <div className="px-3.5 pt-2 text-sm leading-normal text-ink-2">
                      {e.texto && <p>{e.texto}</p>}
                      {chapters ? (
                        <button type="button" className="mt-1 inline-flex min-h-[44px] items-center font-bold text-ember-ink" onClick={() => {
                          onRead({ reference: e.referencia, chapters })
                        }}>Abrir o texto</button>
                      ) : link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-[44px] items-center font-bold text-ember-ink">
                          Abrir o texto →
                        </a>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </Section>
      )}

      {has(livro.personagens) && (
        <Section title="Personagens">
          <ul className="flex flex-wrap gap-1.5">
            {livro.personagens!.map((p) => {
              const nome = typeof p === 'string' ? p : p.nome
              return (
                <li key={nome} className="rounded-full border border-line bg-card px-3 py-1.5 text-[13px] font-semibold">
                  {nome}
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {has(livro.curiosidades) && (
        <Section title="Curiosidades">
          <ul className="grid gap-2">
            {livro.curiosidades!.map((c) => (
              <li key={c} className="rounded-btn bg-gold-soft px-3.5 py-3 text-sm leading-normal text-[#6A4E1C]">
                {c}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <button type="button" aria-haspopup="dialog" onClick={() => onRead()} className="btn btn-ghost library-read-button mt-2 w-full">
        {firstChapter ? 'Abrir o capítulo 1' : 'Abrir capítulo'}
      </button>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3">{title}</h4>
      {children}
    </section>
  )
}

export function BookNavigation({ index, total, onIndex, onClose, closeLabel = 'Fechar', className = 'mt-2', closeRef }: {
  index: number
  total: number
  onIndex(index: number): void
  onClose(): void
  closeLabel?: string
  className?: string
  closeRef?: React.Ref<HTMLButtonElement>
}) {
  const arrowClass = 'grid h-11 w-11 place-items-center self-center justify-self-center rounded-full text-ink-2 transition-colors enabled:hover:bg-white/65 disabled:opacity-35'
  return (
    <nav className={`grid grid-cols-[1fr_1.6fr_1fr] gap-2 ${className}`} aria-label="Navegação entre livros">
      <button type="button" className={arrowClass} disabled={index === 0} onClick={() => onIndex(index - 1)} aria-label="Livro anterior">
        <BackIcon size={22} />
      </button>
      <button ref={closeRef} type="button" className="btn" onClick={onClose} data-autofocus>{closeLabel}</button>
      <button type="button" className={arrowClass} disabled={index === total - 1} onClick={() => onIndex(index + 1)} aria-label="Próximo livro">
        <BackIcon size={22} className="rotate-180" />
      </button>
    </nav>
  )
}

/** Bottom sheet holding a BookCard. */
export function BookSheet({ livros, index, onClose, onIndex }: { livros: Livro[]; index: number | null; onClose(): void; onIndex(i: number): void }) {
  const livro = index !== null ? livros[index] : null
  const [reading, setReading] = useState<{ bookId: string; passage?: BookPassage } | null>(null)
  const openReader = !!livro && reading?.bookId === livro.id
  const closeButton = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)

  function backToBook() {
    restoreFocus.current = true
    setReading(null)
  }

  useEffect(() => {
    if (openReader || !restoreFocus.current) return
    restoreFocus.current = false
    closeButton.current?.focus({ preventScroll: true })
  }, [openReader])

  useEffect(() => {
    if (livro) soundManager.play('offer_open')
  }, [livro])

  return (
    <Sheet
      open={!!livro}
      onClose={openReader ? backToBook : onClose}
      label={livro ? (openReader ? `Leitor da Bíblia: ${livro.nome}` : `Ficha de ${livro.nome}`) : 'Ficha do livro'}
      className={openReader ? '!flex h-[88%] flex-col !overflow-hidden !p-0' : '!pt-6 !pb-6'}
      animateLayout
    >
      {livro && (openReader ? (
        <BibleReader book={livro} open embedded onClose={backToBook} passage={reading?.passage} />
      ) : index !== null && (
        <>
          <BookCard key={livro.id} livro={livro} firstChapter onRead={(passage) => setReading({ bookId: livro.id, passage })} />
          <BookNavigation index={index} total={livros.length} onIndex={onIndex} onClose={onClose} closeRef={closeButton} />
        </>
      ))}
    </Sheet>
  )
}
