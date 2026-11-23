import trilhaMeta from '../../content/trilhas/mapa-7-dias/trilha.json'
import livrosJson from '../../content/livros.json'
import interfaceJson from '../../content/interface.json'
import midiaJson from '../../content/midia.json'
import type { Dia, InterfaceText, LessonStatus, Livro, Trilha } from './types'

// Trilha 1 lives one lesson per file (content/trilhas/mapa-7-dias/dia-XX.json), each with a status.
// The app shows only published lessons; in development it shows all of them, with a status strip.
const dayFiles = import.meta.glob<{ default: Dia & { status: LessonStatus } }>('../../content/trilhas/mapa-7-dias/dia-*.json', { eager: true })
const byFile = new Map(Object.entries(dayFiles).map(([path, mod]) => [path.split('/').at(-1)!, mod.default]))
const showAll = import.meta.env.DEV
const statusByDay = new Map<number, LessonStatus>()

function assemble(): Trilha {
  const { dias: refs, ...meta } = trilhaMeta as unknown as Omit<Trilha, 'dias'> & { dias: { n: number; arquivo: string }[] }
  const dias: Dia[] = []
  for (const ref of refs) {
    const file = byFile.get(ref.arquivo)
    if (!file) continue
    const { status, ...dia } = file
    statusByDay.set(dia.n, status)
    if (showAll || status === 'publicado') dias.push(dia)
  }
  return { ...meta, dias }
}

export const trilha = assemble()

/** Review status of a lesson (always 'publicado' for what users see outside development). */
export function lessonStatus(n: number): LessonStatus | undefined {
  return statusByDay.get(n)
}
export const livros = (livrosJson as unknown as { livros: Livro[] }).livros
export const ui = interfaceJson as unknown as InterfaceText

export const TOTAL_DAYS = trilha.dias.length

export function getDay(n: number): Dia {
  const day = trilha.dias.find((d) => d.n === n)
  if (!day) throw new Error(`Day ${n} not found in trilha ${trilha.id}`)
  return day
}

export interface MidiaItem {
  id: string
  tipo: 'video' | 'imagem' | 'simbolo' | 'fundo'
  dia?: number
  ambiente?: string
}
export const midia = (midiaJson as unknown as { itens: MidiaItem[] }).itens
const midiaById = new Map(midia.map((m) => [m.id, m]))
export function getMidia(id: string): MidiaItem | undefined {
  return midiaById.get(id)
}

const livroById = new Map(livros.map((l) => [l.id, l]))
export function getLivro(id: string): Livro | undefined {
  return livroById.get(id)
}
