// File naming: the id from content/midia.json (docs/02-design-som-midia.md).
export const imagePath = (id: string) => `/media/img/${id}.webp`
/** Small 540×960 version for narrow screens. */
export const imageSmallPath = (id: string) => `/media/img/${id}-540.webp`
export const imageSrcSet = (id: string) => `${imageSmallPath(id)} 540w, ${imagePath(id)} 1080w`

export const videoSources = (id: string) => [
  { src: `/media/video/${id}.webm`, type: 'video/webm' },
  { src: `/media/video/${id}.mp4`, type: 'video/mp4' },
]
export const posterPath = (id: string) => `/media/video/${id}.poster.webp`
