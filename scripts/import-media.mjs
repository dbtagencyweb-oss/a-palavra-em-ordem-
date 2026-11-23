// Brings the finished raw media in media-bruta/ into the app. Run again whenever new files arrive:
//   npm run media:import                  everything
//   npm run media:import -- mapa-         only files whose name starts with "mapa-"
//   npm run media:import -- --preview simbolo-lampada   before/after of one symbol, writes nothing in public/
//   npm run media:import -- --sem-simbolos              everything except the symbols
//
// 1. Images  media-bruta/<id>.jpg (era-, mapa-, simbolo-, capa-, d1- … d7-)
//            → public/media/img/<id>.webp (original size, q80) and <id>-540.webp (540 px wide).
//            Files with English names (from Flow) and the folders alternativas/ and para-identificar/ are skipped.
// 2. Symbols simbolo-*.jpg sit on plain white: the medal is found by its contrast with the white, cut in a
//            snug circle with a soft rim → <id>.png (1024², transparent) and <id>.webp (512², transparent).
// 3. Videos  media-bruta/videos/<id>.mp4 (d1- … d7-, intro-) | .webm | .poster.webp → public/media/video/ (copied, never re-encoded).
//            A raw video (an <id>.mp4 with no <id>.webm beside it) is converted with ffmpeg-static instead:
//            silent H.264 mp4 + VP9 webm (each under 1.5 MB), poster.webp from its first frame, and its
//            sound saved as an ambient candidate. Nothing is ever written into media-bruta/.
// 4. Audio   media-bruta/videos/<id>-audio-original.mp3 → assets-audio-candidatos/ (ambient candidates, not used yet).
// 5. content/midia.json: each item's "status" becomes "pronto" or "pendente" from the files that exist.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import ffmpeg from 'ffmpeg-static'
import sharp from 'sharp'

const RAW = 'media-bruta'
const RAW_VIDEO = join(RAW, 'videos')
const IMG = 'public/media/img'
const VIDEO = 'public/media/video'
const AUDIO = 'assets-audio-candidatos'
const CATALOG = 'content/midia.json'
const KB = 1024

const ID_NAME = /^(era-|mapa-|simbolo-|capa-|intro-|d[1-7]-)[a-z0-9-]+$/
const args = process.argv.slice(2)
const previewAt = args.indexOf('--preview')
const preview = previewAt >= 0 ? args[previewAt + 1] : null
const only = preview ? null : args.find((a) => !a.startsWith('--'))
const skipSymbols = args.includes('--sem-simbolos')

if (!existsSync(RAW)) {
  console.log(`Não achei ${RAW}/ na raiz do projeto. Salve as mídias lá com o id como nome e rode de novo.`)
  process.exit(0)
}
const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'))
const byId = new Map(catalog.itens.map((i) => [i.id, i]))

// ---------- Symbols ----------

/** Finds the medal on its white background and returns { cx, cy, r } in source pixels. */
async function findCoin(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H } = info
  // Foreground = the gold. The background is white to mid grey (vignette and drop shadow) and always
  // unsaturated, so saturation tells them apart better than brightness.
  const fg = (x, y) => {
    const i = (y * W + x) * 3
    const r = data[i], g = data[i + 1], b = data[i + 2]
    return Math.max(r, g, b) - Math.min(r, g, b) > 30
  }
  // Edge points seen from the left (per row) and from the top (per column). The drop shadow falls to
  // the bottom right, so these two sides give a clean outline; a least-squares fit gives the circle.
  const pts = []
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x++) if (fg(x, y)) { pts.push([x, y]); break }
  for (let x = 0; x < W; x += 2) for (let y = 0; y < H; y++) if (fg(x, y)) { pts.push([x, y]); break }
  if (pts.length < 20) throw new Error('medalha não encontrada (fundo não é branco?)')
  // Kåsa circle fit: x² + y² + Dx + Ey + F = 0.
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0
  const n = pts.length
  for (const [x, y] of pts) {
    const z = x * x + y * y
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sz += z; sxz += x * z; syz += y * z
  }
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]]
  const B = [-sxz, -syz, -sz]
  const [D, E, F] = solve3(A, B)
  let cx = -D / 2, cy = -E / 2, r = Math.sqrt(cx * cx + cy * cy - F)
  // Drop the few outliers (a ribbon or a spark poking out) and fit once more.
  const keep = pts.filter(([x, y]) => Math.abs(Math.hypot(x - cx, y - cy) - r) < r * 0.03)
  if (keep.length > n * 0.6 && keep.length < n) {
    return fitAgain(keep)
  }
  return { cx, cy, r }

  function fitAgain(p) {
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0
    for (const [x, y] of p) {
      const z = x * x + y * y
      sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sz += z; sxz += x * z; syz += y * z
    }
    const [D, E, F] = solve3([[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, p.length]], [-sxz, -syz, -sz])
    const cx = -D / 2, cy = -E / 2
    return { cx, cy, r: Math.sqrt(cx * cx + cy * cy - F) }
  }
}

