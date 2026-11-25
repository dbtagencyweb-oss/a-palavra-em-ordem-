// The trails the app knows, behind one shape so the lesson, chapter opener and conclusion screens
// work for any of them.
//  - Trilha 1 (mapa-7-dias, free): bundled with the app (content/index.ts).
//  - Trilha 2 (jesus-em-ordem, paid): only its outline (titles, passages, status, symbols) is
//    bundled. The lessons themselves come from the server (premium_lessons, only for people with
//    access); in development they are read from content/trilhas/jesus-em-ordem/ instead.
import { fetchPremiumLesson } from '../access/premium'
import type { ContentKey } from '../access/rules'
import { eraOf, type Era } from '../ui/eras'
import { getDay as getMainDay, lessonStatus, livros, trilha as mainTrail } from './index'
import type { Dia, LessonStatus, Simbolo } from './types'
import outlines, { studyMetas } from 'virtual:trail-outlines'
import jesusMeta from '../../content/trilhas/jesus-em-ordem/trilha.json'
import planoBiblia from '../../content/trilhas/biblia-em-ordem/plano.json'

export interface DayOutline {
  n: number
  titulo: string
  formato?: 'trilha' | 'leitura-guiada'
  capitulos?: { livro: string; de: number; ate: number }[]
  /** Bible passages of the day (Trilha 2) or the base (Trilha 1). */
  passagens?: string
  /** Phase of the story (Trilha 2) or place (Trilha 1). */
  fase?: string
  status: LessonStatus
  simbolo?: Simbolo
  marcoLinhaDoTempo?: string
  /** The day's own cover (public path to the 800×800 WebP; a 400×400 "-400" version sits beside it). */
  capa?: string
}

export interface Trail {
  id: string
  /** What unlocks it (null = free). */
  content: ContentKey
  titulo: string
  subtitulo: string
  /** Every day of the trail (including unpublished ones in development). */
  outline: DayOutline[]
  /** Days users can open: published ones (all of them in development). */
  visible: DayOutline[]
  total: number
  /** "5 a 7 minutos por dia" under the chapter opener's button. */
  duracao: string
  /** "do mapa" / "da trilha", for "3 de 7 do mapa". */
  ofWhat: string
  era(n: number): Era
  /** Picture behind the chapter opener and the conclusion. */
  backdrop(n: number): string
  /** Timeline milestones, when the trail has them (Trilha 2). */
  timeline: string[]
  /** The full lesson. Sync for bundled trails, async for paid ones. */
  loadDay(n: number): Promise<Dia | null>
}

const showAll = import.meta.env.DEV

// ---------- Trilha 1 ----------

export const MAPA: Trail = {
  id: 'mapa-7-dias',
  content: 'trilha-mapa-7-dias',
  titulo: mainTrail.titulo,
  subtitulo: mainTrail.subtitulo,
  outline: mainTrail.dias.map((d) => ({ n: d.n, titulo: d.titulo, passagens: d.base, fase: d.lugar, status: lessonStatus(d.n) ?? 'publicado', simbolo: d.simbolo })),
  get visible() {
    return this.outline
  },
  total: mainTrail.dias.length,
  duracao: mainTrail.duracaoPorDia,
  ofWhat: 'do mapa',
  era: eraOf,
  backdrop: (n) => `era-d${n}`,
  timeline: [],
  loadDay: async (n) => getMainDay(n),
}

// ---------- Trilha 2: Jesus em Ordem ----------

// Only the outline of each day is bundled (built by the trail-outlines plugin in vite.config.ts).
const jesusRefs = (jesusMeta as { dias: { n: number; arquivo: string }[] }).dias
const jesusOutline = (outlines['jesus-em-ordem'] ?? []) as DayOutline[]

async function loadJesusDay(n: number): Promise<Dia | null> {
  const ref = jesusRefs.find((d) => d.n === n)
  if (!ref) return null
  if (import.meta.env.DEV) {
    // Development: the local files (this branch is removed from production builds).
    const files = import.meta.glob<{ default: Dia & { status: LessonStatus } }>('../../content/trilhas/jesus-em-ordem/dia-*.json')
    const load = files[`../../content/trilhas/jesus-em-ordem/${ref.arquivo}`]
    if (load) {
      const { status: _s, ...day } = (await load()).default
      return day as Dia
    }
  }
  const day = await fetchPremiumLesson<Dia & { status?: LessonStatus }>('trilha-jesus-em-ordem', n)
  if (!day) return null
  const { status: _s, ...rest } = day
  return rest as Dia
}

