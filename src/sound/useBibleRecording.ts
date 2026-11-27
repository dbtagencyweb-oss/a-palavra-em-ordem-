import { useCallback, useEffect, useRef, useState } from 'react'
import { soundManager } from './SoundManager'
import { estimatedWordStarts, wordAtTime } from './bibleWords'

type Recording = { file: string; cues: [verse: number, seconds: number, wordStarts?: number[]][] }
type Catalog = Record<string, Recording>
type Status = 'idle' | 'playing' | 'paused'

const catalogs = import.meta.glob<Catalog>('../../content/bible-audio/*.json', { import: 'default' })
const audioBase = (import.meta.env.VITE_BIBLE_AUDIO_BASE || '/audio/bible/2018').replace(/\/+$/, '')

export function useBibleRecording(
  open: boolean,
  scope: string,
  book: string,
  chapter: number,
  verses: readonly (readonly [number, string])[] | undefined,
  firstVerse?: number,
  lastVerse?: number,
) {
  const load = catalogs[`../../content/bible-audio/${book}.json`]
  const [catalog, setCatalog] = useState<{ book: string; chapters: Catalog }>()
  const [status, setStatus] = useState<Status>('idle')
  const [active, setActive] = useState<{ verse: number; word: number }>()
  const [speed, setSpeed] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const player = useRef<HTMLAudioElement | null>(null)
  const frame = useRef(0)

  useEffect(() => {
    if (!open || !load || catalog?.book === book) return
    let active = true
    void load().then(
      (chapters) => { if (active) setCatalog({ book, chapters }) },
      () => { if (active) setCatalog({ book, chapters: {} }) },
    )
    return () => { active = false }
  }, [open, book, load, catalog])

  const clear = useCallback(() => {
    window.cancelAnimationFrame(frame.current)
    const audio = player.current
    player.current = null
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }, [])

  useEffect(() => {
    setStatus('idle')
    setActive(undefined)
    setError(null)
    return clear
  }, [open, scope, clear])

  const loading = !!load && catalog?.book !== book
  const recording = catalog?.book === book ? catalog.chapters[chapter] : undefined

  function toggle() {
    if (!recording || !open) return
    let audio = player.current
    if (status === 'playing' && audio) {
      audio.pause()
      window.cancelAnimationFrame(frame.current)
      setStatus('paused')
      return
    }

    if (!audio) {
      const cues = recording.cues
      const first = cues.findIndex(([number]) => number >= (firstVerse ?? 1))
      if (first < 0 || cues[first][0] > (lastVerse ?? Infinity)) return
      const start = cues[first][1]
      const end = cues.find(([number]) => number > (lastVerse ?? Infinity))?.[1] ?? Infinity
      const media = new Audio(`${audioBase}/${book}/${recording.file}`)
      const textByVerse = new Map(verses)
      let trackedVerse = -1
      let starts: number[] = []
      let trackedDuration = 0
      let currentWord = -1
      audio = media
      player.current = media
      media.currentTime = start

      function finish() {
        if (player.current !== media) return
        clear()
        setStatus('idle')
        setActive(undefined)
      }

      function sync() {
        if (player.current !== media || media.paused) return
        const time = media.currentTime
        if (time >= end) {
          finish()
          return
        }
        if (time < start) return
        for (let i = cues.length - 1; i >= first; i--) {
          if (time >= cues[i][1]) {
            const [verse, verseStart, measured] = cues[i]
            const duration = (cues[i + 1]?.[1] ?? media.duration) - verseStart
            const validDuration = Number.isFinite(duration) ? duration : 0
            if (trackedVerse !== i || trackedDuration !== validDuration) {
              starts = measured ?? estimatedWordStarts(textByVerse.get(verse) ?? '', Math.max(0, validDuration - 0.18))
              trackedVerse = i
              trackedDuration = validDuration
              currentWord = -2
            }
            const word = wordAtTime(starts, time - verseStart)
            if (word !== currentWord) {
              currentWord = word
              setActive({ verse, word })
            }
            return
          }
        }
      }

      function tick() {
        sync()
        if (player.current === media && !media.paused) frame.current = window.requestAnimationFrame(tick)
      }
      media.addEventListener('playing', () => {
        window.cancelAnimationFrame(frame.current)
        tick()
      })
      media.addEventListener('timeupdate', sync)
      media.addEventListener('ended', finish)
      media.addEventListener('error', () => {
        if (player.current === media) fail()
      })
    }

    soundManager.stopNarration(0)
    soundManager.stopAmbient()
    audio.playbackRate = speed
    setError(null)
    setStatus('playing')
    const media = audio
    void media.play().catch((reason) => {
      if (player.current !== media || reason?.name === 'AbortError') return
      fail()
    })
  }

  function fail() {
    clear()
    setStatus('idle')
    setActive(undefined)
    setError('Não foi possível tocar a narração oficial. Tente novamente.')
  }

  function changeSpeed(rate: number) {
    setSpeed(rate)
    if (player.current) player.current.playbackRate = rate
  }

  return { available: !!recording, loading, status, verse: active?.verse, word: active?.word, speed, error, toggle, changeSpeed }
}
