// @vitest-environment node
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assembleTrail, cardWords, loadTrail, mediaIdSet, parseDays, reviewMarkdown, setStatus, validateDay, validateTrail, pastoralBlock } from './lib.mjs'

const media = new Set(['img-ok', 'simbolo-ok'])
const day = (cards, over = {}) => ({ status: 'em_revisao', n: 1, titulo: 'Teste', cards, ...over })
const texto = (over = {}) => ({ id: 'c1', tipo: 'texto', titulo: 'T', paragrafos: ['Um parágrafo.'], ...over })
const errorsOf = (d) => validateDay(d, media).errors.join('\n')

describe('validateDay', () => {
  it('accepts a good day', () => {
    expect(validateDay(day([texto()]), media).errors).toEqual([])
  })
  it('rejects unknown card types', () => {
    expect(errorsOf(day([{ id: 'c1', tipo: 'carrossel' }]))).toMatch(/tipo "carrossel" não existe/)
  })
  it('rejects media ids missing from midia.json', () => {
    expect(errorsOf(day([{ id: 'c1', tipo: 'cena', midia: 'nao-existe', legenda: 'x' }]))).toMatch(/mídia "nao-existe"/)
    expect(errorsOf(day([texto()], { simbolo: { id: 's', nome: 'S', texto: 't', midia: 'nao-existe' } }))).toMatch(/símbolo usa a mídia/)
  })
  it('limits words per card', () => {
    const long = Array.from({ length: 85 }, () => 'palavra').join(' ')
    expect(errorsOf(day([texto({ paragrafos: [long] })]))).toMatch(/palavras \(máximo 80/)
    const medium = Array.from({ length: 72 }, () => 'palavra').join(' ')
    expect(validateDay(day([texto({ titulo: undefined, paragrafos: [medium] })]), media).warnings.join()).toMatch(/72 palavras/)
  })
  it('a quiz needs exactly one right answer', () => {
    const quiz = (opcoes) => ({ id: 'q', tipo: 'quiz', pergunta: '?', opcoes, acerto: 'a', erro: 'e' })
    expect(errorsOf(day([quiz([{ texto: 'a', correta: true }, { texto: 'b', correta: true }])]))).toMatch(/exatamente uma opção correta \(tem 2\)/)
    expect(errorsOf(day([quiz([{ texto: 'a', correta: false }])]))).toMatch(/tem 0/)
    expect(errorsOf(day([quiz([{ texto: 'a', correta: true }, { texto: 'b', correta: false }])]))).toBe('')
  })
  it('a "palavra" card needs a Bible reference', () => {
    expect(errorsOf(day([{ id: 'p', tipo: 'palavra', resumo: 'r', observar: 'o' }]))).toMatch(/sem referência bíblica/)
  })
  it('no empty text', () => {
    expect(errorsOf(day([texto({ paragrafos: ['ok', '  '] })]))).toMatch(/texto vazio/)
    expect(errorsOf(day([{ id: 'o', tipo: 'oracao', texto: '' }]))).toMatch(/campo "texto" vazio/)
  })
  it('drafts may have no cards yet; anything further needs them', () => {
    expect(validateDay(day([], { status: 'rascunho' }), media).errors).toEqual([])
    expect(errorsOf(day([], { status: 'em_revisao' }))).toMatch(/sem cards/)
    expect(errorsOf(day([texto()], { status: 'pronto' }))).toMatch(/status "pronto" inválido/)
  })
})

describe('helpers', () => {
  it('parseDays', () => {
    const all = [1, 2, 3, 4, 5, 6, 7]
    expect(parseDays('2-4', all)).toEqual([2, 3, 4])
    expect(parseDays('1,3,9', all)).toEqual([1, 3])
    expect(parseDays(undefined, all)).toEqual(all)
  })
  it('counts the words shown on a card', () => {
    expect(cardWords(texto({ titulo: 'Dois termos', paragrafos: ['três palavras aqui'] }))).toBe(5)
  })
})

describe('Trilha 1 in the new structure', () => {
  const t = loadTrail('mapa-7-dias')
  it('passes content:check', () => {
    expect(validateTrail(t, undefined, mediaIdSet()).errors).toEqual([])
  })
  it('has exactly the reviewed text of the original file', () => {
    const original = JSON.parse(readFileSync('reference/trilha-mapa-7-dias.original-v1.json', 'utf8'))
    expect(assembleTrail(t)).toEqual(original)
  })
  it('renders the review script', () => {
    const md = reviewMarkdown(t, [1])
    expect(md).toMatch(/^# Mapa da Bíblia em 7 dias · Dia 1 · Roteiro para revisão/)
    expect(md).toMatch(/## Dia 1 · A Bíblia não é um labirinto/)
    expect(md).toMatch(/\*\*Fixe\.\*\*/)
    expect(md).toMatch(/\(correta\)/)
    expect(md).toMatch(/\*\*Símbolo desbloqueado · A lâmpada\.\*\*/)
  })
})

describe('setStatus', () => {
  it('writes the new status to the day file and leaves the rest as it was', () => {
    const dir = mkdtempSync(join(tmpdir(), 'trilha-'))
    const file = join(dir, 'dia-01.json')
    writeFileSync(file, JSON.stringify({ status: 'em_revisao', n: 1, titulo: 'X', cards: [texto()] }))
    const t = { id: 't', dir, trilha: { dias: [{ n: 1, arquivo: 'dia-01.json' }] }, dias: [{ ref: { n: 1 }, file, dia: JSON.parse(readFileSync(file, 'utf8')) }] }
    expect(setStatus(t, [1], 'publicado')).toEqual([1])
    const saved = JSON.parse(readFileSync(file, 'utf8'))
    expect(saved.status).toBe('publicado')
    expect(saved.cards).toEqual([texto()])
  })
})

describe('leitura guiada', () => {
  const lg = (tipos) => ({
    status: 'em_revisao',
    n: 1,
    titulo: 'Gênesis 1–2',
    formato: 'leitura-guiada',
    cards: tipos.map((tipo, i) => ({ id: `c${i}`, tipo, referencia: 'Gênesis 1–2', texto: 'Texto.' })),
  })
  it('accepts the five cards in order', () => {
    expect(validateDay(lg(['leitura', 'contexto', 'observar', 'cristo', 'pergunta']), media).errors).toEqual([])
  })
  it('rejects a different order or a missing card', () => {
    expect(validateDay(lg(['contexto', 'leitura', 'observar', 'cristo', 'pergunta']), media).errors.join()).toMatch(/nesta ordem/)
    expect(validateDay(lg(['leitura', 'contexto', 'cristo', 'pergunta']), media).errors.join()).toMatch(/nesta ordem/)
  })
  it('the plan stages are trails of their own', () => {
    const t = loadTrail('biblia-em-ordem/etapa-01')
    expect(t.dias).toHaveLength(30)
    expect(validateTrail(t, undefined, mediaIdSet()).errors).toEqual([])
  })
})

describe('estudos por livro', () => {
  it('has the three studies, written and waiting for review', () => {
    for (const [id, n] of [['estudo-romanos', 8], ['estudo-salmos', 10], ['estudo-apocalipse', 8]]) {
      const t = loadTrail(id)
      expect(t.dias).toHaveLength(n)
      expect(t.trilha.acesso).toEqual([id])
      expect(Object.keys(t.trilha.conclusao ?? {}).sort()).toEqual(['mensagem', 'referencia', 'selo', 'titulo'])
      expect(t.dias.every((d) => d.dia.status === 'em_revisao' && d.dia.cards.length > 0)).toBe(true)
      expect(validateTrail(t, undefined, mediaIdSet()).errors).toEqual([])
    }
  })

  it('keeps estudo-apocalipse from being published until revisao_pastoral is true', () => {
    const t = loadTrail('estudo-apocalipse')
    expect(t.trilha.revisao_pastoral).toBe(false)
    const asPublished = { ...t, dias: t.dias.map((d) => ({ ...d, dia: { ...d.dia, status: 'publicado', cards: [{ tipo: 'texto', titulo: 'x', paragrafos: ['y'] }] } })) }
    expect(validateTrail(asPublished, [1], mediaIdSet()).errors.some((e) => e.includes('revisão do pastor'))).toBe(true)
    const reviewed = { ...asPublished, trilha: { ...t.trilha, revisao_pastoral: true } }
    expect(validateTrail(reviewed, [1], mediaIdSet()).errors.some((e) => e.includes('revisão do pastor'))).toBe(false)
    // Trails without the field are not gated.
    expect(pastoralBlock({ id: 'estudo-romanos' })).toBeNull()
  })
})
