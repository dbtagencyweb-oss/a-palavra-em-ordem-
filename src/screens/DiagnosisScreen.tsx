import { useState } from 'react'
import { ui } from '../content'
import { OnboardingTop } from '../ui/TopBar'

interface Props {
  initial: string | null
  onBack(): void
  onNext(optionId: string): void
}

export function DiagnosisScreen({ initial, onBack, onNext }: Props) {
  const [selected, setSelected] = useState<string | null>(initial)
  const t = ui.diagnostico
  return (
    <section className="screen">
      <OnboardingTop step={1} onBack={onBack} />
      <div className="px-6 pt-[18px]">
        <h2 className="mb-2 text-[27px]">{t.titulo}</h2>
        <p className="mb-[22px] text-[14.5px] text-ink-2">{t.texto}</p>
        <div role="radiogroup" aria-label={t.titulo}>
          {t.opcoes.map((o) => {
            const sel = o.id === selected
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => setSelected(o.id)}
                className={`mb-2.5 flex w-full items-center gap-3.5 rounded-btn border-[1.5px] p-4 text-left text-[15px] font-medium transition-colors ${
                  sel ? 'border-ink bg-white' : 'border-line bg-card'
                }`}
              >
                <span
                  className={`grid h-5 w-5 flex-none place-items-center rounded-full border-[1.5px] ${
                    sel ? 'border-ink bg-ink' : 'border-ink-3'
                  }`}
                >
                  {sel && <span className="h-[7px] w-[7px] rounded-full bg-paper" />}
                </span>
                {o.texto}
              </button>
            )
          })}
        </div>
      </div>
      <div className="footer-fade sticky bottom-0 mt-auto px-6 pb-6 pt-4">
        <button
          type="button"
          className="btn"
          disabled={!selected}
          onClick={() => selected && onNext(selected)}
        >
          Continuar
        </button>
      </div>
    </section>
  )
}
