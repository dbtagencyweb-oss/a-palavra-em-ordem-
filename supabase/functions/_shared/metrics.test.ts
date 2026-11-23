// /admin (docs/07, Prompt 11): the panel math, and that the numbers stay behind the admin check.
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseHotmart, parseKiwify } from './logic-access'
import { acceptance, funnel, refundRate, revenue, sampleMetrics, type AdminMetrics } from './logic-metrics'

const m: AdminMetrics = {
  visitantes: 1000,
  cliques_compra: 60,
  leads: 200,
  dia1: 130,
  dia2: 78,
  dia7: 39,
  vendas: [
    { produto: 'fundador', qtd: 20, receita: 940 },
    { produto: 'mapa-impresso', qtd: 6, receita: 89.4 },
  ],
  fundadores: 20,
  aceite: { 'mapa-impresso': 6, familia: 3, audio: 4, vitalicio: 2 },
  reembolsos: 1,
  renovacoes: 5,
}

describe('admin panel math', () => {
  it('funnel: visitors → app → Day 1 → Day 2 → Day 7, with conversion', () => {
    const f = funnel(m)
    expect(f.map((s) => s.n)).toEqual([1000, 200, 130, 78, 39])
    expect(f[0].doAnterior).toBeNull()
    expect(f[1].doAnterior).toBe(20)
    expect(f[3].doAnterior).toBe(60)
    expect(f[4].doTopo).toBe(3.9)
  })

  it('bump and upsell acceptance over Founder buyers; revenue; refunds', () => {
    expect(acceptance(m).map((a) => [a.id, a.taxa])).toEqual([
      ['mapa-impresso', 30],
      ['familia', 15],
      ['audio', 20],
      ['vitalicio', 10],
    ])
    expect(revenue(m)).toBeCloseTo(1029.4)
    expect(refundRate(m)).toBe(3.8)
    expect(acceptance({ ...m, fundadores: 0 })[0].taxa).toBe(0)
  })

  it('example numbers have the real shape and a believable funnel', () => {
    const s = sampleMetrics(30)
    expect(s.visitantes).toBeGreaterThan(s.leads)
    expect(s.dia1).toBeGreaterThan(s.dia7)
    expect(sampleMetrics(30)).toEqual(s)
  })

  it('the campaign of a sale comes back from both platforms', () => {
    const h = parseHotmart({ event: 'PURCHASE_APPROVED', data: { product: { id: 1 }, buyer: { email: 'a@b.c' }, purchase: { transaction: 'T', origin: { src: 'instagram' } } } })
    expect(h.ok && h.event.src).toBe('instagram')
    const k = parseKiwify({ order_id: 'O', webhook_event_type: 'order_approved', Product: { product_id: 'P' }, Customer: { email: 'a@b.c' }, TrackingParameters: { utm_source: 'youtube' } })
    expect(k.ok && k.event.src).toBe('youtube')
  })
})

describe('admin access', () => {
  const sql = readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(`supabase/migrations/${f}`, 'utf8'))
    .join('\n')
  it('every admin function checks is_admin() first, and admins has no API access', () => {
    for (const fn of ['admin_metrics', 'admin_utm_options']) {
      const body = sql.split(`function public.${fn}(`)[1]
      expect(body, fn).toMatch(/if not public\.is_admin\(\) then raise exception 'acesso restrito'/)
    }
    expect(sql).not.toMatch(/create policy[^;]*on public\.admins/i)
  })
})
