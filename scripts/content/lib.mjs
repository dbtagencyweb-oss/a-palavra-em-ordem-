// Content production line (docs/07, Prompt 2): load a trail from content/trilhas/<id>/,
// validate it, render the review script and change lesson status. Used by the npm scripts
// content:check, content:review and content:publish, by the e2e test and by the tests.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const ROOT = 'content/trilhas'
export const STATUSES = ['rascunho', 'em_revisao', 'publicado']
export const CARD_TYPES = ['abertura', 'texto', 'movimentos', 'mapa', 'cena', 'ordenar', 'ligar', 'palavra', 'cristo', 'quiz', 'reflexao', 'oracao', 'oferta', 'leitura', 'contexto', 'observar', 'pergunta']
/** The light format of the chronological plan (docs/07, Prompt 4): always these cards, in this order. */
export const LEITURA_GUIADA = ['leitura', 'contexto', 'observar', 'cristo', 'pergunta']
/** "Um card = uma ideia. Texto de card com no máximo ~70 palavras" (CLAUDE.md). */
export const WORDS_WARN = 70
export const WORDS_MAX = 80

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

/** Trail folders, including the stages of a plan (e.g. biblia-em-ordem/etapa-01). */
export function trailIds() {
  if (!existsSync(ROOT)) return []
  const out = []
  for (const d of readdirSync(ROOT)) {
    if (existsSync(join(ROOT, d, 'trilha.json'))) out.push(d)
    else if (existsSync(join(ROOT, d, 'plano.json')))
      for (const e of readdirSync(join(ROOT, d))) if (existsSync(join(ROOT, d, e, 'trilha.json'))) out.push(`${d}/${e}`)
  }
  return out
}

/** Reads trilha.json and its day files. Each day keeps its file name (for writing back). */
export function loadTrail(id) {
  const dir = join(ROOT, id)
  const trilha = readJson(join(dir, 'trilha.json'))
  const dias = trilha.dias.map((ref) => {
    const file = join(dir, ref.arquivo)
    return { ref, file, dia: existsSync(file) ? readJson(file) : null }
  })
  return { id, dir, trilha, dias }
}

/** Parses "1-7", "1,3,5", "2" or nothing (= all) into day numbers. */
export function parseDays(spec, all) {
  if (!spec) return all
  const out = new Set()
  for (const part of String(spec).split(',')) {
    const [a, b] = part.split('-').map((x) => Number(x.trim()))
    if (Number.isNaN(a)) continue
    for (let n = a; n <= (Number.isNaN(b) || b === undefined ? a : b); n++) out.add(n)
  }
  return all.filter((n) => out.has(n))
}

// ---------- Words on a card ----------

const words = (s) => (typeof s === 'string' ? s.trim().split(/\s+/).filter(Boolean).length : 0)

/** What the person reads on the card at once (title and body; not the feedback after an answer). */
export function cardText(c) {
  const parts = [c.titulo, c.instrucao, c.legenda, c.resumo, c.observar, c.texto, c.pergunta, c.apoio]
  for (const p of c.paragrafos ?? []) parts.push(p)
  for (const i of c.itens ?? []) parts.push(typeof i === 'string' ? i : `${i.nome ?? ''} ${i.texto ?? ''}`)
  for (const p of c.pares ?? []) parts.push(`${p.a} ${p.b}`)
  for (const o of c.opcoes ?? []) parts.push(o.texto)
  return parts.filter(Boolean).join(' ')
}
export const cardWords = (c) => words(cardText(c))

// ---------- Validation ----------

/** Text fields each card type must fill (empty = error). */
const REQUIRED = {
  abertura: ['titulo', 'paragrafos'],
  texto: ['titulo', 'paragrafos'],
  movimentos: ['titulo', 'itens'],
  mapa: ['titulo', 'paragrafos'],
  cena: ['midia', 'legenda'],
  ordenar: ['titulo', 'instrucao', 'itens', 'acerto', 'erro'],
  ligar: ['titulo', 'instrucao', 'pares', 'acerto'],
  palavra: ['resumo', 'observar'], // the reference has its own message below
  cristo: ['texto'],
  quiz: ['pergunta', 'opcoes', 'acerto', 'erro'],
  reflexao: ['pergunta'],
  oracao: ['texto'],
  oferta: ['texto', 'botao', 'botaoSecundario'],
  leitura: ['referencia'],
  contexto: ['texto'],
  observar: ['texto'],
  pergunta: ['texto'],
}

