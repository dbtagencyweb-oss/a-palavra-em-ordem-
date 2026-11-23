import { describe, expect, it } from 'vitest'
import type { Entitlement, ProductCode } from '../../supabase/functions/_shared/logic-access'
import { planNotices } from './notices'

const NOW = new Date('2027-06-01T12:00:00Z')
const DAY = 86_400_000
const at = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString()
const ent = (product_code: ProductCode, over: Partial<Entitlement> = {}): Entitlement => ({
  user_id: 'u', email: 'a@x.com', product_code, origem: 'compra', status: 'ativo', starts_at: at(-10), expires_at: at(200),
  provider: 'hotmart', order_id: `o-${product_code}`, subscription_id: null, grupo_id: null, ...over,
})

describe('plan notices', () => {
  it('nothing to say on a healthy plan', () => {
    expect(planNotices([ent('fundador')], NOW)).toEqual({ atraso: null, renovacao: null, trocaAnual: false })
  })
  it('failed monthly charge: warning with the date access ends', () => {
    const n = planNotices([ent('mensal', { cobranca_falhou_em: at(-1), expires_at: at(2) })], NOW)
    expect(n.atraso).toEqual({ ate: at(2) })
  })
  it('annual Founder ending within 30 days: renewal notice; lifetime never', () => {
    expect(planNotices([ent('fundador', { expires_at: at(25) })], NOW).renovacao?.dias).toBe(25)
    expect(planNotices([ent('fundador', { expires_at: at(45) })], NOW).renovacao).toBeNull()
    expect(planNotices([ent('fundador', { expires_at: at(25) }), ent('vitalicio', { expires_at: null })], NOW).renovacao).toBeNull()
  })
  it('switch to annual after 2 months on the monthly plan, not before, and not for annual buyers', () => {
    expect(planNotices([ent('mensal', { starts_at: at(-62), expires_at: at(20) })], NOW).trocaAnual).toBe(true)
    expect(planNotices([ent('mensal', { starts_at: at(-40), expires_at: at(20) })], NOW).trocaAnual).toBe(false)
    expect(planNotices([ent('mensal', { starts_at: at(-62), expires_at: at(20) }), ent('fundador')], NOW).trocaAnual).toBe(false)
  })
  it('family access (invitee) does not get the buyer notices', () => {
    expect(planNotices([ent('fundador', { origem: 'convite_familia', expires_at: at(10) })], NOW).renovacao).toBeNull()
  })
})
