import { useState } from 'react'
import { trilha, ui } from '../content'
import { characterEras, findCharacters, type CharacterTestament } from '../content/characters'
import { isDayUnlocked } from '../game/progress'
import { useProgress } from '../store/ProgressContext'
import { PassageLink } from '../ui/PassageLink'
import { BackIcon } from '../ui/icons'
import { StudyShortcuts } from '../ui/StudyShortcuts'

const t = ui.guiaVerbo
const testaments = { AT: 'Antigo Testamento', NT: 'Novo Testamento' } as const
const filters: { id: CharacterTestament | ''; name: string }[] = [
  { id: '', name: 'Todos' },
  { id: 'AT', name: testaments.AT },
  { id: 'NT', name: testaments.NT },
]
const fieldClass = 'min-h-11 w-full rounded-btn border border-line bg-card px-3 text-ink shadow-sm'

interface Props {
  onOpenDay(n: number): void
  onCollection(): void
  onBiblia(): void
  onStudies(): void
  onContinueJesus(): void
}

export function GuideScreen({ onOpenDay, onCollection, onBiblia, onStudies, onContinueJesus }: Props) {
  const { progress, today } = useProgress()
  const [showCharacters, setShowCharacters] = useState(false)
  const [query, setQuery] = useState('')
  const [testament, setTestament] = useState<CharacterTestament | ''>('')
  const [era, setEra] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const matches = findCharacters(query, testament, era)

  if (!showCharacters) {
    return (
      <section key="studies" className="screen pb-[calc(84px+env(safe-area-inset-bottom))]">
        <header className="px-5 pb-4 pt-6">
          <h1 className="text-[30px]">Estudos bíblicos</h1>
          <p className="mt-2 text-sm leading-normal text-ink-2">Consulte os livros e personagens da Bíblia ou escolha uma trilha para estudar.</p>
        </header>
        <StudyShortcuts onCollection={onCollection} onBiblia={onBiblia} onStudies={onStudies} guide={{ onCharacters: () => setShowCharacters(true), onContinueJesus }} />
        <details className="mx-5 mb-5 mt-1 rounded-btn border border-line bg-card px-3.5">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{t.titulo} · {t.emBreve}</summary>
          <p role="note" className="pb-3 text-xs leading-relaxed text-ink-2">{t.aviso}</p>
          <ul className="space-y-1 pb-3 text-sm text-ink-2">
            {t.comandos.map((command) => <li key={command}>{command}</li>)}
          </ul>
        </details>
      </section>
    )
  }

  return (
    <section key="characters" className="screen pb-[calc(84px+env(safe-area-inset-bottom))]">
      <header className="px-5 pb-4 pt-2">
        <button type="button" onClick={() => setShowCharacters(false)} className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-btn px-2 text-sm font-semibold text-ink-2">
          <BackIcon size={16} /> Voltar aos estudos
        </button>
        <h1 className="text-[30px]">Personagens da Bíblia</h1>
        <p className="mt-2 text-sm leading-normal text-ink-2">Encontre quem você ouviu mencionar e veja onde sua história aparece na Bíblia.</p>
      </header>
      <div className="space-y-2.5 px-5">
        <label className="block">
          <span className="sr-only">Buscar personagem</span>
          <input type="search" className={fieldClass} placeholder="Ex. João, Saulo ou Moisés" value={query} onChange={(event) => {
            setQuery(event.target.value)
            setOpenId(null)
          }} />
        </label>
        <div role="group" aria-label="Testamento" className="grid grid-cols-3 gap-1.5">
          {filters.map(({ id, name }) => (
            <button key={name} type="button" aria-pressed={testament === id} className={`min-h-11 rounded-btn border px-1 text-xs font-semibold ${testament === id ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink-2'}`} onClick={() => {
              setTestament(id)
              setOpenId(null)
            }}>{name}</button>
          ))}
        </div>
        <label className="block">
          <span className="sr-only">Era bíblica</span>
          <select value={era} onChange={(event) => {
            setEra(event.target.value)
            setOpenId(null)
          }} className={`${fieldClass} text-sm`}>
            <option value="">Todas as eras</option>
            {characterEras.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>
      <p role="status" className="px-5 pb-2 pt-4 text-xs text-ink-2">
        {matches.length === 1 ? '1 personagem encontrado' : `${matches.length} personagens encontrados`}
      </p>
      {matches.length ? (
        <ol className="space-y-2 px-5">
          {matches.map((character) => {
            const expanded = openId === character.id
            const detailId = `personagem-${character.id}`
            const day = trilha.dias.find(({ n }) => n === character.dia)
            return (
              <li key={character.id} className="rounded-card border border-line bg-card shadow-[0_3px_9px_rgba(45,34,22,.07)]">
                <button type="button" aria-expanded={expanded} aria-controls={detailId} className="flex min-h-14 w-full items-center gap-3 rounded-card px-3.5 py-3 text-left" onClick={() => setOpenId(expanded ? null : character.id)}>
                  <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display text-base ${character.testamento === 'AT' ? 'bg-gold-soft text-gold-ink' : 'bg-olive-soft text-olive'}`}>{character.nome[0]}</span>
                  <span className="min-w-0 flex-1">
                    <strong className="block font-display text-lg leading-tight">{character.nome}</strong>
                    <span className="mt-0.5 block text-xs leading-snug text-ink-2">{character.descricao}</span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-lg leading-none text-gold-ink">{expanded ? '−' : '+'}</span>
                </button>
                <div id={detailId} hidden={!expanded} className="border-t border-line px-3.5 pb-3.5 pt-3">
                  {expanded && (
                    <>
                      <p className="text-xs font-semibold text-gold-ink">{testaments[character.testamento]} · {character.era}</p>
                      {!!character.outrosNomes?.length && <p className="mt-1 text-xs text-ink-2">Também encontrado como {character.outrosNomes.join(', ')}</p>}
                      <p className="mt-2 text-sm leading-relaxed">{character.resumo}</p>
                      <h2 className="mb-1.5 mt-4 text-base">Por onde começar a ler</h2>
                      <ul className="space-y-1.5">
                        {character.passagens.map(({ referencia, titulo }) => (
                          <li key={referencia}>
                            <PassageLink reference={referencia} className="min-h-11 w-full rounded-btn border border-line bg-paper px-3 py-2 text-left text-sm font-semibold text-ember-ink">
                              {`${referencia} · ${titulo}`}
                            </PassageLink>
                          </li>
                        ))}
                      </ul>
                      {day && (
                        <div className="mt-3 border-t border-line pt-2 text-xs text-ink-2">
                          <p>Na Jornada · Dia {day.n} · {day.lugar}</p>
                          {isDayUnlocked(progress, day.n, today) && <button type="button" onClick={() => onOpenDay(day.n)} className="min-h-11 text-sm font-semibold text-ember-ink">Abrir lição do Dia {day.n}</button>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="mx-5 rounded-btn bg-card px-4 py-5 text-center text-sm text-ink-2">Nenhuma ficha corresponde a essa busca. Tente outro nome ou ajuste os filtros.</p>
      )}
    </section>
  )
}
