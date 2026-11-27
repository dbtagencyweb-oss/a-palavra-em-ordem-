import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { trilha } from '../../src/content/index'
import { characters, findCharacters } from '../../src/content/characters'
import { parsePassage } from '../../src/content/readingLink'

describe('catálogo de personagens', () => {
  it('procura nomes com ou sem acento e aceita nomes alternativos', () => {
    expect(findCharacters('Saulo', '', '').map(({ id }) => id)).toEqual(['paulo'])
    expect(findCharacters('Moises', '', '').map(({ id }) => id)).toEqual(['moises'])
    expect(findCharacters('mulher do poço', '', '').map(({ id }) => id)).toEqual(['mulher-samaritana'])
  })

  it('distingue nomes repetidos e combina os filtros', () => {
    expect(findCharacters('Joao', '', '').map(({ id }) => id).sort()).toEqual(['joao-apostolo', 'joao-batista'])
    expect(findCharacters('Jose', 'AT', 'Patriarcas').map(({ id }) => id)).toEqual(['jose-egito'])
    expect(findCharacters('Jose', 'NT', 'Patriarcas')).toEqual([])
  })

  it('usa fichas únicas, dias existentes e versículos presentes no leitor', () => {
    expect(new Set(characters.map(({ id }) => id)).size).toBe(characters.length)
    const books = new Map()
    for (const character of characters) {
      if (character.dia) expect(trilha.dias.some(({ n }) => n === character.dia)).toBe(true)
      expect(character.passagens.length).toBeGreaterThan(0)
      for (const { referencia } of character.passagens) {
        const passage = parsePassage(referencia)
        expect(passage, referencia).not.toBeNull()
        for (const { book, chapter, firstVerse, lastVerse } of passage ?? []) {
          let text = books.get(book.id)
          if (!text) {
            text = JSON.parse(readFileSync(`public/biblia-livre/2018/${book.id}.json`, 'utf8'))
            books.set(book.id, text)
          }
          const numbers = text[chapter]?.map(([number]) => number)
          expect(numbers, referencia).toBeDefined()
          if (firstVerse !== undefined) expect(numbers, referencia).toContain(firstVerse)
          if (lastVerse !== undefined) expect(numbers, referencia).toContain(lastVerse)
        }
      }
    }
  })
})