const empty = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0)
/** Every string inside a value (to catch empty items and paragraphs). */
function* strings(v) {
  if (typeof v === 'string') yield v
  else if (Array.isArray(v)) for (const x of v) yield* strings(x)
  else if (v && typeof v === 'object') for (const x of Object.values(v)) yield* strings(x)
}

/**
 * Checks one day. Returns { errors, warnings } as human-readable lines.
 * `mediaIds` = ids in content/midia.json.
 */
export function validateDay(dia, mediaIds, where = `Dia ${dia?.n}`) {
  const errors = []
  const warnings = []
  if (!dia) return { errors: [`${where}: arquivo não encontrado`], warnings }
  if (!STATUSES.includes(dia.status)) errors.push(`${where}: status "${dia.status}" inválido (use ${STATUSES.join(', ')})`)
  if (empty(dia.titulo)) errors.push(`${where}: sem título`)
  if (dia.simbolo?.midia && !mediaIds.has(dia.simbolo.midia)) errors.push(`${where}: símbolo usa a mídia "${dia.simbolo.midia}", que não está no midia.json`)
  // A day still being written can have no cards yet; anything past draft needs them.
  if (!Array.isArray(dia.cards) || dia.cards.length === 0) {
    if (dia.status !== 'rascunho') errors.push(`${where}: sem cards`)
    return { errors, warnings }
  }
  if (dia.formato === 'leitura-guiada') {
    const order = dia.cards.map((c) => c.tipo).join(', ')
    if (order !== LEITURA_GUIADA.join(', ')) errors.push(`${where}: leitura guiada precisa dos cards ${LEITURA_GUIADA.join(', ')}, nesta ordem (tem: ${order})`)
  }
  const ids = new Set()
  for (const c of dia.cards) {
    const at = `${where} · ${c.id ?? '(sem id)'}`
    if (!c.id) errors.push(`${at}: card sem id`)
    else if (ids.has(c.id)) errors.push(`${at}: id repetido`)
    ids.add(c.id)
    if (!CARD_TYPES.includes(c.tipo)) {
      errors.push(`${at}: tipo "${c.tipo}" não existe (tipos: ${CARD_TYPES.join(', ')})`)
      continue
    }
    for (const f of REQUIRED[c.tipo]) if (empty(c[f])) errors.push(`${at}: campo "${f}" vazio`)
    for (const s of strings({ paragrafos: c.paragrafos, itens: c.itens, pares: c.pares, opcoes: c.opcoes })) if (!s.trim()) errors.push(`${at}: há um texto vazio`)
    if (c.midia && !mediaIds.has(c.midia)) errors.push(`${at}: mídia "${c.midia}" não está no midia.json`)
    if (c.tipo === 'palavra' && empty(c.referencia)) errors.push(`${at}: card "palavra" sem referência bíblica`)
    if (c.tipo === 'quiz') {
      const right = (c.opcoes ?? []).filter((o) => o.correta === true).length
      if (right !== 1) errors.push(`${at}: o quiz precisa de exatamente uma opção correta (tem ${right})`)
    }
    const n = cardWords(c)
    if (n > WORDS_MAX) errors.push(`${at}: ${n} palavras (máximo ${WORDS_MAX}; ideal até ${WORDS_WARN})`)
    else if (n > WORDS_WARN) warnings.push(`${at}: ${n} palavras (ideal até ${WORDS_WARN})`)
    if (c.revisar) warnings.push(`${at}: marcado para revisão`)
  }
  return { errors, warnings }
}

/** Why the trail can't be published yet, or null. Only trails that carry revisao_pastoral are gated. */
export function pastoralBlock(trilha) {
  if (!('revisao_pastoral' in trilha) || trilha.revisao_pastoral === true) return null
  return 'bloqueado para publicação até a revisão do pastor (marque revisao_pastoral: true no trilha.json)'
}

