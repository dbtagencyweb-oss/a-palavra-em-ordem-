import { useEffect, useRef, useState, type RefObject } from 'react'
import { LifeTimeline, reachedMilestones } from '../activities/LifeTimeline'
import { dayCovers, JESUS } from '../content/trails'
import { completedOf, isDayCompleted, isDayUnlocked } from '../game/progress'
import { CoverImage } from '../media/CoverImage'
import { TrackCover } from '../media/TrackCover'
import { useProgress } from '../store/ProgressContext'
import { CheckIcon, LockIcon, PlayIcon } from '../ui/icons'

interface Props {
  next: number | null
  headingRef?: RefObject<HTMLHeadingElement>
  autoScroll?: boolean
  onTapDay(n: number): void
}

export function Trail2Path({ next, headingRef, autoScroll = false, onTapDay }: Props) {
  const { progress, today } = useProgress()
  const days = JESUS.visible
  const completed = completedOf(progress, JESUS.id)
  const doneCount = Object.keys(completed).length
  const lit = reachedMilestones(JESUS.outline, completed)
  const currentMilestone = JESUS.timeline.find((milestone) => !lit.has(milestone))
  const nextLesson = days.find((day) => day.n === next)
  const canContinue = !!nextLesson && isDayUnlocked(progress, nextLesson.n, today, JESUS.id)
  const [showPast, setShowPast] = useState(false)
  const cursor = nextLesson ? days.indexOf(nextLesson) : days.length - 1
  const from = showPast ? 0 : Math.max(0, cursor - 2)
  const end = Math.min(days.length, cursor + 4)
  const lessons = days.slice(from, end).filter((day) => day !== nextLesson)
  const remaining = JESUS.total - (days[end - 1]?.n ?? 0)
  const section = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!autoScroll) return
    const id = window.setTimeout(() => section.current?.scrollIntoView({ block: 'start' }), 60)
    return () => window.clearTimeout(id)
  }, [autoScroll])

  return (
    <section
      ref={section}
      className={`mx-4 my-4 flex-none overflow-hidden rounded-[24px] border border-line bg-card shadow-card ${autoScroll ? 'scroll-mt-[82px]' : ''}`}
      aria-labelledby="trilha-jesus-titulo"
      data-testid="trilha-2-mapa"
    >
      <div className="relative isolate bg-[#1C3140] text-paper">
        <TrackCover id="capa-jesus-em-ordem" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(19,32,47,.78),rgba(25,39,52,.66)_49%,rgba(24,37,50,.98)_100%)]" />
        <div className="relative px-4 pb-4 pt-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="eyebrow !text-gold-soft">Trilha 2</p>
              <h2 id="trilha-jesus-titulo" ref={headingRef} tabIndex={-1} className="mt-1 scroll-mt-4 text-[26px] leading-tight">{JESUS.titulo}</h2>
            </div>
            <span className="mt-0.5 shrink-0 rounded-full border border-gold-soft/25 bg-ink/60 px-2.5 py-1 text-[11px] font-bold tabular-nums text-gold-soft">{doneCount} de {JESUS.total}</span>
          </div>
          <p className="mt-1 text-[13px] text-paper/85">Os Evangelhos na ordem dos acontecimentos.</p>
          {nextLesson ? (
            <button
              type="button"
              data-testid="continue-card"
              onClick={() => onTapDay(nextLesson.n)}
              className="mt-4 flex min-h-[78px] w-full items-center gap-3 rounded-card border border-gold-soft/30 bg-ink/75 px-3 py-2.5 text-left shadow-[0_8px_18px_rgba(12,17,25,.28)]"
            >
              <span className="h-12 w-12 flex-none overflow-hidden rounded-xl bg-ink ring-1 ring-paper/25" aria-hidden="true">
                <CoverImage key={nextLesson.n} pictures={dayCovers(JESUS, nextLesson.n)} small className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <small className="block text-[10.5px] font-bold uppercase leading-snug tracking-[0.08em] text-gold-soft">
                  {canContinue ? (doneCount ? `Continuar · Dia ${nextLesson.n}` : `Começar o Dia ${nextLesson.n}`) : `Dia ${nextLesson.n} libera amanhã`}
                </small>
                <strong className="mt-0.5 block font-display text-[15.5px] font-semibold leading-tight">{nextLesson.titulo}</strong>
                {nextLesson.passagens && <span className="mt-0.5 block text-[11.5px] leading-tight text-paper/75">{nextLesson.passagens}</span>}
              </span>
              <span className={`grid h-10 w-10 flex-none place-items-center rounded-full ${canContinue ? 'play-shine' : 'bg-white/10 text-paper/80'}`} aria-hidden="true">
                {canContinue ? <PlayIcon size={17} /> : <LockIcon size={16} />}
              </span>
            </button>
          ) : (
            <p className="mt-4 rounded-btn border border-gold-soft/25 bg-ink/55 px-4 py-3 text-sm font-semibold text-gold-soft">
              {days.length === JESUS.total ? 'Trilha concluída' : 'Novas lições em breve'}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 px-3.5 py-4">
        {JESUS.timeline.length > 0 && (
          <div className="rounded-card border border-line bg-paper/70 px-3 pb-2.5 pt-3 shadow-[0_3px_9px_rgba(45,34,22,.07)]">
            <h3 className="mb-1 text-[15px]">Linha do tempo de Jesus</h3>
            <LifeTimeline milestones={JESUS.timeline} lit={lit} current={currentMilestone} tone="light" />
          </div>
        )}

        {(lessons.length > 0 || from > 0 || showPast) && (
          <div>
            <h3 className="mb-2 px-0.5 text-[16px]">Lições da trilha</h3>
            {(from > 0 || showPast) && (
              <button type="button" onClick={() => setShowPast((value) => !value)} aria-expanded={showPast} className="mb-2 min-h-11 rounded-btn border border-line px-3 text-[13px] font-semibold text-ink-2">
                {showPast ? 'Recolher dias anteriores' : `Ver dias anteriores (${from})`}
              </button>
            )}
            <ol className="space-y-1.5">
              {lessons.map((day) => {
                const done = isDayCompleted(progress, day.n, JESUS.id)
                const open = isDayUnlocked(progress, day.n, today, JESUS.id)
                const published = day.status === 'publicado'
                return (
                  <li key={day.n}>
                    <button
                      type="button"
                      onClick={() => onTapDay(day.n)}
                      aria-label={`Dia ${day.n}: ${day.titulo} (${done ? 'concluído' : open ? 'disponível' : 'bloqueado'})`}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-line/80 bg-paper/45 px-2.5 py-2 text-left shadow-[0_3px_9px_rgba(45,34,22,.07)]"
                    >
                      <span className={`relative h-10 w-10 flex-none overflow-hidden rounded-lg bg-ink ${open ? '' : 'grayscale opacity-65'}`} aria-hidden="true">
                        <CoverImage pictures={dayCovers(JESUS, day.n)} small className="h-full w-full object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <small className="block text-[10px] font-bold uppercase leading-tight tracking-[0.075em] text-ember-ink">
                          Dia {day.n}{day.fase ? ` · ${day.fase}` : ''}
                          {!published && import.meta.env.DEV ? ' · Em revisão' : ''}
                        </small>
                        <strong className="mt-0.5 block font-display text-[14px] font-semibold leading-tight text-ink">{day.titulo}</strong>
                        {day.passagens && <span className="mt-0.5 block text-[11px] leading-tight text-ink-3">{day.passagens}</span>}
                      </span>
                      <span className={`grid h-7 w-7 flex-none place-items-center rounded-full ${done ? 'bg-olive-soft text-olive' : 'bg-paper-2 text-ink-2'}`} aria-hidden="true">
                        {done ? <CheckIcon size={14} /> : open ? <span className="text-lg leading-none">›</span> : <LockIcon size={13} />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
        {remaining > 0 && <p className="px-0.5 text-xs text-ink-3">+ {remaining} dias pela frente</p>}
      </div>
    </section>
  )
}
