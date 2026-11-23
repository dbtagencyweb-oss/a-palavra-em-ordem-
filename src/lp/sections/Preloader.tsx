// 0 · Preloader (max 1.2s): on ink, the logo flame draws its outline and lights; its glow then
// opens a hole in the ink that grows until the hero is uncovered. Reduced motion: a short fade.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LOGO_FLAME } from '../../ui/logoArt'
import { gsap, markReady, reducedMotion } from '../motion'

const BOX = '468 -6 77.7 176.2' // the flame, with a little air

export function Preloader() {
  const root = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)

  useLayoutEffect(() => {
    const el = root.current!
    const q = gsap.utils.selector(el)
    if (reducedMotion()) {
      const tl = gsap.timeline({ onComplete: () => (setGone(true), markReady()) })
      tl.to(el, { opacity: 0, duration: 0.3, delay: 0.25 })
      return () => void tl.kill()
    }
    const outline = el.querySelector<SVGPathElement>('.pl-outline')!
    const len = outline.getTotalLength()
    gsap.set(outline, { strokeDasharray: len, strokeDashoffset: len })
    const tl = gsap.timeline({ onComplete: () => setGone(true) })
    tl.to(outline, { strokeDashoffset: 0, duration: 0.42, ease: 'power2.inOut' })
      .to(q('.pl-fill'), { opacity: 1, duration: 0.25, ease: 'power1.out' }, 0.32)
      .to(outline, { opacity: 0, duration: 0.2 }, 0.45)
      .fromTo(q('.pl-glow'), { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' }, 0.35)
      // The glow opens the screen: the ink gets a growing transparent hole around the flame.
      .to(el, { '--hole': '160vmax', duration: 0.5, ease: 'power2.in', onStart: markReady }, 0.7)
      .to(q('.pl-mark'), { scale: 1.6, opacity: 0, duration: 0.45, ease: 'power2.in' }, 0.72)
    return () => void tl.kill()
  }, [])

  // Never keep the page locked if something above throws.
  useEffect(() => {
    const id = window.setTimeout(() => (setGone(true), markReady()), 2500)
    return () => window.clearTimeout(id)
  }, [])

  if (gone) return null
  return (
    <div
      ref={root}
      aria-hidden="true"
      className="fixed inset-0 z-[100] grid place-items-center"
      style={{
        ['--hole' as string]: '0vmax',
        background: 'radial-gradient(circle at 50% 46%, transparent var(--hole), #1E2230 calc(var(--hole) + 1px))',
      }}
    >
      <div className="pl-mark relative -mt-[8vh] h-28 w-14">
        <div className="pl-glow absolute -inset-16 rounded-full bg-[radial-gradient(circle,rgba(241,217,160,0.55),rgba(226,168,96,0.15)_45%,rgba(226,168,96,0)_70%)] opacity-0" />
        <svg viewBox={BOX} className="relative h-full w-full overflow-visible">
          <defs>
            <linearGradient id="pl-gold" gradientUnits="userSpaceOnUse" x1={579.93} y1={165.9} x2={417.39} y2={89.57}>
              <stop offset="0" stopColor="#9C7A43" />
              <stop offset=".38" stopColor="#E2C580" />
              <stop offset=".68" stopColor="#BD9B5A" />
              <stop offset="1" stopColor="#AA884D" />
            </linearGradient>
          </defs>
          <path className="pl-outline" d={LOGO_FLAME} fill="none" stroke="#E2C580" strokeWidth={2} />
          <path className="pl-fill" d={LOGO_FLAME} fill="url(#pl-gold)" opacity={0} />
        </svg>
      </div>
    </div>
  )
}