// Galilee blue for the ministry; Jerusalem colors for the last week (days 27 to 30).
const JERUSALEM_FROM = 27

export const JESUS: Trail = {
  id: 'jesus-em-ordem',
  content: 'trilha-jesus-em-ordem',
  titulo: jesusMeta.titulo,
  subtitulo: jesusMeta.subtitulo,
  outline: jesusOutline,
  visible: jesusOutline.filter((d) => showAll || d.status === 'publicado'),
  total: jesusOutline.length,
  duracao: mainTrail.duracaoPorDia,
  ofWhat: 'da trilha',
  era: (n) => eraOf(n >= JERUSALEM_FROM ? 5 : 6),
  backdrop: () => 'capa-jesus-em-ordem',
  timeline: (jesusMeta as { linhaDoTempo?: string[] }).linhaDoTempo ?? [],
  loadDay: loadJesusDay,
}

export const TRAILS: Record<string, Trail> = { [MAPA.id]: MAPA, [JESUS.id]: JESUS }
export const trailById = (id: string | undefined): Trail => (id && TRAILS[id]) || MAPA

// ---------- A Bíblia em Ordem (leitura guiada, in monthly stages) ----------
// Days are numbered across the whole plan: Etapa 1 is days 1–30, Etapa 2 starts at 31, and so on.
// A stage shows up once it has publicadaEm in plano.json (every stage in development).

export interface Etapa {
  n: number
  id: string
  nome: string
  livros: string
  publicadaEm: string | null
  previsao: string | null
  /** First global day number of the stage, and its days (outline). */
  offset: number
  dias: DayOutline[]
  aberta: boolean
}

const livroEra = new Map(livros.map((l) => [l.id, (l as { era?: number }).era ?? 1]))
const livroNome = new Map(livros.map((l) => [l.id, l.nome]))
export const TOTAL_CHAPTERS = livros.reduce((s, l) => s + l.capitulos, 0)

let offset = 0
export const ETAPAS: Etapa[] = (planoBiblia.etapas as Omit<Etapa, 'offset' | 'dias' | 'aberta'>[]).map((e) => {
  const local = (outlines[`biblia-em-ordem/${e.id}`] ?? []) as DayOutline[]
  const dias = local.map((d) => ({ ...d, n: offset + d.n, fase: e.nome }))
  const etapa: Etapa = { ...e, offset, dias, aberta: dias.length > 0 && (showAll || e.publicadaEm !== null) }
  offset += local.length
  return etapa
})

const bibliaOutline = ETAPAS.flatMap((e) => e.dias)
const bookOfDay = (n: number) => bibliaOutline.find((d) => d.n === n)?.capitulos?.[0]?.livro
/** Book and era of a day of the plan (the review day uses the previous reading). */
export function bibliaPlace(n: number): { livro: string; nome: string; era: number } | null {
  for (let k = n; k >= 1; k--) {
    const id = bookOfDay(k)
    if (id) return { livro: id, nome: livroNome.get(id) ?? id, era: livroEra.get(id) ?? 1 }
  }
  return null
}
/** Chapters covered by a day. */
export const chaptersOfDay = (d: DayOutline) => (d.capitulos ?? []).reduce((s, c) => s + (c.ate - c.de + 1), 0)

async function loadBibliaDay(n: number): Promise<Dia | null> {
  const etapa = ETAPAS.find((e) => e.dias.some((d) => d.n === n))
  if (!etapa) return null
  const local = n - etapa.offset
  if (import.meta.env.DEV) {
    const files = import.meta.glob<{ default: Dia & { status: LessonStatus } }>('../../content/trilhas/biblia-em-ordem/*/dia-*.json')
    const load = files[`../../content/trilhas/biblia-em-ordem/${etapa.id}/dia-${String(local).padStart(2, '0')}.json`]
    if (load) {
      const { status: _s, ...day } = (await load()).default
      return { ...(day as Dia), n }
    }
  }
  const day = await fetchPremiumLesson<Dia & { status?: LessonStatus }>('biblia-em-ordem', n)
  if (!day) return null
  const { status: _s, ...rest } = day
  return { ...(rest as Dia), n }
}

