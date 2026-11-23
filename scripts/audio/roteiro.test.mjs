// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { lessonScript, spokenReference } from './roteiro.mjs'

describe('spokenReference', () => {
  it('reads references in full', () => {
    expect(spokenReference('Lucas 24:13-27')).toBe('Lucas, capítulo 24, versículos 13 a 27')
    expect(spokenReference('Gênesis 1–2')).toBe('Gênesis, capítulos 1 a 2')
    expect(spokenReference('Gênesis 50')).toBe('Gênesis, capítulo 50')
    expect(spokenReference('Lucas 1:57–2:20')).toBe('Lucas, do capítulo 1, versículo 57, ao capítulo 2, versículo 20')
    expect(spokenReference('Mateus 1:1-17; Lucas 3:23-38')).toBe('Mateus, capítulo 1, versículos 1 a 17 e Lucas, capítulo 3, versículos 23 a 38')
    expect(spokenReference('1 Reis 8')).toBe('Primeiro Reis, capítulo 8')
    expect(spokenReference('1 João 4:8')).toBe('Primeira João, capítulo 4, versículo 8')
  })
})

describe('lessonScript', () => {
  const dia = {
    n: 3,
    titulo: 'Título',
    cards: [
      { tipo: 'abertura', titulo: 'Abre.', paragrafos: ['Um.'] },
      { tipo: 'ordenar', titulo: 'Ordene', itens: ['a', 'b'] },
      { tipo: 'palavra', referencia: 'Lucas 24:13-27', resumo: 'Resumo próprio.', observar: 'Observe.' },
      { tipo: 'quiz', pergunta: '?', opcoes: [] },
      { tipo: 'oracao', texto: 'Senhor. Amém.' },
    ],
  }
  it('reads the lesson in order, leaves the activities out and gives the prayer its own voice', () => {
    const s = lessonScript(dia, 'Trilha')
    const all = s.map((x) => x.texto).join(' | ')
    expect(all).toContain('Trilha. Dia 3. Título.')
    expect(all).toContain('Abre. Um.')
    expect(all).toContain('Na Palavra: Lucas, capítulo 24, versículos 13 a 27. Resumo próprio. O que observar: Observe.')
    expect(all).not.toContain('Ordene')
    expect(s.find((x) => x.texto === 'Senhor. Amém.')?.voz).toBe('oracao')
    expect(s.at(-1)?.texto).toBe('Fim do Dia 3. Até amanhã.')
  })
})

describe('spokenInline', () => {
  it('says references in parentheses in full', async () => {
    const { spokenInline } = await import('./roteiro.mjs')
    expect(spokenInline('tenha vida (João 20:31). Os Evangelhos')).toBe('tenha vida — João, capítulo 20, versículo 31 —. Os Evangelhos')
    expect(spokenInline('sem referência (como aqui).')).toBe('sem referência (como aqui).')
  })
})

describe('more references', () => {
  it('two passages of the same book and loose references in the text', async () => {
    const { spokenInline, spokenReference } = await import('./roteiro.mjs')
    expect(spokenReference('Gênesis 12:1-3 e 15:5-6')).toBe('Gênesis, capítulo 12, versículos 1 a 3 e capítulo 15, versículos 5 a 6')
    expect(spokenInline('leem Gênesis 3:15 como o primeiro anúncio')).toBe('leem Gênesis, capítulo 3, versículo 15 como o primeiro anúncio')
    expect(spokenInline('Compare com Gênesis 2. As mesmas')).toBe('Compare com Gênesis, capítulo 2. As mesmas')
    expect(spokenInline('São 66 livros.')).toBe('São 66 livros.')
  })
})
