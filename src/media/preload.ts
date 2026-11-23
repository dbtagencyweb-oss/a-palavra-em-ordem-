import { getMidia } from '../content'
import { imagePath, imageSrcSet, posterPath, videoSources } from './paths'

// Only the next card's media is warmed up; older warm-ups are released.
let warm: { id: string; release: () => void } | null = null

export function preloadMedia(id: string | undefined) {
  if (!id || warm?.id === id) return
  warm?.release()
  warm = null
  const item = getMidia(id)
  if (!item) return

  if (item.tipo === 'video') {
    const poster = new Image()
    poster.src = posterPath(id)
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'auto'
    const source = videoSources(id).find((s) => video.canPlayType(s.type))
    if (source) video.src = source.src
    warm = {
      id,
      release: () => {
        video.removeAttribute('src')
        video.load()
      },
    }
    return
  }

  const img = new Image()
  img.sizes = '(max-width: 400px) 100vw, 400px'
  img.srcset = imageSrcSet(id)
  img.src = imagePath(id)
  warm = { id, release: () => {} }
}
