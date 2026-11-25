import { expect, it } from 'vitest'
import { parseBibleLookup } from './readingLink'

it.each(['Êxodo 20:12', 'exodo 20:12', 'Ex. 20:12', 'Ex 20,12', 'Êxodo / 20 / 12'])('resolves %s to the same verse', (query) => {
  const result = parseBibleLookup(query)
  expect(result?.reference).toBe('Êxodo 20:12')
  expect(result?.chapters[0]).toMatchObject({ chapter: 20, firstVerse: 12, lastVerse: 12 })
})

it('distinguishes numbered books and handles chapters and verse ranges', () => {
  expect(parseBibleLookup('1Jo 4:7-8')?.reference).toBe('1 João 4:7–8')
  expect(parseBibleLookup('João 3')?.reference).toBe('João 3')
  expect(parseBibleLookup('Salmo 23')?.reference).toBe('Salmos 23')
  expect(parseBibleLookup('Êxodo 99:12')).toBeNull()
  expect(parseBibleLookup('Êxodo')).toBeNull()
})
