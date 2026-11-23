import { trilha, ui } from '../content'
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
        <div className="rounded-card border border-line bg-card p-[22px] shadow-card">
          <div className="eyebrow !text-ember-ink">Trilha 1 · grátis</div>
          <h3 className="mt-1.5 text-[21px]">{trilha.titulo}</h3>
          <p className="mt-1 text-[13.5px] text-ink-2">{trilha.duracaoPorDia} por dia</p>
          <ol className="mt-4">
            {trilha.dias.map((d) => (
              <li key={d.n} className="flex items-center gap-3 border-t border-dashed border-line py-2.5 text-sm">
                <b className="w-[22px] font-display font-semibold text-gold-ink">{d.n}</b>
                {d.titulo}
              </li>
            ))}
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
