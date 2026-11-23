import { SignInForm } from '../auth/SignInForm'
import { useProgress } from '../store/ProgressContext'

/** Shown once after Day 1: create an account so the journey is never lost. */
export function SaveJourneyScreen({ onSkip }: { onSkip(): void }) {
  const { progress } = useProgress()
  return (
    <section className="screen">
      <div className="mt-auto px-7 pb-7 pt-10">
        <div className="eyebrow">Dia 1 concluído</div>
        <h1 className="mb-3 mt-2.5 text-[32px]">Salve sua jornada.</h1>
        <p className="mb-6 font-serif text-[17px] leading-[1.55] text-ink-2">
          Crie sua conta para guardar a lâmpada, os {progress.steps} passos e o seu diário, e continuar de qualquer aparelho.
        </p>
        <SignInForm origem="salve_jornada" />
        <button type="button" className="btn btn-ghost mt-3" onClick={onSkip}>
          Agora não
        </button>
        <p className="mt-2 text-center text-[11.5px] text-ink-3">Seu progresso continua salvo neste aparelho.</p>
      </div>
    </section>
  )
}
