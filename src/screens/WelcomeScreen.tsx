import { useState } from 'react'
import { ui } from '../content'
import { Backdrop } from '../media/Backdrop'
import { WelcomeArt } from '../ui/icons'
import { Logo } from '../ui/Logo'

interface Props {
  onStart(): void
  onHasAccount(): void
}

export function WelcomeScreen({ onStart, onHasAccount }: Props) {
  const t = ui.boasVindas
  const [art, setArt] = useState(false)
  return (
    <section className="screen bg-[radial-gradient(120%_70%_at_50%_0%,#FBF6EC_0%,#F5EFE3_60%)]">
      <div className="relative flex h-[300px] flex-none items-end justify-center pt-10">
        <Backdrop id="capa-boas-vindas" tint="#F5EFE3" variant="light" responsive={false} onLoad={() => setArt(true)} />
        {/* Drawn stand-in until the cover picture exists. */}
        {!art && <WelcomeArt />}
      </div>
      <div className="mt-auto px-7 pb-7 pt-2">
        <Logo variant="full" title={t.marca} className="mb-3 h-[68px] w-auto text-ink" />
        <h1 className="mb-3.5 mt-2.5 text-[34px]">{t.titulo}</h1>
        <p className="mb-7 font-serif text-[17px] leading-[1.55] text-ink-2">{t.texto}</p>
        <button type="button" className="btn" onClick={onStart}>
          {t.botao}
        </button>
        <button type="button" className="btn btn-ghost mt-1.5" onClick={onHasAccount}>
          {t.botaoSecundario}
        </button>
      </div>
    </section>
  )
}
