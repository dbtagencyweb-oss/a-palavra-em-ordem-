import { trilha, ui } from '../content'
import { eraOf } from '../ui/eras'
import { JourneyMedal } from '../ui/JourneyMedal'
import { OnboardingTop } from '../ui/TopBar'

interface Props {
  diagnosis: string | null
  onBack(): void
  onStart(): void
}

export function RecommendationScreen({ diagnosis, onBack, onStart }: Props) {
  const opts = ui.diagnostico.opcoes
  const o = opts.find((x) => x.id === diagnosis) ?? opts[0]
  return (
    <section className="screen">
      <OnboardingTop step={2} onBack={onBack} />
      <div className="px-6 pt-[18px]">
        <div className="eyebrow">Seu ponto de partida</div>
        <h2 className="mb-2.5 mt-2 text-[27px]">{o.recTitulo}</h2>
        <p className="mb-[22px] font-serif text-[17.5px] leading-normal text-ink-2">{o.recTexto}</p>
        <div className="rounded-card border border-line bg-card px-4 py-5 shadow-[0_4px_12px_rgba(46,34,20,0.10),0_16px_28px_-14px_rgba(46,34,20,0.24)]">
          <div className="eyebrow !text-ember-ink">Trilha 1 · grátis</div>
          <h3 className="mt-1.5 text-[21px]">{trilha.titulo}</h3>
          <p className="mt-1 text-[13.5px] text-ink-2">{trilha.duracaoPorDia} por dia</p>
          <ol className="mt-4 space-y-1.5">
            {trilha.dias.map((day) => {
              const era = eraOf(day.n)
              return (
                <li
                  key={day.n}
                  className="flex min-h-[56px] items-center gap-2.5 rounded-xl border px-2.5 py-2"
                  style={{
                    background: `linear-gradient(105deg, ${era.light}77, transparent 86%)`,
                    borderColor: `${era.mid}36`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="isolate grid h-9 w-9 flex-none place-items-center rounded-full border shadow-sm"
                    style={{ background: `linear-gradient(145deg, ${era.mid}, ${era.deep})`, borderColor: era.mid }}
                  >
                    <span className="h-7 w-7 mix-blend-luminosity"><JourneyMedal id={day.simbolo.midia} n={day.n} /></span>
                  </span>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase leading-tight tracking-[0.08em]" style={{ color: era.deep }}>
                      Dia {day.n} · {day.lugar}
                    </span>
                    <strong className="mt-0.5 block text-[13.5px] font-semibold leading-snug text-ink">{day.titulo}</strong>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
      <div className="footer-fade sticky bottom-0 mt-auto px-6 pb-6 pt-4">
        <button type="button" className="btn btn-ember" onClick={onStart}>
          Começar o Dia 1
        </button>
      </div>
    </section>
  )
}
