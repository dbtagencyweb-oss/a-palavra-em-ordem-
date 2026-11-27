import type { ReactNode } from 'react'
import { useFounder } from '../auth/useFounder'
import { TOTAL_DAYS } from '../content'
import { useProgress } from '../store/ProgressContext'
import { NavProfile, NavStudies, PlayIcon, StarIcon } from './icons'

interface Props {
  onCollection(): void
  onBiblia(): void
  onStudies(): void
  guide?: { onCharacters(): void; onContinueJesus(): void }
}

const iconTone = {
  gold: 'icon-3d-gold',
  ember: 'icon-3d-ember',
  olive: 'icon-3d-olive',
  petrol: 'icon-3d-petrol',
  violet: 'icon-3d-violet',
}

type Shortcut = {
  title: string
  description: string
  icon: ReactNode
  tone: keyof typeof iconTone
  action(): void
  testId?: string
}

export function StudyShortcuts({ onCollection, onBiblia, onStudies, guide }: Props) {
  const { progress } = useProgress()
  const founder = useFounder()
  const collection: Shortcut = {
    title: 'Coleção de símbolos', description: `${progress.symbols.length} de ${TOTAL_DAYS} desbloqueados`,
    icon: <StarIcon />, tone: 'gold', action: onCollection,
  }
  const library: Shortcut = {
    title: 'Biblioteca da Bíblia', description: '66 livros, mapa e plano cronológico',
    icon: <NavStudies />, tone: 'ember', action: onBiblia, testId: 'abrir-biblia-em-ordem',
  }
  const studies: Shortcut = {
    title: 'Estudos por livro', description: `Romanos, Salmos e Apocalipse${founder ? ' · Preço de Fundador' : ''}`,
    icon: <NavStudies />, tone: 'olive', action: onStudies, testId: 'abrir-loja-estudos',
  }
  const shortcuts: Shortcut[] = guide ? [
    library,
    studies,
    { title: 'Jesus em Ordem', description: 'Os quatro Evangelhos na sequência dos acontecimentos.', icon: <PlayIcon size={20} />, tone: 'petrol', action: guide.onContinueJesus },
    { title: 'Personagens da Bíblia', description: 'Conheça quem aparece na história e abra as passagens.', icon: <NavProfile />, tone: 'violet', action: guide.onCharacters },
    collection,
  ] : [collection, library, studies]

  return (
    <ul className="mx-5 mb-3 space-y-3">
      {shortcuts.map(({ title, description, icon, tone, action, testId }) => (
        <li key={title}>
          <button type="button" onClick={action} data-testid={guide ? undefined : testId} className="home-tile flex w-full items-center gap-3.5 rounded-btn border border-line bg-card p-3.5 text-left">
            <span className={`icon-3d grid h-11 w-11 flex-none place-items-center rounded-xl ${iconTone[tone]}`} aria-hidden="true">{icon}</span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm">{title}</strong>
              <span className="text-xs text-ink-3">{description}</span>
            </span>
            <span className="text-ink-3" aria-hidden="true">›</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
