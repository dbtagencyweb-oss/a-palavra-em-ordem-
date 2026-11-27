import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getLivro } from '../content'
import type { Livro } from '../content/types'
import { BookCard } from './BookCard'

describe('BookCard', () => {
  it('shows only filled fields (current data: name, block, chapters, map days)', () => {
    render(<BookCard livro={getLivro('lv')!} onRead={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Levítico' })).toBeInTheDocument()
    expect(screen.getByText('27')).toBeInTheDocument()
    expect(screen.getAllByText(/Pentateuco/).length).toBeGreaterThan(0)
    expect(screen.getByRole('img', { name: /livro 3 de 66/ })).toBeInTheDocument()
    expect(screen.getByText(/Dia 4 \(Sinai\)/)).toBeInTheDocument()
    expect(screen.queryByText('versículos')).toBeNull()
    expect(screen.queryByText('Linha do tempo')).toBeNull()
    expect(screen.queryByText('Curiosidades')).toBeNull()
    expect(screen.queryByText('Onde se encaixa')).toBeNull()
  })

  it('renders every section once data is filled, with tappable timeline events', () => {
    const livro: Livro = {
      ...getLivro('ex')!,
      versiculos: 1213,
      tempoLeitura: '3 h',
      ondeSeEncaixa: 'Texto de teste.',
      autorTradicional: 'Autor de teste',
      eventos: [{ titulo: 'Evento de teste', referencia: 'Êxodo 3:1-10', texto: 'Resumo de teste.' }],
      personagens: ['Pessoa A', { nome: 'Pessoa B' }],
      curiosidades: ['Curiosidade de teste.'],
    }
    const onRead = vi.fn()
    render(<BookCard livro={livro} onRead={onRead} />)
    expect(screen.getByText('1213')).toBeInTheDocument()
    expect(screen.getByText('Texto de teste.')).toBeInTheDocument()
    expect(screen.getByText('Autor de teste')).toBeInTheDocument()
    expect(screen.getByText('Pessoa B')).toBeInTheDocument()
    expect(screen.getByText('Curiosidade de teste.')).toBeInTheDocument()

    const event = screen.getByRole('button', { name: /Evento de teste/ })
    expect(screen.queryByText('Resumo de teste.')).toBeNull()
    fireEvent.click(event)
    expect(screen.getByText('Resumo de teste.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir o texto' }))
    expect(onRead).toHaveBeenCalledWith({
      reference: 'Êxodo 3:1-10',
      chapters: [{ book: getLivro('ex')!, chapter: 3, firstVerse: 1, lastVerse: 10 }],
    })
  })
})
