import { describe, expect, it } from 'vitest'
import type { Entitlement } from './logic-access'
import { activeInvites, canInvite, canRevoke, familyLamp, inviteMessage, lampSentence, ownerSharesAccess, swapsUsed, type FamilyInvite } from './logic-family'

const NOW = new Date('2027-03-01T12:00:00Z')
const inv = (over: Partial<FamilyInvite>): FamilyInvite => ({ id: Math.random().toString(36), codigo: 'abc', email: null, status: 'pendente', aceito_por: null, created_at: '2027-01-01T00:00:00Z', revogado_em: null, ...over })
const ent = (product_code: Entitlement['product_code'], over: Partial<Entitlement> = {}): Entitlement => ({
  user_id: 'owner', email: 'dono@x.com', product_code, origem: 'compra', status: 'ativo', starts_at: '2027-01-01T00:00:00Z', expires_at: '2028-01-01T00:00:00Z',
  provider: 'hotmart', order_id: `o-${product_code}`, subscription_id: null, grupo_id: null, ...over,
})

describe('slots', () => {
  it('two people at most (pending or accepted)', () => {
    expect(canInvite([])).toBe(true)
    expect(canInvite([inv({}), inv({ status: 'aceito', aceito_por: 'u1' })])).toBe(false)
    expect(canInvite([inv({}), inv({ status: 'revogado' })])).toBe(true)
    expect(activeInvites([inv({}), inv({ status: 'revogado' })])).toHaveLength(1)
  })
})

describe('swaps', () => {
  const removed = (when: string) => inv({ status: 'revogado', aceito_por: 'u', revogado_em: when })
  it('canceling an invite nobody accepted is always fine', () => {
    const all = [removed('2027-02-01T00:00:00Z'), removed('2027-02-10T00:00:00Z')]
    expect(canRevoke(inv({}), all, NOW)).toBe(true)
  })
  it('removing someone who accepted is a swap: 2 per year', () => {
    const accepted = inv({ status: 'aceito', aceito_por: 'u3' })
    expect(canRevoke(accepted, [removed('2027-02-01T00:00:00Z')], NOW)).toBe(true)
    expect(canRevoke(accepted, [removed('2027-02-01T00:00:00Z'), removed('2027-02-10T00:00:00Z')], NOW)).toBe(false)
    // a swap from more than a year ago no longer counts
    expect(swapsUsed([removed('2026-01-01T00:00:00Z'), removed('2027-02-10T00:00:00Z')], NOW)).toBe(1)
  })
})

describe('owner access', () => {
  it('invitees keep access only while the owner has the bump and a bought full access', () => {
    expect(ownerSharesAccess([ent('fundador'), ent('familia', { expires_at: null })], NOW)).toBe(true)
    expect(ownerSharesAccess([ent('familia', { expires_at: null })], NOW)).toBe(false)
    expect(ownerSharesAccess([ent('fundador', { status: 'reembolsado' }), ent('familia', { expires_at: null })], NOW)).toBe(false) // refund: everyone loses it
    expect(ownerSharesAccess([ent('vitalicio', { expires_at: null }), ent('familia', { expires_at: null })], NOW)).toBe(true)
    // an access the owner got as an invitee does not pass on
    expect(ownerSharesAccess([ent('fundador', { origem: 'convite_familia' }), ent('familia', { expires_at: null })], NOW)).toBe(false)
  })
})

describe('lamp and message', () => {
  it('shows the streak only while it is alive', () => {
    expect(familyLamp(5, '2027-03-01', '2027-03-01')).toBe(5)
    expect(familyLamp(5, '2027-02-28', '2027-03-01')).toBe(5)
    expect(familyLamp(5, '2027-02-26', '2027-03-01')).toBe(0)
    expect(lampSentence('Ana', 5)).toBe('Ana está com 5 dias de lâmpada acesa.')
    expect(lampSentence('Ana', 1)).toBe('Ana está com 1 dia de lâmpada acesa.')
  })
  it('the WhatsApp message carries the link', () => {
    expect(inviteMessage('https://x/convite/abc')).toBe('Estou lendo a Bíblia inteira em ordem e quero que você venha comigo. Entre por este link: https://x/convite/abc')
  })
})
