import { useEffect, useId, useRef, useState } from 'react'
import { livros, trilha } from '../content'
import { downloadBibleText, loadBibleText, offlineBookCount, type BibleText } from '../content/bibleText'
import { buildReadingLink, type PassageChapter } from '../content/readingLink'
import type { Livro } from '../content/types'
import { CloseIcon } from './icons'
import { Sheet } from './Sheet'

const FONT_KEY = 'pao:leitor:tamanho'
const FONT_SIZES = [16, 18, 20, 22, 24, 26]

function getFontSize() {
  try {
    const size = Number(localStorage.getItem(FONT_KEY))
    if (FONT_SIZES.includes(size)) return size
  } catch {
    // Optional preference.
  }
  return 18
}

interface Props {
  book: Livro
  open: boolean
  onClose(): void
  embedded?: boolean
  onBackToSearch?(): void
  guided?: { chapter: number; last: boolean; onAdvance(): void }
  passage?: { reference: string; chapters: PassageChapter[] }
}

export function BibleReader({ book: initialBook, open, onClose, embedded = false, onBackToSearch, guided, passage }: Props) {
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [passageIndex, setPassageIndex] = useState(0)
  const passageChapter = passage?.chapters[passageIndex]
  const book = passageChapter?.book ?? initialBook
  const chapter = passageChapter?.chapter ?? guided?.chapter ?? selectedChapter
  const [fontSize, setFontSize] = useState(getFontSize)
  const [loaded, setLoaded] = useState<{ bookId: string; text: BibleText } | null>(null)
  const [failedBook, setFailedBook] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [downloaded, setDownloaded] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadFailed, setDownloadFailed] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const chapterId = useId()
  const external = buildReadingLink(`${book.nome} ${chapter}`, trilha.linkLeitura.modelo)
  const text = loaded?.bookId === book.id ? loaded.text : null
  const loadFailed = failedBook === book.id
  const verses = text?.[chapter]
  const visibleVerses = passageChapter ? verses?.filter(([number]) =>
    number >= (passageChapter.firstVerse ?? 1) && number <= (passageChapter.lastVerse ?? Infinity),
  ) : verses

  useEffect(() => {
    if (!open || text) return
    const controller = new AbortController()
    loadBibleText(book.id, controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setLoaded({ bookId: book.id, text: result })
        setFailedBook(null)
      }
    }).catch(() => {
      if (!controller.signal.aborted) setFailedBook(book.id)
    })
    return () => controller.abort()
  }, [open, book.id, attempt, text])

  useEffect(() => {
    if (open && !downloading && 'caches' in window) {
      void offlineBookCount().then(setDownloaded).catch(() => setDownloaded(null))
    }
  }, [open, downloading])

  useEffect(() => {
    if (body.current) body.current.scrollTop = 0
  }, [book.id, chapter, passageIndex, open])

  useEffect(() => {
    if (embedded && open) closeButton.current?.focus()
  }, [embedded, open])

  function changeFont(step: number) {
    const next = FONT_SIZES[FONT_SIZES.indexOf(fontSize) + step]
    if (!next) return
    setFontSize(next)
    try {
      localStorage.setItem(FONT_KEY, String(next))
    } catch {
      // The size still applies to the current reader.
    }
  }

  async function download() {
    setDownloading(true)
    setDownloadFailed(false)
    try {
      await downloadBibleText(setDownloaded)
    } catch {
      setDownloadFailed(true)
    } finally {
      setDownloading(false)
    }
  }

  const backLabel = onBackToSearch ? 'Voltar à busca' : 'Voltar à lição'
  const content = (
    <>
      <header className="shrink-0 border-b border-line px-5 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Bíblia Livre</p>
            <h2 className="text-[24px] leading-tight" aria-live="polite">
              {passage?.chapters.length === 1 ? passage.reference : `${book.nome} ${chapter}`}
            </h2>
          </div>
          <button ref={closeButton} type="button" data-autofocus onClick={onClose} aria-label="Fechar leitor" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper-2"><CloseIcon /></button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {passage ? <p className="min-w-0 flex-1 text-sm font-semibold text-ink-2">{passage.chapters.length > 1 ? passage.reference : onBackToSearch ? 'Consulta bíblica' : 'Leitura da lição'}</p> : guided ? <p className="text-sm font-semibold text-ink-2">Ordem de leitura</p> : <div className="flex items-center gap-2 text-sm font-semibold">
            <label htmlFor={chapterId}>Capítulo</label>
            <select id={chapterId} value={chapter} onChange={(event) => setSelectedChapter(Number(event.target.value))} className="min-h-11 rounded-btn border border-line bg-card px-2">
              {Array.from({ length: book.capitulos }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </div>}
          <div className="flex gap-1">
            <button type="button" aria-label="Diminuir letra" disabled={fontSize === FONT_SIZES[0]} onClick={() => changeFont(-1)} className="min-h-11 min-w-11 rounded-btn bg-paper-2 font-semibold disabled:opacity-40">A−</button>
            <button type="button" aria-label="Aumentar letra" disabled={fontSize === FONT_SIZES.at(-1)} onClick={() => changeFont(1)} className="min-h-11 min-w-11 rounded-btn bg-paper-2 font-semibold disabled:opacity-40">A+</button>
          </div>
        </div>
      </header>

      <div ref={body} role="region" aria-label="Texto do capítulo" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <details className="mb-4 border-b border-line pb-2 text-sm text-ink-2">
          <summary className="min-h-9 cursor-pointer font-semibold">Versão e leitura offline</summary>
          <p>Bíblia Livre (BLIVRE), edição de fevereiro de 2018. © Diego Santos, Mario Sérgio e Marco Teles. <a href="https://ebible.org/bible/details.php?id=porbr2018" target="_blank" rel="noreferrer" className="underline">Fonte</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline">CC BY 4.0</a>.</p>
          {external && <a href={external} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-semibold underline">Ler na NVI no YouVersion</a>}
          {downloaded !== null && (
            <div>
              {downloaded === livros.length ? <p role="status">Bíblia disponível offline neste dispositivo.</p> : (
                <button type="button" onClick={() => void download()} disabled={downloading} className="min-h-11 text-left font-semibold underline disabled:no-underline">
                  {downloading ? `Baixando… ${downloaded} de ${livros.length} livros` : 'Baixar Bíblia para ler offline'}
                </button>
              )}
              {downloadFailed && <p role="status">Download interrompido. Tente novamente para baixar os livros restantes.</p>}
            </div>
          )}
        </details>
        {!text && !loadFailed && <p role="status" className="text-ink-2">Carregando capítulo…</p>}
        {(loadFailed || (text && !verses)) && (
          <div role="status" className="text-ink-2">
            <p>Não foi possível abrir o capítulo. Confira sua conexão e tente de novo.</p>
            <button type="button" className="mt-2 min-h-11 font-semibold underline" onClick={() => {
              setLoaded(null)
              setFailedBook(null)
              setAttempt((value) => value + 1)
            }}>Tentar novamente</button>
          </div>
        )}
        {verses && visibleVerses?.length === 0 && <p role="status" className="text-ink-2">Não encontrei esses versículos na Bíblia Livre. Confira a numeração ou consulte a NVI nas opções acima.</p>}
        {!!visibleVerses?.length && (
          <div className="font-serif leading-relaxed" style={{ fontSize }}>
            {visibleVerses.map(([number, verse], index) => (
              <p key={index} className="mb-2"><sup className="mr-1.5 font-sans font-semibold text-gold-ink">{number}</sup>{verse}</p>
            ))}
          </div>
        )}
      </div>

      <nav aria-label="Navegação de capítulos" className="shrink-0 border-t border-line px-5 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))]">
        {passage ? (
          passage.chapters.length === 1 ? (
            <button type="button" className="btn min-h-11 py-2 text-sm" onClick={onBackToSearch ?? onClose}>{backLabel}</button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={passageIndex === 0} onClick={() => setPassageIndex(passageIndex - 1)} className="min-h-11 rounded-btn border border-line text-sm font-semibold disabled:opacity-40">Anterior</button>
              {passageIndex === passage.chapters.length - 1 ? (
                <button type="button" onClick={onBackToSearch ?? onClose} className="min-h-11 rounded-btn border border-line text-sm font-semibold">{backLabel}</button>
              ) : (
                <button type="button" onClick={() => setPassageIndex(passageIndex + 1)} className="min-h-11 rounded-btn border border-line text-sm font-semibold">Próximo trecho</button>
              )}
            </div>
          )
        ) : guided ? (
          <button type="button" disabled={!verses} onClick={guided.onAdvance} className="btn min-h-11 py-2 text-sm">
            {guided.last ? 'Marcar capítulo como lido' : 'Marcar como lido e avançar'}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={chapter === 1} onClick={() => setSelectedChapter(chapter - 1)} className="min-h-11 rounded-btn border border-line text-sm font-semibold disabled:opacity-40">Anterior</button>
            <button type="button" disabled={chapter === book.capitulos} onClick={() => setSelectedChapter(chapter + 1)} className="min-h-11 rounded-btn border border-line text-sm font-semibold disabled:opacity-40">Próximo</button>
            {onBackToSearch && <button type="button" className="col-span-2 min-h-11 text-sm font-semibold text-ink-2" onClick={onBackToSearch}>{backLabel}</button>}
          </div>
        )}
      </nav>
    </>
  )
  if (embedded) return content
  return (
    <Sheet open={open} onClose={onClose} label={`Leitor da Bíblia: ${book.nome}`} className="!flex h-[88%] flex-col !overflow-hidden !p-0">
      {content}
    </Sheet>
  )
}
