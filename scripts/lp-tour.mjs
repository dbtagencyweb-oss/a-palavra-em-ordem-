// Records the app tour for the landing page phone (section 6, step 1): the Home, a slow walk down
// the journey map, then a few sections opened and closed (symbols, Bíblia em Ordem, studies).
// Same seeded progress as scripts/lp-screens.mjs (Days 1–3 done). Writes
// public/media/video/lp-app-tour.{webm,mp4} and its poster. Needs a running dev server.
// Run: node scripts/lp-tour.mjs [http://localhost:5174]
import { chromium } from '@playwright/test'
import ffmpegPath from 'ffmpeg-static'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.argv[2] || 'http://localhost:5174'
const OUT = 'public/media/video/lp-app-tour'
const W = 390
const H = 844

const today = new Date()
const day = (back) => new Date(today.getTime() - back * 864e5).toLocaleDateString('sv-SE')
const progress = {
  version: 1,
  started: true,
  introSeen: true,
  diagnosis: 'perco',
  completedDays: { 1: day(3), 2: day(2), 3: day(1) },
  streak: 3,
  lastStreakDate: day(1),
  grace: 1,
  graceWeek: null,
  steps: 140,
  symbols: ['lampada', 'arvore', 'estrelas'],
  milestones: [],
  diary: [
    { id: 'd3', createdAt: `${day(1)}T21:10:00.000Z`, tag: 'Dia 3 · Reflexão', fields: { aprendi: 'Deus fez uma promessa a Abraão quando ele ainda não tinha nada nas mãos.', orar: 'Pela minha família.' } },
    { id: 'd2', createdAt: `${day(2)}T20:40:00.000Z`, tag: 'Dia 2 · Reflexão', fields: { aprendi: 'A árvore da vida aparece no começo e no fim da Bíblia.' } },
  ],
}

const dir = mkdtempSync(join(tmpdir(), 'lp-tour-'))
const browser = await chromium.launch()
// Frames come straight from Chrome's screencast at 2x (Playwright's own video records the page at
// 1x into a corner of a 2x frame).
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })
const page = await context.newPage()
const cdp = await context.newCDPSession(page)
const frames = []
let recording = false
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  if (recording) frames.push({ t: metadata.timestamp, data })
  void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await page.addInitScript((p) => {
  if (sessionStorage.getItem('seeded')) return
  sessionStorage.setItem('seeded', '1')
  localStorage.setItem('pao:progress:v1', JSON.stringify(p))
  localStorage.setItem('pao:ios-guide-shown', '1')
  localStorage.setItem('pao:sound:v1', JSON.stringify({ muted: true, volume: 0.6, narration: false }))
  // The dev button is not part of the product.
  addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style')
    s.textContent = '[aria-label="Abrir painel de dev"]{display:none!important}'
    document.head.append(s)
  })
}, progress)

const wait = (ms) => page.waitForTimeout(ms)

/**
 * Eased scroll of the Home's scrolling column over `ms`, to a target: px, { frac } of the way,
 * 'bottom', or { day: n } (that day's marker centred on the screen).
 */
async function glide(to, ms) {
  await page.evaluate(
    ([to, ms]) =>
      new Promise((done) => {
        const el = [...document.querySelectorAll('.device *')].find((e) => {
          const s = getComputedStyle(e).overflowY
          return (s === 'auto' || s === 'scroll') && e.scrollHeight > e.clientHeight + 40
        })
        if (!el) return done()
        const from = el.scrollTop
        const max = el.scrollHeight - el.clientHeight
        const dayAt = (n) => {
          const m = document.querySelector(`button[aria-label^="Dia ${n}:"]`)
          if (!m) return from
          const r = m.getBoundingClientRect()
          const box = el.getBoundingClientRect()
          return from + r.top + r.height / 2 - (box.top + el.clientHeight / 2)
        }
        const raw = to === 'bottom' ? max : typeof to === 'object' ? ('day' in to ? dayAt(to.day) : max * to.frac) : to
        const end = Math.max(0, Math.min(max, raw))
        const t0 = performance.now()
        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
        const step = (now) => {
          const t = Math.min(1, (now - t0) / ms)
          el.scrollTop = from + (end - from) * ease(t)
          if (t < 1) requestAnimationFrame(step)
          else done()
        }
        requestAnimationFrame(step)
      }),
    [to, ms],
  )
}

