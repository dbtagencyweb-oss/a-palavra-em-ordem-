import { useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

/** Counts from 0 to `target` over `durationMs` (instant with reduced motion). */
export function useCountUp(target: number, durationMs = 1200, delayMs = 0): number {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(reduced ? target : 0)

  useEffect(() => {
    if (reduced) {
      setValue(target)
      return
    }
    let raf = 0
    let start = 0
    const timer = window.setTimeout(() => {
      const step = (t: number) => {
        if (!start) start = t
        const p = Math.min(1, (t - start) / durationMs)
        const eased = 1 - Math.pow(1 - p, 3)
        setValue(Math.round(target * eased))
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delayMs)
    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [target, durationMs, delayMs, reduced])

  return value
}
