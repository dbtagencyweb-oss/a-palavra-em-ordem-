import { useState } from 'react'
import { imagePath, imageSrcSet, isStudyCover, studyCoverVertical } from './paths'

type Variant = 'opener' | 'card' | 'done' | 'light'

interface Props {
  /** Media id from content/midia.json (tipo "fundo"). */
  id: string
  /** The color the image melts into (the era's `deep`, or the paper color for `light`). */
  tint: string
  variant: Variant
  /** Use the 540/1080 srcset. Covers ship a single file. */
  responsive?: boolean
  /** Called once the real file has loaded, so the screen can drop its stand-in art. */
  onLoad?(): void
}

type Stage = 'srcset' | 'single' | 'missing'

// How each place keeps its text readable over the picture.
function overlay(variant: Variant, tint: string): string {
  switch (variant) {
    case 'opener': // picture on top, text on the dark lower half
      return `linear-gradient(to bottom, ${tint}55 0%, ${tint}00 22%, ${tint}00 34%, ${tint}C0 54%, ${tint} 74%)`
    case 'card': // text on the left, picture shows through on the right
      return `linear-gradient(to right, ${tint}F2 0%, ${tint}C8 52%, ${tint}55 100%)`
    case 'done': // a quiet backdrop behind the celebration
      return `linear-gradient(to bottom, ${tint}A6 0%, ${tint}E0 40%, ${tint} 75%)`
    case 'light': // melts into the paper at the bottom
      return `linear-gradient(to bottom, ${tint}00 50%, ${tint} 100%)`
  }
}

/** Study covers on a full screen: the tall version, ink rising from the bottom to ~55%. */
const STUDY_OPENER = 'linear-gradient(to top, #1E2230 0%, rgba(30,34,48,0) 55%)'

/**
 * Full-bleed background picture behind a screen or card.
 * While the file is missing, the screen keeps its flat color and a small tag shows the catalog id.
 * Study covers (capa-estudo-*) use their tall version from /estudos/ and never show a tag.
 */
export function Backdrop({ id, tint, variant, responsive = true, onLoad }: Props) {
  const [stage, setStage] = useState<Stage>(responsive ? 'srcset' : 'single')
  const [loaded, setLoaded] = useState(false)
  const study = isStudyCover(id) ? studyCoverVertical(id) : null

  if (stage === 'missing' && study) return null
  if (stage === 'missing')
    return (
      <span
        role="img"
        aria-label={`Mídia pendente: ${id}`}
        data-media-id={id}
        className={`pointer-events-none absolute right-3 z-[1] rounded-md ${variant === 'card' ? 'bottom-2' : 'top-3'} border px-2 py-0.5 font-mono text-[10px] tracking-wide ${
          variant === 'light' ? 'border-ink/15 text-ink-3' : 'border-white/20 text-white/55'
        }`}
      >
        {id}
      </span>
    )

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" data-media-id={id}>
      <img
        key={stage}
        src={study?.full ?? imagePath(id)}
        srcSet={stage === 'srcset' ? (study ? `${study.small} 540w, ${study.full} 1080w` : imageSrcSet(id)) : undefined}
        sizes={stage === 'srcset' ? '(max-width: 400px) 100vw, 400px' : undefined}
        alt=""
        decoding="async"
        onLoad={() => {
          setLoaded(true)
          onLoad?.()
        }}
        onError={() => setStage(stage === 'srcset' ? 'single' : 'missing')}
        className={`h-full w-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'} ${
          study ? 'object-[45%_15%]' : variant === 'card' ? 'object-[center_35%]' : 'object-top'
        }`}
      />
      <div className="absolute inset-0" style={{ background: study && variant === 'opener' ? STUDY_OPENER : overlay(variant, tint) }} />
    </div>
  )
}
