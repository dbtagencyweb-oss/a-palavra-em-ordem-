import { describe, expect, it } from 'vitest'
import type { Entitlement } from './logic-access'
import { renewalEmail, renewalsDue } from './logic-renewal'

const NOW = new Date('2027-01-01T12:00:00Z')
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000 - 3600_000).toISOString()
const row = (over: Partial<Entitlement & { id: string }> = {}) =>
  ({
    id: 'e1',
    user_id: null,
    email: 'Ana@Exemplo.dev',
    product_code: 'fundador',
    origem: 'compra',
    status: 'ativo',
    starts_at: '2026-01-01T00:00:00Z',
    expires_at: inDays(15),
    provider: 'hotmart',
    order_id: 'A1',
    subscription_id: null,
    grupo_id: null,
    preco_fundador: true,
    ...over,
  }) as Entitlement & { id: string }

describe('renewal e-mails (15 and 3 days before)', () => {
  it('sends the 15-day e-mail, then the 3-day one, once each', () => {
    const [d] = renewalsDue([row()], new Set(), NOW)
    expect(d).toMatchObject({ mark: 15, dias: 15, email: 'ana@exemplo.dev', founderSeat: true })
    expect(renewalsDue([row()], new Set(['e1:15']), NOW)).toEqual([])
    const late = row({ expires_at: inDays(3) })
    expect(renewalsDue([late], new Set(['e1:15']), NOW)[0].mark).toBe(3)
    expect(renewalsDue([late], new Set(['e1:15', 'e1:3']), NOW)).toEqual([])
  })

  it('nothing yet at 20 days; never a late 15-day e-mail after the 3-day one', () => {
    expect(renewalsDue([row({ expires_at: inDays(20) })], new Set(), NOW)).toEqual([])
    expect(renewalsDue([row({ expires_at: inDays(10) })], new Set(['e1:3']), NOW)).toEqual([])
  })

  it('skips lifetime, monthly, refunded and already renewed accesses', () => {
    expect(renewalsDue([row(), row({ id: 'v', product_code: 'vitalicio', expires_at: null })], new Set(), NOW)).toEqual([])
    expect(renewalsDue([row({ product_code: 'mensal' })], new Set(), NOW)).toEqual([])
    expect(renewalsDue([row({ status: 'reembolsado' })], new Set(), NOW)).toEqual([])
    expect(renewalsDue([row(), row({ id: 'e2', order_id: 'B2', expires_at: inDays(380) })], new Set(), NOW)).toEqual([])
  })

  it('annual buyers past the Founder seats get the annual price in the e-mail', () => {
    const [d] = renewalsDue([row({ product_code: 'anual', preco_fundador: false })], new Set(), NOW)
    expect(d.founderSeat).toBe(false)
    const mail = renewalEmail(d, 'https://pay.exemplo/anual', 67)
    expect(mail.text).toContain('R$ 67')
    expect(mail.text).toContain('Não existe cobrança automática')
    const founder = renewalEmail(renewalsDue([row()], new Set(), NOW)[0], 'https://pay.exemplo/fundador', 47)
    expect(founder.text).toContain('Como Fundador, você renova por R$ 47')
    expect(founder.html).toContain('#C0552D')
  })
})
