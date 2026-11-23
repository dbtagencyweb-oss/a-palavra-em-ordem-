// Elements marked data-reveal inside a section rise and fade in as they scroll into view.
// With reduced motion they are left as they are (always visible).
import { useLayoutEffect, type RefObject } from 'react'
import { ScrollTrigger, gsap, reducedMotion } from './motion'

export function useReveal(root: RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    const el = root.current
    if (!el || reducedMotion()) return
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>('[data-reveal]', el)
      gsap.set(items, { opacity: 0, y: 28 })
      ScrollTrigger.batch(items, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12 }),
      })
    }, el)
    return () => ctx.revert()
  }, [root])
}
