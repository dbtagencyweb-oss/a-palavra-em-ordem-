// Quick opening (~2s) shown on every app open, over the app that is already mounting underneath
// (so Home and its first images load meanwhile). On ink: the flame lights and its glow pulses once,
// "A PALAVRA" appears, the gold rules draw out from the center, then "EM ORDEM" and the tagline.
// No sound. A tap skips it. With reduced motion it is a 300ms fade of the still logo.
import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import { ui } from '../content'
import { LOGO_FLAME, LOGO_TEXT, LOGO_VIEWBOX } from '../ui/logoArt'

const GOLD: [number, string][] = [
  [0, '#9C7A43'],
  [0.259, '#AA884D'],
  [0.38, '#E2C580'],
  [0.678, '#BD9B5A'],
  [0.749, '#9C7A43'],
  [1, '#AA884D'],
]
const RULE_YS = [430.22, 556.64] // the two gold rules, 7.33 tall, full width
const FLAME_ORIGIN = '506.85px 164px' // base of the flame: it grows up from the wick

const HOLD_MS = 1900 // full animation, then the fade out
const REDUCED_HOLD_MS = 700
const ease: Transition['ease'] = [0.22, 1, 0.36, 1]

interface Props {
  onDone(): void
}

export function Splash({ onDone }: Props) {
  const reduced = useReducedMotion()
  const uid = useId().replace(/:/g, '')
  const [leaving, setLeaving] = useState(false)
  const done = useRef(false)

  const finish = () => {
    if (done.current) return
    done.current = true
    setLeaving(true)
  }

  useEffect(() => {
    const t = window.setTimeout(finish, reduced ? REDUCED_HOLD_MS : HOLD_MS)
    return () => window.clearTimeout(t)
  }, [reduced])

  // Still logo for reduced motion; otherwise each part on its own beat.
  const at = (delay: number, duration = 0.45): Transition => (reduced ? { duration: 0 } : { delay, duration, ease })
  const hidden = reduced ? 1 : 0

  return (
    <motion.div
      role="presentation"
      data-testid="splash"
      className="absolute inset-0 z-[80] flex cursor-pointer flex-col items-center justify-center bg-ink px-10"
      initial={{ opacity: reduced ? 0 : 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: reduced ? 0.15 : 0.35, ease: 'easeOut' }}
      onAnimationComplete={() => leaving && onDone()}
      onPointerDown={finish}
    >
      <span className="sr-only">A Palavra em Ordem</span>
      <svg viewBox={LOGO_VIEWBOX} className="w-full max-w-[300px] overflow-visible text-paper" aria-hidden="true">
        <defs>
          <linearGradient id={`sf-${uid}`} gradientUnits="userSpaceOnUse" x1={579.93} y1={165.9} x2={417.39} y2={89.57}>
            {GOLD.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
          </linearGradient>
          <linearGradient id={`sr-${uid}`} gradientUnits="userSpaceOnUse" x1={392.45} y1={704.03} x2={353.63} y2={364.45}>
            {GOLD.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
          </linearGradient>
          <radialGradient id={`sg-${uid}`}>
            <stop offset="0" stopColor="#F1D9A0" stopOpacity="0.55" />
            <stop offset="0.45" stopColor="#E2A860" stopOpacity="0.18" />
            <stop offset="1" stopColor="#E2A860" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Glow behind the flame: comes up with it, then pulses once. */}
        <motion.circle
          cx={506.85}
          cy={96}
          r={150}
          fill={`url(#sg-${uid})`}
          style={{ transformOrigin: '506.85px 96px' }}
          initial={{ opacity: hidden, scale: reduced ? 1 : 0.4 }}
          animate={reduced ? { opacity: 1, scale: 1 } : { opacity: [0, 1, 1, 0.7], scale: [0.4, 1, 1.35, 1] }}
          transition={reduced ? { duration: 0 } : { duration: 1.0, times: [0, 0.45, 0.7, 1], ease: 'easeInOut' }}
        />

        {/* The flame lights: grows from the wick. */}
        <motion.path
          d={LOGO_FLAME}
          fill={`url(#sf-${uid})`}
          style={{ transformOrigin: FLAME_ORIGIN }}
          initial={{ opacity: hidden, scale: reduced ? 1 : 0.2 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={at(0, 0.5)}
        />

        {/* "A PALAVRA" */}
        <motion.path
          d={LOGO_TEXT[0]}
          fill="currentColor"
          initial={{ opacity: hidden, y: reduced ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={at(0.55, 0.5)}
        />

        {/* Gold rules, drawn from the center out. */}
        {RULE_YS.map((y, i) => (
          <motion.rect
            key={y}
            x={0}
            y={y}
            width={995.63}
            height={7.33}
            fill={`url(#sr-${uid})`}
            style={{ transformOrigin: '497.8px 0px', transformBox: 'view-box' }}
            initial={{ scaleX: reduced ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={at(0.85 + i * 0.08, 0.55)}
          />
        ))}

        {/* "EM ORDEM" */}
        <motion.g initial={{ opacity: hidden }} animate={{ opacity: 1 }} transition={at(1.1, 0.4)} fill="currentColor">
          {LOGO_TEXT.slice(1).map((d, i) => (
            <path key={i} d={d} />
          ))}
        </motion.g>
      </svg>

      <motion.p
        className="mt-7 text-[13px] font-medium tracking-[0.08em] text-gold-soft/70"
        initial={{ opacity: hidden }}
        animate={{ opacity: 1 }}
        transition={at(1.35, 0.4)}
      >
        {ui.abertura.frase}
      </motion.p>
    </motion.div>
  )
}
