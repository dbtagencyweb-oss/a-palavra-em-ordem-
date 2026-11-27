// Bottom navigation, in the style of the Gatedo app: a dark ink bar from edge to edge (square
// ends, running to the bottom of the screen), gold icons, and a raised round button in a notch at
// the center for quick Scripture lookup.
import { motion, useReducedMotion } from 'framer-motion'
import { FlameSearchIcon, NavDiary, NavJourney, NavProfile, NavStudies } from './icons'

export type Tab = 'home' | 'diary' | 'guide' | 'profile'

const TABS: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  { id: 'home', label: 'Jornada', icon: (a) => <NavJourney active={a} /> },
  { id: 'diary', label: 'Diário', icon: (a) => <NavDiary active={a} /> },
  { id: 'guide', label: 'Estudos', icon: (a) => <NavStudies active={a} /> },
  { id: 'profile', label: 'Perfil', icon: (a) => <NavProfile active={a} /> },
]

interface Props {
  current: Tab
  onChange(tab: Tab): void
  onSearch(): void
  onJesus?(): void
}

export function BottomNav({ current, onChange, onSearch, onJesus }: Props) {
  const reduced = useReducedMotion()

  const tab = (t: (typeof TABS)[number]) => {
    const active = t.id === current
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => !active && onChange(t.id)}
        aria-current={active ? 'page' : undefined}
        className={`nav-tab relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-[3px] text-[10.5px] font-bold tracking-[0.02em] ${active ? 'is-active' : ''}`}
      >
        <motion.span whileTap={reduced ? undefined : { scale: 0.8 }} transition={{ type: 'spring', stiffness: 620, damping: 24 }} className="grid place-items-center">
          {t.icon(active)}
        </motion.span>
        {t.label}
        {active && <motion.span layoutId="nav-indicator" className="nav-indicator" transition={{ type: 'spring', stiffness: 430, damping: 38 }} />}
      </button>
    )
  }

  return (
    <nav className="absolute inset-x-0 bottom-0 z-[15]" aria-label="Navegação principal" data-testid="barra-inferior">
      <div className="nav-bar">
        {/* Gold hairline along the top edge, dipping with the notch. */}
        <svg className="pointer-events-none absolute left-1/2 top-0 h-[36px] w-[100px] -translate-x-1/2" viewBox="0 0 100 36" aria-hidden="true">
          <path d="M0 0.6C18 0.6 21 33.6 50 33.6C79 33.6 82 0.6 100 0.6" fill="none" stroke="rgba(226,197,128,0.4)" strokeWidth="1" />
        </svg>
        <div className="relative z-[2] flex h-[60px] items-stretch px-1">
          {TABS.slice(0, 2).map(tab)}
          <div className="w-[80px] flex-none" aria-hidden="true" />
          {TABS.slice(2).map(tab)}
        </div>
      </div>

      <div className="absolute left-1/2 top-[-26px] z-[3] -translate-x-1/2">
        <motion.button
          type="button"
          onClick={onSearch}
          aria-label="Buscar na Bíblia"
          aria-haspopup="dialog"
          whileTap={reduced ? undefined : { scale: 0.9 }}
          className="nav-flame grid h-[54px] w-[54px] place-items-center rounded-full text-gold-soft"
        >
          <FlameSearchIcon className="h-[42px] w-[42px]" />
        </motion.button>
      </div>
      {onJesus && (
        <button type="button" className="nav-jesus-shortcut" onClick={onJesus} aria-label="Ir para Jesus em Ordem" title="Jesus em Ordem">
          <span>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 9 7 7 7-7" />
            </svg>
          </span>
        </button>
      )}
    </nav>
  )
}
