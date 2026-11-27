import catalog from '../../content/personagens.json'

interface Character {
  id: string
  nome: string
  outrosNomes?: string[]
  testamento: 'AT' | 'NT'
  era: string
  dia?: number
  descricao: string
  resumo: string
  passagens: { referencia: string; titulo: string }[]
}

export type CharacterTestament = Character['testamento']

export const characters = ([...catalog] as Character[]).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
export const characterEras = [...new Set(catalog.map((character) => character.era))]

function normalizeName(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function findCharacters(query: string, testament: CharacterTestament | '', era: string) {
  const words = normalizeName(query).split(' ').filter(Boolean)
  return characters.filter((character) => {
    if (testament && character.testamento !== testament) return false
    if (era && character.era !== era) return false
    return [character.nome, ...(character.outrosNomes ?? [])].some((name) => {
      const normalized = normalizeName(name)
      return words.every((word) => normalized.includes(word))
    })
  })
}
