import { useRef, useState } from 'react'
import { soundManager } from '../sound/SoundManager'
import { Feedback } from './Feedback'

interface Props {
  opcoes: { texto: string; correta: boolean }[]
  acerto: string
  erro: string
  /** `attempts` counts tries until right (1 = first try). */
  onSolved(firstTry: boolean, attempts: number): void
  solved?: boolean
}

export function QuizActivity({ opcoes, acerto, erro, onSolved, solved = false }: Props) {
  const [wrong, setWrong] = useState<number[]>([])
  const [right, setRight] = useState<number | null>(solved ? opcoes.findIndex((o) => o.correta) : null)
  const firstTry = useRef(true)
  const last: 'good' | 'bad' | null = right !== null ? 'good' : wrong.length ? 'bad' : null

  function choose(i: number) {
    if (right !== null || wrong.includes(i)) return
    if (opcoes[i].correta) {
      setRight(i)
      soundManager.play('correct')
      soundManager.vibrate('correct')
      onSolved(firstTry.current, wrong.length + 1)
    } else {
      firstTry.current = false
      setWrong([...wrong, i])
      soundManager.play('wrong')
      soundManager.vibrate('wrong')
    }
  }

  return (
    <div>
      {opcoes.map((o, i) => {
        const state =
          right === i
            ? 'pulse-ok border-olive bg-olive-soft'
            : wrong.includes(i)
              ? 'border-ember bg-ember-soft'
              : 'border-line bg-card'
        const shaking = right === null && wrong[wrong.length - 1] === i
        return (
          <button
            key={o.texto}
            type="button"
            data-sound="answer"
            onClick={() => choose(i)}
            aria-pressed={right === i || wrong.includes(i)}
            className={`mb-2.5 block min-h-[44px] w-full rounded-btn border-[1.5px] p-4 text-left text-[15px] font-medium leading-[1.4] shadow-pill ${state} ${shaking ? 'shake' : ''}`}
          >
            {o.texto}
          </button>
        )
      })}
      <Feedback kind={last} text={last === 'good' ? acerto : erro} />
    </div>
  )
}
