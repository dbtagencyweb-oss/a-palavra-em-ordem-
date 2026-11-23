// Cards of the "leitura guiada" format (A Bíblia em Ordem): the reading of the day (read in the
// person's own Bible, then "Marcar como lido"), where it fits, what to observe and one question
// that goes to the Diary. "Como aponta para Cristo" uses the existing CristoCard.
import { useId } from 'react'
import { trilha } from '../content'
import { buildReadingLink } from '../content/readingLink'
import { CheckIcon } from '../ui/icons'
import type { CardOf, CardProps } from './types'

export function LeituraCard({ card, api }: CardProps<CardOf<'leitura'>>) {
  const link = buildReadingLink(card.referencia, trilha.linkLeitura.modelo)
  const done = api.read || api.solved
  return (
    <>
      <h2 className="mb-2 font-display text-[34px] leading-tight">{card.referencia}</h2>
      {card.texto && <p className="mb-4 font-serif text-[17px] leading-normal text-ink-2">{card.texto}</p>}
      <p className="mb-5 text-[14.5px] text-ink-2">Leia na sua Bíblia, no seu ritmo. Depois volte e marque como lido.</p>
      <div className="grid gap-2.5">
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !bg-card !text-ink ring-1 ring-line">
            Ler na minha Bíblia
          </a>
        )}
        <button
          type="button"
          data-sound="correct"
          onClick={() => !done && api.markRead()}
          aria-pressed={done}
          className={`btn ${done ? 'btn-ghost !bg-olive !text-white' : ''}`}
        >
          {done ? (
            <span className="inline-flex items-center gap-2">
              <CheckIcon size={20} className="text-white" /> Lido
            </span>
          ) : (
            'Marcar como lido'
          )}
        </button>
      </div>
      <p className="mt-3 min-h-[1.5em] text-center text-[13px] text-olive" role="status">
        {done ? 'Leitura registrada. Sua lâmpada está acesa hoje.' : ''}
      </p>
    </>
  )
}

export function ContextoCard({ card }: CardProps<CardOf<'contexto'>>) {
  return <p className="font-serif text-[19px] leading-relaxed text-ink">{card.texto}</p>
}

export function ObservarCard({ card }: CardProps<CardOf<'observar'>>) {
  return (
    <div className="rounded-card border-l-4 border-gold bg-card p-5 shadow-card">
      <p className="font-serif text-[18px] leading-relaxed text-ink">{card.texto}</p>
    </div>
  )
}

export function PerguntaCard({ card, api }: CardProps<CardOf<'pergunta'>>) {
  const id = useId()
  return (
    <>
      <h2 className="mb-4 text-2xl">
        <label htmlFor={id}>{card.texto}</label>
      </h2>
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
