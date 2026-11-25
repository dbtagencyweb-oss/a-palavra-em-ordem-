import { useAccess } from '../access/AccessContext'
import { isFounderSeat } from '../access/rules'
import { FounderBadge } from '../ui/FounderBadge'
import { Logo } from '../ui/Logo'
import { useEffect } from 'react'
import { TOTAL_DAYS, trilha, ui } from '../content'
import { isDayCompleted, isDayUnlocked, nextDay } from '../game/progress'
import { useProgress } from '../store/ProgressContext'
import { ArrowIcon, CheckIcon, GraceIcon, LampIcon, LockIcon, PlayIcon, StarIcon, StepsIcon } from '../ui/icons'
import { useToast } from '../ui/Toast'
import { useFounder } from '../auth/useFounder'
import { soundManager } from '../sound/SoundManager'
import { TrackCover } from '../media/TrackCover'
import { ContinueCard } from './ContinueCard'
import { dayCovers, JESUS } from '../content/trails'
import { Trail2Path } from './Trail2Path'
import { PlanBanner } from '../access/PlanNotices'
import { GroupCard } from '../access/GroupCard'
import { JourneyMap } from './JourneyMap'

interface Props {
  onOpenDay(n: number, trail?: string): void
  onOffer(origem: string): void
  onContinueJesus(): void
  onCollection(): void
  onBiblia(): void
  onStudies(): void
  onGroup(): void
}

function greeting(hour: number) {
  return hour < 12 ? 'Bom dia.' : hour < 18 ? 'Boa tarde.' : 'Boa noite.'
}

