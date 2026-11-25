import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { getDay, ui } from '../content'
import { MAPA, type Trail } from '../content/trails'
import { completedOf, type CompletionResult } from '../game/progress'
import { LifeTimeline, reachedMilestones } from '../activities/LifeTimeline'
import { SymbolEmblem } from '../media/SymbolEmblem'
import { soundManager } from '../sound/SoundManager'
import { useNarration, useNarrationOn } from '../sound/useNarration'
import { useMuted } from '../sound/useSound'
import { useProgress } from '../store/ProgressContext'
import { MountainIcon } from '../ui/icons'
import { Backdrop } from '../media/Backdrop'
import { useCountUp } from '../ui/useCountUp'
import { OilLamp3D } from '../ui/OilLamp3D'

interface Props {
  dayN: number
  trail?: Trail
  result: CompletionResult
  onHome(): void
  onContinueJesus?(): void
}

// Sequence (ms): lamp lights and numbers count for 1.2 s, then the choir, then the symbol turns gold.
const T_DAY_COMPLETE = 1150
const T_SYMBOL = 1700
const T_GRACE = 600
/** The narrator speaks once the lamp, the numbers and the symbol have had their moment. */
const T_NARRATION = 2300

export function DoneScreen({ dayN, trail = MAPA, result, onHome, onContinueJesus }: Props) {
  const { progress } = useProgress()
  const reduced = useReducedMotion()
  const isMain = trail.id === MAPA.id
  const outline = trail.outline.find((d) => d.n === dayN)
  // Trilha 1 days always have a symbol (and some a milestone); other trails only on some days.
  const simbolo = isMain ? getDay(dayN).simbolo : outline?.simbolo
  const marco = isMain ? getDay(dayN).marco : undefined
  const completed = completedOf(progress, trail.id)
  const doneCount = Object.keys(completed).length
  const TOTAL_DAYS = trail.total
  const isLastDay = dayN === TOTAL_DAYS
  const era = trail.era(dayN)
  const freshMilestone = result.firstTime ? (outline?.marcoLinhaDoTempo ?? null) : null
  const [symbolGold, setSymbolGold] = useState(false)
  // Trilha 1 only: Salmo 119:105 on days 1 to 6, the closing words on day 7.
  const muted = useMuted()
  const voiceOn = useNarrationOn() && !muted
  const voice = useNarration(isLastDay ? 'narr-conclusao-final' : 'narr-conclusao', { delayMs: T_NARRATION, active: isMain && result.firstTime })

  const streak = useCountUp(progress.streak)
  const steps = useCountUp(result.stepsGained)
  const mapDone = useCountUp(doneCount)

  useEffect(() => {
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    if (result.firstTime) {
      // Deferred so React StrictMode's double mount doesn't play it twice.
      at(0, () => soundManager.play('lamp_ignite'))
      at(T_DAY_COMPLETE, () => soundManager.play('day_complete'))
      if (result.newSymbol)
        at(T_SYMBOL, () => {
          setSymbolGold(true)
          soundManager.play('symbol_unlock')
        })
    } else {
      at(300, () => soundManager.play('day_complete'))
    }
    if (result.graceUsed > 0) at(T_GRACE, () => soundManager.play('grace_used'))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [result])

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden text-center text-paper" style={{ backgroundColor: era.deep }}>
      <Backdrop id={trail.backdrop(dayN)} tint={era.deep} variant="done" />
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3 pt-5">
        <OilLamp3D className="mx-auto mb-3 w-[clamp(124px,20dvh,164px)]" ignite={result.firstTime && !reduced} />
        <h1 className="mb-1.5 text-[30px]">{result.firstTime ? 'Lâmpada acesa.' : 'Revisão concluída.'}</h1>
        <p className="mb-4 font-serif text-base italic opacity-65">{ui.conclusao.verso}</p>
        {/* The verse is already on screen, so the subtitle shows only while the voice speaks. */}
        {isMain && result.firstTime && voiceOn && (
          <p className="-mt-2 mb-2 min-h-8" aria-hidden="true" data-testid="legenda-narracao">
            {voice.speaking && voice.cue && (
              <span key={voice.cue.text} className="narr-cue rounded-md bg-ink/45 px-2 py-[3px] font-serif text-[15px] italic leading-[1.8] text-paper/95 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
                {voice.cue.text}
              </span>
            )}
          </p>
        )}

        {/* Numbers count up visually; screen readers get the final values once. */}
        <p className="sr-only" role="status">
          {`${progress.streak} ${progress.streak === 1 ? 'dia seguido' : 'dias seguidos'}, mais ${result.stepsGained} passos, ${doneCount} de ${TOTAL_DAYS} dias ${trail.ofWhat}.`}
        </p>
        <div className="mb-3.5 grid grid-cols-3 gap-2" aria-hidden="true">
          <Stat value={String(streak)} label={progress.streak === 1 ? 'dia seguido' : 'dias seguidos'} />
          <Stat value={`+${steps}`} label="passos" />
          <Stat value={`${mapDone}/${TOTAL_DAYS}`} label={trail.ofWhat} />
        </div>

        {result.graceUsed > 0 && (
          <p className="mb-4 rounded-btn bg-olive/25 px-4 py-3 text-[13.5px] text-olive-soft">
            A Graça protegeu sua lâmpada num dia perdido.
          </p>
        )}

        <div className="grid gap-2.5 empty:hidden">
          {result.newSymbol && simbolo && (
            <Badge
              eyebrow="Símbolo desbloqueado"
              title={simbolo.nome}
              text={simbolo.texto}
              icon={<SymbolEmblem midia={simbolo.midia ?? `simbolo-${simbolo.id}`} unlocked={symbolGold} revealing />}
            />
          )}
          {result.newMilestone && marco && (
            <Badge
              eyebrow="Marco desbloqueado"
              title={marco.nome}
              text={marco.texto}
              icon={
                <span className="grid h-[46px] w-[46px] flex-none place-items-center rounded-xl bg-gold">
                  <MountainIcon />
                </span>
              }
            />
          )}
        </div>

        {/* Trails with a timeline (Jesus em Ordem): the milestone reached lights up on it. */}
        {trail.timeline.length > 0 && (
          <div className="mt-3 rounded-card bg-black/25 px-2 pb-2.5 pt-3 text-left">
            {freshMilestone && <p className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-gold-soft">Linha do tempo · {freshMilestone}</p>}
            <LifeTimeline milestones={trail.timeline} lit={reachedMilestones(trail.outline, completed)} fresh={freshMilestone} />
          </div>
        )}

        {result.stepsGained > 0 && !reduced && (
          <motion.div
            className="pointer-events-none absolute left-1/2 top-6 whitespace-nowrap font-display text-[20px] font-bold text-gold-soft"
            initial={{ x: '-50%', y: 24, opacity: 0 }}
            animate={{ y: -16, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.6, delay: 1.2, times: [0, 0.2, 0.7, 1] }}
            aria-hidden="true"
          >
            +{result.stepsGained} passos
          </motion.div>
        )}
      </div>
      <footer className="relative shrink-0 px-5 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))]">
        {onContinueJesus && (
          <button type="button" className="btn" onClick={onContinueJesus}>Continuar com Jesus em Ordem</button>
        )}
        <button type="button" className={onContinueJesus ? 'btn btn-ghost mt-1 !text-paper/80' : 'btn'} onClick={onHome}>
          Voltar à jornada
        </button>
        {result.firstTime && !onContinueJesus && (
          <p className="mt-2 text-[12.5px] opacity-55">
            {isLastDay
              ? isMain
                ? 'Você completou o mapa. A próxima trilha já está à sua espera.'
                : `Você concluiu ${trail.titulo}.`
              : `O Dia ${dayN + 1} libera amanhã. Volte para manter a lâmpada acesa.`}
          </p>
        )}
      </footer>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-btn bg-white/[0.06] px-1.5 py-2.5">
      <strong className="block font-display text-2xl tabular-nums text-gold-soft">{value}</strong>
      <span className="text-[11px] font-semibold opacity-60">{label}</span>
    </div>
  )
}

function Badge({ eyebrow, title, text, icon }: { eyebrow: string; title: string; text: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-btn border border-gold/35 bg-gold/[0.14] p-3 text-left">
      {icon}
      <div>
        <small className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold">{eyebrow}</small>
        <strong className="block font-display text-[17px]">{title}</strong>
        <span className="text-[12.5px] opacity-70">{text}</span>
      </div>
    </div>
  )
}
