import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MATCH_MISS_HINT, MatchActivity } from './MatchActivity'
import { ORDER_RESET_MS, OrderActivity } from './OrderActivity'
import { QuizActivity } from './QuizActivity'
import { shuffle } from './shuffle'

afterEach(() => vi.useRealTimers())

const tap = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

describe('shuffle', () => {
  it('never returns the original order', () => {
    const items = ['a', 'b', 'c', 'd']
    for (let i = 0; i < 50; i++) expect(shuffle(items)).not.toEqual(items)
    expect([...shuffle(items)].sort()).toEqual(items)
  })
})

describe('OrderActivity', () => {
  const items = ['Criação', 'Queda', 'Redenção', 'Restauração']

  it('accepts the right order on the first try', () => {
    const onSolved = vi.fn()
    render(<OrderActivity items={items} acerto="Certo!" erro="Quase." onSolved={onSolved} />)
    items.forEach(tap)
    expect(screen.getByRole('status')).toHaveTextContent('Certo!')
    expect(onSolved).toHaveBeenCalledWith(true, 1)
  })

  it('shows the hint, resets after 1.4 s and loses the first-try bonus', () => {
    vi.useFakeTimers()
    const onSolved = vi.fn()
    render(<OrderActivity items={items} acerto="Certo!" erro="Quase." onSolved={onSolved} />)
    ;[...items].reverse().forEach(tap)
    expect(screen.getByRole('status')).toHaveTextContent('Quase.')
    expect(onSolved).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(ORDER_RESET_MS))
    items.forEach(tap)
    expect(onSolved).toHaveBeenCalledWith(false, 2)
  })
})

describe('QuizActivity', () => {
  const opcoes = [
    { texto: 'Errada', correta: false },
    { texto: 'Certa', correta: true },
  ]

  it('rewards a first-try answer', () => {
    const onSolved = vi.fn()
    render(<QuizActivity opcoes={opcoes} acerto="Isso." erro="Tente de novo." onSolved={onSolved} />)
    tap('Certa')
    expect(screen.getByRole('status')).toHaveTextContent('Isso.')
    expect(onSolved).toHaveBeenCalledWith(true, 1)
  })

  it('shows the hint and lets the user try again', () => {
    const onSolved = vi.fn()
    render(<QuizActivity opcoes={opcoes} acerto="Isso." erro="Tente de novo." onSolved={onSolved} />)
    tap('Errada')
    expect(screen.getByRole('status')).toHaveTextContent('Tente de novo.')
    tap('Certa')
    expect(onSolved).toHaveBeenCalledWith(false, 2)
  })
})

describe('MatchActivity', () => {
  const pares = [
    { a: 'Mateus', b: 'O Rei prometido' },
    { a: 'Marcos', b: 'O Servo em ação' },
  ]

  it('solves on the first try when every pair is right', () => {
    const onSolved = vi.fn()
    render(<MatchActivity pares={pares} acerto="Isso." onSolved={onSolved} />)
    tap('Mateus')
    tap('O Rei prometido')
    tap('Marcos')
    tap('O Servo em ação')
    expect(screen.getByRole('status')).toHaveTextContent('Isso.')
    expect(onSolved).toHaveBeenCalledWith(true, 1)
  })

  it('hints on a wrong pair and works starting from either column', () => {
    const onSolved = vi.fn()
    render(<MatchActivity pares={pares} acerto="Isso." onSolved={onSolved} />)
    tap('Mateus')
    tap('O Servo em ação')
    expect(screen.getByRole('status')).toHaveTextContent(MATCH_MISS_HINT)
    tap('O Rei prometido')
    tap('Mateus')
    tap('Marcos')
    tap('O Servo em ação')
    expect(onSolved).toHaveBeenCalledWith(false, 2)
  })
})
