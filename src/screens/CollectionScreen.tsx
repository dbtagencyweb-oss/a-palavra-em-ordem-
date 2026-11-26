import { motion } from 'framer-motion'
import { useState } from 'react'
import { trilha } from '../content'
import { eraOf } from '../ui/eras'
import type { Dia } from '../content/types'
import { SymbolEmblem } from '../media/SymbolEmblem'
import { useProgress } from '../store/ProgressContext'
import { BackIcon } from '../ui/icons'
import { useListItemMotion } from '../ui/motion'
import { useToast } from '../ui/Toast'
import { Sheet } from '../ui/Sheet'
import { useAccess } from '../access/AccessContext'
import { isFounderSeat } from '../access/rules'
import { CrownIcon } from '../ui/FounderBadge'

interface Props {
  onBack(): void
}

/** Unlocked symbols use their era palette. Tapping opens the meaning. */
export function CollectionScreen({ onBack }: Props) {
  const { progress } = useProgress()
  const toast = useToast()
  const [open, setOpen] = useState<Dia | null>(null)
  const seat = isFounderSeat(useAccess().entitlements)

  return (
    <section className="screen relative">
      <div className="flex items-center gap-2 px-5 pt-4">
        <button type="button" onClick={onBack} aria-label="Voltar" className="-ml-3 grid h-11 w-11 place-items-center rounded-full text-ink-2">
          <BackIcon />
        </button>
      </div>
      <div className="px-5 pb-2">
        <h2 className="text-[26px]">Coleção de símbolos</h2>
        <p className="mt-1.5 text-sm leading-normal text-ink-2">
          Um símbolo para cada dia concluído. {progress.symbols.length} de {trilha.dias.length} desbloqueados.
        </p>
      </div>
      {seat && <FounderMedal />}
      <ul className="grid grid-cols-2 gap-3 px-5 pb-8 pt-4">
        {trilha.dias.map((d, i) => (
          <Tile
            key={d.n}
            day={d}
            index={i}
            unlocked={progress.symbols.includes(d.simbolo.id)}
            onOpen={() => setOpen(d)}
            onLocked={() => toast(`Conclua o Dia ${d.n} para desbloquear.`)}
          />
        ))}
      </ul>

      <Sheet open={!!open} onClose={() => setOpen(null)} labelledBy="symbol-title" tone="dark" className="text-center">
        {open && (
          <>
            <div className="mx-auto mb-4 w-fit">
              <SymbolEmblem midia={open.simbolo.midia} unlocked size={112} era={eraOf(open.n)} />
            </div>
            <div className="eyebrow eyebrow-dark">
              Dia {open.n} · {open.lugar}
            </div>
            <h3 id="symbol-title" className="mb-3 mt-1.5 text-[24px]">
              {open.simbolo.nome}
            </h3>
            <p className="mb-6 font-serif text-[17px] leading-normal text-paper/85">{open.simbolo.texto}</p>
            <button type="button" className="btn" onClick={() => setOpen(null)} data-autofocus>
              Fechar
            </button>
          </>
        )}
      </Sheet>
    </section>
  )
}

function Tile({ day, index, unlocked, onOpen, onLocked }: { day: Dia; index: number; unlocked: boolean; onOpen(): void; onLocked(): void }) {
  const m = useListItemMotion(index, 0.05)
  const era = eraOf(day.n)
  return (
    <motion.li {...m}>
      <button
        type="button"
        onClick={unlocked ? onOpen : onLocked}
        aria-label={unlocked ? `${day.simbolo.nome}, Dia ${day.n}` : `Símbolo do Dia ${day.n}, bloqueado`}
        className={`flex w-full flex-col items-center gap-3 rounded-card border p-4 ${unlocked ? 'shadow-sm' : 'border-line bg-paper-2 text-ink-3'}`}
        style={unlocked ? {
          background: `linear-gradient(150deg, ${era.mid}70, transparent 78%), ${era.deep}`,
          borderColor: `${era.mid}A6`,
          color: era.light,
        } : undefined}
      >
        <SymbolEmblem midia={day.simbolo.midia} unlocked={unlocked} size={88} era={era} />
        <span className="text-center">
          <small className={`block text-[10.5px] font-bold uppercase tracking-[0.12em] ${unlocked ? 'opacity-85' : 'text-gold-ink'}`}>Dia {day.n}</small>
          <strong className="mt-0.5 block font-display text-[15px] font-semibold">{unlocked ? day.simbolo.nome : '?'}</strong>
        </span>
      </button>
    </motion.li>
  )
}

/** The Founder medal: only for the limited Founder seats (content/oferta.json). */
function FounderMedal() {
  return (
    <div className="mx-5 mt-4 flex items-center gap-4 rounded-card bg-[linear-gradient(160deg,#5E6B38,#3F4A24)] p-4 text-paper shadow-card" data-testid="medalha-fundador">
      <span className="seal-shine relative grid h-16 w-16 flex-none place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#FBE7A6,#E2C580_45%,#B8893A_80%)] shadow-[0_6px_16px_-6px_rgba(20,24,10,0.7),inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-3px_0_rgba(120,80,20,0.35)]">
        <span className="scale-[2.1]">
          <CrownIcon />
        </span>
      </span>
      <span>
        <small className="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#F1D58F]">Medalha exclusiva</small>
        <strong className="block font-display text-lg font-semibold">Fundador</strong>
        <span className="block text-[13px] leading-snug text-paper/80">Uma das vagas de Fundador é sua.</span>
      </span>
    </div>
  )
}
