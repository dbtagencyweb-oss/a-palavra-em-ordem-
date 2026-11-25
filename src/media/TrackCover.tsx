import { useState } from 'react'
import { imagePath } from './paths'

interface Props {
  /** Media id from content/midia.json. */
  id: string
  /** CSS object-position, so the subject stays in view at any crop. */
  position?: string
  /** A file outside /media/img (e.g. the study covers in /estudos/), with its small version. */
  src?: { full: string; small: string }
  /**
   * Where the text sits. 'left' (default): ink at 90% → clear at the middle, from the left.
   * 'bottom': ink at 85% → clear, over the lower half, for a title and a label at the bottom.
   */
  shade?: 'left' | 'bottom'
}

const SHADE = {
  left: 'linear-gradient(to right, rgba(30,34,48,0.9) 0%, rgba(30,34,48,0.55) 28%, rgba(30,34,48,0) 50%)',
  bottom: 'linear-gradient(to top, rgba(30,34,48,0.85) 0%, rgba(30,34,48,0) 50%)',
}

/**
 * A track's cover picture filling its box, darkened where the text sits.
 * If the picture does not load, only the dark background stays: no text, no file name.
 */
export function TrackCover({ id, position = '75% 48%', src, shade = 'left' }: Props) {
  const [missing, setMissing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-ink" data-media-id={id}>
      {!missing && (
        <img
          src={src?.full ?? imagePath(id)}
          srcSet={src ? `${src.small} 640w, ${src.full} 1280w` : undefined}
          sizes={src ? '(max-width: 480px) 100vw, 480px' : undefined}
          alt=""
          decoding="async"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setMissing(true)}
          className={`h-full w-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ objectPosition: position }}
        />
      )}
      <div className="absolute inset-0" style={{ background: SHADE[shade] }} />
    </div>
  )
}
