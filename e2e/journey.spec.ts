import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { assembleTrail, loadTrail } from '../scripts/content/lib.mjs'

// Trilha 1 as users see it (published lessons only).
const trilha = assembleTrail(loadTrail('mapa-7-dias'))

// Full Trilha 1 (Day 1 → Day 7) using the dev "Avançar um dia" button.
// Besides the flow, every card is audited at 390 px and screenshotted into test-results/cards/.

type AnyCard = { id: string; tipo: string } & Record<string, any>

const AUDIT_DIR = 'test-results'
const audit: Record<string, unknown>[] = []

async function auditCard(page: Page, dayN: number, card: AnyCard) {
  await page.waitForTimeout(450) // let the card transition settle
  const info = await page.evaluate(() => {
    const device = document.querySelector('.device') as HTMLElement
    const screen = document.querySelector('.screen') as HTMLElement
    const dr = device.getBoundingClientRect()
    const overflowing = [...device.querySelectorAll<HTMLElement>('*')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && (r.right > dr.right + 1 || r.left < dr.left - 1) && getComputedStyle(el).position !== 'absolute'
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`)
    const smallTargets = [...device.querySelectorAll<HTMLElement>('button, a[href], input, textarea')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const visible = r.width > 0 && getComputedStyle(el).visibility !== 'hidden'
        return visible && (r.height < 44 || r.width < 44)
      })
      .map((el) => `${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30)} (${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)})`)
    return {
      needsScroll: screen ? screen.scrollHeight - screen.clientHeight : 0,
      overflowing,
      smallTargets,
    }
  })
  mkdirSync(`${AUDIT_DIR}/cards`, { recursive: true })
  await page.locator('.device').screenshot({ path: `${AUDIT_DIR}/cards/${card.id}.png` })
  audit.push({ dia: dayN, card: card.id, tipo: card.tipo, ...info })
}

async function solveAndAdvance(page: Page, dayN: number, card: AnyCard, isLast: boolean) {
  await expect(page.locator('[data-card-type]')).toHaveAttribute('data-card-type', card.tipo)
  await auditCard(page, dayN, card)

  if (card.tipo === 'cena') {
    await page.locator('button[aria-label*="Toque para seguir"]').click()
    return
  }
  if (card.tipo === 'ordenar') {
    for (const item of card.itens as string[]) await page.getByRole('button', { name: item, exact: true }).click()
    await expect(page.getByRole('status')).toContainText(card.acerto.slice(0, 20))
  }
  if (card.tipo === 'ligar') {
    for (const p of card.pares as { a: string; b: string }[]) {
      await page.getByRole('button', { name: p.a, exact: true }).click()
      await page.getByRole('button', { name: p.b, exact: true }).click()
    }
    await expect(page.getByRole('status')).toContainText(card.acerto.slice(0, 20))
  }
  if (card.tipo === 'quiz') {
    const right = (card.opcoes as { texto: string; correta: boolean }[]).find((o) => o.correta)!
    await page.getByRole('button', { name: right.texto, exact: true }).click()
    await expect(page.getByRole('status')).toContainText(card.acerto.slice(0, 20))
  }
  if (card.tipo === 'reflexao') await page.locator('textarea').fill(`Reflexão de teste do Dia ${dayN}.`)
  if (card.tipo === 'oferta' && !isLast) {
    await page.locator('[data-card-type=oferta]').getByRole('button', { name: card.botaoSecundario }).click()
    return
  }

  const label = isLast ? `Concluir o Dia ${dayN}` : card.tipo === 'reflexao' ? 'Salvar e continuar' : 'Continuar'
  await page.getByRole('button', { name: label, exact: true }).click()
}

test('Trilha 1 inteira, do Dia 1 ao Dia 7', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => d.accept())

  await page.goto('/?mapa=classico')
  await page.getByRole('button', { name: 'Começar minha jornada' }).click()
  // First-time cinema intro (placeholder until intro-luz lands): skip it.
  await expect(page.getByTestId('intro')).toBeVisible()
  await page.getByRole('button', { name: 'Pular' }).click()
  await page.getByRole('radio', { name: 'Tento ler a Bíblia, mas me perco.' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Começar o Dia 1' }).click()

  const activities = trilha.dias.flatMap((d) => d.cards).filter((c) => ['ordenar', 'ligar', 'quiz'].includes(c.tipo)).length

  for (const day of trilha.dias as { n: number; lugar: string; cards: AnyCard[]; simbolo: { nome: string }; marco?: { nome: string } }[]) {
    if (day.n > 1) {
      await page.getByRole('button', { name: 'Abrir painel de dev' }).click()
      await page.getByRole('button', { name: 'Avançar um dia' }).click()
      await page.getByRole('button', { name: 'Fechar painel de dev' }).click()
      await page.getByRole('button', { name: new RegExp(`^Dia ${day.n}: .*\\(disponível\\)`) }).click()
    }
    // Chapter opener in the era's color.
    await expect(page.getByRole('heading', { level: 1, name: day.lugar })).toBeVisible()
    await page.waitForTimeout(900)
    mkdirSync(`${AUDIT_DIR}/cards`, { recursive: true })
    await page.locator('.device').screenshot({ path: `${AUDIT_DIR}/cards/abertura-d${day.n}.png` })
    await page.getByRole('button', { name: 'Começar o dia' }).click()
    for (let i = 0; i < day.cards.length; i++) await solveAndAdvance(page, day.n, day.cards[i], i === day.cards.length - 1)

    // Conclusion
    await expect(page.getByRole('heading', { name: 'Lâmpada acesa.' })).toBeVisible()
    await expect(page.getByText('Símbolo desbloqueado')).toBeVisible()
    await expect(page.getByText(day.simbolo.nome, { exact: true })).toBeVisible()
    if (day.marco) await expect(page.getByText(day.marco.nome, { exact: true })).toBeVisible()
    await page.waitForTimeout(1500) // count-up and symbol reveal
    mkdirSync(`${AUDIT_DIR}/cards`, { recursive: true })
    await page.locator('.device').screenshot({ path: `${AUDIT_DIR}/cards/conclusao-d${day.n}.png` })
    await page.getByRole('button', { name: 'Voltar à jornada' }).click()
    if (day.n === 1) {
      // iPhone browser: the "add to home screen" guide shows once after Day 1.
      await page.getByRole('button', { name: 'Entendi' }).click()
    }
    await expect(page.getByText(`${day.n} de 7`, { exact: true })).toBeVisible()
  }

  // End state: whole map done, every activity right on the first try.
  await expect(page.getByText('Trilha concluída')).toBeVisible()
  await page.locator('.device').screenshot({ path: `${AUDIT_DIR}/cards/home-final.png`, fullPage: false })
  await page.getByRole('button', { name: /Coleção de símbolos/ }).click()
  await expect(page.getByText('7 de 7 desbloqueados.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'Perfil' }).click()
  await expect(page.getByText('7 de 7').first()).toBeVisible()
  await expect(page.locator('dl')).toContainText(String(7 * 50 + activities * 10))
  await page.getByRole('navigation').getByRole('button', { name: 'Diário' }).click()
  await expect(page.getByText('Dia 7 · Reflexão')).toBeVisible()

  writeFileSync(`${AUDIT_DIR}/audit.json`, JSON.stringify(audit, null, 2))
  expect(errors).toEqual([])
})
