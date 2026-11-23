import { beforeEach, describe, expect, it } from 'vitest'
import ui from '../../content/interface.json'
import publicos from '../../content/lp-publicos.json'
import { capturePublico, DIAGNOSIS_FOR, presetDiagnosis } from './publico'

describe('landing page audience → app diagnosis', () => {
  beforeEach(() => localStorage.clear())

  it('reads publico= or utm_content=publico-<id> and keeps it', () => {
    expect(capturePublico('?publico=inicio')).toBe('inicio')
    expect(presetDiagnosis()).toBe('comecando')
    // "crente" pre-selects nothing (diagnosticoApp.mapaUtm), the person picks.
    expect(capturePublico('?utm_content=publico-crente&utm_source=ig')).toBe('crente')
    expect(presetDiagnosis()).toBeNull()
    // A later visit without it keeps the first answer; unknown values are ignored.
    expect(capturePublico('?publico=outro')).toBe('crente')
  })

  it('has nothing to pre-select without a landing page audience', () => {
    expect(capturePublico('?utm_content=anuncio-3')).toBeNull()
    expect(presetDiagnosis()).toBeNull()
  })

  it('maps every audience to an existing diagnosis option', () => {
    const ids = ui.diagnostico.opcoes.map((o) => o.id)
    for (const p of publicos.seletor.opcoes) {
      const d = DIAGNOSIS_FOR[p.id as keyof typeof DIAGNOSIS_FOR]
      if (d) expect(ids).toContain(d)
    }
    // The app option matches content/lp-publicos.json → diagnosticoApp.novaOpcao word for word.
    const nova = publicos.diagnosticoApp.novaOpcao
    const opt = ui.diagnostico.opcoes.find((o) => o.id === nova.id)!
    expect(opt.texto).toBe(nova.rotulo)
    expect(opt.recTitulo).toBe(nova.recomendacao.titulo)
    expect(opt.recTexto).toBe(nova.recomendacao.texto)
  })
})
