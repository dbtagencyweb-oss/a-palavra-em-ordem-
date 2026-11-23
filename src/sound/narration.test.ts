import { describe, expect, it } from 'vitest'
import doc from '../../docs/05-narracoes.md?raw'
import { cueAt, EDGE_SILENCE_MS, estimatedDurationMs, NARRACOES, narrationForCard, sentences, subtitleCues } from './narration'

describe('narration catalog', () => {
  it('keeps the script text from docs/05 word for word', () => {
    for (const n of NARRACOES) {
      expect(doc, n.id).toContain(`**\`${n.id}\`**`)
      expect(doc, n.id).toContain(`> ${n.texto}`)
    }
  })

  it('points each scene narration at a scene card of Trilha 1', () => {
    const days = import.meta.glob<{ cards: { id: string; tipo: string; midia?: string }[] }>('../../content/trilhas/mapa-7-dias/dia-*.json', { eager: true, import: 'default' })
    const cards = Object.values(days).flatMap((d) => d.cards)
    for (const n of NARRACOES.filter((x) => x.onde.card)) {
      const card = cards.find((c) => c.id === n.onde.card)
      expect(card?.tipo, n.id).toBe('cena')
      expect(`narr-${card?.midia}`).toBe(n.id)
    }
    expect(narrationForCard('d6-c03')?.id).toBe('narr-d6-tumulo')
  })
})

describe('subtitles', () => {
  const text = 'No primeiro dia da semana, bem cedo, elas foram ao túmulo. A pedra tinha sido removida. Ele não está aqui. Ressuscitou.'

  it('splits sentences, keeping the punctuation', () => {
    expect(sentences(text)).toEqual(['No primeiro dia da semana, bem cedo, elas foram ao túmulo.', 'A pedra tinha sido removida.', 'Ele não está aqui.', 'Ressuscitou.'])
    expect(sentences('Sem ponto final')).toEqual(['Sem ponto final'])
  })

  it('shares the spoken time by word count, skipping the silent edges', () => {
    const cues = subtitleCues(text, 10_600)
    expect(cues).toHaveLength(4)
    expect(cues[0].start).toBe(EDGE_SILENCE_MS)
    expect(cues.at(-1)!.end).toBe(10_600)
    // 11 of 21 words → 11/21 of the 10 s spoken.
    expect(cues[0].end).toBe(EDGE_SILENCE_MS + Math.round((11 / 21) * 10_000))
    for (let i = 1; i < cues.length; i++) expect(cues[i].start).toBe(cues[i - 1].end)
  })

  it('finds the cue on screen at a given time', () => {
    const cues = subtitleCues(text, 10_600)
    expect(cueAt(cues, 0)?.text).toBe(cues[0].text)
    expect(cueAt(cues, 6_000)?.text).toBe('A pedra tinha sido removida.')
    expect(cueAt(cues, 99_000)?.text).toBe('Ressuscitou.')
    expect(cueAt([], 10)).toBeUndefined()
  })

  it('estimates a reading time when there is no audio', () => {
    expect(estimatedDurationMs(text)).toBeGreaterThan(8_000)
    expect(estimatedDurationMs(text)).toBeLessThan(10_000)
  })
})
