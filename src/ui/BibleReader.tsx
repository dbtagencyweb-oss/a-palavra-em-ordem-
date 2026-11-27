import { useIsPresent } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import { livros, trilha } from '../content'
import { downloadBibleText, loadBibleText, offlineBookCount, type BibleText } from '../content/bibleText'
import { buildReadingLink, type PassageChapter } from '../content/readingLink'
import type { Livro } from '../content/types'
import { useBibleSpeech } from '../sound/useBibleSpeech'
import { useBibleRecording } from '../sound/useBibleRecording'
import { bibleWords } from '../sound/bibleWords'
import { CloseIcon, DownloadIcon, PauseIcon, PlayIcon } from './icons'
import { Sheet } from './Sheet'

const FONT_KEY = 'pao:leitor:tamanho'
const FONT_SIZES = [16, 18, 20, 22, 24, 26]
const SPEECH_SPEEDS = [0.8, 1, 1.25, 1.5]
const NAV_BUTTON = 'min-h-11 rounded-btn border border-line bg-card px-1 text-xs font-semibold text-ink-2 shadow-[0_2px_7px_rgba(45,34,22,.08)] disabled:opacity-40 disabled:shadow-none'

function getFontSize() {
  try {
    const size = Number(localStorage.getItem(FONT_KEY))
    if (FONT_SIZES.includes(size)) return size
  } catch {
    // Optional preference.
  }
  return 18
}

