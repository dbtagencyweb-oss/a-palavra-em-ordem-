// The app's icon set: one 24px grid, 1.8 stroke, round caps and joins.
// Most icons are "duotone": a line drawing plus a soft tinted fill (ACCENT) that gives them a little volume,
// the way the gold medallions and the paper cards do. Navigation icons fill that accent in when active.
import { useId, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

type P = { className?: string; size?: number }
type NavP = { active?: boolean }

const ACCENT = 0.18

function Svg({ size = 24, className, children, stroke = 1.8 }: P & { children: ReactNode; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// ---- Actions ----

export function FlameSearchIcon({ className }: P) {
  const gold = useId()
  const reduced = useReducedMotion()
  const loop = { duration: 3, repeat: Infinity, ease: 'easeInOut' } as const
  return (
    <svg className={className} viewBox="0 0 42 42" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gold} x1="7" y1="7" x2="28" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#AD8747" />
          <stop offset=".57" stopColor="#E5C681" />
          <stop offset="1" stopColor="#D5AD64" />
        </linearGradient>
      </defs>
      {/* The arc is centered at (21, 21), with a gap at the top for the flame. */}
      <motion.path d="M14.25 12.9565A10.5 10.5 0 1 0 27.75 12.9565" stroke={`url(#${gold})`} strokeWidth="2.6" strokeLinecap="round"
        initial={reduced ? false : { opacity: 1 }}
        animate={reduced ? { opacity: 1 } : { opacity: [1, 0.8, 1] }}
        transition={reduced ? { duration: 0 } : loop} />
      <motion.path d="m28.42 28.42 7.8 7.8" stroke={`url(#${gold})`} strokeWidth="2.6" strokeLinecap="round"
        initial={reduced ? false : { opacity: 1 }}
        animate={reduced ? { opacity: 1 } : { opacity: [1, 0.8, 1] }}
        transition={reduced ? { duration: 0 } : loop} />
      <motion.path d="M20.3 3.8c3.6 2.2 6.6 7.2 6.6 12 0 3.2-1.5 6.4-3.5 8.6.8-3.1-.1-6-1.9-8.1-.7 3.1-2.8 5.6-2.8 8.8 0 1.4.4 2.6 1 3.9-3.4-3.1-4.7-6.6-4.7-10.1 0-5.1 4.6-10.8 5.3-15.1Z" fill={`url(#${gold})`}
        style={{ originX: 0.5, originY: 0.95 }}
        initial={reduced ? false : { opacity: 1, rotate: 0, scaleY: 1 }}
        animate={reduced ? { opacity: 1, rotate: 0, scaleY: 1 } : {
          opacity: [1, 0.76, 1, 0.85, 1],
          rotate: [0, -8, 6, -3, 0],
          scaleY: [1, 0.85, 1.04, 0.94, 1],
        }}
        transition={reduced ? { duration: 0 } : { ...loop, times: [0, 0.22, 0.46, 0.75, 1] }} />
    </svg>
  )
}

export const BackIcon = ({ size = 20, className }: P) => (
  <Svg size={size} className={className} stroke={2.1}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Svg>
)

export const CloseIcon = ({ size = 20, className }: P) => (
  <Svg size={size} className={className} stroke={2.1}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Svg>
)

export const ArrowIcon = ({ size = 20, className = 'text-white' }: P) => (
  <Svg size={size} className={className} stroke={2.2}>
    <path d="M5 12h13.5M13 6.5l5.5 5.5-5.5 5.5" />
  </Svg>
)

export const PlayIcon = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
    <path d="M8.5 6.3v11.4c0 .9 1 1.4 1.7.9l8.8-5.7c.7-.4.7-1.4 0-1.8l-8.8-5.7c-.7-.5-1.7 0-1.7.9z" />
  </svg>
)

export const CheckIcon = ({ size = 26, className }: P) => (
  <Svg size={size} className={className} stroke={2.6}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
)

export const LockIcon = ({ size = 20, className }: P) => (
  <Svg size={size} className={className}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" fillOpacity={ACCENT} />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <path d="M12 14.5v2.2" />
  </Svg>
)

export const ShareIcon = ({ size = 20, className }: P) => (
  <Svg size={size} className={className}>
    <path d="M12 14.5V3.5M8 7.5l4-4 4 4" />
    <path d="M8 10.5H6.5a1.5 1.5 0 0 0-1.5 1.5v7a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16" />
  </Svg>
)

export const PlusIcon = ({ size = 20, className }: P) => (
  <Svg size={size} className={className}>
    <rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" fillOpacity={ACCENT} />
    <path d="M12 8.5v7M8.5 12h7" />
  </Svg>
)

// ---- Journey markers (Home chips, badges) ----

/** An oil lamp with its flame: the streak ("Lâmpada acesa"). */
export const LampIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M18.6 3.6c-1.9 2.2-2.5 4-1.6 5.6.5.9 1.6 1.2 2.4.7 1.3-.8 1.4-2.9-.8-6.3z" />
    <path d="M2.8 12.6h12.6c1.3 0 2.5-.3 3.6-.8l2.2-1-1.6 3c-1.4 2.6-4.4 4.6-8.6 4.6-4.6 0-7.6-2.2-8.2-5.8z" />
    <path d="M3.4 14.4c-1.9-.2-2.4-2.6-.6-3.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8 21h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

/** A shield with an olive sprig: Grace protects the streak. */
export const GraceIcon = ({ className }: P) => (
  <Svg className={className} stroke={1.9}>
    <path d="M12 3.2l7 2.8v5.6c0 4.4-2.9 7.6-7 9.2-4.1-1.6-7-4.8-7-9.2V6z" fill="currentColor" fillOpacity={ACCENT} />
    <path d="M12 16.5V9.5" />
    <path d="M12 12.6c-1.7 0-2.8-.9-3.1-2.6 1.7 0 2.8.9 3.1 2.6zM12 11.4c1.7 0 2.8-.9 3.1-2.6-1.7 0-2.8.9-3.1 2.6z" fill="currentColor" stroke="none" />
  </Svg>
)

/** Two sandal prints: steps on the journey. */
export const StepsIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <ellipse cx="8" cy="11" rx="2.6" ry="3.9" />
    <circle cx="6.5" cy="5.6" r="0.95" />
    <circle cx="8.3" cy="5" r="0.95" />
    <circle cx="10" cy="5.8" r="0.85" />
    <ellipse cx="16" cy="17" rx="2.6" ry="3.9" />
    <circle cx="14.5" cy="11.6" r="0.95" />
    <circle cx="16.3" cy="11" r="0.95" />
    <circle cx="18" cy="11.8" r="0.85" />
  </svg>
)