export function HomeScreen({ onOpenDay, onOffer, onContinueJesus, onCollection, onBiblia, onStudies, onGroup }: Props) {
  const founder = useFounder()
  // The crowned badge is for the limited Founder seats (paid access without a seat shows no lock either).
  const seat = isFounderSeat(useAccess().entitlements)
  const { progress, today, pendingGrace, clearPendingGrace } = useProgress()
  const toast = useToast()
  useEffect(() => {
    if (pendingGrace > 0) {
      soundManager.play('grace_used')
      toast('A Graça protegeu sua lâmpada.')
      clearPendingGrace()
    }
  }, [pendingGrace, clearPendingGrace, toast])

  const doneCount = Object.keys(progress.completedDays).length
  const next = nextDay(progress, TOTAL_DAYS)
  const nextAvailable = next !== null && isDayUnlocked(progress, next, today)
  const nextDayData = next !== null ? trilha.dias[next - 1] : null

  // Trilha 2 continues the path for Founders who finished the 7-day map.
  const onTrail2 = next === null && founder
  const t2Next = JESUS.visible.find((d) => !isDayCompleted(progress, d.n, JESUS.id))?.n ?? null
  const t2Open = t2Next !== null && isDayUnlocked(progress, t2Next, today, JESUS.id)

  // The round button tells what tapping does: play a lesson, see the next track, or wait for tomorrow.
  let cont: { eyebrow: string; title: string; sub: string; icon: 'play' | 'next' | 'done'; action(): void }
  if (onTrail2) {
    const d = JESUS.visible.find((x) => x.n === t2Next)
    if (!d) {
      const all = JESUS.visible.length === JESUS.total
      cont = { eyebrow: JESUS.titulo, title: all ? 'Trilha concluída' : 'Novos dias em breve', sub: all ? 'Você caminhou com Jesus do começo ao fim' : 'Os próximos dias estão sendo preparados', icon: 'done', action: () => toast(all ? 'Trilha concluída.' : 'Os próximos dias chegam em breve.') }
    } else if (t2Open) {
      cont = { eyebrow: `${JESUS.titulo} · Dia ${d.n}`, title: d.titulo, sub: d.passagens ?? 'Cerca de 6 minutos', icon: 'play', action: () => onOpenDay(d.n, JESUS.id) }
    } else {
      cont = { eyebrow: 'Lâmpada acesa hoje', title: `Dia ${d.n} libera amanhã`, sub: d.titulo, icon: 'done', action: () => toast('Libera amanhã. Volte para manter a lâmpada acesa.') }
    }
  } else if (next === null) {
    cont = { eyebrow: 'Trilha concluída', title: 'Você viu o mapa inteiro', sub: `Conheça a próxima trilha: ${ui.proximaTrilha.titulo}`, icon: 'next', action: () => onOffer('trilha_concluida') }
  } else if (nextAvailable) {
    cont = {
      eyebrow: doneCount ? 'Continue de onde parou' : 'Comece aqui',
      title: `Dia ${next} · ${nextDayData!.titulo}`,
      sub: 'Cerca de 6 minutos',
      icon: 'play',
      action: () => onOpenDay(next),
    }
  } else {
    cont = {
      eyebrow: 'Lâmpada acesa hoje',
      title: `Dia ${next} libera amanhã`,
      sub: 'Enquanto isso, revise um dia concluído',
      icon: 'done',
      action: () => toast('Libera amanhã. Volte para manter a lâmpada acesa.'),
    }
  }

  // The continue card wears the picture of the day it leads to (the last day once the track is done;
  // the Galilee for Trilha 2).
  const contDay = onTrail2 ? 6 : (next ?? TOTAL_DAYS)
  // Trilha 2: the cover of the day it leads to (or the last day), falling back to the trail's cover.
  const contPictures = onTrail2 ? dayCovers(JESUS, t2Next ?? JESUS.visible.at(-1)?.n ?? 1) : undefined

  function tapTrail2Day(n: number) {
    if (isDayCompleted(progress, n, JESUS.id) || isDayUnlocked(progress, n, today, JESUS.id)) return onOpenDay(n, JESUS.id)
    toast(n === t2Next ? 'Libera amanhã. Volte para manter a lâmpada acesa.' : 'Siga a trilha em ordem, um dia por vez.')
  }

  function tapDay(n: number) {
    if (isDayCompleted(progress, n) || isDayUnlocked(progress, n, today)) return onOpenDay(n)
    toast(n === next ? 'Libera amanhã. Volte para manter a lâmpada acesa.' : 'Siga a trilha em ordem, um dia por vez.')
  }

  return (
    // Bottom room = the nav bar (~66px + safe area) + 24px, so the last card scrolls fully into view.
    <section className="screen pb-[calc(90px+env(safe-area-inset-bottom))]">
      {/* Header in the Gatedo style: a dark pill with a gold edge, the logo and the journey's numbers. */}
      <header className="sticky top-0 z-[5] px-3.5 pb-2 pt-3">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[92px] bg-[linear-gradient(180deg,rgba(30,34,48,0.55)_0%,rgba(30,34,48,0.25)_40%,rgba(30,34,48,0)_100%)]" />
        <div className="app-header relative flex h-[58px] items-center justify-between gap-2 rounded-full pl-5 pr-2">
          <Logo variant="full" className="h-[38px] w-auto flex-none text-paper" />
          <div className="flex items-center gap-1.5">
            <Chip
              onExplain={() => toast('Lâmpada: acende a cada dia em que você conclui a lição liberada.')}
              label={`Lâmpada acesa: ${progress.streak} ${progress.streak === 1 ? 'dia seguido' : 'dias seguidos'}`}
              className={progress.streak > 0 ? 'bg-ember/30 text-[#F8C9AE] ring-1 ring-ember/50' : ''}
              icon={<LampIcon className="h-4 w-4" />}
              value={progress.streak}
            />
            <Chip
              onExplain={() => toast('Graça: protege sua lâmpada em 1 dia perdido por semana. Renova na segunda.')}
              label={`Graça: ${progress.grace}. Protege sua sequência 1 dia por semana`}
              className="text-[#CDD7AE]"
              icon={<GraceIcon className="h-4 w-4" />}
              value={progress.grace}
            />
            <Chip
              onExplain={() => toast('Passos: 50 por lição nova e 10 por atividade acertada de primeira.')}
              label={`${progress.steps} passos na jornada`}
              icon={<StepsIcon className="h-4 w-4" />}
              value={progress.steps}
            />
          </div>
        </div>
      </header>

      <div className="px-5 pb-1.5 pt-1">
        <h2 className="text-2xl">{greeting(new Date().getHours())}</h2>
        <p className="mt-1 text-sm text-ink-2">Sua caminhada pela Palavra continua aqui.</p>
      </div>

      <PlanBanner />
      <GroupCard onOpenPanel={onGroup} />


      <div className="flex items-baseline justify-between px-5 pb-1.5 pt-4">
        <h3 className="text-lg">{trilha.titulo}</h3>
        <span className="text-xs font-semibold text-ink-3">
          {doneCount} de {TOTAL_DAYS}
        </span>
      </div>

      {onTrail2 && <Trail2Path next={t2Next} onTapDay={tapTrail2Day} />}

      <JourneyMap doneCount={doneCount} nextAvailable={nextAvailable} onTapDay={tapDay} autoScroll={!onTrail2} blendFromTrail={onTrail2} />

      {/* Continue card: sits under the map and floats over it while you scroll, so it is on screen
          as soon as Home opens on the current day. */}
      <ContinueCard
        day={contDay}
        eyebrow={cont.eyebrow}
        title={cont.title}
        sub={cont.sub}
        iconDone={cont.icon === 'done'}
        pictures={contPictures}
        icon={cont.icon === 'play' ? <PlayIcon /> : cont.icon === 'next' ? <ArrowIcon /> : <CheckIcon size={20} className="text-white" />}
        onClick={cont.action}
      />

      <button
        type="button"
        onClick={onCollection}
        className="mx-5 mb-3 flex items-center gap-3.5 home-tile rounded-btn border border-line bg-card p-3.5 text-left"
      >
        <span className="grid h-11 w-11 flex-none place-items-center icon-3d icon-3d-gold rounded-xl">
          <StarIcon />
        </span>
        <span className="flex-1">
          <strong className="block text-sm">Coleção de símbolos</strong>
          <span className="text-xs text-ink-3">
            {progress.symbols.length} de {TOTAL_DAYS} desbloqueados
          </span>
        </span>
        <span className="text-ink-3" aria-hidden="true">›</span>
      </button>

      {/* A Bíblia em Ordem: the chronological plan, on its own screen. */}
      <button
        type="button"
        onClick={onBiblia}
        data-testid="abrir-biblia-em-ordem"
        className="mx-5 mb-3 flex flex-none items-center gap-3.5 home-tile rounded-btn border border-line bg-card p-3.5 text-left"
      >
        <span className="grid h-11 w-11 flex-none place-items-center icon-3d icon-3d-ember rounded-xl">
          <BookIcon />
        </span>
        <span className="flex-1">
          <strong className="block text-sm">Biblioteca da Bíblia</strong>
          <span className="text-xs text-ink-3">66 livros, mapa e plano cronológico</span>
        </span>
        <span className="text-ink-3" aria-hidden="true">›</span>
      </button>

      {/* Estudos por livro: the in-app store (docs/07, Prompt 9). */}
      <button
        type="button"
        onClick={onStudies}
        data-testid="abrir-loja-estudos"
        className="mx-5 mb-3 flex flex-none items-center gap-3.5 home-tile rounded-btn border border-line bg-card p-3.5 text-left"
      >
        <span className="grid h-11 w-11 flex-none place-items-center icon-3d icon-3d-olive rounded-xl">
          <BookIcon />
        </span>
        <span className="flex-1">
          <strong className="block text-sm">Estudos por livro</strong>
          <span className="text-xs text-ink-3">{founder ? 'Romanos, Salmos e Apocalipse · Preço de Fundador' : 'Romanos, Salmos e Apocalipse'}</span>
        </span>
        <span className="text-ink-3" aria-hidden="true">›</span>
      </button>

      {/* Direct access for subscribers who are still exploring the free map. */}
      {!onTrail2 && (
      <div
        className="relative mx-5 mt-1.5 aspect-[16/10] flex-none overflow-hidden rounded-card bg-ink text-paper shadow-[0_8px_22px_rgba(30,34,48,0.22)]"
        data-testid="trilha-2"
        data-locked={!founder}
      >
        <TrackCover id="capa-jesus-em-ordem" />
        {founder ? (
          seat && (
            <span className="absolute right-3.5 top-3.5 z-[2]">
              <FounderBadge />
            </span>
          )
        ) : (
          <span className="absolute right-3.5 top-3.5 z-[2] grid h-8 w-8 place-items-center rounded-full bg-ink/35 backdrop-blur-[2px]" aria-label="Trilha bloqueada" role="img">
            <LockIcon size={16} className="text-paper/75" />
          </span>
        )}
        <div className="relative flex h-full w-[62%] flex-col justify-center gap-1 py-4 pl-5 [text-shadow:0_1px_8px_rgba(20,22,32,0.55)]">
          <small className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-gold">{founder ? 'Sua próxima trilha' : ui.proximaTrilha.rotulo}</small>
          <h3 className="font-display text-[22px] font-semibold leading-tight">{ui.proximaTrilha.titulo}</h3>
          <p className="text-[12.5px] leading-snug text-paper/85">{founder ? 'Os Evangelhos na sequência dos acontecimentos.' : ui.proximaTrilha.resumo}</p>
          <button
            type="button"
            className="btn-shine mt-2 min-h-[44px] self-start rounded-full px-4 text-[13px] font-bold active:scale-[0.98]"
            onClick={founder ? onContinueJesus : () => onOffer('home')}
          >
            {founder ? 'Abrir Jesus em Ordem' : ui.proximaTrilha.botao}
          </button>
        </div>
      </div>
      )}
    </section>
  )
}

function Chip({ icon, value, label, className = '', onExplain }: { icon: React.ReactNode; value: number; label: string; className?: string; onExplain(): void }) {
  return (
    <button
      type="button"
      onClick={onExplain}
      title={label}
      aria-label={label}
      className={`relative flex min-h-[36px] items-center gap-1 rounded-full bg-white/10 px-2.5 py-[7px] text-[13px] font-bold text-gold-soft after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] ${className}`}
    >
      {icon}
      <span aria-hidden="true">{value}</span>
    </button>
  )
}


function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6.5C10.3 5.2 7.7 4.6 4 4.8v13c3.7-.2 6.3.4 8 1.7 1.7-1.3 4.3-1.9 8-1.7v-13c-3.7-.2-6.3.4-8 1.7z" fill="currentColor" fillOpacity={0.18} />
      <path d="M12 6.5v13" />
    </svg>
  )
}
