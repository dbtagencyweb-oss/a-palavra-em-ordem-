import { describe, expect, it } from 'vitest'
import type { Entitlement, ProductCode } from '../../supabase/functions/_shared/logic-access'
import { canAccess, currentPlan, extras, founderDiscount, studyPrice } from './rules'

const NOW = new Date('2026-12-01T12:00:00Z')
const ent = (product_code: ProductCode, over: Partial<Entitlement> = {}): Entitlement => ({
  user_id: 'u1',
  email: 'ana@exemplo.com',
  product_code,
  origem: 'compra',
  status: 'ativo',
  starts_at: '2026-11-01T00:00:00Z',
  expires_at: '2027-11-01T00:00:00Z',
  provider: 'hotmart',
  order_id: `o-${product_code}`,
  subscription_id: null,
  grupo_id: null,
  ...over,
})

describe('canAccess', () => {
  it('the 7-day map is free for everyone', () => {
    expect(canAccess('trilha-mapa-7-dias', [], NOW)).toBe(true)
  })
  it('the paid trails need fundador, vitalicio, mensal or igreja', () => {
    expect(canAccess('trilha-jesus-em-ordem', [], NOW)).toBe(false)
    for (const p of ['fundador', 'vitalicio', 'mensal', 'igreja'] as const) {
      expect(canAccess('trilha-jesus-em-ordem', [ent(p)], NOW)).toBe(true)
      expect(canAccess('biblia-em-ordem', [ent(p)], NOW)).toBe(true)
    }
    expect(canAccess('trilha-jesus-em-ordem', [ent('mapa-impresso', { expires_at: null })], NOW)).toBe(false)
  })
  it('expired, refunded or past-period entitlements give nothing', () => {
    expect(canAccess('trilha-jesus-em-ordem', [ent('fundador', { expires_at: '2026-11-30T00:00:00Z' })], NOW)).toBe(false)
    expect(canAccess('trilha-jesus-em-ordem', [ent('fundador', { status: 'reembolsado' })], NOW)).toBe(false)
    expect(canAccess('trilha-jesus-em-ordem', [ent('mensal', { status: 'cancelado' })], NOW)).toBe(true) // until it ends
  })
  it('downloads, audio and studies need their own product', () => {
    expect(canAccess('download-mapa-impresso', [ent('fundador')], NOW)).toBe(false)
    expect(canAccess('download-mapa-impresso', [ent('mapa-impresso', { expires_at: null })], NOW)).toBe(true)
    expect(canAccess('modo-audio-completo', [ent('audio')], NOW)).toBe(true)
    expect(canAccess('estudo-romanos', [ent('fundador')], NOW)).toBe(false)
    expect(canAccess('estudo-romanos', [ent('estudo-romanos', { expires_at: null })], NOW)).toBe(true)
  })
  it('founders get the study discount', () => {
    expect(founderDiscount([ent('fundador')], NOW)).toBe(0.3)
    expect(founderDiscount([], NOW)).toBe(0)
  })
})

describe('currentPlan', () => {
  it('picks the strongest live access', () => {
    expect(currentPlan([], NOW).kind).toBe('gratuito')
    expect(currentPlan([ent('fundador')], NOW)).toEqual({ kind: 'fundador', expiresAt: '2027-11-01T00:00:00Z', canceled: false })
    expect(currentPlan([ent('fundador'), ent('vitalicio', { expires_at: null })], NOW).kind).toBe('vitalicio')
    expect(currentPlan([ent('fundador', { expires_at: null })], NOW).kind).toBe('vitalicio')
    expect(currentPlan([ent('mensal', { status: 'cancelado' })], NOW)).toMatchObject({ kind: 'mensal', canceled: true })
  })
  it('lists the bumps as extras', () => {
    expect(extras([ent('fundador'), ent('mapa-impresso', { expires_at: null }), ent('familia', { status: 'reembolsado' })], NOW).map((e) => e.product_code)).toEqual(['mapa-impresso'])
  })
})

describe('estudos por livro', () => {
  it('shows Founders the price 30% lower', () => {
    expect(studyPrice(37, founderDiscount([ent('fundador')], NOW))).toBe(25.9)
    expect(studyPrice(37, founderDiscount([], NOW))).toBe(37)
  })

  it('gives the study (and only it) through the payment webhook, at either price', async () => {
    const { applyPayment, parseHotmart, productFor } = await import('../../supabase/functions/_shared/logic-access')
    const { DEV_MAP, hotmartPurchase } = await import('./devPayments')
    for (const body of [hotmartPurchase('DEV-ESTUDO-ROMANOS'), hotmartPurchase('DEV-ESTUDO-ROMANOS', { offer: 'DEV-OFERTA-ROMANOS-FUNDADOR' })]) {
      const parsed = parseHotmart(body)
      if (!parsed.ok) throw new Error(parsed.reason)
      const product = productFor(parsed.event, DEV_MAP)
      expect(product).toBe('estudo-romanos')
      const rows = applyPayment(parsed.event, product!, [], NOW)
      expect(rows.map((r) => [r.product_code, r.expires_at])).toEqual([['estudo-romanos', null]])
      expect(canAccess('estudo-romanos', rows, NOW)).toBe(true)
      expect(canAccess('estudo-salmos', rows, NOW)).toBe(false)
      expect(canAccess('trilha-jesus-em-ordem', rows, NOW)).toBe(false)
    }
  })
})
