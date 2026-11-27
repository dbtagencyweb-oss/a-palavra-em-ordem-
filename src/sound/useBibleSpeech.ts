import { useCallback, useEffect, useRef, useState } from 'react'
import { soundManager } from './SoundManager'
import { bibleWords, estimatedWordStarts, wordAtTime } from './bibleWords'

type Verse = readonly [number, string]
type Status = 'idle' | 'playing' | 'paused'

export function useBibleSpeech(open: boolean, scope: string, verses: readonly Verse[] | undefined) {
  const synth = typeof window !== 'undefined' && typeof window.SpeechSynthesisUtterance === 'function'
    ? window.speechSynthesis
    : undefined
  const [status, setStatus] = useState<Status>('idle')
  const [verseIndex, setVerseIndex] = useState<number | null>(null)
  const [word, setWord] = useState<number>()
  const [speed, setSpeed] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const current = useRef<SpeechSynthesisUtterance | null>(null)
  const position = useRef(0)
  const startTimer = useRef<number | undefined>(undefined)
  const wordFrame = useRef(0)

  const cancel = useCallback(() => {
    window.clearTimeout(startTimer.current)
    window.cancelAnimationFrame(wordFrame.current)
    if (!current.current) return
    current.current = null
    synth?.cancel()
  }, [synth])

  useEffect(() => {
    position.current = 0
    setStatus('idle')
    setVerseIndex(null)
    setWord(undefined)
    setError(null)
    return cancel
  }, [open, scope, cancel])

  function speak(index: number, rate: number, voice: SpeechSynthesisVoice | undefined) {
    const verse = verses?.[index]
    if (!synth || !verse) {
      position.current = 0
      setStatus('idle')
      setVerseIndex(null)
      setWord(undefined)
      return
    }

    position.current = index
    const utterance = new SpeechSynthesisUtterance(verse[1])
    utterance.lang = voice?.lang ?? 'pt-BR'
    utterance.rate = rate
    if (voice) utterance.voice = voice
    current.current = utterance
    const words = bibleWords(verse[1])
    const starts = estimatedWordStarts(verse[1], words.length / (2.7 * rate))
    let highlighted = -1

    function highlight(next: number) {
      if (next < 0 || highlighted === next) return
      highlighted = next
      setWord(next)
    }

    function fail(message: string) {
      if (current.current !== utterance) return
      cancel()
      setStatus('paused')
      setError(message)
    }

    utterance.onstart = () => {
      if (current.current !== utterance) return
      window.clearTimeout(startTimer.current)
      setVerseIndex(index)
      setWord(undefined)
      const started = performance.now()
      function update(now: number) {
        if (current.current !== utterance) return
        highlight(wordAtTime(starts, (now - started) / 1000))
        if (highlighted < words.length - 1) wordFrame.current = window.requestAnimationFrame(update)
      }
      update(started)
    }
    utterance.onboundary = ({ name, charIndex }) => {
      if (current.current !== utterance || name === 'sentence') return
      const next = words.findIndex(({ start, end }) => charIndex >= start && charIndex < end)
      if (next < 0) return
      window.cancelAnimationFrame(wordFrame.current)
      highlight(next)
    }
    utterance.onend = () => {
      if (current.current !== utterance) return
      window.clearTimeout(startTimer.current)
      window.cancelAnimationFrame(wordFrame.current)
      current.current = null
      speak(index + 1, rate, voice)
    }
    utterance.onerror = ({ error: reason }) => fail(
      reason === 'language-unavailable' || reason === 'voice-unavailable'
        ? 'Ative uma voz em português nas configurações do aparelho.'
        : 'O áudio foi interrompido. Toque em retomar para tentar novamente.',
    )

    startTimer.current = window.setTimeout(() => {
      fail('A voz do aparelho demorou para responder. Toque em retomar para tentar novamente.')
    }, 8000)
    try {
      synth.speak(utterance)
    } catch {
      fail('Não foi possível iniciar o áudio. Toque em retomar para tentar novamente.')
    }
  }

  function start(rate: number) {
    if (!synth || !open || !verses?.length) return
    const voices = synth.getVoices()
    const voice = voices.find(({ lang }) => /^pt[-_]br$/i.test(lang)) ?? voices.find(({ lang }) => /^pt(?:[-_]|$)/i.test(lang))
    if (voices.length && !voice) {
      setStatus('idle')
      setError('Ative uma voz em português nas configurações do aparelho.')
      return
    }
    setError(null)
    setStatus('playing')
    speak(position.current, rate, voice)
  }

  function toggle() {
    if (status === 'playing') {
      // Restart the current verse on resume, including on browsers that cancel speech when paused.
      cancel()
      setStatus('paused')
    } else {
      soundManager.stopNarration(0)
      soundManager.stopAmbient()
      start(speed)
    }
  }

  function changeSpeed(rate: number) {
    setSpeed(rate)
    if (status === 'playing') {
      cancel()
      start(rate)
    }
  }

  return { available: !!synth, status, verseIndex, word, speed, error, toggle, changeSpeed }
}
