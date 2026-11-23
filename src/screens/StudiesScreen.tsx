// Estudos por livro (docs/07, Prompt 9).
//  - StudiesScreen, the "Loja de estudos": each study with cover, description, number of lessons and
//    price. Founders see the price 30% lower with the "Preço de Fundador" seal. The buy button opens
//    the study's checkout (config/checkout.json); access arrives through the payment webhook.
//  - StudyScreen: the lessons of a study the person owns, opened one per day, in order.
import { useEffect, useState } from 'react'
import { useAccess } from '../access/AccessContext'
import { founderDiscount, studyPrice } from '../access/rules'
import { formatBRL, studyCheckout } from '../access/studies'
import { useAuth } from '../auth/AuthContext'
import { STUDIES, type StudyMeta } from '../content/trails'
import { completedOf, isDayCompleted, isDayUnlocked } from '../game/progress'
import { TrackCover } from '../media/TrackCover'
import { useProgress } from '../store/ProgressContext'
import { BackIcon, CheckIcon, LockIcon, PlayIcon } from '../ui/icons'
import { ScrollReward, WaxSeal } from '../ui/ScrollReward'
import { useToast } from '../ui/Toast'

// The closing scroll opens by itself once per study; after that, from the seal on the study screen.
const SEEN = (id: string) => `pao:estudo-mensagem:${id}`
function seenScroll(id: string): boolean {
  try {
    return localStorage.getItem(SEEN(id)) === '1'
  } catch {
    return true
  }
}
function markScrollSeen(id: string) {
  try {
    localStorage.setItem(SEEN(id), '1')
  } catch {
    /* ignore */
  }
}

interface StoreProps {
  onBack(): void
  onOpenStudy(id: string): void
}

