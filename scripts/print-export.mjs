// npm run print:export: renders the print routes and saves the bump files to private/downloads/
// (outside public/, so they are never served openly; see /downloads and docs/04, section 6).
//   mapa-a3.pdf, mapa-a4.pdf, wallpaper-1.png, wallpaper-2.png, wallpaper-3.png
import { chromium } from '@playwright/test'
import { mkdirSync, statSync } from 'node:fs'
import { createServer } from 'vite'

const OUT = 'private/downloads'
mkdirSync(OUT, { recursive: true })

// Its own dev server, on a free port, so it works with or without npm run dev.
const server = await createServer({ server: { port: 0, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' })
await server.listen()
const base = server.resolvedUrls.local[0].replace(/\/$/, '')

const browser = await chromium.launch()
async function open(route, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  await page.goto(`${base}/print/${route}`, { waitUntil: 'networkidle' })
  // Fonts and every picture in place before printing.
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => ((img.onload = r), (img.onerror = r))))))
  })
  await page.waitForTimeout(300)
  return page
}

const kb = (f) => `${Math.round(statSync(f).size / 1024)} KB`
try {
  for (const [route, format] of [['mapa-a3', 'A3'], ['mapa-a4', 'A4']]) {
    const page = await open(route, { width: 1200, height: 1700 })
    const file = `${OUT}/${route}.pdf`
    await page.pdf({ path: file, format, printBackground: true, preferCSSPageSize: true })
    console.log(`${file} (${kb(file)})`)
    await page.close()
  }
  for (const n of [1, 2, 3]) {
    const page = await open(`wallpaper-${n}`, { width: 1080, height: 1920 })
    const file = `${OUT}/wallpaper-${n}.png`
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1080, height: 1920 } })
    console.log(`${file} (${kb(file)})`)
    await page.close()
  }
} finally {
  await browser.close()
  await server.close()
}
