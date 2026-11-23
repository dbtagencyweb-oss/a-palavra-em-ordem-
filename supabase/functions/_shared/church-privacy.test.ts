// Licença Igreja (docs/07, Prompt 10): the group rules and, above all, the privacy promise.
// The database itself is tested by supabase/tests/church_group_privacy.test.sql (pgTAP); this file
// checks the migrations' text and the shared logic, so a change that opens private data fails here
// too, even without a database at hand.
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyPayment, type Entitlement, type PaymentEvent } from './logic-access'
import {
  collectiveLamp,
  groupLive,
  joinRefusal,
  PANEL_FIELDS,
  panelMember,
  panelSummary,
  seatsFor,
  weekLesson,
  type Group,
} from './logic-group'

const DIR = 'supabase/migrations'
const sql = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(`${DIR}/${f}`, 'utf8'))
  .join('\n')
const church = readFileSync(`${DIR}/${readdirSync(DIR).find((f) => f.includes('church_groups'))}`, 'utf8')

/** Every `create policy ... on public.<table> ... ;` statement for a table. */
const policiesOn = (table: string) => [...sql.matchAll(new RegExp(String.raw`create policy[^;]*?on public\.${table}\b[^;]*;`, 'gis'))].map((m) => m[0])
/** The body of a SQL function (the last definition wins, as in the database). */
function fnBody(name: string): string {
  const all = [...sql.matchAll(new RegExp(String.raw`create or replace function public\.${name}\([\s\S]*?\$\$([\s\S]*?)\$\$`, 'gi'))]
  if (!all.length) throw new Error(`função ${name} não encontrada`)
  return all.at(-1)![1]
}

describe('privacy: the leader never reaches private data', () => {
  it('diary, progress and entitlements stay "own rows only" in every migration', () => {
    for (const table of ['diary_entries', 'progress', 'entitlements']) {
      const policies = policiesOn(table)
      expect(policies.length).toBeGreaterThan(0)
      for (const p of policies) {
        expect(p, p).toMatch(/user_id = auth\.uid\(\)/)
        expect(p, p).not.toMatch(/group|grupo|lider|igreja|family|famil/i)
      }
    }
  })

  it('clients cannot write groups or memberships, and only read their own', () => {
    for (const table of ['groups', 'group_members']) {
      const policies = policiesOn(table)
      expect(policies.every((p) => /for select/i.test(p))).toBe(true)
    }
    expect(policiesOn('groups').join()).toMatch(/lider_id = auth\.uid\(\)/)
    expect(policiesOn('group_members').join()).toMatch(/user_id = auth\.uid\(\)/)
  })

  it('the panel function returns exactly the allowed fields', () => {
    const body = fnBody('church_group_panel')
    const keys = [...body.matchAll(/'(\w+)',\s/g)].map((m) => m[1]).filter((k) => !['lider', 'membro'].includes(k))
    expect(keys.sort()).toEqual([...PANEL_FIELDS].sort())
    // Names go through the first-name function; nothing reads the diary, the e-mail or raw progress.
    expect(body).toMatch(/family_first_name\(gm\.user_id\)/)
    expect(body).not.toMatch(/diary|email|raw_user_meta|pr\.data\s*->/i)
    expect(body).toMatch(/where lider_id = me/)
  })

  it('progress is reduced to the panel numbers before leaving the database', () => {
    const body = fnBody('church_progress')
    expect(body).toMatch(/returns table|select/i)
    expect(fnBody('church_progress')).not.toMatch(/diary/i)
    expect(church).toMatch(/returns table \(leu_hoje boolean, lampada int, trilha text, dia int\)/)
  })

  it("a member's own group view lists no other member", () => {
    const body = fnBody('my_church_group')
    expect(body).not.toMatch(/family_first_name|json_agg/)
    expect(body).toMatch(/'codigo', case when role = 'lider'/)
  })

  it('panelMember keeps nothing but the panel fields, whatever the progress holds', () => {
    const today = '2026-11-21'
    const row = panelMember('m1', 'Ana', { completedDays: { 1: today }, streak: 2, lastStreakDate: today, diary: [{ texto: 'segredo' }], quiz: { a: 1 } } as never, today)
    expect(Object.keys(row).sort()).toEqual([...PANEL_FIELDS].sort())
    expect(JSON.stringify(row)).not.toMatch(/segredo|quiz/)
  })
})