export const BIBLIA: Trail = {
  id: 'biblia-em-ordem',
  content: 'biblia-em-ordem',
  titulo: planoBiblia.titulo,
  subtitulo: planoBiblia.subtitulo,
  outline: bibliaOutline,
  visible: ETAPAS.filter((e) => e.aberta).flatMap((e) => e.dias.filter((d) => showAll || d.status === 'publicado')),
  total: bibliaOutline.length,
  duracao: 'A leitura do dia e alguns minutos de guia',
  ofWhat: 'do plano',
  era: (n) => eraOf(bibliaPlace(n)?.era ?? 1),
  backdrop: (n) => `era-d${bibliaPlace(n)?.era ?? 1}`,
  timeline: [],
  loadDay: loadBibliaDay,
}
TRAILS[BIBLIA.id] = BIBLIA

// ---------- Estudos por livro (docs/07, Prompt 9) ----------
// Each study is a paid trail of its own (content/trilhas/estudo-<nome>/), sold one by one in the
// Loja de estudos. Only the descriptive trilha.json (title, description, price, cover) and the
// day outline are bundled; the lessons come from premium_lessons, like the other paid trails.

export interface StudyMeta {
  id: string
  titulo: string
  subtitulo: string
  descricao: string
  capa: string
  /** Full price in reais. */
  preco: number
  totalDias: number
  /** Book id in livros.json (era and colors). */
  livro?: string
  revisao_pastoral?: boolean
  /** The reward when every lesson is done: a message on a scroll, and a seal. */
  conclusao?: { selo: string; titulo: string; mensagem: string; referencia: string }
}

function loadStudyDay(id: string) {
  return async (n: number): Promise<Dia | null> => {
    if (import.meta.env.DEV) {
      const files = import.meta.glob<{ default: Dia & { status: LessonStatus } }>('../../content/trilhas/estudo-*/dia-*.json')
      const load = files[`../../content/trilhas/${id}/dia-${String(n).padStart(2, '0')}.json`]
      if (load) {
        const { status: _s, ...day } = (await load()).default
        return day as Dia
      }
    }
    const day = await fetchPremiumLesson<Dia & { status?: LessonStatus }>(id as ContentKey, n)
    if (!day) return null
    const { status: _s, ...rest } = day
    return rest as Dia
  }
}

function studyTrail(meta: StudyMeta): Trail {
  const outline = (outlines[meta.id] ?? []) as DayOutline[]
  const era = livroEra.get(meta.livro ?? '') ?? 7
  return {
    id: meta.id,
    content: meta.id as ContentKey,
    titulo: meta.titulo,
    subtitulo: meta.subtitulo,
    outline,
    visible: outline.filter((d) => showAll || d.status === 'publicado'),
    total: outline.length,
    duracao: mainTrail.duracaoPorDia,
    ofWhat: 'do estudo',
    era: () => eraOf(era),
    backdrop: () => meta.capa,
    timeline: [],
    loadDay: loadStudyDay(meta.id),
  }
}

/** The studies, in the order of docs/06 (Romanos, Salmos, Apocalipse). */
const STUDY_ORDER = ['estudo-romanos', 'estudo-salmos', 'estudo-apocalipse']
export const STUDIES: { meta: StudyMeta; trail: Trail }[] = (Object.values(studyMetas) as StudyMeta[])
  .sort((a, b) => (STUDY_ORDER.indexOf(a.id) + 1 || 99) - (STUDY_ORDER.indexOf(b.id) + 1 || 99))
  .map((meta) => ({ meta, trail: studyTrail(meta) }))
for (const s of STUDIES) TRAILS[s.trail.id] = s.trail
export const isStudy = (id: string | undefined) => Boolean(id?.startsWith('estudo-'))

/** A picture as its full file and a small version. */
export interface Picture {
  full: string
  small: string
}

/**
 * The pictures to try for a day, best first: the day's own cover, then the trail's cover. A screen
 * shows the first that loads; if none loads, only its background color (never a file name).
 */
export function dayCovers(trail: Trail, n: number, shape: 'square' | 'tall' = 'square'): Picture[] {
  const out: Picture[] = []
  const capa = trail.outline.find((d) => d.n === n)?.capa
  // Tall screens (the day's opener) take the vertical version (720×1280, 540×960) first.
  if (capa && shape === 'tall') out.push({ full: capa.replace(/\.webp$/, '-vertical.webp'), small: capa.replace(/\.webp$/, '-vertical-540.webp') })
  if (capa) out.push({ full: capa, small: capa.replace(/\.webp$/, '-400.webp') })
  const id = trail.backdrop(n)
  out.push({ full: `/media/img/${id}.webp`, small: `/media/img/${id}-540.webp` })
  return out
}
