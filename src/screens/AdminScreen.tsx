// /admin: the internal panel (docs/07, Prompt 11). Landing page visitors, leads, Day 1 → Day 2 →
// Day 7, sales by product, bump and upsell acceptance, refunds and renewals, filtered by period
// and UTM. Only admins (public.admins) get numbers: the database functions check it.
// In development without Supabase it shows example numbers, clearly marked.
import { useEffect, useMemo, useState } from 'react'
import { acceptance, funnel, refundRate, revenue, sampleMetrics, type AdminMetrics } from '../../supabase/functions/_shared/logic-metrics'
import { useAuth } from '../auth/AuthContext'
import { SignInForm } from '../auth/SignInForm'
import { cloudEnabled, getSupabase } from '../lib/supabase'
import { BackIcon } from '../ui/icons'

const PRODUCT_NAMES: Record<string, string> = {
  fundador: 'Acesso Fundador',
  'mapa-impresso': 'Mapa para imprimir',
  familia: 'Acesso Família',
  vitalicio: 'Vitalício',
  audio: 'Modo Áudio',
  mensal: 'Plano Mensal',
  'estudo-romanos': 'Estudo Romanos',
  'estudo-salmos': 'Estudo Salmos',
  'estudo-apocalipse': 'Estudo Apocalipse',
  igreja: 'Licença Igreja (30)',
  'igreja-100': 'Licença Igreja (100)',
}
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const num = (v: number) => v.toLocaleString('pt-BR')
const pctTxt = (v: number) => `${String(v).replace('.', ',')}%`
const dayKey = (d: Date) => d.toISOString().slice(0, 10)
const PRESETS = [7, 30, 90] as const

type Load = { state: 'loading' } | { state: 'ok'; m: AdminMetrics; example?: boolean } | { state: 'denied' } | { state: 'error'; msg: string }

