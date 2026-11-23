// Measures how fast screens and cards respond, in a real (headless) Chromium at 390 px.
// Needs the dev server running. Run: node scripts/perf-check.mjs [url]
import { chromium } from '@playwright/test'

const url = process.argv[2] ?? 'http://localhost:5174/'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 390, height: 844 } })
await p.goto(url)
await p.evaluate(() => localStorage.clear())
await p.reload()

const until = (fn) => p.waitForFunction(fn, null, { polling: 'raf' })
async function time(label, act, cond) {
  const t = Date.now()
  await act()
  await until(cond)
  console.log(label.padEnd(30), `${Date.now() - t} ms`)
}

await p.getByRole('button', { name: 'Começar minha jornada' }).click()
await p.getByRole('radio').first().click()
await time('Diagnóstico → Recomendação', () => p.getByRole('button', { name: 'Continuar' }).click(), () => document.body.textContent.includes('Seu ponto de partida'))
await time('Recomendação → Abertura', () => p.getByRole('button', { name: 'Começar o Dia 1' }).click(), () => document.querySelector('h1')?.textContent.includes('Visão'))
await time('Abertura → 1º card', () => p.getByRole('button', { name: 'Começar o dia', exact: true }).click(), () => !!document.querySelector('[data-card-type]'))
await p.waitForTimeout(300)
await time('Cena → próximo card', () => p.locator('button[aria-label*="Toque para seguir"]').click(), () =>
  [...document.querySelectorAll('[data-card-type]')].some((e) => e.dataset.cardType === 'abertura'),
)
await p.waitForTimeout(300)
await time('Continuar → próximo card', () => p.getByRole('button', { name: 'Continuar', exact: true }).click(), () =>
  [...document.querySelectorAll('[data-card-type]')].some((e) => e.dataset.cardType === 'texto'),
)
const fps = await p.evaluate(
  () =>
    new Promise((r) => {
      let n = 0
      const s = performance.now()
      const f = () => (n++, performance.now() - s < 1000 ? requestAnimationFrame(f) : r(n))
      requestAnimationFrame(f)
    }),
)
console.log('Quadros por segundo'.padEnd(30), fps)
await b.close()
