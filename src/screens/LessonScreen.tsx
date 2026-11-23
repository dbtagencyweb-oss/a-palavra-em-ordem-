import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MAPA, type Trail } from '../content/trails'
import type { Card, Dia } from '../content/types'
import { cardRegistry } from '../cards/registry'
import { DEFAULT_LABEL, INTERACTIVE_TYPES, isCinema, type CardProps, type LessonApi } from '../cards/types'
import { track } from '../analytics/track'
import { preloadMedia } from '../media/preload'
import { narrationForCard } from '../sound/narration'
import { soundManager } from '../sound/SoundManager'
import { useProgress } from '../store/ProgressContext'
import { isDayCompleted, type CompletionResult } from '../game/progress'
import { ChapterOpener } from './ChapterOpener'
import { BackIcon, CloseIcon } from '../ui/icons'
import { EASE_OUT, useCardMotion, useSceneMotion } from '../ui/motion'
import { SoundToggle } from '../ui/SoundToggle'
import { LessonAudioPlayer } from '../media/LessonAudioPlayer'
import { useAccess } from '../access/AccessContext'
import { Leaving } from '../ui/Leaving'

interface Props {
  dayN: number
  /** Which trail the day belongs to (Trilha 1 when omitted). */
  trail?: Trail
  onExit(): void
  /** `early`: the day was already completed during the lesson ("Marcar como lido"). */
  onFinish(firstTryActivities: number, early?: CompletionResult): void
  onOffer(origem: string): void
}

function CardView({ card, api }: CardProps) {
  const Component = cardRegistry[card.tipo] as React.ComponentType<CardProps>
  return <Component card={card} api={api} />
}

/**
 * Loads the day (bundled for Trilha 1; from the server, or the local files in development, for a
 * paid trail) and then runs the lesson.
 */
export function LessonScreen(props: Props) {
  const trail = props.trail ?? MAPA
  const [day, setDay] = useState<Dia | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    void trail.loadDay(props.dayN).then((d) => alive && setDay(d))
    return () => {
      alive = false
    }
  }, [trail, props.dayN])

  if (day === undefined) return <section className="screen grid place-items-center bg-paper" aria-busy="true" aria-label="Carregando a lição" />
  if (day === null || !day.cards?.length)
    return (
      <section className="screen flex flex-col items-center justify-center gap-4 bg-paper px-8 text-center">
        <h1 className="text-2xl">Esta lição ainda não está disponível.</h1>
        <p className="text-sm text-ink-2">Ela está sendo preparada. Volte em breve.</p>
        <button type="button" className="btn" onClick={props.onExit}>
          Voltar à jornada
        </button>
      </section>
    )
  return <Lesson {...props} trail={trail} day={day} />
}

