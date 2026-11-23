import { useId } from 'react'
import type { CardOf, CardProps } from './types'

export function ReflexaoCard({ card, api }: CardProps<CardOf<'reflexao'>>) {
  const id = useId()
  return (
    <>
      <h2 className="mb-4 text-2xl">
        <label htmlFor={id}>{card.pergunta}</label>
      </h2>
      {card.apoio && <p className="-mt-1.5 mb-3.5 text-[14.5px] text-ink-2">{card.apoio}</p>}
      <textarea
        id={id}
        defaultValue={api.reflection}
        onChange={(e) => api.setReflection(e.target.value)}
        placeholder="Escreva com suas palavras..."
        className="min-h-[130px] w-full resize-none rounded-btn border-[1.5px] border-line bg-card p-4 font-serif text-lg leading-normal text-ink outline-none focus:border-ink"
      />
      <p className="mt-2 text-[12.5px] text-ink-3">Isso vai para o seu Diário Espiritual.</p>
    </>
  )
}
