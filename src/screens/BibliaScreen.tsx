// A Bíblia em Ordem: the chronological plan in monthly stages (docs/07, Prompt 4).
// Chapters read so far (of the whole Bible), a mini map with the book and era the person is in,
// the grid of stages (open ones and the ones coming, with their expected date) and the days of the
// current stage. Without access: the plan is shown locked, with the Offer.
import { useAccess } from '../access/AccessContext'
import { BIBLIA, bibliaPlace, chaptersOfDay, ETAPAS, MAPA, TOTAL_CHAPTERS } from '../content/trails'
import { completedOf, isDayCompleted, isDayUnlocked } from '../game/progress'
import { imageSmallPath } from '../media/paths'
import { useProgress } from '../store/ProgressContext'
import { BackIcon, CheckIcon, LockIcon, PlayIcon } from '../ui/icons'
import { eraOf } from '../ui/eras'
import { useToast } from '../ui/Toast'

interface Props {
  onBack(): void
  onOpenDay(n: number): void
  onOffer(origem: string): void
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })

export function BibliaScreen({ onBack, onOpenDay, onOffer }: Props) {
  const { podeAcessar } = useAccess()
  const { progress, today } = useProgress()
  const toast = useToast()
  const access = podeAcessar('biblia-em-ordem')
  const completed = completedOf(progress, BIBLIA.id)
  const read = BIBLIA.outline.filter((d) => completed[d.n]).reduce((s, d) => s + chaptersOfDay(d), 0)
  const next = BIBLIA.visible.find((d) => !completed[d.n]) ?? null
  const place = bibliaPlace(next?.n ?? BIBLIA.visible.at(-1)?.n ?? 1)
  const etapaAtual = ETAPAS.find((e) => e.dias.some((d) => d.n === next?.n)) ?? ETAPAS.find((e) => e.aberta) ?? ETAPAS[0]

  function tap(n: number) {
    if (!access) return onOffer('biblia_em_ordem')
    if (isDayCompleted(progress, n, BIBLIA.id) || isDayUnlocked(progress, n, today, BIBLIA.id)) return onOpenDay(n)
    toast(n === next?.n ? 'Libera amanhã. Volte para manter a lâmpada acesa.' : 'Siga o plano em ordem, um dia por vez.')
  }

  return (
    <section className="screen bg-paper pb-[calc(90px+env(safe-area-inset-bottom))]" data-testid="biblia-em-ordem">
      {/* One block that never shrinks: inside the screen's flex column, loose children would. */}
      <div className="flex-none">
      <header className="flex items-center gap-2 px-3 pt-3">
        <button type="button" onClick={onBack} aria-label="Voltar" className="grid h-11 w-11 place-items-center rounded-full text-ink-2">
          <BackIcon />
        </button>
      </header>
      <div className="px-5 pb-2">
        <h2 className="text-[28px] leading-tight">{BIBLIA.titulo}</h2>
        <p className="mt-1 text-sm text-ink-2">{BIBLIA.subtitulo}.</p>
      </div>

      {/* Chapters read, of the whole Bible. */}
      <div className="mx-5 mt-3 rounded-card bg-card p-4 shadow-card" role="group" aria-label="Capítulos lidos">
        <div className="flex items-baseline justify-between">
          <strong className="font-display text-[30px] leading-none">{read}</strong>
          <span className="text-xs font-semibold text-ink-3">de {TOTAL_CHAPTERS.toLocaleString('pt-BR')} capítulos da Bíblia</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL_CHAPTERS} aria-valuenow={read}>
          <div className="h-full rounded-full bg-[linear-gradient(90deg,#B8893A,#E2C580)]" style={{ width: `${Math.max(read ? 1.5 : 0, (read / TOTAL_CHAPTERS) * 100)}%` }} />
        </div>
      </div>

      {/* Mini map: the seven eras of the story, with where the reading is now. */}
      <div className="mx-5 mt-3 rounded-card bg-ink p-4 text-paper shadow-card" aria-label={place ? `Você está em ${place.nome}, na era ${MAPA.outline[place.era - 1]?.fase}` : 'Mapa'}>
        <small className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-gold-soft/80">Você está em</small>
        <p className="font-display text-xl font-semibold">
          {place?.nome ?? '—'} <span className="text-paper/60">· {MAPA.outline[(place?.era ?? 1) - 1]?.fase}</span>
        </p>
        <div className="mt-3 flex gap-1" aria-hidden="true">
          {MAPA.outline.map((d) => {
            const here = d.n === place?.era
            return (
              <span key={d.n} className="relative h-9 flex-1 overflow-hidden rounded-md" style={{ background: eraOf(d.n).mid, opacity: here ? 1 : 0.35 }}>
                <img src={imageSmallPath(`era-d${d.n}`)} alt="" loading="lazy" className="h-full w-full object-cover opacity-60 mix-blend-luminosity" />
                {here && <span className="absolute inset-0 ring-2 ring-inset ring-gold-soft" />}
              </span>
            )
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-paper/55">
          <span>{MAPA.outline[0]?.fase}</span>
          <span>{MAPA.outline.at(-1)?.fase}</span>
        </div>
      </div>

      {/* Stages. */}
      <h3 className="px-5 pb-2 pt-6 text-lg">Etapas</h3>
      <ul className="mx-5 grid grid-cols-2 gap-2.5">
        {ETAPAS.map((e) => {
          const done = e.dias.filter((d) => completed[d.n]).length
          return (
            <li
              key={e.id}
              className={`rounded-card p-3.5 ${e.aberta ? 'bg-card shadow-card' : 'border border-dashed border-line text-ink-3'}`}
              data-etapa={e.n}
              data-aberta={e.aberta}
            >
              <small className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold-ink">Etapa {e.n}</small>
              <strong className="block font-display text-lg leading-tight text-ink">{e.nome}</strong>
              <span className="block text-[12px] leading-snug">{e.livros}</span>
              <span className="mt-2 block text-[12px] font-semibold">
                {e.aberta ? `${done} de ${e.dias.length} dias` : e.previsao ? `Em breve · ${fmt(e.previsao)}` : 'Em breve'}
              </span>
            </li>
          )
        })}
      </ul>

      {/* Days of the current stage. */}
      {etapaAtual?.aberta && (
        <>
          <h3 className="px-5 pb-2 pt-6 text-lg">
            Etapa {etapaAtual.n} · {etapaAtual.nome}
          </h3>
          <ol className="mx-5 divide-y divide-line overflow-hidden rounded-card bg-card shadow-card">
            {etapaAtual.dias
              .filter((d) => BIBLIA.visible.some((v) => v.n === d.n))
              .map((d) => {
                const done = Boolean(completed[d.n])
                const open = access && !done && isDayUnlocked(progress, d.n, today, BIBLIA.id)
                return (
                  <li key={d.n}>
                    <button
                      type="button"
                      onClick={() => tap(d.n)}
                      aria-label={`Dia ${d.n - etapaAtual.offset}: ${d.titulo} (${done ? 'lido' : open ? 'disponível' : 'bloqueado'})`}
                      className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left"
                    >
                      <span
                        className={`grid h-9 w-9 flex-none place-items-center rounded-full text-sm font-bold ${
                          done ? 'bg-olive text-white' : open ? 'play-shine' : 'bg-paper-2 text-ink-3'
                        }`}
                      >
                        {done ? <CheckIcon size={18} /> : open ? <PlayIcon /> : d.n - etapaAtual.offset}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-[15px]">{d.titulo}</strong>
                        <span className="text-[12px] text-ink-3">
                          Dia {d.n - etapaAtual.offset}
                          {chaptersOfDay(d) ? ` · ${chaptersOfDay(d)} ${chaptersOfDay(d) === 1 ? 'capítulo' : 'capítulos'}` : ''}
                          {d.status !== 'publicado' && import.meta.env.DEV ? ` · ${d.status}` : ''}
                        </span>
                      </span>
                      {!access && <LockIcon size={16} className="text-ink-3" />}
                    </button>
                  </li>
                )
              })}
          </ol>
        </>
      )}

      {!access && (
        <div className="mx-5 mt-5 rounded-card bg-ink p-4 text-paper">
          <p className="text-[14px] text-paper/85">A Bíblia em Ordem faz parte do Acesso Fundador.</p>
          <button type="button" onClick={() => onOffer('biblia_em_ordem')} className="btn-shine mt-3 min-h-11 w-full rounded-btn px-4 text-sm font-bold">
            Conhecer o Acesso Fundador
          </button>
        </div>
      )}
      </div>
    </section>
  )
}
