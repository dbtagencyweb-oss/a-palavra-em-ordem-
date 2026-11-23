import { describe, expect, it } from 'vitest'
import { etapaNotices } from '../access/etapaNotices'
import { BIBLIA, bibliaPlace, chaptersOfDay, ETAPAS, TOTAL_CHAPTERS } from './trails'

describe('A Bíblia em Ordem', () => {
  it('counts the 1.189 chapters of the Bible', () => {
    expect(TOTAL_CHAPTERS).toBe(1189)
  })
  it('Etapa 1 "Origens" has 30 days, numbered from 1', () => {
    const e1 = ETAPAS[0]
    expect(e1.nome).toBe('Origens')
    expect(e1.dias.map((d) => d.n)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1))
    expect(BIBLIA.outline[0].passagens).toBe('Gênesis 1–2')
  })
  it('knows the chapters and the place of each day (Job right after Genesis 11)', () => {
    const d4 = BIBLIA.outline.find((d) => d.n === 4)!
    expect(chaptersOfDay(d4)).toBe(4) // Gênesis 6–9
    expect(bibliaPlace(6)).toMatchObject({ livro: 'job', nome: 'Jó' })
    expect(bibliaPlace(30)?.livro).toBe('gn') // the review day keeps the last book read
  })
  it('the whole of Etapa 1 reads Genesis (50) and the chosen chapters of Job (2 + 2 + 3)', () => {
    const total = ETAPAS[0].dias.reduce((s, d) => s + chaptersOfDay(d), 0)
    expect(total).toBe(50 + 7)
  })
})

describe('new stage notice', () => {
  it('stays quiet the first time on a device (what is out is not news)', () => {
    expect(etapaNotices(['etapa-01'], null)).toEqual({ notify: [], seen: ['etapa-01'] })
  })
  it('announces each newly released stage once', () => {
    const r = etapaNotices(['etapa-01', 'etapa-02'], ['etapa-01'])
    expect(r.notify).toEqual(['etapa-02'])
    expect(etapaNotices(['etapa-01', 'etapa-02'], r.seen).notify).toEqual([])
  })
})
