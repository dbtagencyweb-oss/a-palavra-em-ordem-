import { describe, expect, it } from 'vitest'
import { ACCESS_DAYS, handleHotmartEvent, tokensMatch } from './logic'

const approved = (over: Record<string, unknown> = {}) => ({
  id: 'evt-1',
  event: 'PURCHASE_APPROVED',
  version: '2.0.0',
  data: {
    product: { id: 123456, name: 'Acesso Fundador' },
    buyer: { email: ' Pessoa@Exemplo.com ', name: 'Pessoa Teste' },
    purchase: {
      transaction: 'HP0001',
      status: 'APPROVED',
      approved_date: Date.UTC(2026, 10, 19, 12),
      origin: { xcod: '0b6a9c2e-1d4f-4e7a-9a51-2f3c4d5e6f70' },
    },
  },
  ...over,
})

const opts = { productId: '123456', now: new Date(Date.UTC(2026, 10, 19, 12, 5)) }

describe('hotmart webhook', () => {
  it('compares the hottok safely', () => {
    expect(tokensMatch('abc123', 'abc123')).toBe(true)
    expect(tokensMatch('abc124', 'abc123')).toBe(false)
    expect(tokensMatch(null, 'abc123')).toBe(false)
    expect(tokensMatch('abc123', '')).toBe(false)
  })

  it('grants one year of Founder Access on approval, linked by xcod', () => {
    const r = handleHotmartEvent(approved(), opts)
    expect(r.action).toBe('upsert')
    if (r.action !== 'upsert') return
    expect(r.row.status).toBe('active')
    expect(r.row.email).toBe('pessoa@exemplo.com')
    expect(r.row.user_id).toBe('0b6a9c2e-1d4f-4e7a-9a51-2f3c4d5e6f70')
    expect(r.row.provider_transaction).toBe('HP0001')
    const days = (Date.parse(r.row.expires_at!) - Date.parse(r.row.purchased_at!)) / 86_400_000
    expect(days).toBe(ACCESS_DAYS)
  })

  it('revokes on refund, chargeback and cancel', () => {
    for (const [event, status] of [
      ['PURCHASE_REFUNDED', 'refunded'],
      ['PURCHASE_CHARGEBACK', 'chargeback'],
      ['PURCHASE_CANCELED', 'canceled'],
      ['PURCHASE_PROTEST', 'disputed'],
    ]) {
      const r = handleHotmartEvent(approved({ event }), opts)
      expect(r.action === 'upsert' && r.row.status).toBe(status)
      expect(r.action === 'upsert' && r.row.expires_at).toBeNull()
    }
  })

  it('ignores other products, unknown events and incomplete payloads', () => {
    expect(handleHotmartEvent(approved(), { productId: '999' }).action).toBe('ignore')
    expect(handleHotmartEvent(approved({ event: 'PURCHASE_BILLET_PRINTED' }), opts).action).toBe('ignore')
    expect(handleHotmartEvent({ event: 'PURCHASE_APPROVED', data: { product: { id: 123456 } } }, opts).action).toBe('ignore')
    expect(handleHotmartEvent(null, opts).action).toBe('ignore')
  })

  it('does not trust an xcod that is not an account id', () => {
    const body = approved()
    body.data.purchase.origin.xcod = 'campanha-instagram'
    const r = handleHotmartEvent(body, opts)
    expect(r.action === 'upsert' && r.row.user_id).toBeNull()
  })
})