/** Checks a trail (or some of its days). */
export function validateTrail(t, days, mediaIds) {
  const errors = []
  const warnings = []
  const nums = t.dias.map((d) => d.ref.n)
  if (new Set(nums).size !== nums.length) errors.push(`${t.id}: números de dia repetidos no trilha.json`)
  const want = new Set(days ?? nums)
  for (const d of t.dias) {
    if (!want.has(d.ref.n)) continue
    const where = `${t.id} · Dia ${d.ref.n}`
    if (d.dia && d.dia.n !== d.ref.n) errors.push(`${where}: o arquivo diz n=${d.dia.n}`)
    const r = validateDay(d.dia, mediaIds, where)
    errors.push(...r.errors)
    warnings.push(...r.warnings)
  }
  // A trail that needs the pastor's review (estudo-apocalipse) can't have published days until
  // trilha.json says revisao_pastoral: true (docs/07, Prompt 9).
  const blocked = pastoralBlock(t.trilha)
  if (blocked)
    for (const d of t.dias)
      if (want.has(d.ref.n) && d.dia?.status === 'publicado') errors.push(`${t.id} · Dia ${d.ref.n}: ${blocked}`)
  // The symbols index in trilha.json must match the days.
  for (const s of t.trilha.simbolos ?? []) {
    const d = t.dias.find((x) => x.ref.n === s.dia)?.dia
    if (d && d.simbolo?.id !== s.id) errors.push(`${t.id}: trilha.json diz que o Dia ${s.dia} dá o símbolo "${s.id}", o arquivo diz "${d.simbolo?.id ?? 'nenhum'}"`)
  }
  return { errors, warnings }
}

export function mediaIdSet(path = 'content/midia.json') {
  return new Set(readJson(path).itens.map((m) => m.id))
}

// ---------- Review script (Markdown) ----------

const q = (s) => `"${s}"`
const para = (c) => (c.paragrafos ?? []).join(' ')
const label = (c, fallback) => c.rotulo ?? fallback

/** One card in the review format (same as docs/jesus-em-ordem-dias-01-10/docs/revisao-*.md). */
export function cardMarkdown(c) {
  switch (c.tipo) {
    case 'abertura':
    case 'texto':
    case 'mapa':
      return `**${label(c, c.tipo === 'abertura' ? 'Abertura' : 'Entenda')} · ${c.titulo}** ${para(c)}${c.livros?.length ? ` (Livros: ${c.livros.join(', ')}.)` : ''}`
    case 'movimentos':
      return `**${label(c, 'Entenda')} · ${c.titulo}**\n\n${c.itens.map((i) => `${i.n}. **${i.nome}:** ${i.texto}`).join('\n')}`
    case 'cena':
      return `**Cena · ${c.midia}.** ${c.legenda}${c.referencia ? ` (${c.referencia})` : ''}`
    case 'ordenar':
      return `**${label(c, 'Pratique')} · Ordenar.** ${c.titulo} ${c.itens.join(' → ')}. Acerto: ${q(c.acerto)} Erro: ${q(c.erro)}`
    case 'ligar':
      return `**${label(c, 'Pratique')} · Ligar pares.** ${c.titulo}\n\n${c.pares.map((p) => `- ${p.a} → ${p.b}`).join('\n')}\n\nAcerto: ${q(c.acerto)}`
    case 'palavra':
      return `**Na Palavra · ${c.referencia}.** ${c.resumo} O que observar: ${c.observar}`
    case 'cristo':
      return `**Como aponta para Cristo.** ${c.texto}`
    case 'quiz':
      return `**Fixe.** ${c.pergunta}\n\n${c.opcoes.map((o) => (o.correta ? `- **${o.texto}** (correta)` : `- ${o.texto}`)).join('\n')}\n\nAcerto: ${q(c.acerto)} Erro: ${q(c.erro)}`
    case 'reflexao':
      return `**Reflita.** ${c.pergunta}${c.apoio ? ` ${c.apoio}` : ''}`
    case 'oracao':
      return `**Oração.** ${c.texto}`
    case 'oferta':
      return `**Oferta.** ${c.texto} Botões: ${q(c.botao)} / ${q(c.botaoSecundario)}`
    case 'leitura':
      return `**Leitura · ${c.referencia}.** Botões: "Ler na minha Bíblia" e "Marcar como lido".${c.texto ? ` ${c.texto}` : ''}`
    case 'contexto':
      return `**Onde isso se encaixa.** ${c.texto}`
    case 'observar':
      return `**O que observar.** ${c.texto}`
    case 'pergunta':
      return `**Pergunta para o diário.** ${c.texto}`
    default:
      return `**${c.tipo}** (tipo desconhecido)`
  }
}

