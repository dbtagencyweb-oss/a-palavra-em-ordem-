import { useId } from 'react'

interface Props {
  className?: string
  /** Plays the one-time lighting beat before settling into the regular flicker. */
  ignite?: boolean
}

/**
 * The journey's terracotta oil lamp. The rendered clay body stays crisp at every size while the
 * live SVG flame, halo and sparks remain independent so they can genuinely flicker.
 */
export function OilLamp3D({ className = '', ignite = false }: Props) {
  const uid = useId().replace(/:/g, '')
  const outer = `oil-flame-outer-${uid}`
  const inner = `oil-flame-inner-${uid}`

  return (
    <span className={`oil-lamp-3d ${ignite ? 'oil-lamp-ignite' : ''} ${className}`} aria-hidden="true">
      <span className="oil-lamp-halo" />
      <span className="oil-lamp-wick-glow" />
      <span className="oil-lamp-flame-wrap">
        <svg className="oil-lamp-flame-art" viewBox="0 0 60 120" fill="none">
          <defs>
            <linearGradient id={outer} x1="30" y1="5" x2="30" y2="116" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFBE8" />
              <stop offset="0.34" stopColor="#FFD879" />
              <stop offset="0.72" stopColor="#F39A35" />
              <stop offset="1" stopColor="#C4572E" />
            </linearGradient>
            <linearGradient id={inner} x1="30" y1="55" x2="30" y2="112" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" />
              <stop offset="0.5" stopColor="#FFF4B7" />
              <stop offset="1" stopColor="#FFC55E" />
            </linearGradient>
          </defs>
          <path d="M30 117C10 106 7 86 17 63 26 43 35 27 31 4c18 22 27 47 23 70-3 21-13 36-24 43Z" fill={`url(#${outer})`} />
          <path d="M30 111c-9-7-10-18-5-31 4-10 8-18 8-28 9 13 12 27 9 39-2 10-7 17-12 20Z" fill={`url(#${inner})`} />
        </svg>
      </span>
      <i className="oil-lamp-spark oil-lamp-spark-a" />
      <i className="oil-lamp-spark oil-lamp-spark-b" />
      <img src="/media/ui/candeia-3d.webp" alt="" draggable={false} decoding="async" />
    </span>
  )
}
