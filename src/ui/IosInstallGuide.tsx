import { Sheet } from './Sheet'
import { PlusIcon, ShareIcon } from './icons'

interface Props {
  open: boolean
  onClose(): void
}

/** Teaches iPhone users to add the app to the home screen (needed for reminders on iOS). */
export function IosInstallGuide({ open, onClose }: Props) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="ios-title">
      <div className="eyebrow">No iPhone</div>
      <h3 id="ios-title" className="mb-2 mt-1.5 text-[23px]">
        Coloque a jornada na tela inicial.
      </h3>
      <p className="mb-4 text-[14.5px] leading-normal text-ink-2">
        Assim o app abre em tela cheia, funciona sem internet e pode lembrar você do passo de cada dia.
      </p>
      <ol className="mb-5 grid gap-2.5">
        <Step n={1} icon={<ShareIcon />}>
          No Safari, toque em <b>Compartilhar</b>, na barra de baixo.
        </Step>
        <Step n={2} icon={<PlusIcon />}>
          Role e toque em <b>Adicionar à Tela de Início</b>.
        </Step>
        <Step n={3} icon={<span className="font-display text-sm font-bold">OK</span>}>
          Toque em <b>Adicionar</b> e abra o app pelo novo ícone.
        </Step>
      </ol>
      <button type="button" className="btn" onClick={onClose} data-autofocus>
        Entendi
      </button>
    </Sheet>
  )
}

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3.5 rounded-btn border border-line bg-card p-3.5 text-[14.5px] leading-snug">
      <span className="w-4 font-display text-lg font-semibold text-ember">{n}</span>
      <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-paper-2 text-[#0A84FF]">{icon}</span>
      <span>{children}</span>
    </li>
  )
}

