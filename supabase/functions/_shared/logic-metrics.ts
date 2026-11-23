// The internal panel (/admin, docs/07 Prompt 11): what admin_metrics() returns and the math the
// screen does on it (funnel conversion, acceptance rates). Pure, so it's tested and the dev panel
// can show example numbers without Supabase.

export interface AdminMetrics {
  visitantes: number
  cliques_compra: number
  leads: number
  dia1: number
  dia2: number
  dia7: number
  vendas: { produto: string; qtd: number; receita: number }[]
  /** Buyers of the main offer (Acesso Fundador) in the period: the base of the acceptance rates. */
  fundadores: number
  /** Buyers of each bump and of the upsell in the period. */
  aceite: Record<'mapa-impresso' | 'familia' | 'audio' | 'vitalicio', number>
  reembolsos: number
  renovacoes: number
}

export interface FunnelStep {
  id: 'visitantes' | 'leads' | 'dia1' | 'dia2' | 'dia7'
  label: string
  n: number
  /** Share of the step before (null for the first). */
  doAnterior: number | null
  /** Share of the first step. */
  doTopo: number
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)

export function funnel(m: AdminMetrics): FunnelStep[] {
  const steps: [FunnelStep['id'], string][] = [
    ['visitantes', 'Visitantes da página'],
    ['leads', 'Começaram no app'],
    ['dia1', 'Concluíram o Dia 1'],
    ['dia2', 'Voltaram no Dia 2'],
    ['dia7', 'Chegaram ao Dia 7'],
  ]
  return steps.map(([id, label], i) => ({
    id,
    label,
    n: m[id],
    doAnterior: i === 0 ? null : pct(m[id], m[steps[i - 1][0]]),
    doTopo: pct(m[id], m[steps[0][0]]),
  }))
}

/** Acceptance of each bump and of the upsell: buyers of it / buyers of the Acesso Fundador. */
export function acceptance(m: AdminMetrics): { id: keyof AdminMetrics['aceite']; label: string; n: number; taxa: number }[] {
  const labels: Record<keyof AdminMetrics['aceite'], string> = {
    'mapa-impresso': 'Bump · Mapa para imprimir',
    familia: 'Bump · Acesso Família',
    audio: 'Bump · Modo Áudio',
    vitalicio: 'Upsell · Vitalício',
  }
  return (Object.keys(labels) as (keyof AdminMetrics['aceite'])[]).map((id) => ({ id, label: labels[id], n: m.aceite[id] ?? 0, taxa: pct(m.aceite[id] ?? 0, m.fundadores) }))
}

export const revenue = (m: AdminMetrics) => m.vendas.reduce((s, v) => s + v.receita, 0)
/** Sales of the period that were refunded, as a share of the sales (orders). */
export const refundRate = (m: AdminMetrics) => pct(m.reembolsos, m.vendas.reduce((s, v) => s + v.qtd, 0))

/** Example numbers for development without Supabase (shape of admin_metrics). Deterministic per period. */
export function sampleMetrics(days: number, seed = 1): AdminMetrics {
  let x = seed * 9301 + days * 49297
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280)
  const visitantes = Math.round(days * (180 + rnd() * 60))
  const leads = Math.round(visitantes * (0.16 + rnd() * 0.05))
  const dia1 = Math.round(leads * (0.62 + rnd() * 0.1))
  const dia2 = Math.round(dia1 * (0.55 + rnd() * 0.1))
  const dia7 = Math.round(dia2 * (0.45 + rnd() * 0.1))
  const fundadores = Math.round(dia7 * (0.12 + rnd() * 0.06) + visitantes * 0.004)
  const aceite = {
    'mapa-impresso': Math.round(fundadores * (0.28 + rnd() * 0.08)),
    familia: Math.round(fundadores * (0.14 + rnd() * 0.05)),
    audio: Math.round(fundadores * (0.18 + rnd() * 0.05)),
    vitalicio: Math.round(fundadores * (0.09 + rnd() * 0.04)),
  }
  const mensal = Math.round(fundadores * 0.35)
  const vendas = [
    { produto: 'fundador', qtd: fundadores, receita: fundadores * 47 },
    { produto: 'mapa-impresso', qtd: aceite['mapa-impresso'], receita: aceite['mapa-impresso'] * 14.9 },
    { produto: 'familia', qtd: aceite.familia, receita: aceite.familia * 27 },
    { produto: 'audio', qtd: aceite.audio, receita: aceite.audio * 19.9 },
    { produto: 'vitalicio', qtd: aceite.vitalicio, receita: aceite.vitalicio * 97 },
    { produto: 'mensal', qtd: mensal, receita: mensal * 9.9 },
  ].sort((a, b) => b.receita - a.receita)
  return {
    visitantes,
    cliques_compra: Math.round(visitantes * 0.06),
    leads,
    dia1,
    dia2,
    dia7,
    vendas,
    fundadores,
    aceite,
    reembolsos: Math.round(fundadores * 0.04),
    renovacoes: Math.round(mensal * (days / 31) * 0.8),
  }
}