/** Tap with a visible finger dot, so the viewer sees where the touch lands. */
async function tap(locator) {
  const box = await locator.boundingBox()
  if (box) {
    await page.evaluate(([x, y]) => {
      const d = document.createElement('div')
      d.style.cssText = `position:fixed;left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:50%;background:rgba(226,197,128,.45);box-shadow:0 0 0 2px rgba(255,255,255,.7);z-index:99999;pointer-events:none;transition:transform .35s ease,opacity .35s ease`
      document.body.append(d)
      requestAnimationFrame(() => (d.style.transform = 'scale(.7)'))
      setTimeout(() => (d.style.opacity = '0'), 350)
      setTimeout(() => d.remove(), 800)
    }, [box.x + box.width / 2, box.y + box.height / 2])
    await wait(260)
  }
  await locator.click()
}

await page.goto(BASE)
await wait(2600) // splash
await wait(2200) // the Home scrolls itself to today's day: let it settle, then start at the Éden
await glide({ day: 1 }, 10)
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * 2, maxHeight: H * 2 })
await wait(300)
recording = true

// 1 · The map climbs like the journey: from the Éden (Day 1, at the bottom), up the footsteps of the
// days already done, to today's lesson (Day 4), and on to the New Jerusalem and the Home's top.
await wait(1500)
await glide({ day: 3 }, 3200)
await wait(500)
await glide({ day: 4 }, 1600)
await wait(1100)
await glide(0, 3400)
await wait(1200)
// 2 · The list under the map.
await glide('bottom', 2400)
await wait(1100)

// 3 · Open a few sections.
await tap(page.getByRole('button', { name: /Coleção de símbolos/ }))
await wait(2300)
await tap(page.getByRole('button', { name: 'Voltar' }).first())
await wait(700)
await glide('bottom', 1300)
await wait(400)
await tap(page.getByTestId('abrir-loja-estudos'))
await wait(2300)
await tap(page.getByRole('button', { name: 'Voltar' }).first())
await wait(1600) // the map picture loads back in
await tap(page.getByRole('button', { name: 'Diário', exact: true }))
await wait(2300)
await tap(page.getByRole('button', { name: 'Jornada', exact: true }))
await wait(2600)
recording = false
await cdp.send('Page.stopScreencast')
const endT = frames.at(-1).t + 0.1
await context.close()
await browser.close()

// Frames arrive only when something changes: each one lasts until the next (concat demuxer).
const list = []
frames.forEach((f, i) => {
  const file = join(dir, `f${String(i).padStart(5, '0')}.jpg`)
  writeFileSync(file, Buffer.from(f.data, 'base64'))
  list.push(`file '${file.replace(/\\/g, '/')}'`, `duration ${((frames[i + 1]?.t ?? endT) - f.t).toFixed(4)}`)
})
list.push(`file '${join(dir, `f${String(frames.length - 1).padStart(5, '0')}.jpg`).replace(/\\/g, '/')}'`)
writeFileSync(join(dir, 'list.txt'), list.join('\n'))
const raw = join(dir, 'f00000.jpg')
const tourStart = 0
const tourEnd = endT - frames[0].t

const trim = ['-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt')]
const scale = ['-vf', 'scale=540:-2:flags=lanczos,fps=30', '-an']
const ff = (args) => execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
ff([...trim, ...scale, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '31', '-movflags', '+faststart', `${OUT}.mp4`])
ff([...trim, ...scale, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '42', '-row-mt', '1', `${OUT}.webm`])
ff(['-i', raw, '-frames:v', '1', '-vf', 'scale=540:-2:flags=lanczos', '-quality', '82', `${OUT}.poster.webp`])
rmSync(dir, { recursive: true, force: true })

for (const ext of ['mp4', 'webm', 'poster.webp']) console.log('wrote', `${OUT}.${ext}`, `${(statSync(`${OUT}.${ext}`).size / 1024).toFixed(0)} KB`)
console.log(`tour ${(tourEnd - tourStart).toFixed(1)} s`)
