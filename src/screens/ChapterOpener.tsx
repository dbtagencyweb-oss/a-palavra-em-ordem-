import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { dayCovers, MAPA, type Trail } from '../content/trails'
import { Backdrop } from '../media/Backdrop'
import { CoverImage } from '../media/CoverImage'
import { BackIcon, CloseIcon } from '../ui/icons'

interface Props {
  dayN: number
  trail?: Trail
  review: boolean
  onStart(): void
  onExit(): void
  /** Opens the day before, to see it again (given only when that day is done). */
  onPrevious?(): void
}

/**
 * Each day opens like a book chapter, in the color of its era:
 * the place in large serif, the passage it covers, and where it sits on the line of the story.
 */
export function ChapterOpener({ dayN, trail = MAPA, review, onStart, onExit, onPrevious }: Props) {
  const reduced = useReducedMotion()
  const days = trail.outline
  const total = trail.total
  const day = days.find((d) => d.n === dayN) ?? days[0]
  const era = trail.era(dayN)
  const [art, setArt] = useState(false)
  const rise = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
      : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const } }

  return (
    <section className="screen relative" style={{ backgroundColor: era.deep, color: era.light }} aria-label={`Dia ${dayN}: ${day.titulo}`}>
      <div className="relative z-[2] flex px-6 pt-4">
        <button type="button" onClick={onExit} aria-label="Fechar" className="-ml-3 grid h-11 w-11 place-items-center rounded-full" style={{ color: era.light }}>
          <CloseIcon />
        </button>
      </div>

      {/* A day with its own cover (Jesus em Ordem) wears it; otherwise the era's picture. */}
      {day.capa ? (
        // The picture fills the upper half, anchored at its bottom, so the people of the scene sit above
        // the title; it melts into the era's color where the text begins.
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[54%] overflow-hidden">
          <CoverImage key={dayN} pictures={dayCovers(trail, dayN, 'tall')} onLoad={() => setArt(true)} className="h-full w-full object-cover object-bottom" />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, ${era.deep}66 0%, ${era.deep}00 18%, ${era.deep}00 62%, ${era.deep}B0 84%, ${era.deep} 100%)` }}
          />
        </div>
      ) : (
        <Backdrop id={trail.backdrop(dayN)} tint={era.deep} variant="opener" onLoad={() => setArt(true)} />
      )}

      {/* Large day numeral: the chapter's watermark, quieter once the era's picture is in place. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-10 select-none font-display font-semibold leading-none"
        style={{ color: art ? (dayN === 4 ? era.deep : era.light) : era.mid, fontSize: 'clamp(200px, 62vw, 280px)' }}
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: art ? (dayN === 4 ? 0.18 : 0.22) : 0.35, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        {dayN}
      </motion.div>

      <div className="relative mt-auto px-7 pb-8">
        <motion.div {...rise(0.05)} className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: era.light, opacity: 0.75 }}>
          Dia {dayN} de {total}
        </motion.div>
        <motion.h1
          {...rise(0.15)}
          className="mt-3 font-display text-[clamp(44px,14vw,64px)] font-semibold leading-[0.98] tracking-[-0.02em]"
          style={{ color: era.light }}
        >
          {day.fase ?? trail.titulo}
        </motion.h1>
        <motion.p {...rise(0.25)} className="mt-3 text-[13.5px]" style={{ color: era.light, opacity: 0.8 }}>
          {day.passagens}
        </motion.p>

        <motion.div
          className="my-7 h-px origin-left"
          style={{ backgroundColor: era.light, opacity: 0.25 }}
          initial={reduced ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        />

        <motion.h2 {...rise(0.4)} className="font-serif text-[24px] font-medium leading-[1.25]" style={{ color: era.light }}>
          {day.titulo}
        </motion.h2>

        {/* The line of the story: one stretch per day, each in its era's color. */}
        <motion.div {...rise(0.5)} className="mt-8" aria-label={`Linha da história: dia ${dayN} de ${total}`} role="img">
          <div className={`flex ${total > 12 ? 'gap-[3px]' : 'gap-1.5'}`}>
            {days.map((d) => {
              const e = trail.era(d.n)
              const state = d.n < dayN ? 'past' : d.n === dayN ? 'now' : 'next'
              return (
                <span
                  key={d.n}
                  className="h-[6px] flex-1 rounded-full"
                  style={{
                    backgroundColor: state === 'next' ? 'rgba(255,255,255,.14)' : e.mid,
                    boxShadow: state === 'now' ? `0 0 0 2px ${era.deep}, 0 0 0 3.5px ${era.light}` : undefined,
                  }}
                />
              )
            })}
          </div>
          <div className="mt-2.5 flex justify-between text-[11px]" style={{ color: era.light, opacity: 0.65 }}>
            <span>{days[0]?.fase}</span>
            <span>{days.at(-1)?.fase}</span>
          </div>
        </motion.div>

        <motion.div {...rise(0.6)} className="mt-9">
          <button
            type="button"
            data-sound="card_next"
            onClick={onStart}
            className="btn"
            autoFocus
          >
            {review ? 'Revisar o dia' : 'Começar o dia'}
          </button>
          <p className="mt-3 text-center text-[12px]" style={{ color: era.light, opacity: 0.6 }}>
            {trail.duracao}
          </p>
          {onPrevious && (
            <button
              type="button"
              onClick={onPrevious}
              className="mx-auto mt-2 flex min-h-11 items-center gap-1.5 px-3 text-[13px] font-semibold underline-offset-4 hover:underline"
              style={{ color: era.light, opacity: 0.85 }}
            >
              <BackIcon size={16} />
              Rever o Dia {dayN - 1}
            </button>
          )}
        </motion.div>
      </div>
    </section>
  )
}
