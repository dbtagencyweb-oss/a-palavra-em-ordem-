import { useState } from 'react'
import { track } from '../analytics/track'
import { ui } from '../content'
import type { DiaryEntry } from '../game/progress'
import { useProgress } from '../store/ProgressContext'
import { useToast } from '../ui/Toast'

const t = ui.diario
const labelOf = (key: string) => t.campos.find((c) => c.id === key)?.rotulo

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

export function DiaryScreen() {
  const { progress, addDiaryEntry } = useProgress()
  const toast = useToast()
  const [tab, setTab] = useState<'list' | 'new'>('list')
  const [draft, setDraft] = useState<Record<string, string>>({})

  function save() {
    const fields = Object.fromEntries(
      Object.entries(draft)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v),
    )
    if (!Object.keys(fields).length) return toast('Escreva em pelo menos um campo')
    addDiaryEntry(t.etiquetaLivre, fields)
    track('diary_entry_saved', { origem: 'diario' })
    setDraft({})
    setTab('list')
    toast('Registro salvo')
  }

  return (
    <section className="screen pb-[calc(84px+env(safe-area-inset-bottom))]">
      <header className="px-5 pb-2 pt-[22px]">
        <h2 className="text-[26px]">{t.titulo}</h2>
        <p className="mt-1.5 text-sm leading-normal text-ink-2">{t.texto}</p>
      </header>

      <div className="mx-5 mb-4 mt-1 flex rounded-xl bg-paper-2 p-1" role="tablist">
        {(['list', 'new'] as const).map((id, i) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-[44px] flex-1 rounded-[9px] text-[13px] font-bold ${
              tab === id ? 'bg-card text-ink shadow-[0_1px_3px_rgba(0,0,0,.08)]' : 'text-ink-2'
            }`}
          >
            {t.abas[i]}
          </button>
        ))}
      </div>

      {tab === 'list' ? (
        progress.diary.length === 0 ? (
          <p className="mx-5 my-2.5 rounded-btn border-[1.5px] border-dashed border-line p-6 text-center text-sm text-ink-3">{t.vazio}</p>
        ) : (
          <ul className="pb-6">
            {progress.diary.map((e) => (
              <Entry key={e.id} entry={e} />
            ))}
          </ul>
        )
      ) : (
        <form
          className="pb-6"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          {t.campos.map((c) => (
            <div key={c.id} className="mx-5 mb-3.5">
              <label htmlFor={`f-${c.id}`} className="mb-1.5 block text-[13px] font-bold">
                {c.pergunta}
              </label>
              <textarea
                id={`f-${c.id}`}
                value={draft[c.id] ?? ''}
                onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value })}
                className="min-h-[64px] w-full resize-none rounded-btn border-[1.5px] border-line bg-card px-3.5 py-3 font-serif text-[16.5px] leading-normal text-ink outline-none focus:border-ink"
              />
            </div>
          ))}
          <div className="px-5 pt-1">
            <button type="submit" className="btn">
              {t.botao}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function Entry({ entry }: { entry: DiaryEntry }) {
  const isReflection = 'pergunta' in entry.fields
  return (
    <li className="mx-5 mb-2.5 rounded-btn border border-line bg-card p-4">
      <div className="mb-2 flex justify-between text-[11.5px] font-bold uppercase tracking-[0.06em] text-ink-3">
        <span className="text-gold-ink">{entry.tag}</span>
        <span>{formatDate(entry.createdAt)}</span>
      </div>
      {isReflection ? (
        <p className="font-serif text-[16.5px] leading-normal">
          <i className="block font-sans text-xs font-bold not-italic text-ink-3">{entry.fields.pergunta}</i>
          {entry.fields.resposta}
        </p>
      ) : (
        Object.entries(entry.fields).map(([k, v]) => (
          <p key={k} className="font-serif text-[16.5px] leading-normal [&+p]:mt-1.5">
            <i className="block font-sans text-xs font-bold not-italic text-ink-3">{labelOf(k) ?? k}</i>
            {v}
          </p>
        ))
      )}
    </li>
  )
}
