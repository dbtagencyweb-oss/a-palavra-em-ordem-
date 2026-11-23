// Generates the PWA icons and favicons from the logo flame (src/ui/logoArt.ts, taken from
// reference/logo-palavra-em-ordem.svg): a gold flame on an ink tile.
// Run: node scripts/generate-icons.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const art = readFileSync('src/ui/logoArt.ts', 'utf8')
const FLAME = art.match(/LOGO_FLAME = '([^']+)'/)[1]
const BOX = { x: 474, y: 0, w: 65.7, h: 164.2 } // the flame's box in the master artwork

const STOPS = [
  [0, '#9C7A43'], [0.259, '#AA884D'], [0.38, '#E2C580'], [0.678, '#BD9B5A'], [0.749, '#9C7A43'], [1, '#AA884D'],
].map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')

/**
 * A 512-unit square icon. `fill` is the flame height as a share of the tile; `radius` rounds the
 * tile (0 for full-bleed icons, which the OS masks itself).
 */
function iconSvg({ fill, radius = 0, size = 512 }) {
  const s = (512 * fill) / BOX.h
  const tx = 256 - (BOX.x + BOX.w / 2) * s
  const ty = 262 - (BOX.y + BOX.h / 2) * s
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
<defs>
<linearGradient id="f" gradientUnits="userSpaceOnUse" x1="579.93" y1="165.9" x2="417.39" y2="89.57">${STOPS}</linearGradient>
<radialGradient id="g" cx="50%" cy="58%" r="46%"><stop offset="0" stop-color="#E2C580" stop-opacity="0.22"/><stop offset="1" stop-color="#E2C580" stop-opacity="0"/></radialGradient>
</defs>
<rect width="512" height="512" rx="${radius}" fill="#1E2230"/>
<rect width="512" height="512" rx="${radius}" fill="url(#g)"/>
<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})"><path d="${FLAME}" fill="url(#f)"/></g>
</svg>`
}

mkdirSync('public/icons', { recursive: true })
const out = [
  ['icon-192.png', 192, { fill: 0.56 }],
  ['icon-512.png', 512, { fill: 0.56 }],
  ['maskable-512.png', 512, { fill: 0.46 }], // inside the 80% safe zone
  ['apple-touch-icon.png', 180, { fill: 0.56 }],
  ['favicon-32.png', 32, { fill: 0.78, radius: 96 }],
]
for (const [name, size, opts] of out) {
  await sharp(Buffer.from(iconSvg({ ...opts, size }))).png({ compressionLevel: 9 }).toFile(`public/icons/${name}`)
  console.log('wrote public/icons/' + name)
}
writeFileSync('public/icons/favicon.svg', iconSvg({ fill: 0.72, radius: 112, size: 32 }))
console.log('wrote public/icons/favicon.svg')