export function dayMarkdown(dia) {
  const sub = [dia.passagens ?? dia.leitura ?? dia.base, dia.fase ? `Fase: ${dia.fase}` : dia.lugar && dia.lugar !== dia.base ? `Lugar: ${dia.lugar}` : null].filter(Boolean)
  const lines = [`## Dia ${dia.n} · ${dia.titulo}`, '', `*${sub[0] ?? ''}*${sub[1] ? ` · ${sub[1]}` : ''} · Status: ${dia.status}`, '']
  if (!dia.cards?.length) lines.push('_Ainda sem cards._', '')
  for (const c of dia.cards ?? []) lines.push(cardMarkdown(c), '')
  if (dia.simbolo) lines.push(`**Símbolo desbloqueado · ${dia.simbolo.nome}.** ${dia.simbolo.texto}`, '')
  if (dia.marco) lines.push(`**Marco · ${dia.marco.nome}.** ${dia.marco.texto}`, '')
  return lines.join('\n')
}

/** The review document for a batch of days. */
export function reviewMarkdown(t, days) {
  const list = t.dias.filter((d) => days.includes(d.ref.n) && d.dia)
  const range = days.length === 1 ? `Dia ${days[0]}` : `Dias ${days[0]} a ${days.at(-1)}`
  const out = [
    `# ${t.trilha.titulo} · ${range} · Roteiro para revisão`,
    '',
    `${t.trilha.subtitulo ?? ''}. Cada dia é uma sequência de cards no celular. O app não reproduz o texto bíblico: indica a referência para a pessoa ler na própria Bíblia.`,
    '',
    'Os pontos marcados para atenção do revisor estão no fim do documento.',
    '',
  ]
  for (const d of list) out.push(dayMarkdown(d.dia))
  const flagged = list.flatMap((d) => (d.dia.cards ?? []).filter((c) => c.revisar).map((c) => ({ n: d.dia.n, c })))
  out.push('## Pontos para revisão doutrinária', '')
  if (flagged.length) {
    out.push('| Dia | Card | Trecho |', '| --- | --- | --- |')
    for (const { n, c } of flagged) out.push(`| ${n} | ${c.id} (${c.tipo}) | ${(c.titulo ?? c.pergunta ?? c.referencia ?? cardText(c)).slice(0, 80).replace(/\|/g, '/')} |`)
  } else out.push('Nenhum card foi marcado com "revisar" neste lote.')
  out.push('', '**Perguntas para o revisor**', '', '- Algum card soa estranho para quem acabou de chegar à igreja?', '- O tom das orações combina com a igreja?', '- Há alguma afirmação que tome partido onde as igrejas divergem?', '')
  return out.join('\n')
}

// ---------- Status ----------

/** Sets the status of some days (writes the day files back, keeping 2-space JSON). */
export function setStatus(t, days, status) {
  if (!STATUSES.includes(status)) throw new Error(`status inválido: ${status}`)
  const changed = []
  for (const d of t.dias) {
    if (!days.includes(d.ref.n) || !d.dia) continue
    if (d.dia.status === status) continue
    // status first, as in the day files
    const { status: _old, ...rest } = d.dia
    d.dia = { status, ...rest }
    writeFileSync(d.file, JSON.stringify(d.dia, null, 2) + '\n')
    changed.push(d.ref.n)
  }
  return changed
}

/** The day as the app sees it (Trilha 1 shape): without the status. */
export function assembleTrail(t, { onlyPublished = true } = {}) {
  const { dias: _refs, simbolos: _s, acesso: _a, formato: _f, totalDias: _td, ...meta } = t.trilha
  const dias = t.dias
    .filter((d) => d.dia && (!onlyPublished || d.dia.status === 'publicado'))
    .map((d) => {
      const { status: _st, ...dia } = d.dia
      return dia
    })
  return { ...meta, dias }
}
