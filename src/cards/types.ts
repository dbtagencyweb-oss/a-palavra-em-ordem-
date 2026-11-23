import type { Card, CardType } from '../content/types'

/** What a card can ask of the lesson engine. */
import type { Era } from '../ui/eras'

export interface LessonApi {
  dayN: number
  /** Colors of the lesson's era (depends on the trail and the day). */
  era: Era
  /** True when the user comes back to an activity already solved in this lesson. */
  solved: boolean
  /** Text already written in this reflection card (when coming back to it). */
  reflection: string
  /** Interactive cards call this once solved; `firstTry` earns the +10 steps bonus. */
  solve(firstTry: boolean, attempts?: number): void
  /** Reflection cards keep the current draft here; it goes to the Diary on "continue". */
  setReflection(text: string): void
  openOffer(): void
  next(): void
  /** "Marcar como lido" (leitura guiada): completes the day now, so it counts for the lamp. */
  markRead(): void
  /** True once the reading of this lesson was marked as read. */
  read: boolean
}

export interface CardProps<C extends Card = Card> {
  card: C
  api: LessonApi
}

export type CardOf<T extends CardType> = Extract<Card, { tipo: T }>

/** Card types that must be solved before "Continuar" is enabled. */
export const INTERACTIVE_TYPES: ReadonlySet<CardType> = new Set(['ordenar', 'ligar', 'quiz', 'leitura'])

/** Fixed labels for card types whose JSON has no "rotulo". */
export const DEFAULT_LABEL: Partial<Record<CardType, string>> = {
  cristo: 'Como aponta para Cristo',
  oferta: 'Próxima trilha',
  cena: 'Cena',
  leitura: 'Leitura do dia',
  contexto: 'Onde isso se encaixa',
  observar: 'O que observar',
  pergunta: 'Para o seu diário',
}

/** Cards that switch the lesson to the dark "cinema" look. */
export function isCinema(card: Card): boolean {
  return card.tipo === 'cena' || card.tipo === 'oracao' || (card.tipo === 'abertura' && Boolean(card.midia))
}
