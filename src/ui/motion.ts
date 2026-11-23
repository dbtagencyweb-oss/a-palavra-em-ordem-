import { useReducedMotion, type Transition, type Variants } from 'framer-motion'

// Timings from the "Movimento" table in docs/02-design-som-midia.md.
export const EASE_OUT: Transition['ease'] = [0.22, 1, 0.36, 1]
const REDUCED: Transition = { duration: 0.15 }
const fade: Variants = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }

/** Card change: current leaves left with scale .98, next enters from the right (inverse when going back). */
export function useCardMotion() {
  const reduced = useReducedMotion()
  if (reduced) return { variants: fade, transition: REDUCED }
  const variants: Variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 56 : -56, scale: 1 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -56 : 56, scale: 0.98 }),
  }
  return { variants, transition: { duration: 0.32, ease: EASE_OUT } as Transition }
}

/** Entering a scene: crossfade with a slight zoom from 1.04 to 1. */
export function useSceneMotion() {
  const reduced = useReducedMotion()
  if (reduced) return { variants: fade, transition: REDUCED }
  const variants: Variants = {
    enter: { opacity: 0, scale: 1.04 },
    center: { opacity: 1, scale: 1 },
    exit: { opacity: 0 },
  }
  return { variants, transition: { duration: 0.6, ease: EASE_OUT } as Transition }
}

/** Screens: short fade with a 6px rise. */
export function useScreenMotion() {
  const reduced = useReducedMotion()
  if (reduced) return { variants: fade, transition: REDUCED }
  const variants: Variants = {
    enter: { opacity: 0, y: 6 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
  }
  return { variants, transition: { duration: 0.35, ease: 'easeOut' } as Transition }
}

/** List items enter one by one, 70 ms apart, 250 ms each. */
export const STAGGER_S = 0.07
export function useListItemMotion(index: number, baseDelay = 0.15) {
  const reduced = useReducedMotion()
  if (reduced) return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: REDUCED }
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: baseDelay + index * STAGGER_S, duration: 0.25, ease: EASE_OUT } as Transition,
  }
}