/** A four-pointed star of light: the symbol collection. */
export const StarIcon = ({ size = 22, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 3.5c.7 4.6 3.4 7.3 8 8-4.6.7-7.3 3.4-8 8-.7-4.6-3.4-7.3-8-8 4.6-.7 7.3-3.4 8-8z" />
    <circle cx="19" cy="4.5" r="1.3" />
    <circle cx="5" cy="19.5" r="1" opacity=".7" />
  </svg>
)

/** Mountain under the sun: a milestone reached. */
export const MountainIcon = ({ size = 24, className = 'text-ink' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M2.5 20.5 9 9.3c.4-.7 1.4-.7 1.8 0l3.1 5.4 1.9-2.7c.4-.6 1.3-.6 1.7 0l5 8.5z" />
    <path d="M7.7 11.6l1.6 1 1.4-1.2" fill="none" stroke="#F5EFE3" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
    <circle cx="17.5" cy="5.5" r="2.5" />
  </svg>
)

// ---- Bottom navigation ----

const accent = (active?: boolean) => ({ fill: 'currentColor', fillOpacity: active ? 0.22 : 0 })

/** A winding road from a starting point to a flag. */
export const NavJourney = ({ active }: NavP) => (
  <Svg className="h-[22px] w-[22px]">
    <path d="M5.5 19.5c4 0 4.6-3.3 6.5-5.3s5.4-1.2 6-5" strokeDasharray={active ? undefined : '0.1 3.2'} />
    <circle cx="5" cy="19.5" r="1.8" fill="currentColor" />
    <path d="M18 9.5V3.5l3.3 1.6L18 6.7" {...accent(active)} />
  </Svg>
)

/** A book with a ribbon marker. */
export const NavDiary = ({ active }: NavP) => (
  <Svg className="h-[22px] w-[22px]">
    <path d="M6 3.5h11.5a1 1 0 0 1 1 1v16H7.5A2.5 2.5 0 0 1 5 18V4.5a1 1 0 0 1 1-1z" {...accent(active)} />
    <path d="M5 18a2.5 2.5 0 0 1 2.5-2.5h11" />
    <path d="M12.5 3.5v6l1.8-1.3 1.8 1.3v-6" fill={active ? 'currentColor' : 'none'} />
  </Svg>
)

/** A speech bubble with lines: conversation with the guide. */
export const NavGuide = ({ active }: NavP) => (
  <Svg className="h-[22px] w-[22px]">
    <path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9.5A1.5 1.5 0 0 1 19 17h-8.5l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 5 4.5z" {...accent(active)} />
    <path d="M8 9.3h8M8 12.6h5" />
  </Svg>
)

export const NavProfile = ({ active }: NavP) => (
  <Svg className="h-[22px] w-[22px]">
    <circle cx="12" cy="8" r="3.8" {...accent(active)} />
    <path d="M4.5 20.5c.9-3.9 4-6 7.5-6s6.6 2.1 7.5 6" />
  </Svg>
)

// ---- Illustrations ----

export function LampHero() {
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" className="relative" aria-hidden="true">
      <path d="M30 92 h90 c-6 24-24 34-45 34 s-39-10-45-34z" fill="#F5EFE3" />
      <path d="M120 98 c18 0 24-14 13-21" fill="none" stroke="#F5EFE3" strokeWidth="7" strokeLinecap="round" />
      <path d="M75 86 c-16-14-11-36 0-56 c11 20 16 42 0 56z" fill="#C4572E" />
      <path d="M75 82 c-7-7-5-18 0-28 c5 10 7 21 0 28z" fill="#F6C99A" />
    </svg>
  )
}

export function WelcomeArt() {
  return (
    <svg width="260" height="250" viewBox="0 0 260 250" aria-hidden="true">
      <defs>
        <radialGradient id="g1" cx="50%" cy="40%">
          <stop offset="0" stopColor="#F6C99A" stopOpacity=".9" />
          <stop offset="1" stopColor="#F6C99A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="130" cy="95" r="95" fill="url(#g1)" />
      <path d="M20 230 C 70 200, 70 160, 120 150 S 190 120, 170 80 S 200 30, 240 22" fill="none" stroke="#1E2230" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
      <circle cx="20" cy="230" r="7" fill="#5D6B3B" />
      <circle cx="120" cy="150" r="7" fill="#C4572E" />
      <circle cx="170" cy="80" r="6" fill="#E2D8C5" stroke="#1E2230" strokeWidth="1.5" />
      <circle cx="240" cy="22" r="6" fill="#E2D8C5" stroke="#1E2230" strokeWidth="1.5" />
      <g transform="translate(96 152)">
        <path d="M6 30 h56 c-4 14-14 20-28 20 s-24-6-28-20z" fill="#1E2230" />
        <path d="M62 34 c10 0 14-8 8-12" fill="none" stroke="#1E2230" strokeWidth="4" strokeLinecap="round" />
        <path d="M34 26 c-9-8-6-20 0-30 c6 10 9 22 0 30z" fill="#C4572E" />
        <path d="M34 24 c-4-4-3-10 0-15 c3 5 4 11 0 15z" fill="#F6C99A" />
      </g>
    </svg>
  )
}