describe('the group', () => {
  const NOW = new Date('2026-11-21T12:00:00Z')
  const g: Group = { id: 'g', nome: 'Célula Vida', vagas: 30, vencimento: '2027-11-21T00:00:00Z', ativo: true, codigo: 'abc' }

  it('30 or 100 seats by product', () => {
    expect(seatsFor('igreja')).toBe(30)
    expect(seatsFor('igreja-100')).toBe(100)
  })

  it('buying the license gives a year of full access (the group follows it)', () => {
    const ev: PaymentEvent = { provider: 'hotmart', kind: 'approved', email: 'p@x.com', userId: null, platformProductId: 'X', offerCode: null, orderId: 'O1', subscriptionId: null, at: NOW }
    const [row] = applyPayment(ev, 'igreja-100', [] as Entitlement[], NOW)
    expect(row.product_code).toBe('igreja-100')
    expect(new Date(row.expires_at!).getUTCFullYear()).toBe(2027)
  })

  it('joining needs a live group and a free seat', () => {
    expect(joinRefusal(g, 29, {}, NOW)).toBeNull()
    expect(joinRefusal(g, 30, {}, NOW)).toBe('grupo cheio')
    expect(joinRefusal({ ...g, ativo: false }, 1, {}, NOW)).toBe('grupo inativo')
    expect(joinRefusal({ ...g, vencimento: '2026-11-01T00:00:00Z' }, 1, {}, NOW)).toBe('grupo inativo')
    expect(joinRefusal(g, 1, { isLeader: true }, NOW)).toBe('é o líder')
    expect(groupLive({ ativo: true, vencimento: null }, NOW)).toBe(true)
  })

  it('where each member is: the furthest trail reached, and its last day', () => {
    const today = '2026-11-21'
    expect(panelMember('1', 'A', null, today)).toMatchObject({ trilha: null, dia: 0, leu_hoje: false, lampada: 0 })
    expect(panelMember('2', 'B', { completedDays: { 1: '2026-11-10', 2: '2026-11-11' } }, today)).toMatchObject({ trilha: 'mapa-7-dias', dia: 2 })
    const b = panelMember('3', 'C', { completedDays: { 7: '2026-11-01' }, trails: { 'jesus-em-ordem': { 3: today } }, streak: 9, lastStreakDate: today }, today)
    expect(b).toMatchObject({ trilha: 'jesus-em-ordem', dia: 3, leu_hoje: true, lampada: 9 })
    // A lamp that went out (last lit two days ago) shows as 0.
    expect(panelMember('4', 'D', { streak: 5, lastStreakDate: '2026-11-19' }, today).lampada).toBe(0)
  })

  it('panel summary, collective lamp and the lesson for the meeting', () => {
    const rows = [
      { id: '1', nome: 'A', leu_hoje: true, lampada: 4, trilha: 'jesus-em-ordem', dia: 5 },
      { id: '2', nome: 'B', leu_hoje: true, lampada: 2, trilha: 'jesus-em-ordem', dia: 5 },
      { id: '3', nome: 'C', leu_hoje: false, lampada: 0, trilha: 'jesus-em-ordem', dia: 7 },
      { id: '4', nome: 'D', leu_hoje: false, lampada: 0, trilha: null, dia: 0 },
    ]
    const s = panelSummary(rows)
    expect(s).toMatchObject({ total: 4, leramHoje: 2, sequenciaMedia: 1.5, naoComecaram: 1 })
    expect(s.distribuicao).toEqual([
      { trilha: 'jesus-em-ordem', dia: 7, pessoas: 1 },
      { trilha: 'jesus-em-ordem', dia: 5, pessoas: 2 },
    ])
    expect(weekLesson(s)).toEqual({ trilha: 'jesus-em-ordem', dia: 5 })
    expect(collectiveLamp(rows)).toEqual({ acesas: 2, total: 4 })
  })
})