function Lesson({ dayN, trail, day, onExit, onFinish, onOffer }: Props & { trail: Trail; day: Dia }) {
  const { progress, addDiaryEntry, updateDiaryEntry, completeDay } = useProgress()
  const { podeAcessar } = useAccess()
  const era = trail.era(dayN)
  // "Marcar como lido" completes the day right away (it counts for the lamp like a finished lesson).
  const early = useRef<CompletionResult | null>(null)
  const [read, setRead] = useState(false)
  // Every day opens with its chapter page; the lesson cards come after it.
  const [intro, setIntro] = useState(true)
  const [review] = useState(() => isDayCompleted(progress, dayN, trail.id))
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [solved, setSolved] = useState<ReadonlySet<number>>(new Set())
  const firstTries = useRef(0)
  const reflections = useRef<Record<number, string>>({})
  /** Card index → diary entry id, so going back and editing a reflection updates it. */
  const saved = useRef<Record<number, string>>({})

  const card: Card = day.cards[index]
  const isLast = index === day.cards.length - 1
  const cinema = isCinema(card)
  const canContinue = !INTERACTIVE_TYPES.has(card.tipo) || solved.has(index)

  // "More below" hint: some cards (long lists, many books) continue under the footer.
  const sectionRef = useRef<HTMLElement>(null)
  const [moreBelow, setMoreBelow] = useState(false)
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const check = () => setMoreBelow(el.scrollHeight - el.clientHeight - el.scrollTop > 24)
    el.scrollTop = 0
    // Cheap poll: cards change height after transitions or when a list expands.
    const t = window.setInterval(check, 500)
    el.addEventListener('scroll', check, { passive: true })
    return () => {
      window.clearInterval(t)
      el.removeEventListener('scroll', check)
    }
  }, [index, intro])

  const cardMotion = useCardMotion()
  const sceneMotion = useSceneMotion()
  const m = card.tipo === 'cena' ? sceneMotion : cardMotion

  // Only the current card's media loads; warm up the next one.
  useEffect(() => {
    preloadMedia(day.cards[index + 1]?.midia)
    const nextCard = day.cards[index + 1]
    if (nextCard) soundManager.preloadNarration(narrationForCard(nextCard.id)?.id)
    track('card_view', { dia: dayN, trilha: trail.id, card: day.cards[index].id })
  }, [day.cards, index, dayN])

  function next() {
    if (card.tipo === 'reflexao' || card.tipo === 'pergunta') {
      const text = (reflections.current[index] ?? '').trim()
      const fields = { pergunta: card.tipo === 'reflexao' ? card.pergunta : card.texto, resposta: text }
      const existing = saved.current[index]
      if (existing && text) updateDiaryEntry(existing, fields)
      else if (text) {
        saved.current[index] = addDiaryEntry(`${trail.id === MAPA.id ? '' : `${trail.titulo} · `}Dia ${dayN} · Reflexão`, fields)
        track('diary_entry_saved', { origem: 'reflexao' })
      }
    }
    if (isLast) return onFinish(firstTries.current, early.current ?? undefined)
    // Scenes announce themselves with scene_in.
    if (day.cards[index + 1].tipo !== 'cena') soundManager.play('card_next')
    setDirection(1)
    setIndex((i) => i + 1)
  }

  function back() {
    if (index === 0) return
    soundManager.play('card_next')
    setDirection(-1)
    setIndex((i) => i - 1)
  }

  // Rebuilt per card so callbacks always see the current card.
  const api: LessonApi = useMemo(
    () => ({
      dayN,
      era,
      solved: solved.has(index),
      reflection: reflections.current[index] ?? '',
      solve: (firstTry, attempts) => {
        if (!solved.has(index)) track('activity_result', { dia: dayN, card: card.id, acertou: firstTry, tentativas: attempts ?? 1 })
        setSolved((prev) => {
          if (prev.has(index)) return prev
          if (firstTry) firstTries.current += 1
          return new Set(prev).add(index)
        })
      },
      setReflection: (t) => {
        reflections.current[index] = t
      },
      openOffer: () => onOffer(`licao_dia_${dayN}`),
      next,
      read,
      markRead: () => {
        if (!early.current) early.current = completeDay(dayN, firstTries.current, trail)
        setRead(true)
        setSolved((prev) => (prev.has(index) ? prev : new Set(prev).add(index)))
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, dayN, read],
  )

  const label = card.rotulo ?? DEFAULT_LABEL[card.tipo] ?? ''
  const buttonText = isLast
    ? `Concluir o Dia ${dayN}`
    : card.tipo === 'reflexao' || card.tipo === 'pergunta'
      ? 'Salvar e continuar'
      : 'Continuar'
  const iconTone = cinema ? 'text-paper/80' : 'text-ink-2'

  if (intro)
    return (
      <ChapterOpener
        dayN={dayN}
        trail={trail}
        review={review}
        onExit={onExit}
        onStart={() => {
          soundManager.play(day.cards[0].tipo === 'cena' ? 'tap' : 'card_next')
          setIntro(false)
        }}
      />
    )

  return (
    <section
      ref={sectionRef}
      className={`screen relative transition-colors duration-500 ${cinema ? '' : 'bg-paper'}`}
      style={cinema ? { backgroundColor: era.deep } : undefined}
      aria-label={`Dia ${dayN}: ${day.titulo}`}
    >
      <DevStatusStrip status={trail.outline.find((d) => d.n === dayN)?.status} />
      <div className="relative z-10 flex items-center gap-2 px-6 pb-2 pt-4">
        <button type="button" onClick={onExit} aria-label="Fechar a lição" className={`-ml-3 grid h-11 w-11 place-items-center rounded-full ${iconTone}`}>
          <CloseIcon />
        </button>
        <div
          className={`h-2 flex-1 overflow-hidden rounded-lg ${cinema ? 'bg-white/15' : 'bg-line'}`}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={day.cards.length}
          aria-valuenow={index + 1}
          aria-label={`Card ${index + 1} de ${day.cards.length}`}
        >
          <motion.i
            className="block h-full rounded-lg"
            style={{ backgroundColor: cinema ? era.light : era.mid }}
            animate={{ width: `${(index / day.cards.length) * 100 + 4}%` }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          />
        </div>
        <SoundToggle className={`-mr-3 ${iconTone}`} />
      </div>

      {/* Modo Áudio: the whole lesson narrated, for buyers of the "audio" bump. */}
      {podeAcessar('modo-audio-completo') && (
        <div className="relative z-10 flex px-6 pb-2">
          <LessonAudioPlayer
            trailId={trail.id}
            trailTitle={trail.titulo}
            dayN={dayN}
            dayTitle={day.titulo}
            tone={cinema ? 'dark' : 'light'}
            onListened={() => {
              // Listening to the end completes the lesson.
              if (!early.current) early.current = completeDay(dayN, firstTries.current, trail)
              onFinish(firstTries.current, early.current)
            }}
          />
        </div>
      )}

      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={card.id}
          custom={direction}
          variants={m.variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={m.transition}
          className={cinema ? 'flex flex-1 flex-col' : 'flex flex-1 flex-col px-6 pb-2.5 pt-3.5'}
        >
          <Leaving attrs={{ 'data-card-type': card.tipo }}>
          {!cinema && label && (
            <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-ink">
              Dia {dayN} · {label}
            </div>
          )}
          <CardView card={card} api={api} />
          </Leaving>
        </motion.div>
      </AnimatePresence>

      {card.tipo !== 'cena' && (
        <div className={`sticky bottom-0 z-10 flex gap-2 px-6 pb-6 pt-3 ${cinema ? '' : 'footer-fade'}`}>
          {moreBelow && (
            <button
              type="button"
              data-sound="none"
              onClick={() => sectionRef.current?.scrollBy({ top: sectionRef.current.clientHeight * 0.6, behavior: 'smooth' })}
              className="absolute -top-8 left-1/2 flex min-h-[44px] -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 text-[12.5px] font-semibold text-ink-2 shadow-card"
            >
              Role para ver mais
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )}
          {index > 0 && (
            <button
              type="button"
              data-sound="card_next"
              onClick={back}
              aria-label="Card anterior"
              className={`grid min-h-[52px] w-[52px] flex-none place-items-center rounded-btn border-[1.5px] ${
                cinema ? 'border-white/20 text-paper/80' : 'border-line text-ink-2'
              }`}
            >
              <BackIcon />
            </button>
          )}
          <button
            type="button"
            data-sound="card_next"
            className="btn"
            disabled={!canContinue}
            onClick={next}
          >
            {buttonText}
          </button>
        </div>
      )}
    </section>
  )
}

const STATUS_LABEL = { rascunho: 'Rascunho', em_revisao: 'Em revisão', publicado: 'Publicado' } as const

/** Development only: a strip on lessons that users would not see yet (not published). */
function DevStatusStrip({ status }: { status?: keyof typeof STATUS_LABEL }) {
  if (!import.meta.env.DEV || !status || status === 'publicado') return null
  return (
    <div
      role="status"
      data-testid="dev-status"
      className={`relative z-20 py-1 pl-14 pr-4 text-center text-[11px] font-bold uppercase tracking-[0.14em] ${status === 'rascunho' ? 'bg-ember text-white' : 'bg-gold text-ink'}`}
    >
      Dev · {STATUS_LABEL[status]} · não aparece para os usuários
    </div>
  )
}
