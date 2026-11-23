// The app logo, drawn from reference/logo-palavra-em-ordem.svg.
// - full: "A PALAVRA" with the flame, "EM ORDEM" between two gold rules. Letters use currentColor,
//   so set the text color for the background (text-ink on paper, text-paper on ink).
// - mark: the flame alone.
// - icon: the flame on an ink tile, as in the app icon.
import { useId, type CSSProperties } from 'react'
import { LOGO_FLAME, LOGO_RULES, LOGO_TEXT, LOGO_VIEWBOX } from './logoArt'

const GOLD_STOPS: [number, string][] = [
  [0, '#9C7A43'],
  [0.259, '#AA884D'],
  [0.38, '#E2C580'],
  [0.678, '#BD9B5A'],
  [0.749, '#9C7A43'],
  [1, '#AA884D'],
]

/** The flame's own box inside the master artwork. */
const FLAME_BOX = { x: 474, y: 0, w: 65.7, h: 164.2 }

function Gold({ id, x1, y1, x2, y2 }: { id: string; x1: number; y1: number; x2: number; y2: number }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
      {GOLD_STOPS.map(([o, c]) => (
        <stop key={o} offset={o} stopColor={c} />
      ))}
    </linearGradient>
  )
}

const FlameGold = ({ id }: { id: string }) => <Gold id={id} x1={579.93} y1={165.9} x2={417.39} y2={89.57} />

interface Props {
  variant?: 'full' | 'mark' | 'icon'
  className?: string
  style?: CSSProperties
  /** Accessible name; pass null when the logo sits next to the app name already. */
  title?: string | null
}

export function Logo({ variant = 'full', className, style, title = 'A Palavra em Ordem' }: Props) {
  const uid = useId().replace(/:/g, '')
  const flameFill = `logo-flame-${uid}`
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true as const }

  if (variant === 'full') {
    const rulesFill = `logo-rules-${uid}`
    return (
      <svg viewBox={LOGO_VIEWBOX} className={className} style={style} fill="currentColor" {...a11y}>
        <defs>
          <Gold id={rulesFill} x1={392.45} y1={704.03} x2={353.63} y2={364.45} />
          <FlameGold id={flameFill} />
        </defs>
        {LOGO_TEXT.map((d, i) => (
          <path key={i} d={d} />
        ))}
        <path d={LOGO_RULES} fill={`url(#${rulesFill})`} />
        <path d={LOGO_FLAME} fill={`url(#${flameFill})`} />
      </svg>
    )
  }

  if (variant === 'mark') {
    const pad = 6
    const box = `${FLAME_BOX.x - pad} ${FLAME_BOX.y - pad} ${FLAME_BOX.w + pad * 2} ${FLAME_BOX.h + pad * 2}`
    return (
      <svg viewBox={box} className={className} style={style} {...a11y}>
        <defs>
          <FlameGold id={flameFill} />
        </defs>
        <path d={LOGO_FLAME} fill={`url(#${flameFill})`} />
      </svg>
    )
  }

  // icon: 512 tile, flame 56% of its height, centered a touch low (the tip is thin, the base heavy).
  const s = (512 * 0.56) / FLAME_BOX.h
  const tx = 256 - (FLAME_BOX.x + FLAME_BOX.w / 2) * s
  const ty = 262 - (FLAME_BOX.y + FLAME_BOX.h / 2) * s
  const glow = `logo-glow-${uid}`
  return (
    <svg viewBox="0 0 512 512" className={className} style={style} {...a11y}>
      <defs>
        <FlameGold id={flameFill} />
        <radialGradient id={glow} cx="50%" cy="58%" r="46%">
          <stop offset="0" stopColor="#E2C580" stopOpacity="0.22" />
          <stop offset="1" stopColor="#E2C580" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="#1E2230" />
      <rect width="512" height="512" rx="112" fill={`url(#${glow})`} />
      <g transform={`translate(${tx} ${ty}) scale(${s})`}>
        <path d={LOGO_FLAME} fill={`url(#${flameFill})`} />
      </g>
    </svg>
  )
}
