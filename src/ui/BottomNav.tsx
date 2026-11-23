// Bottom navigation, in the style of the Gatedo app: a dark ink bar from edge to edge (square
// ends, running to the bottom of the screen), gold icons, and a raised round button in a notch at
// the center with the lamp's flame. The flame opens today's lesson; it glows steady once today's
// lesson is done and breathes softly while it's still waiting.
import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Logo } from './Logo'
import { NavDiary, NavGuide, NavJourney, NavProfile } from './icons'

export type Tab = 'home' | 'diary' | 'guide' | 'profile'

const TABS: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  { id: 'home', label: 'Jornada', icon: (a) => <NavJourney active={a} /> },
  { id: 'diary', label: 'Diário', icon: (a) => <NavDiary active={a} /> },
  { id: 'guide', label: 'GuiaVerbo', icon: (a) => <NavGuide active={a} /> },
  { id: 'profile', label: 'Perfil', icon: (a) => <NavProfile active={a} /> },
]

interface Props {
  current: Tab
  onChange(tab: Tab): void
  /** The flame: opens today's lesson (or the journey, when there is none). */
  onToday(): void
  /** Today's lesson is done: the flame is lit. */
  litToday: boolean
}

export function BottomNav({ current, onChange, onToday, litToday }: Props) {
  const reduced = useReducedMotion()
  const [ripple, setRipple] = useState(0)

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

      {/* The flame: today's lesson. */}
      <div className="absolute left-1/2 top-[-26px] z-[3] -translate-x-1/2">
        <motion.button
          type="button"
          onClick={() => {
            setRipple((n) => n + 1)
            onToday()
          }}
          aria-label={litToday ? 'Lição de hoje concluída. Abrir a jornada' : 'Abrir a lição de hoje'}
          data-testid="chama-central"
          data-acesa={litToday}
          whileTap={reduced ? undefined : { scale: 0.9 }}
          className={`nav-flame grid h-[54px] w-[54px] place-items-center rounded-full ${litToday ? 'is-lit' : ''}`}
        >
          {ripple > 0 && <span key={ripple} className="nav-flame-ripple" aria-hidden="true" />}
          <motion.span
            className="relative z-[1] block"
            animate={reduced || litToday ? undefined : { scale: [1, 1.07, 1], y: [0, -1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Logo variant="mark" title={null} className={`h-[32px] w-auto ${litToday ? 'drop-shadow-[0_0_10px_rgba(242,190,110,0.85)]' : 'opacity-90'}`} />
          </motion.span>
        </motion.button>
      </div>
    </nav>
  )
}
