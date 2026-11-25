// Home, after the 7-day map: Trilha 2 (Jesus em Ordem) as the continuation of the path. A new
// stretch of the illustrated map, painted with the trail's cover, with the life-of-Jesus timeline
// on top and the days climbing (bottom to top, like the map below it).
import { useEffect, useRef, useState } from 'react'
import { LifeTimeline, reachedMilestones } from '../activities/LifeTimeline'
import { dayCovers, JESUS } from '../content/trails'
import { completedOf, isDayCompleted, isDayUnlocked } from '../game/progress'
import { CoverImage } from '../media/CoverImage'
import { imagePath } from '../media/paths'
import { useProgress } from '../store/ProgressContext'
import { CheckIcon, LockIcon, PlayIcon } from '../ui/icons'

/** Brushed gold sampled from the symbol medallions (public/media/img/simbolo-*.webp). */
const MEDAL_GOLD = 'radial-gradient(circle at 34% 28%, #F1E0AD 0%, #DCC088 30%, #C4A266 62%, #9E7A3E 100%)'
const MAP_BLEND = 'linear-gradient(to bottom, #000 calc(100% - 176px), rgba(0,0,0,.84) calc(100% - 120px), rgba(0,0,0,.48) calc(100% - 72px), rgba(0,0,0,.14) calc(100% - 28px), transparent)'

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
  // "Ver dias anteriores" opens every earlier day, to see them again.
  const [showPast, setShowPast] = useState(false)
  const from = showPast ? 0 : Math.max(0, idx - BEFORE)
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
    <section className="relative z-[1] flex-none" aria-label={`${JESUS.titulo}: ${doneCount} de ${JESUS.total}`} data-testid="trilha-2-mapa">
      {/* Overlap the next map so the artwork fades directly into it. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-36 top-0 overflow-hidden" style={{ maskImage: MAP_BLEND, WebkitMaskImage: MAP_BLEND }}>
        <img src={imagePath('capa-jesus-em-ordem')} alt="" className="h-full w-full object-cover object-[60%_50%]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#F5EFE3_0%,rgba(245,239,227,0)_14%,rgba(30,34,48,0.35)_40%,rgba(30,34,48,0.35)_75%,transparent_100%)]" />
      </div>

      <div className="relative px-5 pb-10 pt-10 text-paper">
        <div className="flex items-baseline justify-between [text-shadow:0_1px_8px_rgba(20,22,32,0.6)]">
          <h3 className="text-lg text-paper">{JESUS.titulo}</h3>
          <span className="text-xs font-semibold text-paper/80">
            {doneCount} de {JESUS.total}
          </span>
        </div>

        {JESUS.timeline.length > 0 && (
          <div className="mt-3 rounded-card bg-ink/55 px-4 pb-3.5 pt-4 backdrop-blur-sm">
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
                  className={`relative h-14 w-14 flex-none rounded-full p-[3px] font-display text-lg font-semibold shadow-[0_6px_16px_rgba(20,22,32,0.4)] ${
                    done ? '' : open ? 'bg-paper motion-safe:animate-[play-pulse_2.4s_ease-in-out_infinite]' : 'bg-white/25'
                  }`}
                  // Done: a ring in the same brushed gold as the symbol medals.
                  style={done ? { backgroundImage: MEDAL_GOLD } : undefined}
                >
                  {/* The day's cover (or the trail's), inside the ring. */}
                  <span className="relative block h-full w-full overflow-hidden rounded-full bg-ink">
                    <CoverImage
                      key={d.n}
                      pictures={dayCovers(JESUS, d.n)}
                      small
                      className={`h-full w-full object-cover ${done || open ? '' : 'grayscale'} ${open ? '' : done ? '' : '!opacity-40'}`}
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute inset-0 grid place-items-center ${open ? 'bg-[rgba(30,34,48,0.38)] text-white' : done ? '' : 'text-paper'}`}
                    >
                      {open ? <PlayIcon size={22} /> : done ? null : d.n === current ? <LockIcon size={18} /> : d.n}
                    </span>
                  </span>
                  {/* Done: a small gold check on the ring. */}
                  {done && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-[#E6D09C] text-[#5A4318] shadow-[0_2px_6px_rgba(20,22,32,0.45)]"
                      style={{ backgroundImage: MEDAL_GOLD }}
                    >
                      <CheckIcon size={13} />
                    </span>
                  )}
                </button>
                <div className="min-w-0 flex-1 rounded-card bg-ink/55 px-3 py-2 backdrop-blur-sm">
                  <small className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#F5A36B]">
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

        {(below > 0 || showPast) && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowPast((v) => !v)}
              aria-expanded={showPast}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-paper/25 bg-ink/55 px-4 text-[13px] font-semibold text-paper backdrop-blur-sm hover:bg-ink/70"
            >
              {showPast ? 'Esconder dias anteriores' : `Ver dias anteriores (${below})`}
              <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${showPast ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
