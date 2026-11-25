// File naming: the id from content/midia.json (docs/02-design-som-midia.md).
export const imagePath = (id: string) => `/media/img/${id}.webp`
/** Small 540×960 version for narrow screens. */
export const imageSmallPath = (id: string) => `/media/img/${id}-540.webp`
/** Study covers live in /estudos/ (1280×720 and a 640×360 version). */
export const studyCover = (id: string) => ({ full: `/estudos/${id}.webp`, small: `/estudos/${id}-640.webp` })
/** A study's cover id (capa-estudo-<id>): its files live in /estudos/, never in /media/img/. */
export const isStudyCover = (id: string) => id.startsWith('capa-estudo-')
/** The tall version of a study cover, for full screens (1080×1920 and 540×960). */
export const studyCoverVertical = (id: string) => ({ full: `/estudos/${id}-vertical.webp`, small: `/estudos/${id}-vertical-540.webp` })
export const imageSrcSet = (id: string) => `${imageSmallPath(id)} 540w, ${imagePath(id)} 1080w`

export const videoSources = (id: string) => [
  { src: `/media/video/${id}.webm`, type: 'video/webm' },
  { src: `/media/video/${id}.mp4`, type: 'video/mp4' },
]
export const posterPath = (id: string) => `/media/video/${id}.poster.webp`
