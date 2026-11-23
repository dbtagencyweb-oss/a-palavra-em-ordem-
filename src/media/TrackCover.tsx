import { useState } from 'react'
import { imagePath } from './paths'

interface Props {
  /** Media id from content/midia.json. */
  id: string
  /** CSS object-position, so the subject stays in view at any crop. */
  position?: string
}

/**
 * A track's cover picture filling its box, darkened from the left (ink at 90% → clear at the
 * middle) so text on the left stays readable and the right half shows the picture.
 * While the file is missing, a small tag with the catalog id is shown instead.
 */
export function TrackCover({ id, position = '75% 48%' }: Props) {
  const [missing, setMissing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" data-media-id={id}>
      {missing ? (
        <span className="absolute bottom-2 right-3 rounded-md border border-white/20 px-2 py-0.5 font-mono text-[10px] text-white/55">{id}</span>
      ) : (
        <img
          src={imagePath(id)}
          alt=""
          decoding="async"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setMissing(true)}
          className={`h-full w-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ objectPosition: position }}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(30,34,48,0.9)_0%,rgba(30,34,48,0.55)_28%,rgba(30,34,48,0)_50%)]" />
    </div>
  )
}
