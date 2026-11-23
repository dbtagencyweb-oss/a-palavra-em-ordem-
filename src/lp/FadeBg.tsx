// A section background picture that fades away toward the top of the section (strong at the
// bottom, almost gone at the top) and drifts slower than the page as you scroll (parallax).
// The fade is anchored to the section; only the picture moves under it.
// Reduced motion: still picture.
import { useLayoutEffect, useRef } from 'react'
import { imagePath, imageSmallPath } from '../media/paths'
import { gsap, reducedMotion } from './motion'

const FADE_UP = 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.15) 75%, transparent 100%)'

interface Props {
  /** Media id from content/midia.json. */
  id: string
  /** CSS object-position, to keep the subject in view. */
  position?: string
  opacity?: number
  /** Veil over the picture (CSS background), so the content on top stays readable. */
  veil?: string
}

export function FadeBg({ id, position = '50% 60%', opacity = 0.7, veil }: Props) {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    if (reducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelector('.fadebg-move'),
        { yPercent: -7 },
        { yPercent: 7, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } },
      )
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ WebkitMaskImage: FADE_UP, maskImage: FADE_UP }}>
        {/* Taller than the section, so the drift never shows an edge. */}
        <div className="fadebg-move absolute inset-x-0 -bottom-[10%] -top-[10%]">
          <img
            src={imagePath(id)}
            srcSet={`${imageSmallPath(id)} 540w, ${imagePath(id)} 768w`}
            sizes="100vw"
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            style={{ objectPosition: position, opacity }}
          />
        </div>
      </div>
      {veil && <div className="absolute inset-0" style={{ background: veil }} />}
    </div>
  )
}
