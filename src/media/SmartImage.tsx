import { useState } from 'react'
import { MediaPlaceholder } from './MediaPlaceholder'
import { imagePath, imageSrcSet } from './paths'

interface Props {
  id: string
  /** Fill the parent (backgrounds) instead of a 160px banner. */
  fill?: boolean
  /** Darken the lower third so text on top stays readable. */
  gradient?: boolean
  /** Use the 540/1080 srcset (scene images). Symbols ship a single file. */
  responsive?: boolean
  className?: string
  placeholderClassName?: string
  /** Called once the real file has loaded. */
  onLoad?(): void
}

type Stage = 'srcset' | 'single' | 'missing'

/** WebP with srcset, fade-in on load, falling back to the id placeholder while the file is missing. */
export function SmartImage({ id, fill, gradient, responsive = true, className = '', placeholderClassName = '', onLoad }: Props) {
  const [stage, setStage] = useState<Stage>(responsive ? 'srcset' : 'single')
  const [loaded, setLoaded] = useState(false)

  const box = fill ? 'absolute inset-0' : 'relative h-40 w-full overflow-hidden rounded-card'

  if (stage === 'missing') return <MediaPlaceholder id={id} fill={fill} className={`${placeholderClassName} ${className}`} />

  return (
    <div className={`${box} bg-[#2B2F3D] ${className}`} data-media-id={id}>
      <img
        key={stage}
        src={imagePath(id)}
        srcSet={stage === 'srcset' ? imageSrcSet(id) : undefined}
        sizes={stage === 'srcset' ? '(max-width: 400px) 100vw, 400px' : undefined}
        alt=""
        decoding="async"
        onLoad={() => {
          setLoaded(true)
          onLoad?.()
        }}
        // If the small version is missing, retry with the full one before giving up.
        onError={() => setStage(stage === 'srcset' ? 'single' : 'missing')}
        className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      {gradient && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
      )}
    </div>
  )
}