export function AdminScreen({ onBack }: { onBack(): void }) {
  const auth = useAuth()
  const today = new Date()
  const [from, setFrom] = useState(dayKey(new Date(today.getTime() - 29 * 86_400_000)))
  const [to, setTo] = useState(dayKey(today))
  const [source, setSource] = useState('')
  const [campaign, setCampaign] = useState('')
  const [options, setOptions] = useState<{ sources: string[]; campaigns: string[] }>({ sources: [], campaigns: [] })
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1)

  useEffect(() => {
    let alive = true
    setLoad({ state: 'loading' })
    if (!cloudEnabled) {
      if (import.meta.env.DEV) setLoad({ state: 'ok', m: sampleMetrics(days, (source + campaign).length + 1), example: true })
      else setLoad({ state: 'denied' })
      return
    }
    if (!auth.session) return
    void (async () => {
      const sb = await getSupabase()!
      const end = new Date(`${to}T00:00:00`)
      end.setDate(end.getDate() + 1)
      const { data, error } = await sb.rpc('admin_metrics', {
        p_from: new Date(`${from}T00:00:00`).toISOString(),
        p_to: end.toISOString(),
        p_source: source || null,
        p_campaign: campaign || null,
      })
      if (!alive) return
      if (error) setLoad(/restrito/.test(error.message) ? { state: 'denied' } : { state: 'error', msg: error.message })
      else setLoad({ state: 'ok', m: data as AdminMetrics })
    })()
    return () => {
      alive = false
    }
  }, [from, to, source, campaign, auth.session, days])

  useEffect(() => {
    if (!cloudEnabled || !auth.session) return
    void (async () => {
      const { data } = await (await getSupabase()!).rpc('admin_utm_options')
      if (data) setOptions({ sources: (data.sources ?? []).filter(Boolean).sort(), campaigns: (data.campaigns ?? []).filter(Boolean).sort() })
    })()
  }, [auth.session])

  const m = load.state === 'ok' ? load.m : null
  const steps = useMemo(() => (m ? funnel(m) : []), [m])

  if (cloudEnabled && !auth.session)
    return (
      <Shell onBack={onBack}>
        <p className="mx-5 text-[14px] text-ink-2">Entre com o e-mail de administrador.</p>
        <div className="mx-5 mt-4">
          <SignInForm origem="admin" />
        </div>
      </Shell>
    )
  if (load.state === 'denied')
    return (
      <Shell onBack={onBack}>
        <p className="mx-5 rounded-card bg-card p-4 text-[14px] text-ink-2 shadow-card" data-testid="admin-restrito">
          Esta página é só para o administrador.
        </p>
      </Shell>
    )

  return (
    <Shell onBack={onBack}>
      {load.state === 'ok' && load.example && (
        <p className="mx-5 mb-3 rounded-btn border border-dashed border-ember/50 bg-ember-soft/40 px-3 py-2 text-[12.5px] text-ember-ink" data-testid="admin-exemplo">
          Dados de exemplo: sem Supabase configurado. Com o Supabase, os números vêm do banco.
        </p>
      )}

      {/* Filters. */}
      <div className="mx-5 rounded-card bg-card p-4 shadow-card">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Período">
          {PRESETS.map((d) => {
            const f = dayKey(new Date(today.getTime() - (d - 1) * 86_400_000))
            const active = from === f && to === dayKey(today)
            return (
              <button
                key={d}
                type="button"
                onClick={() => (setFrom(f), setTo(dayKey(today)))}
                className={`min-h-10 rounded-full px-3.5 text-[13px] font-bold ${active ? 'bg-ink text-paper' : 'bg-paper-2 text-ink-2'}`}
                aria-pressed={active}
              >
                {d} dias
              </button>
            )
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-[12px] font-semibold text-ink-3">
            De
            <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="mt-1 block min-h-11 w-full rounded-btn border border-line bg-paper px-2 text-[14px] text-ink" />
          </label>
          <label className="text-[12px] font-semibold text-ink-3">
            Até
            <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className="mt-1 block min-h-11 w-full rounded-btn border border-line bg-paper px-2 text-[14px] text-ink" />
          </label>
          <label className="text-[12px] font-semibold text-ink-3">
            utm_source
            <UtmInput value={source} onChange={setSource} options={options.sources} list="utm-sources" />
          </label>
          <label className="text-[12px] font-semibold text-ink-3">
            utm_campaign
            <UtmInput value={campaign} onChange={setCampaign} options={options.campaigns} list="utm-campaigns" />
          </label>
        </div>
        {campaign && <p className="mt-2 text-[11.5px] text-ink-3">Vendas e reembolsos são filtrados só por utm_source: as plataformas não devolvem a campanha.</p>}
      </div>

      {load.state === 'loading' && <p className="mx-5 mt-4 text-[14px] text-ink-3">Carregando…</p>}
      {load.state === 'error' && <p className="mx-5 mt-4 rounded-btn bg-ember-soft px-3 py-2 text-[13px] text-ember-ink">Não deu para carregar: {load.msg}</p>}

      {m && (
        <>
          {/* Headline numbers. */}
          <div className="mx-5 mt-4 grid grid-cols-2 gap-2.5">
            <Stat label="Receita (preço de referência)" value={brl(revenue(m))} dark />
            <Stat label="Acessos Fundador vendidos" value={num(m.fundadores)} />
            <Stat label="Reembolsos" value={`${num(m.reembolsos)} · ${pctTxt(refundRate(m))}`} />
            <Stat label="Renovações" value={num(m.renovacoes)} />
          </div>

          {/* Funnel. */}
          <h3 className="px-5 pb-2 pt-6 text-lg">Funil</h3>
          <ol className="mx-5 space-y-3 rounded-card bg-card p-4 shadow-card" data-testid="admin-funil">
            {steps.map((s) => (
              <li key={s.id}>
                <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
                  <span className="font-semibold">{s.label}</span>
                  <span className="whitespace-nowrap">
                    <strong>{num(s.n)}</strong>
                    {s.doAnterior !== null && <span className="ml-1.5 text-[12px] text-ink-3">{pctTxt(s.doAnterior)} da etapa anterior</span>}
                  </span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#B8893A,#E2C580)]" style={{ width: `${Math.max(s.n ? 1.5 : 0, s.doTopo)}%` }} />
                </div>
              </li>
            ))}
            <li className="text-[12px] text-ink-3">Cliques em comprar na página: {num(m.cliques_compra)}</li>
          </ol>

          {/* Sales by product. */}
          <h3 className="px-5 pb-2 pt-6 text-lg">Vendas por produto</h3>
          <div className="mx-5 overflow-hidden rounded-card bg-card shadow-card">
            <table className="w-full text-[13.5px]" data-testid="admin-vendas">
              <thead className="bg-paper-2 text-left text-[11.5px] uppercase tracking-[0.08em] text-ink-3">
                <tr>
                  <th className="px-4 py-2 font-bold">Produto</th>
                  <th className="px-2 py-2 text-right font-bold">Vendas</th>
                  <th className="px-4 py-2 text-right font-bold">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {m.vendas.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-ink-3">
                      Nenhuma venda no período.
                    </td>
                  </tr>
                )}
                {m.vendas.map((v) => (
                  <tr key={v.produto}>
                    <td className="px-4 py-2.5">{PRODUCT_NAMES[v.produto] ?? v.produto}</td>
                    <td className="px-2 py-2.5 text-right">{num(v.qtd)}</td>
                    <td className="px-4 py-2.5 text-right">{brl(v.receita)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bumps and upsell. */}
          <h3 className="px-5 pb-2 pt-6 text-lg">Aceite dos bumps e do upsell</h3>
          <ul className="mx-5 space-y-3 rounded-card bg-card p-4 shadow-card" data-testid="admin-aceite">
            {acceptance(m).map((a) => (
              <li key={a.id}>
                <div className="flex justify-between text-[13.5px]">
                  <span>{a.label}</span>
                  <span>
                    <strong>{pctTxt(a.taxa)}</strong> <span className="text-[12px] text-ink-3">({num(a.n)})</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-olive" style={{ width: `${Math.min(100, a.taxa)}%` }} />
                </div>
              </li>
            ))}
            <li className="text-[12px] text-ink-3">Base: compradores do Acesso Fundador no período ({num(m.fundadores)}).</li>
          </ul>
        </>
      )}
    </Shell>
  )
}

function Shell({ onBack, children }: { onBack(): void; children: React.ReactNode }) {
  return (
    <section className="screen bg-paper pb-[calc(40px+env(safe-area-inset-bottom))]" data-testid="admin">
      <div className="flex-none">
        <header className="flex items-center gap-2 px-3 pt-3">
          <button type="button" onClick={onBack} aria-label="Voltar" className="grid h-11 w-11 place-items-center rounded-full text-ink-2">
            <BackIcon />
          </button>
        </header>
        <div className="px-5 pb-4">
          <small className="eyebrow block">Painel interno</small>
          <h2 className="text-[28px] leading-tight">Métricas</h2>
        </div>
        {children}
      </div>
    </section>
  )
}

function Stat({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`rounded-card p-4 shadow-card ${dark ? 'bg-ink text-paper' : 'bg-card'}`}>
      <strong className="block font-display text-[22px] leading-tight">{value}</strong>
      <span className={`mt-1 block text-[12px] ${dark ? 'text-paper/70' : 'text-ink-3'}`}>{label}</span>
    </div>
  )
}

function UtmInput({ value, onChange, options, list }: { value: string; onChange(v: string): void; options: string[]; list: string }) {
  return (
    <>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        list={list}
        placeholder="todas"
        className="mt-1 block min-h-11 w-full rounded-btn border border-line bg-paper px-2 text-[14px] text-ink"
      />
      <datalist id={list}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  )
}
