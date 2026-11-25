import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import landing from '../../../content/landing.json'
import livrosJson from '../../../content/livros.json'
import { lpSound } from '../state'
import { useReveal } from '../useReveal'

const content = landing.organizacao
type Group = (typeof content.grupos)[number]
type GroupId = Group['id']

interface Book {
  id: string
  nome: string
  bloco: string
  testamento: 'AT' | 'NT'
}

const BOOKS = livrosJson.livros as Book[]
const POSITION = [
  { x: 20, y: 28 },
  { x: 50, y: 18 },
  { x: 80, y: 28 },
  { x: 84, y: 50 },
  { x: 80, y: 72 },
  { x: 50, y: 82 },
  { x: 20, y: 72 },
  { x: 16, y: 50 },
] as const

function connectorPath(id: GroupId, x: number, y: number) {
  if (id === 'lei' || id === 'cartas') return `M500 325 L380 ${y} L${x} ${y}`
  if (id === 'poeticos' || id === 'evangelhos') return `M500 325 L620 ${y} L${x} ${y}`
  return `M500 325 L${x} ${y}`
}

function booksFor(group: Group) {
  return BOOKS.filter((book) => group.blocos.some((block) => block === book.bloco))
}

function GroupIcon({ id }: { id: GroupId }) {
  const common = { width: 25, height: 25, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.65, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (id === 'lei') return <svg {...common}><path d="M7 4.5c-1.6.4-2.5 1.4-2.5 3v11c0 .8.7 1.5 1.5 1.5h5V7.2C10 5.5 8.7 4.5 7 4.5Z"/><path d="M17 4.5c1.6.4 2.5 1.4 2.5 3v11c0 .8-.7 1.5-1.5 1.5h-5V7.2c1-1.7 2.3-2.7 4-2.7Z"/><path d="M8 9h1M15 9h1M8 12h1M15 12h1"/></svg>
  if (id === 'historicos') return <svg {...common}><path d="M3 9h18M5 9V6l7-3 7 3v3M6 10v8M10 10v8M14 10v8M18 10v8M3 21h18M4 18h16"/></svg>
  if (id === 'poeticos') return <svg {...common}><path d="M9 19c-3 0-5-2-5-5 0-2.5 1.6-4.5 4-5.4M15 19c3 0 5-2 5-5 0-2.5-1.6-4.5-4-5.4M8 5v10M16 5v10M8 6c2 2.4 6 2.4 8 0M8 12c2 1.4 6 1.4 8 0"/></svg>
  if (id === 'profetas') return <svg {...common}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"/><path d="M8 8h7M8 12h7M8 16h4"/><path d="M19 7a3 3 0 0 0-3-3"/></svg>
  if (id === 'evangelhos') return <svg {...common}><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5ZM20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z"/><path d="M8 7h1M15 7h1"/></svg>
  if (id === 'atos') return <svg {...common}><path d="M4 20h16M6 20V10l6-4 6 4v10M9 20v-5h6v5M12 6V2M10 4h4"/></svg>
  if (id === 'cartas') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>
  return <svg {...common}><path d="M12 2 9.5 8.2 3 9l5 4.2L6.5 20 12 16.5 17.5 20 16 13.2 21 9l-6.5-.8L12 2Z"/></svg>
}

function GroupButton({ group, active, visited, onSelect, compact = false }: { group: Group; active: boolean; visited: boolean; onSelect(): void; compact?: boolean }) {
  const count = booksFor(group).length
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`org-node group relative min-h-[76px] overflow-hidden rounded-[18px] border bg-card text-left shadow-card transition-[transform,border-color,box-shadow,opacity] duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 ${compact ? 'w-full p-3.5' : 'w-[168px] p-4'} ${active ? 'z-10 scale-[1.035]' : 'hover:-translate-y-1'}`}
      style={{ borderColor: active ? group.cor : `${group.cor}42`, boxShadow: active ? `0 16px 34px -18px ${group.cor}, inset 0 3px 0 ${group.cor}` : undefined }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: group.cor }} />
      <span className="flex items-start gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl" style={{ color: group.cor, backgroundColor: `${group.cor}14` }}>
          <GroupIcon id={group.id} />
        </span>
        <span className="min-w-0">
          <strong className="block text-[15px] leading-tight text-ink">{group.nome}</strong>
          <span className="mt-1 block text-[13px] font-semibold text-ink-3">{count} {count === 1 ? 'livro' : 'livros'}</span>
        </span>
      </span>
      {visited && !active && <span aria-label="Explorado" className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full" style={{ backgroundColor: group.cor }} />}
    </button>
  )
}