function verseText(text: string, wordIndex: number | undefined) {
  if (wordIndex === undefined || wordIndex < 0) return text
  const word = bibleWords(text)[wordIndex]
  if (!word) return text
  return <>{text.slice(0, word.start)}<mark data-current-word className="rounded-sm bg-gold-soft text-ink">{word.word}</mark>{text.slice(word.end)}</>
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
  const present = useIsPresent()
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)
  const [passageIndex, setPassageIndex] = useState(0)
  const passageChapter = passage?.chapters[passageIndex]
  const book = passageChapter?.book ?? initialBook
  const excerpt = passageChapter?.firstVerse !== undefined || passageChapter?.lastVerse !== undefined
  const multiPassage = (passage?.chapters.length ?? 0) > 1
  const canBrowse = !guided && (!passage || (!!onBackToSearch && !multiPassage && !excerpt))
  const chapter = (canBrowse ? selectedChapter : null) ?? passageChapter?.chapter ?? guided?.chapter ?? 1
  const [fontSize, setFontSize] = useState(getFontSize)
  const [loaded, setLoaded] = useState<{ bookId: string; text: BibleText } | null>(null)
  const [failedBook, setFailedBook] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [downloaded, setDownloaded] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadFailed, setDownloadFailed] = useState(false)
  const [offlineOpen, setOfflineOpen] = useState(false)
  const [fallbackScope, setFallbackScope] = useState<string>()
  const body = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const chapterId = useId()
  const offlineId = useId()
  const external = buildReadingLink(`${book.nome} ${chapter}`, trilha.linkLeitura.modelo)
  const text = loaded?.bookId === book.id ? loaded.text : null
  const loadFailed = failedBook === book.id
  const verses = text?.[chapter]
  const visibleVerses = passageChapter ? verses?.filter(([number]) =>
    number >= (passageChapter.firstVerse ?? 1) && number <= (passageChapter.lastVerse ?? Infinity),
  ) : verses
  const scope = `${book.id}:${chapter}:${passageIndex}:${passage?.reference ?? ''}`
  const fallback = fallbackScope === scope
  const speech = useBibleSpeech(open && present, scope, visibleVerses)
  const recording = useBibleRecording(open && present && !fallback, scope, book.id, chapter, verses, passageChapter?.firstVerse, passageChapter?.lastVerse)
  const official = recording.available && !fallback
  const playback = official ? recording : speech
  const singleVerse = passageChapter?.firstVerse !== undefined && passageChapter.firstVerse === passageChapter.lastVerse
  const listenLabel = singleVerse ? 'Ouvir versículo' : excerpt ? 'Ouvir trecho' : 'Ouvir capítulo'
  const playLabel = playback.status === 'playing' ? 'Pausar áudio' : playback.status === 'paused' ? 'Retomar áudio' : listenLabel
  const spokenVerse = official ? recording.verse : speech.verseIndex === null ? undefined : visibleVerses?.[speech.verseIndex]?.[0]
  const spokenWord = playback.word

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
    if (spokenVerse === undefined) return
    const container = body.current
    const targetWord = container?.querySelector('[data-current-word]') ?? container?.querySelector('[data-current-verse]')
    if (!container || !targetWord) return
    const bounds = container.getBoundingClientRect()
    const target = targetWord.getBoundingClientRect()
    if (target.top < bounds.top + 12 || target.bottom > bounds.bottom - 16) {
      container.scrollTop += target.top - bounds.top - 20
    }
  }, [spokenVerse, spokenWord])

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
  const showBack = !!(onBackToSearch || passage)
  const showArrows = canBrowse || multiPassage || !!onBackToSearch

  function changeChapter(step: number) {
    if (canBrowse) setSelectedChapter(chapter + step)
    else if (multiPassage) setPassageIndex(passageIndex + step)
  }

  const content = (
    <>
      <header className="shrink-0 border-b border-line px-4 pb-2.5 pt-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Bíblia Livre</p>
            <h2 className="text-[24px] leading-tight" aria-live="polite">
              {passage && !multiPassage && !canBrowse ? passage.reference : `${book.nome} ${chapter}`}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" aria-label="Baixar e ver opções offline" title="Versão e leitura offline" aria-expanded={offlineOpen} aria-controls={offlineId} onClick={() => {
              if (!offlineOpen && body.current) body.current.scrollTop = 0
              setOfflineOpen(!offlineOpen)
            }} className={`grid h-11 w-11 place-items-center rounded-full ${offlineOpen ? 'bg-gold-soft text-gold-ink' : 'bg-paper-2 text-ink-2'}`}><DownloadIcon /></button>
            <button ref={closeButton} type="button" data-autofocus onClick={onClose} aria-label="Fechar leitor" className="grid h-11 w-11 place-items-center rounded-full bg-paper-2"><CloseIcon /></button>
          </div>
        </div>
        <div className="mt-2.5 flex min-w-0 items-center justify-between gap-1.5">
          {canBrowse ? <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink-2">
            <label htmlFor={chapterId}>Capítulo</label>
            <select id={chapterId} value={chapter} onChange={(event) => setSelectedChapter(Number(event.target.value))} className="min-h-11 rounded-btn border border-line bg-card px-2">
              {Array.from({ length: book.capitulos }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </div> : <p className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-2" title={multiPassage ? passage?.reference : undefined}>{multiPassage ? passage?.reference : guided ? 'Ordem de leitura' : `Capítulo ${chapter}`}</p>}
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" aria-label="Diminuir letra" disabled={fontSize === FONT_SIZES[0]} onClick={() => changeFont(-1)} className="min-h-11 min-w-11 rounded-btn bg-paper-2 font-semibold disabled:opacity-40">A−</button>
            <button type="button" aria-label="Aumentar letra" disabled={fontSize === FONT_SIZES.at(-1)} onClick={() => changeFont(1)} className="min-h-11 min-w-11 rounded-btn bg-paper-2 font-semibold disabled:opacity-40">A+</button>
            {(playback.available || recording.loading) && <button type="button" aria-label={playLabel} title={playLabel} disabled={recording.loading || !visibleVerses?.length} onClick={playback.toggle} className="grid h-11 w-11 place-items-center rounded-btn bg-ink text-paper disabled:opacity-40">
              {playback.status === 'playing' ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
            </button>}
          </div>
        </div>
        {(playback.status !== 'idle' || playback.error) && (
          <div className="mt-1.5 flex items-center justify-between gap-2">
            {playback.error ? <div className="text-xs text-ember-ink">
              <p role="status">{playback.error}</p>
              {official && speech.available && <button type="button" className="min-h-8 font-semibold underline" onClick={() => {
                setFallbackScope(scope)
                speech.toggle()
              }}>Usar voz do aparelho</button>}
            </div> : <p className="text-xs font-semibold text-gold-ink">{spokenVerse === undefined ? 'Preparando áudio…' : `Versículo ${spokenVerse}`}</p>}
            <select aria-label="Velocidade da narração" value={playback.speed} onChange={(event) => {
              const speed = Number(event.target.value)
              recording.changeSpeed(speed)
              speech.changeSpeed(speed)
            }} className="min-h-11 shrink-0 rounded-lg bg-paper-2 px-1.5 text-xs font-semibold text-ink-2">
              {SPEECH_SPEEDS.map((speed) => <option value={speed} key={speed}>{speed.toLocaleString('pt-BR')}×</option>)}
            </select>
          </div>
        )}
      </header>

      <div ref={body} role="region" aria-label="Texto do capítulo" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <div id={offlineId} hidden={!offlineOpen} className="mb-4 rounded-btn border border-line bg-card p-3 text-sm text-ink-2 shadow-[0_2px_7px_rgba(45,34,22,.08)]">
          <h3 className="mb-1.5 text-base">Versão e leitura offline</h3>
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
        </div>
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
            {visibleVerses.map(([number, verse]) => {
              const current = spokenVerse === number
              return <p key={number} aria-current={current || undefined} data-current-verse={current || undefined} className="mb-2"><sup className="mr-1.5 font-sans font-semibold text-gold-ink">{number}</sup>{verseText(verse, current ? spokenWord : undefined)}</p>
            })}
          </div>
        )}
      </div>

      <nav aria-label="Navegação de capítulos" className="shrink-0 border-t border-line px-4 pt-2.5 pb-[calc(12px+env(safe-area-inset-bottom))]">
        {guided ? (
          <button type="button" disabled={!verses} onClick={guided.onAdvance} className="btn min-h-11 py-2 text-sm shadow-[0_2px_7px_rgba(45,34,22,.08)]">
            {guided.last ? 'Marcar capítulo como lido' : 'Marcar como lido e avançar'}
          </button>
        ) : (
          <div className={`grid gap-1.5 ${showArrows ? (showBack ? 'grid-cols-[1fr_1fr_1.4fr]' : 'grid-cols-2') : 'grid-cols-1'}`}>
            {showArrows && <>
              <button type="button" disabled={canBrowse ? chapter <= 1 : passageIndex <= 0} onClick={() => changeChapter(-1)} className={NAV_BUTTON}>Anterior</button>
              <button type="button" aria-label={multiPassage ? 'Próximo trecho' : undefined} disabled={canBrowse ? chapter >= book.capitulos : passageIndex >= (passage?.chapters.length ?? 0) - 1} onClick={() => changeChapter(1)} className={NAV_BUTTON}>Próximo</button>
            </>}
            {showBack && <button type="button" className={`${NAV_BUTTON} !border-gold/30 !text-gold-ink`} onClick={onBackToSearch ?? onClose}>{backLabel}</button>}
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
