// Home, after the 7-day map: Trilha 2 (Jesus em Ordem) as the continuation of the path. A new
// stretch of the illustrated map, painted with the trail's cover, with the life-of-Jesus timeline
// on top and the days climbing (bottom to top, like the map below it).
import { useEffect, useRef } from 'react'
import { LifeTimeline, reachedMilestones } from '../activities/LifeTimeline'
import { JESUS } from '../content/trails'
import { completedOf, isDayCompleted, isDayUnlocked } from '../game/progress'
import { imagePath } from '../media/paths'
import { useProgress } from '../store/ProgressContext'
import { CheckIcon, LockIcon, PlayIcon } from '../ui/icons'

interface Props {
  next: number | null
  onTapDay(n: number): void
}

/** How many days to show around the current one (the rest is summarized). */
const BEFORE = 2
const AFTER = 3

export function Trail2Path({ next, onTapDay }: Props) {
  const { progress, today } = useProgress()
  const days = JESUS.visible
  const completed = completedOf(progress, JESUS.id)
  const doneCount = Object.keys(completed).length
  const lit = reachedMilestones(JESUS.outline, completed)
  const current = next ?? days.at(-1)?.n ?? 1
  const idx = Math.max(0, days.findIndex((d) => d.n === current))
  const from = Math.max(0, idx - BEFORE)
  const to = Math.min(days.length, idx + AFTER + 1)
  const windowDays = days.slice(from, to)
  const below = from
  const above = JESUS.total - (days[to - 1]?.n ?? 0)
  const nodeRef = useRef<HTMLButtonElement>(null)

  // Open Home on the current day of Trilha 2 (it sits above the 7-day map).
  useEffect(() => {
    const id = window.setTimeout(() => nodeRef.current?.scrollIntoView({ block: 'center' }), 60)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <section className="relative mx-0 mb-2 flex-none overflow-hidden" aria-label={`${JESUS.titulo}: ${doneCount} de ${JESUS.total}`} data-testid="trilha-2-mapa">
      {/* The new stretch of map: the trail cover, melting into the paper above and the map below. */}
      <div aria-hidden="true" className="absolute inset-0">
        <img src={imagePath('capa-jesus-em-ordem')} alt="" className="h-full w-full object-cover object-[60%_50%] opacity-90" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#F5EFE3_0%,rgba(245,239,227,0)_14%,rgba(30,34,48,0.35)_40%,rgba(30,34,48,0.35)_75%,rgba(245,239,227,0)_92%,#F5EFE3_100%)]" />
      </div>

      <div className="relative px-5 pb-10 pt-10 text-paper">
        <div className="flex items-baseline justify-between [text-shadow:0_1px_8px_rgba(20,22,32,0.6)]">
          <h3 className="text-lg text-paper">{JESUS.titulo}</h3>
          <span className="text-xs font-semibold text-paper/80">
            {doneCount} de {JESUS.total}
          </span>
        </div>

        {JESUS.timeline.length > 0 && (
          <div className="mt-3 rounded-card bg-ink/55 px-2 pb-2.5 pt-3 backdrop-blur-sm">
            <LifeTimeline milestones={JESUS.timeline} lit={lit} />
          </div>
        )}

        {above > 0 && <p className="mt-5 text-center text-[12px] font-semibold text-paper/80 [text-shadow:0_1px_6px_rgba(20,22,32,0.7)]">+ {above} dias pela frente</p>}

        {/* Days, bottom to top, zigzagging like the map below. */}
        <ol className="mt-3 flex flex-col-reverse gap-3">
          {windowDays.map((d, i) => {
            const done = isDayCompleted(progress, d.n, JESUS.id)
            const open = !done && isDayUnlocked(progress, d.n, today, JESUS.id)
            const right = (from + i) % 2 === 1
            const draft = d.status !== 'publicado'
            return (
              <li key={d.n} className={`flex items-center gap-3 ${right ? 'flex-row-reverse text-right' : ''}`}>
                <button
                  ref={d.n === current ? nodeRef : undefined}
                  type="button"
                  onClick={() => onTapDay(d.n)}
                  aria-label={`Dia ${d.n}: ${d.titulo} (${done ? 'concluído' : open ? 'disponível' : 'bloqueado'})`}
                  className={`relative grid h-14 w-14 flex-none place-items-center rounded-full border-2 font-display text-lg font-semibold shadow-[0_6px_16px_rgba(20,22,32,0.4)] ${
                    done
                      ? 'border-gold bg-gold text-ink'
                      : open
                        ? 'play-shine border-paper'
                        : 'border-white/40 bg-ink/70 text-paper/60'
                  } ${draft ? 'outline-dashed outline-2 outline-offset-2 outline-gold-soft/70' : ''}`}
                >
                  {open && <span aria-hidden="true" className="absolute -inset-1.5 animate-ping rounded-full border-2 border-ember/50" />}
                  {done ? <CheckIcon size={22} /> : open ? <PlayIcon /> : d.n === current ? <LockIcon size={18} /> : d.n}
                </button>
                <div className="min-w-0 flex-1 rounded-card bg-ink/55 px-3 py-2 backdrop-blur-sm">
                  <small className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold-soft">
                    Dia {d.n}
                    {d.fase ? ` · ${d.fase}` : ''}
                    {draft && import.meta.env.DEV ? ` · ${d.status}` : ''}
                  </small>
                  <strong className="block truncate font-display text-[15px] font-semibold leading-tight">{d.titulo}</strong>
                  {d.passagens && <span className="block truncate text-[11.5px] text-paper/70">{d.passagens}</span>}
                </div>
              </li>
            )
          })}
        </ol>

        {below > 0 && <p className="mt-4 text-center text-[12px] font-semibold text-paper/80 [text-shadow:0_1px_6px_rgba(20,22,32,0.7)]">✓ {below} dias concluídos antes</p>}
      </div>
    </section>
  )
}