export function BookOrganization() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)
  const reduced = useReducedMotion()
  const groups = content.grupos
  const [activeId, setActiveId] = useState<GroupId>(groups[0].id)
  const [visited, setVisited] = useState<Set<GroupId>>(() => new Set([groups[0].id]))
  const active = groups.find((group) => group.id === activeId) ?? groups[0]
  const activeBooks = useMemo(() => booksFor(active), [active])

  function select(id: GroupId) {
    setActiveId(id)
    setVisited((current) => new Set(current).add(id))
    lpSound.play('tap')
  }

  return (
    <section id="organizacao" ref={root} className="relative overflow-hidden bg-paper-2 px-5 py-20 text-ink md:px-10 md:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(226,197,128,0.24),transparent_68%)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p data-reveal className="text-sm font-bold tracking-[0.16em] text-gold-ink">{content.eyebrow}</p>
          <h2 data-reveal className="mt-3 font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.015em] md:text-[44px]">{content.titulo}</h2>
          <p data-reveal className="mx-auto mt-5 max-w-[46em] text-[16px] leading-[1.65] text-ink-2 md:text-lg">{content.texto}</p>
        </div>

        <div data-reveal className="mt-12 md:hidden">
          <BibleHub active={active} />
          <p className="mt-7 text-center text-sm font-semibold text-ink-3">{content.instrucao}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {groups.map((group) => <GroupButton key={group.id} group={group} active={group.id === activeId} visited={visited.has(group.id)} onSelect={() => select(group.id)} compact />)}
          </div>
        </div>

        <div data-reveal className="relative mt-8 hidden h-[650px] md:block" aria-label="Mapa interativo dos grupos de livros da Bíblia">
          <svg viewBox="0 0 1000 650" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {groups.map((group, index) => {
              const p = POSITION[index]
              const x = p.x * 10
              const y = p.y * 6.5
              const isActive = group.id === activeId
              return (
                <motion.path
                  key={group.id}
                  d={connectorPath(group.id, x, y)}
                  fill="none"
                  stroke={isActive ? group.cor : '#B8A98D'}
                  strokeOpacity={isActive ? 0.95 : 0.28}
                  strokeWidth={isActive ? 5 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={false}
                  animate={{ pathLength: isActive ? 1 : 0.92 }}
                  transition={{ duration: reduced ? 0 : 0.55, ease: 'easeOut' }}
                />
              )
            })}
          </svg>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><BibleHub active={active} /></div>
          {groups.map((group, index) => {
            const p = POSITION[index]
            return (
              <div key={group.id} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}>
                <GroupButton group={group} active={group.id === activeId} visited={visited.has(group.id)} onSelect={() => select(group.id)} />
              </div>
            )
          })}
        </div>

        <div className="mx-auto mt-6 max-w-4xl md:-mt-5">
          <div className="mb-4 flex items-center justify-center gap-3 text-sm font-semibold text-ink-3">
            <span>{visited.size} de {groups.length} {content.progresso}</span>
            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-line" aria-hidden="true"><span className="block h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${(visited.size / groups.length) * 100}%` }} /></span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={active.id}
              initial={{ opacity: 0, y: reduced ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -6 }}
              transition={{ duration: reduced ? 0.12 : 0.35 }}
              className="relative overflow-hidden rounded-card border border-line bg-card p-5 shadow-card md:p-7"
              aria-live="polite"
            >
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: active.cor }} />
              <div className="md:grid md:grid-cols-[0.82fr_1.18fr] md:gap-8">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-xl" style={{ color: active.cor, backgroundColor: `${active.cor}14` }}><GroupIcon id={active.id} /></span>
                    <div>
                      <p className="text-[13px] font-bold uppercase tracking-[0.13em]" style={{ color: active.cor }}>{active.rotulo}</p>
                      <h3 className="font-display text-[26px] font-semibold leading-tight md:text-[30px]">{active.nome}</h3>
                    </div>
                  </div>
                  <p className="mt-4 text-[16px] leading-relaxed text-ink-2">{active.funcao}</p>
                  <p className="mt-3 text-sm font-semibold text-ink-3">{active.testamento} · {activeBooks.length} {activeBooks.length === 1 ? 'livro' : 'livros'}</p>
                </div>
                <div className="mt-5 border-t border-line pt-5 md:mt-0 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                  <p className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-ink-3">Livros deste grupo</p>
                  <div className="flex flex-wrap gap-2">
                    {activeBooks.map((book, index) => (
                      <motion.span
                        key={book.id}
                        initial={{ opacity: 0, y: reduced ? 0 : 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: reduced ? 0 : Math.min(index * 0.025, 0.35) }}
                        className="rounded-lg border bg-paper px-2.5 py-1.5 text-[14px] font-semibold text-ink"
                        style={{ borderColor: `${active.cor}3D` }}
                      >
                        {book.nome}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.article>
          </AnimatePresence>
          <p className="mx-auto mt-8 max-w-2xl text-center font-serif text-xl italic leading-relaxed text-ink-2 md:text-2xl">{content.transicao}</p>
        </div>
      </div>
    </section>
  )
}

function BibleHub({ active }: { active: Group }) {
  return (
    <div className="relative mx-auto grid h-[174px] w-[174px] place-items-center rounded-full border-[3px] border-gold/70 bg-[radial-gradient(circle_at_42%_35%,#FFF9EB,#EFE1C4)] text-center shadow-[0_20px_50px_-24px_rgba(74,49,20,0.8),inset_0_0_0_8px_rgba(184,137,58,0.08)] md:h-[196px] md:w-[196px]">
      <span aria-hidden="true" className="absolute inset-3 rounded-full border border-gold/25" />
      <div className="relative px-5">
        <span className="mx-auto mb-1 grid h-9 w-12 place-items-center text-gold-ink"><GroupIcon id={active.id} /></span>
        <strong className="block font-display text-[27px] font-semibold leading-none md:text-[31px]">{content.centroTitulo}</strong>
        <span className="mt-1 block text-sm font-bold text-gold-ink">{content.centroLivros}</span>
        <span className="mt-2 block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">{content.centroMensagem}</span>
      </div>
      <motion.span key={active.id} aria-hidden="true" className="absolute -inset-2 rounded-full border-2" style={{ borderColor: active.cor }} initial={{ opacity: 0.7, scale: 0.94 }} animate={{ opacity: 0, scale: 1.08 }} transition={{ duration: 0.7 }} />
    </div>
  )
}