function solve3(A, b) {
  const m = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < 3; c++) {
    let p = c
    for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r
    ;[m[c], m[p]] = [m[p], m[c]]
    for (let r = 0; r < 3; r++) {
      if (r === c) continue
      const f = m[r][c] / m[c][c]
      for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k]
    }
  }
  return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]]
}

/** Snug round cut-out of the medal, `size`² RGBA, with a soft 1.5 px rim. */
async function coin(file, size) {
  const { cx, cy, r: r0 } = await findCoin(file)
  const r = r0 * 0.985 // stay a hair inside the rim so no white shows
  const meta = await sharp(file).metadata()
  const left = Math.round(cx - r), top = Math.round(cy - r), d = Math.round(r * 2)
  // Pad with white when the circle touches the picture edge.
  const pad = Math.max(0, -left, -top, left + d - meta.width, top + d - meta.height)
  const rgb = await sharp(file)
    .removeAlpha()
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#ffffff' })
    .extract({ left: left + pad, top: top + pad, width: d, height: d })
    .resize(size, size, { kernel: 'lanczos3' })
    .raw()
    .toBuffer()
  const out = Buffer.alloc(size * size * 4)
  const c = size / 2, R = size / 2 - 1, feather = 1.5 * (size / 1024) + 0.75
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      const dist = Math.hypot(x + 0.5 - c, y + 0.5 - c)
      const a = Math.max(0, Math.min(1, (R - dist) / feather + 0.5))
      out[i * 4] = rgb[i * 3]
      out[i * 4 + 1] = rgb[i * 3 + 1]
      out[i * 4 + 2] = rgb[i * 3 + 2]
      out[i * 4 + 3] = Math.round(a * 255)
    }
  return { img: sharp(out, { raw: { width: size, height: size, channels: 4 } }), circle: { cx, cy, r } }
}

// ---------- Preview of one symbol (before / after on a checkerboard) ----------

if (preview) {
  const file = join(RAW, `${preview}.jpg`)
  if (!existsSync(file)) throw new Error(`${file} não existe`)
  const S = 512
  const before = await sharp(file).resize(S, S, { fit: 'contain', background: '#ffffff' }).png().toBuffer()
  const { img, circle } = await coin(file, S)
  const after = await img.png().toBuffer()
  const tile = 16
  const checker = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs><pattern id="p" width="${tile * 2}" height="${tile * 2}" patternUnits="userSpaceOnUse"><rect width="${tile * 2}" height="${tile * 2}" fill="#cfcfcf"/><rect width="${tile}" height="${tile}" fill="#8f8f8f"/><rect x="${tile}" y="${tile}" width="${tile}" height="${tile}" fill="#8f8f8f"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`,
  )
  const dark = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="100%" height="100%" fill="#1E2230"/></svg>`)
  const label = (t, x) => `<text x="${x}" y="34" font-family="Arial" font-size="22" fill="#1E2230">${t}</text>`
  const sheet = await sharp({ create: { width: S * 3 + 80, height: S + 70, channels: 4, background: '#F5EFE3' } })
    .composite([
      { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S * 3 + 80}" height="60">${label('Antes (original)', 20)}${label('Depois, sobre xadrez (transparência)', S + 40)}${label('Depois, sobre fundo escuro', S * 2 + 60)}</svg>`), left: 0, top: 0 },
      { input: before, left: 20, top: 50 },
      { input: checker, left: S + 40, top: 50 },
      { input: after, left: S + 40, top: 50 },
      { input: dark, left: S * 2 + 60, top: 50 },
      { input: after, left: S * 2 + 60, top: 50 },
    ])
    .png()
    .toBuffer()
  const outFile = `${preview}-antes-depois.png`
  writeFileSync(outFile, sheet)
  console.log(`Círculo encontrado: centro (${circle.cx.toFixed(0)}, ${circle.cy.toFixed(0)}), raio ${circle.r.toFixed(0)} px`)
  console.log(`Prévia salva em ${outFile} (nada foi gravado em public/).`)
  process.exit(0)
}

// ---------- 1 + 2. Images ----------

mkdirSync(IMG, { recursive: true })
let made = 0
const rawImages = readdirSync(RAW).filter((f) => {
  if (!f.toLowerCase().endsWith('.jpg') || !statSync(join(RAW, f)).isFile()) return false
  const id = f.slice(0, -4)
  return ID_NAME.test(id) && (!only || id.startsWith(only)) && !(skipSymbols && id.startsWith('simbolo-'))
})
const kb = (b) => `${(b / KB).toFixed(0)} KB`
for (const f of rawImages) {
  const id = f.slice(0, -4)
  const file = join(RAW, f)
  if (!byId.has(id)) console.log(`AVISO  ${id} não está em ${CATALOG} (convertido mesmo assim)`)
  try {
    if (id.startsWith('simbolo-')) {
      const png = await (await coin(file, 1024)).img.png({ compressionLevel: 9 }).toFile(join(IMG, `${id}.png`))
      const webp = await (await coin(file, 512)).img.webp({ quality: 80, alphaQuality: 90 }).toFile(join(IMG, `${id}.webp`))
      console.log(`OK  ${id}.png 1024² ${kb(png.size)} · ${id}.webp 512² ${kb(webp.size)}`)
      made += 2
    } else {
      const full = await sharp(file).webp({ quality: 80 }).toFile(join(IMG, `${id}.webp`))
      const small = await sharp(file).resize({ width: 540 }).webp({ quality: 80 }).toFile(join(IMG, `${id}-540.webp`))
      console.log(`OK  ${id}.webp ${full.width}×${full.height} ${kb(full.size)} · -540 ${small.width}×${small.height} ${kb(small.size)}`)
      made += 2
    }
  } catch (e) {
    console.log(`ERRO  ${f}: ${e.message}`)
  }
}

