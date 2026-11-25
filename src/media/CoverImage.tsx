import { useState } from 'react'
import type { Picture } from '../content/trails'

interface Props {
  /** Pictures to try, best first (see dayCovers). */
  pictures: Picture[]
  /** Use the small version (thumbnails, path nodes). */
  small?: boolean
  className?: string
  onLoad?(): void
}

/**
 * A cover that falls back down its list: when one picture fails, the next one is tried. When none
 * loads, nothing is drawn, so the box keeps its own background. Never a file name or a tag.
 */
export function CoverImage({ pictures, small = false, className = '', onLoad }: Props) {
  const [i, setI] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const pic = pictures[i]
  if (!pic) return null
  return (
    <img
      key={i}
      src={small ? pic.small : pic.full}
      alt=""
      decoding="async"
      loading="lazy"
      onLoad={() => {
        setLoaded(true)
        onLoad?.()
      }}
      onError={() => {
        setLoaded(false)
        setI((n) => n + 1)
      }}
      className={`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  )
}