export function StudiesScreen({ onBack, onOpenStudy }: StoreProps) {
  const { entitlements, podeAcessar } = useAccess()
  const { session } = useAuth()
  const toast = useToast()
  const discount = founderDiscount(entitlements)
  const { progress } = useProgress()

  function buy(meta: StudyMeta) {
    const url = studyCheckout(meta.id, discount > 0, session?.user.id ?? null)
    if (!url) return toast('Este estudo ainda não está à venda. Avisaremos quando abrir.')
    window.open(url, '_blank', 'noopener')
  }

  return (
    <section className="screen bg-paper pb-[calc(90px+env(safe-area-inset-bottom))]" data-testid="loja-estudos">
      <div className="flex-none">
        <header className="flex items-center gap-2 px-3 pt-3">
          <button type="button" onClick={onBack} aria-label="Voltar" className="grid h-11 w-11 place-items-center rounded-full text-ink-2">
            <BackIcon />
          </button>
        </header>
        <div className="px-5 pb-2">
          <h2 className="text-[28px] leading-tight">Estudos por livro</h2>
          <p className="mt-1 text-sm text-ink-2">Um livro da Bíblia de cada vez, com calma, no mesmo formato das trilhas.</p>
        </div>

        <ul className="mt-3 space-y-4 px-5">
          {STUDIES.map(({ meta, trail }) => {
            const owned = podeAcessar(trail.content)
            const price = studyPrice(meta.preco, discount)
            const ready = trail.visible.length > 0
            const finished = trail.outline.length > 0 && trail.outline.every((d) => completedOf(progress, trail.id)[d.n])
            return (
              <li key={meta.id} className="overflow-hidden rounded-card bg-card shadow-card" data-estudo={meta.id} data-comprado={owned}>
                <div className="relative aspect-[16/9] bg-ink text-paper">
                  <TrackCover id={meta.capa} />
                  <div className="absolute inset-x-0 bottom-0 z-[1] p-4">
                    <small className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-gold-soft">{meta.totalDias} lições</small>
                    <strong className="block max-w-[70%] font-display text-[22px] font-semibold leading-tight">{meta.titulo}</strong>
                  </div>
                  {owned && (
                    <span className="absolute right-3.5 top-3.5 z-[2] rounded-full bg-gold px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink">
                      {finished ? 'Concluído' : 'Seu estudo'}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[14px] leading-relaxed text-ink-2">{meta.descricao}</p>
                  {owned ? (
                    <button
                      type="button"
                      onClick={() => onOpenStudy(meta.id)}
                      className="btn-shine mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-btn px-4 text-[15px] font-bold"
                    >
                      {ready ? 'Abrir estudo' : 'Ver as lições'}
                    </button>
                  ) : (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1" data-testid="preco-estudo">
                        {discount > 0 && (
                          <span className="mb-1 inline-block rounded-full bg-gold/20 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-gold-ink">
                            Preço de Fundador
                          </span>
                        )}
                        <span className="flex items-baseline gap-2">
                          <strong className="font-display text-[24px] leading-none">{formatBRL(price)}</strong>
                          {discount > 0 && (
                            <s className="text-[13px] text-ink-3" aria-label={`de ${formatBRL(meta.preco)}`}>
                              {formatBRL(meta.preco)}
                            </s>
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => buy(meta)}
                        className="btn-shine min-h-12 rounded-btn px-5 text-[15px] font-bold"
                      >
                        Comprar
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="px-5 pt-4 text-center text-[12px] text-ink-3">Pagamento único. O estudo fica na sua conta.</p>
      </div>
    </section>
  )
}

interface StudyProps {
  id: string
  onBack(): void
  onOpenDay(n: number): void
}

export function StudyScreen({ id, onBack, onOpenDay }: StudyProps) {
  const study = STUDIES.find((s) => s.meta.id === id)
  const { podeAcessar } = useAccess()
  const { progress, today } = useProgress()
  const toast = useToast()
  const finished = Boolean(study && study.trail.outline.length > 0 && study.trail.outline.every((d) => completedOf(progress, study.trail.id)[d.n]))
  const [scrollOpen, setScrollOpen] = useState(false)
  useEffect(() => {
    if (!finished || !study?.meta.conclusao || seenScroll(id)) return
    // After the screen's own transition, so the scroll is the thing the person sees.
    const t = window.setTimeout(() => {
      markScrollSeen(id)
      setScrollOpen(true)
    }, 500)
    return () => window.clearTimeout(t)
  }, [finished, id, study])
  if (!study) return null
  const { meta, trail } = study
  const access = podeAcessar(trail.content)
  const completed = completedOf(progress, trail.id)
  const done = trail.outline.filter((d) => completed[d.n]).length
  const next = trail.visible.find((d) => !completed[d.n])

  function tap(n: number) {
    if (!access) return onBack()
    if (isDayCompleted(progress, n, trail.id) || isDayUnlocked(progress, n, today, trail.id)) return onOpenDay(n)
    toast(n === next?.n ? 'Libera amanhã. Uma lição por dia.' : 'Siga o estudo em ordem, uma lição por vez.')
  }

  return (
    <section className="screen bg-paper pb-[calc(90px+env(safe-area-inset-bottom))]" data-testid="estudo" data-estudo={id}>
      <div className="flex-none">
        <div className="relative aspect-[16/10] bg-ink text-paper">
          <TrackCover id={meta.capa} />
          <button type="button" onClick={onBack} aria-label="Voltar" className="absolute left-3 top-3 z-[2] grid h-11 w-11 place-items-center rounded-full bg-ink/40 text-paper">
            <BackIcon />
          </button>
          <div className="absolute inset-x-0 bottom-0 z-[1] p-5">
            <small className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-gold-soft">Estudo por livro</small>
            <h2 className="max-w-[75%] text-[26px] leading-tight text-paper">{meta.titulo}</h2>
            <p className="mt-1 max-w-[75%] text-[13px] text-paper/75">{meta.subtitulo}</p>
          </div>
        </div>

        {/* Finished: the seal, and the closing message again. */}
        {finished && meta.conclusao && (
          <button
            type="button"
            onClick={() => setScrollOpen(true)}
            data-testid="selo-estudo"
            className="mx-5 mt-4 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-card bg-ink p-3.5 text-left text-paper shadow-card"
          >
            <WaxSeal size={48} />
            <span className="min-w-0 flex-1">
              <strong className="block font-display text-[17px] leading-tight">{meta.conclusao.selo}</strong>
              <span className="text-[12.5px] text-paper/70">Estudo concluído · Rever a mensagem</span>
            </span>
            <span className="text-gold-soft" aria-hidden="true">›</span>
          </button>
        )}

        <div className="mx-5 mt-4 flex items-baseline justify-between">
          <h3 className="text-lg">Lições</h3>
          <span className="text-xs font-semibold text-ink-3">
            {done} de {meta.totalDias} concluídas
          </span>
        </div>

        {trail.visible.length === 0 ? (
          <p className="mx-5 mt-2 rounded-card border border-dashed border-line p-4 text-[14px] text-ink-2">
            As lições deste estudo estão sendo preparadas. Assim que a primeira ficar pronta, ela aparece aqui.
          </p>
        ) : (
          <ol className="mx-5 mt-2 divide-y divide-line overflow-hidden rounded-card bg-card shadow-card">
            {trail.visible.map((d) => {
              const isDone = Boolean(completed[d.n])
              const open = access && !isDone && isDayUnlocked(progress, d.n, today, trail.id)
              return (
                <li key={d.n}>
                  <button
                    type="button"
                    onClick={() => tap(d.n)}
                    aria-label={`Lição ${d.n}: ${d.titulo} (${isDone ? 'concluída' : open ? 'disponível' : 'bloqueada'})`}
                    className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left"
                  >
                    <span
                      className={`grid h-9 w-9 flex-none place-items-center rounded-full text-sm font-bold ${
                        isDone ? 'bg-olive text-white' : open ? 'play-shine' : 'bg-paper-2 text-ink-3'
                      }`}
                    >
                      {isDone ? <CheckIcon size={18} /> : open ? <PlayIcon /> : d.n}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[15px]">{d.titulo}</strong>
                      <span className="text-[12px] text-ink-3">
                        Lição {d.n}
                        {d.passagens ? ` · ${d.passagens}` : ''}
                        {d.status !== 'publicado' && import.meta.env.DEV ? ` · ${d.status}` : ''}
                      </span>
                    </span>
                    {!access && <LockIcon size={16} className="text-ink-3" />}
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </div>
      {meta.conclusao && (
        <ScrollReward open={scrollOpen} heading={`${meta.titulo.split(':')[0]} concluído`} message={meta.conclusao} onClose={() => setScrollOpen(false)} />
      )}
    </section>
  )
}
