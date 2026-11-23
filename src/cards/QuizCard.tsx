import { QuizActivity } from '../activities/QuizActivity'
import type { CardOf, CardProps } from './types'

export function QuizCard({ card, api }: CardProps<CardOf<'quiz'>>) {
  return (
    <>
      <h2 className="mb-4 text-[23px]">{card.pergunta}</h2>
      <QuizActivity opcoes={card.opcoes} acerto={card.acerto} erro={card.erro} onSolved={api.solve} solved={api.solved} />
    </>
  )
}
