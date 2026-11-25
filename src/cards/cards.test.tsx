import { eraOf } from '../ui/eras'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { trilha } from '../content'
import { buildReadingLink, parsePassage } from '../content/readingLink'
import { cardRegistry } from './registry'
import type { CardProps, LessonApi } from './types'

const api: LessonApi = {
  dayN: 1,
  era: eraOf(1),
  read: false,
  markRead: vi.fn(),
  solved: false,
  reflection: '',
  solve: vi.fn(),
  setReflection: vi.fn(),
  openOffer: vi.fn(),
  next: vi.fn(),
}

const allCards = trilha.dias.flatMap((d) => d.cards.map((c) => ({ day: d.n, card: c })))

describe('lesson content', () => {
  it('has 7 days, each with a symbol', () => {
    expect(trilha.dias.map((d) => d.n)).toEqual([1, 2, 3, 4, 5, 6, 7])
    for (const d of trilha.dias) expect(d.simbolo.id).toBeTruthy()
  })

  it('has a component for every card type in the JSON', () => {
    for (const { card } of allCards) expect(cardRegistry[card.tipo], card.id).toBeDefined()
  })

  it('has unique card ids', () => {
    const ids = allCards.map((c) => c.card.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(allCards.map((c) => [c.card.id, c.card] as const))('renders %s', (_id, card) => {
    const Component = cardRegistry[card.tipo] as React.ComponentType<CardProps>
    const { container } = render(<Component card={card} api={api} />)
    expect(container.textContent?.length).toBeGreaterThan(0)
    if (card.midia) expect(container.querySelector(`[data-media-id="${card.midia}"]`)).not.toBeNull()
  })

  it('builds a reading link for every "palavra" reference', () => {
    for (const { card } of allCards) {
      if (card.tipo !== 'palavra') continue
      expect(buildReadingLink(card.referencia, trilha.linkLeitura.modelo), card.referencia).toMatch(
        /^https:\/\/www\.bible\.com\/pt\/bible\/129\/[1-3A-Z]{3}\.\d+\.NVI$/,
      )
    }
    expect(buildReadingLink('Lucas 24:13-27', trilha.linkLeitura.modelo)).toContain('LUK.24')
    expect(buildReadingLink('2 Samuel 7:12-16 e Jeremias 31', trilha.linkLeitura.modelo)).toContain('2SA.7')
  })

  it('opens the exact verses and follows references across chapters and books', () => {
    for (const { card } of allCards) {
      if (card.tipo === 'palavra') expect(parsePassage(card.referencia), card.referencia).not.toBeNull()
    }
    const ranges = (reference: string) => parsePassage(reference)?.map(({ book, chapter, firstVerse, lastVerse }) =>
      [book.id, chapter, firstVerse, lastVerse],
    )
    expect(ranges('Lucas 24:13-27')).toEqual([['lc', 24, 13, 27]])
    expect(ranges('Gênesis 1–2')).toEqual([['gn', 1, undefined, undefined], ['gn', 2, undefined, undefined]])
    expect(ranges('2 Samuel 7:12-16 e Jeremias 31:31-34')).toEqual([['2sm', 7, 12, 16], ['jr', 31, 31, 34]])
    expect(ranges('Apocalipse 21:1-7; 22:1-5')).toEqual([['ap', 21, 1, 7], ['ap', 22, 1, 5]])
    expect(parsePassage('Lucas 25')).toBeNull()
  })

  it('shows the scene caption and reference over a media placeholder', () => {
    const cena = allCards.find((c) => c.card.id === 'd4-c02')!.card
    const Component = cardRegistry.cena as React.ComponentType<CardProps>
    render(<Component card={cena} api={api} />)
    expect(screen.getByText('Uma sarça que queimava sem se consumir.')).toBeInTheDocument()
    expect(screen.getByText('Êxodo 3')).toBeInTheDocument()
    expect(screen.getByText('d4-sarca')).toBeInTheDocument()
  })
})