// ---------- 3 + 4. Videos and audio candidates ----------

if (existsSync(RAW_VIDEO) && (!only || /^d[1-7]-/.test(only))) {
  mkdirSync(VIDEO, { recursive: true })
  const names = new Set(readdirSync(RAW_VIDEO))
  const raw = new Set(
    [...names]
      .filter((f) => f.endsWith('.mp4') && !names.has(f.replace(/\.mp4$/, '.webm')))
      .map((f) => f.slice(0, -4))
      .filter((id) => ID_NAME.test(id) && (!only || id.startsWith(only))),
  )
  const run = (...a) => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...a], { maxBuffer: 64 * 1024 * 1024 })
  const LIMIT = 1.5 * KB * KB
  for (const id of raw) {
    const src = join(RAW_VIDEO, `${id}.mp4`)
    const mp4 = join(VIDEO, `${id}.mp4`)
    const webm = join(VIDEO, `${id}.webm`)
    try {
      // Lower quality step by step until each file fits the limit from docs/02.
      for (const crf of [26, 28, 30, 32, 34]) {
        run('-i', src, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4)
        if (statSync(mp4).size <= LIMIT) break
      }
      for (const crf of [36, 40, 44, 48]) {
        run('-i', src, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', webm)
        if (statSync(webm).size <= LIMIT) break
      }
      const frame = run('-i', src, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-')
      await sharp(frame).webp({ quality: 80 }).toFile(join(VIDEO, `${id}.poster.webp`))
      console.log(`CONVERTIDO  ${id}: mp4 ${kb(statSync(mp4).size)} · webm ${kb(statSync(webm).size)} · poster ${kb(statSync(join(VIDEO, `${id}.poster.webp`)).size)}`)
      made += 3
      if (!names.has(`${id}-audio-original.mp3`)) {
        mkdirSync(AUDIO, { recursive: true })
        try {
          run('-i', src, '-vn', '-c:a', 'libmp3lame', '-q:a', '4', join(AUDIO, `${id}-audio-original.mp3`))
          console.log(`ÁUDIO    ${AUDIO}/${id}-audio-original.mp3 (extraído do vídeo)`)
        } catch {
          /* the video has no sound */
        }
      }
    } catch (e) {
      console.log(`ERRO  ${id}.mp4: ${String(e.message).split(/\r?\n/)[0]}`)
    }
  }
  for (const f of names) {
    const video = f.match(/^(.+?)(\.mp4|\.webm|\.poster\.webp)$/)
    const audio = f.match(/^(.+)-audio-original\.mp3$/)
    const id = (video ?? audio)?.[1]
    if (!id || !ID_NAME.test(id) || (only && !id.startsWith(only)) || raw.has(id)) continue
    if (video) {
      copyFileSync(join(RAW_VIDEO, f), join(VIDEO, f))
      console.log(`COPIADO  ${VIDEO}/${f}  ${kb(statSync(join(VIDEO, f)).size)}`)
      made++
    } else {
      mkdirSync(AUDIO, { recursive: true })
      copyFileSync(join(RAW_VIDEO, f), join(AUDIO, f))
      console.log(`ÁUDIO    ${AUDIO}/${f}  ${kb(statSync(join(AUDIO, f)).size)}`)
    }
  }
}

// ---------- 5. Catalog status ----------

// Symbols count as ready with their WebP (the PNG master is made by the same run).
const need = {
  imagem: (id) => [`${IMG}/${id}.webp`],
  fundo: (id) => [`${IMG}/${id}.webp`],
  simbolo: (id) => [`${IMG}/${id}.webp`],
  video: (id) => [`${VIDEO}/${id}.mp4`, `${VIDEO}/${id}.webm`, `${VIDEO}/${id}.poster.webp`],
}
let changed = 0
for (const item of catalog.itens) {
  const files = need[item.tipo]?.(item.id) ?? []
  const status = files.length && files.every((p) => existsSync(p)) ? 'pronto' : 'pendente'
  if (item.status !== status) {
    item.status = status
    changed++
  }
}
if (changed) writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + '\n')

console.log(`\n${made} arquivo(s) gerado(s) ou copiado(s). ${changed} status atualizado(s) em ${CATALOG}.`)
console.log('Confira o que falta com: npm run check:media')
