import { BackIcon } from './icons'

/** Back button + two-step indicator used by the onboarding screens. */
export function OnboardingTop({ step, onBack }: { step: 1 | 2; onBack(): void }) {
  return (
    <div className="flex items-center gap-2 px-6 pb-1.5 pt-[18px]">
      <button
        type="button"
        onClick={onBack}
        aria-label="Voltar"
        className="-ml-3 grid h-11 w-11 place-items-center rounded-full text-ink-2"
      >
        <BackIcon />
      </button>
      <div className="flex flex-1 gap-1.5" aria-label={`Passo ${step} de 2`}>
        <i className="h-1 flex-1 rounded bg-ink" />
        <i className={`h-1 flex-1 rounded ${step === 2 ? 'bg-ink' : 'bg-line'}`} />
      </div>
    </div>
  )
}
