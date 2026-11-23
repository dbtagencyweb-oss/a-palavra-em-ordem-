import { describe, expect, it } from 'vitest'
import { applyPayment, founderSeatFor, hasFounderSeat, seatsLeft, type Entitlement, type PaymentEvent } from './logic-access'
import oferta from '../../../content/oferta.json'
import { currentPlan, isFounderSeat } from '../../../src/access/rules'

const LIMIT = oferta.fundadorLimite
const NOW = new Date('2026-12-01T12:00:00Z')

const event = (orderId: string, email = 'ana@exemplo.dev'): PaymentEvent => ({
  provider: 'hotmart',
  kind: 'approved',
  email,
  userId: null,
  orderId,
  subscriptionId: null,
  platformProductId: 'X',
  offerCode: null,
  at: NOW,
})

const founder = (over: Partial<Entitlement> = {}): Entitlement => ({
  user_id: null,
  email: 'ana@exemplo.dev',
  product_code: 'fundador',
  origem: 'compra',
  status: 'ativo',
  starts_at: NOW.toISOString(),
  expires_at: '2027-12-01T12:00:00.000Z',
  provider: 'hotmart',
  order_id: 'A1',
  subscription_id: null,
  grupo_id: null,
  preco_fundador: true,
  ...over,
})

describe('Founder seats (content/oferta.json)', () => {
  it('gives a seat while sold < limit: 499 sold → yes, 500 → no', () => {
    expect(founderSeatFor([], LIMIT - 1, LIMIT)).toBe(true)
    expect(founderSeatFor([], LIMIT, LIMIT)).toBe(false)
    expect(founderSeatFor([], LIMIT + 3, LIMIT)).toBe(false)
  })

  it('a seat holder keeps it past the limit (renewal, repeated webhook)', () => {
    expect(founderSeatFor([founder()], LIMIT + 10, LIMIT)).toBe(true)
    // A refunded purchase frees the seat: no seat kept.
    expect(founderSeatFor([founder({ status: 'reembolsado' })], LIMIT, LIMIT)).toBe(false)
    expect(hasFounderSeat([founder({ preco_fundador: false })])).toBe(false)
  })

  it('a sale past the limit still gives access, as annual without the Founder price', () => {
    const [row] = applyPayment(event('B2', 'bia@exemplo.dev'), 'fundador', [], NOW, false)
    expect(row.product_code).toBe('fundador')
    expect(row.preco_fundador).toBe(false)
    expect(currentPlan([row], NOW).kind).toBe('anual')
    expect(isFounderSeat([row], NOW)).toBe(false)
  })

  it('a sale with a seat is the Founder plan, with the medal', () => {
    const [row] = applyPayment(event('C3'), 'fundador', [], NOW, true)
    expect(row.preco_fundador).toBe(true)
    expect(currentPlan([row], NOW).kind).toBe('fundador')
    expect(isFounderSeat([row], NOW)).toBe(true)
  })

  it('the annual product (after the seats) opens the journey for a year', () => {
    const [row] = applyPayment(event('D4'), 'anual', [], NOW)
    expect(row.product_code).toBe('anual')
    expect(row.expires_at?.slice(0, 10)).toBe('2027-12-01')
    expect(currentPlan([row], NOW).kind).toBe('anual')
  })

  it('seats left for the landing page: hidden (null) when the count failed', () => {
    expect(seatsLeft(499, LIMIT)).toBe(1)
    expect(seatsLeft(500, LIMIT)).toBe(0)
    expect(seatsLeft(612, LIMIT)).toBe(0)
    expect(seatsLeft(null, LIMIT)).toBeNull()
    expect(seatsLeft(Number.NaN, LIMIT)).toBeNull()
  })
})
