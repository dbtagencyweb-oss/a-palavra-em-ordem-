// Captures real app screens for the phone mockup on the landing page (section 6) into
// public/media/lp/app-*.webp. Runs against a dev server with seeded progress (Days 1–3 done).
// Run: node scripts/lp-screens.mjs [http://localhost:5174]
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
import { assembleTrail, loadTrail } from './content/lib.mjs'

const BASE = process.argv[2] || 'http://localhost:5174'
const OUT = 'public/media/lp'
const trilha = assembleTrail(loadTrail('mapa-7-dias'))
mkdirSync(OUT, { recursive: true })

const today = new Date()
// Local calendar dates, as the app counts days.
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

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 })
await page.addInitScript((p) => {
  if (sessionStorage.getItem('seeded')) return
  sessionStorage.setItem('seeded', '1')
  localStorage.setItem('pao:progress:v1', JSON.stringify(p))
  localStorage.setItem('pao:ios-guide-shown', '1')
  localStorage.setItem('pao:sound:v1', JSON.stringify({ muted: true, volume: 0.6 }))
}, progress)

async function shot(name, settle = 700) {
  await page.waitForTimeout(settle)
  // The dev button is not part of the product.
  await page.evaluate(() => {
    const dev = document.querySelector('[aria-label="Abrir painel de dev"]')
    if (dev?.parentElement) dev.parentElement.style.display = 'none'
  })
  const buf = await page.locator('.device').screenshot()
  await sharp(buf).resize(540).webp({ quality: 80 }).toFile(`${OUT}/${name}.webp`)
  console.log('wrote', `${OUT}/${name}.webp`)
}

await page.goto(BASE)
await page.waitForTimeout(2600) // splash
await shot('app-mapa', 1200)

// Day 4, card by card (same moves as the e2e test), stopping for the text card and the activity.
await page.getByRole('button', { name: /^Dia 4: .*\(disponível\)/ }).click()
await page.waitForTimeout(1200)
// The chapter opener comes first; then the cards.
await page.getByRole('button', { name: 'Começar o dia' }).click()
const cards = trilha.dias[3].cards
let textShot = false
for (let i = 0; i < cards.length; i++) {
  const c = cards[i]
  const last = i === cards.length - 1
  await page.waitForSelector(`[data-card-type="${c.tipo}"]`)
  await page.waitForTimeout(450)
  if (c.tipo === 'cena') {
    await page.locator('button[aria-label*="Toque para seguir"]').click()
    continue
  }
  if (c.tipo === 'texto' && !textShot) {
    textShot = true
    await shot('app-licao')
  }
  if (c.tipo === 'ordenar') {
    const half = Math.ceil(c.itens.length / 2)
    for (const item of c.itens.slice(0, half)) await page.getByRole('button', { name: item, exact: true }).click()
    await shot('app-atividade', 500)
    for (const item of c.itens.slice(half)) await page.getByRole('button', { name: item, exact: true }).click()
    await page.waitForTimeout(600)
  }
  if (c.tipo === 'ligar') for (const p of c.pares) {
    await page.getByRole('button', { name: p.a, exact: true }).click()
    await page.getByRole('button', { name: p.b, exact: true }).click()
  }
  if (c.tipo === 'quiz') await page.getByRole('button', { name: c.opcoes.find((o) => o.correta).texto, exact: true }).click()
  if (c.tipo === 'reflexao') await page.locator('textarea').first().fill('Deus abriu o caminho no meio do mar.')
  if (c.tipo === 'oferta' && !last) {
    await page.locator('[data-card-type=oferta]').getByRole('button', { name: c.botaoSecundario }).click()
    continue
  }
  const label = last ? 'Concluir o Dia 4' : c.tipo === 'reflexao' ? 'Salvar e continuar' : 'Continuar'
  await page.getByRole('button', { name: label, exact: true }).click()
}
await shot('app-lampada', 3200) // conclusion: the lamp lit and the new symbol

const out = page.getByRole('button', { name: 'Voltar à jornada' }).first()
if (await out.count()) await out.click()
await page.waitForTimeout(1200)
await page.getByRole('button', { name: /Coleção de símbolos/ }).click()
await shot('app-simbolos', 1500)
await page.goBack().catch(() => {})
await page.goto(BASE)
await page.waitForTimeout(2600)
await page.getByRole('button', { name: 'Diário' }).click()
await shot('app-diario', 1200)

await browser.close()
