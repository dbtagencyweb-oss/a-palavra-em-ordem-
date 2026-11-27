import { expect, test, type Page } from '@playwright/test'

const map = (page: Page) => page.getByTestId('pilgrimage-map')
const viewport = (page: Page) => map(page).getByRole('region', { name: /^Mapa interativo/ })
const pin = (page: Page, n: number) => map(page).getByRole('button', { name: new RegExp(`^Dia ${n} ·`) })
const stage = (page: Page) => viewport(page).locator('.pilgrimage-stage').first()
const cssTransform = (page: Page) => stage(page).evaluate((element) => (element as HTMLElement).style.transform)

async function openMap(page: Page, completed = 0) {
  const completedDays = Object.fromEntries(Array.from({ length: completed }, (_, i) => [i + 1, '2020-01-01']))
  await page.addInitScript((days) => localStorage.setItem('pao:progress:v1', JSON.stringify({
    version: 1, started: true, introSeen: true, completedDays: days,
  })), completedDays)
  await page.goto('/?mapa=v2')
  await expect(map(page)).toHaveAttribute('data-level', 'world')
  await expect(page.getByTestId('splash')).toBeHidden()
  await expect(stage(page).locator('.pilgrimage-image img[data-loaded=true]')).toBeVisible()
}

async function selectDay(page: Page, n: number) {
  await viewport(page).focus()
  await page.keyboard.press('Tab')
  await pin(page, n).focus()
  await expect(pin(page, n)).toHaveAttribute('aria-pressed', 'true')
}

test.use({ reducedMotion: 'reduce' })

for (const size of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 900, height: 740 }]) {
  test(`abre a região e a lição em ${size.width} × ${size.height}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize(size)
    await openMap(page)
    const labels = map(page).locator('.pilgrimage-pin-label')
    await expect(labels).toHaveCount(7)
    await expect(labels.first()).toContainText('A Bíblia não é um labirinto')
    await expect(map(page).getByRole('button', { name: 'Calibrar coordenadas' })).toHaveCount(0)
    await expect.poll(() => map(page).evaluate((element) => {
      const area = element.getBoundingClientRect()
      const device = element.closest('.device')!.getBoundingClientRect()
      const hud = element.querySelector('.pilgrimage-hud')!.getBoundingClientRect()
      const search = element.closest('.device')!.querySelector('.nav-flame')!.getBoundingClientRect()
      return area.top === device.top && area.bottom === device.bottom &&
        area.left === device.left && area.right === device.right && hud.bottom < search.top
    })).toBe(true)
    await expect(pin(page, 1)).toHaveAttribute('data-state', 'open')
    await expect(pin(page, 2)).toHaveAttribute('data-state', 'locked')
    await selectDay(page, 2)
    await expect(map(page).getByRole('button', { name: 'Explorar região' })).toBeDisabled()
    await map(page).getByRole('button', { name: 'Centralizar na minha posição' }).click()
    await pin(page, 1).click({ trial: true })
    const prior = await cssTransform(page)
    await map(page).getByRole('button', { name: 'Explorar região' }).click()
    await expect(map(page)).toHaveAttribute('data-level', 'region')
    await map(page).getByRole('button', { name: 'Voltar ao mapa' }).click()
    await expect(map(page)).toHaveAttribute('data-level', 'world')
    await expect.poll(() => cssTransform(page)).toBe(prior)

    await map(page).getByRole('button', { name: 'Mais da jornada' }).click()
    await expect(page.getByRole('heading', { level: 2, name: /Bom dia|Boa tarde|Boa noite/ })).toBeInViewport()
    await page.getByRole('button', { name: 'Explorar região' }).scrollIntoViewIfNeeded()
    await map(page).getByRole('button', { name: 'Abrir a lição' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Visão do todo' })).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('revisita os sete territórios, enquadra Canaã e abre a cena do Mar Vermelho', async ({ page }) => {
  await openMap(page, 7)
  await expect(map(page).getByTestId('pilgrimage-red-sea-crossing')).toHaveCount(1)
  for (let day = 1; day <= 7; day++) {
    await selectDay(page, day)
    await expect(pin(page, day)).toHaveAttribute('data-state', 'done')
    await map(page).getByRole('button', { name: 'Explorar região' }).click()
    await expect(map(page)).toHaveAttribute('data-level', 'region')
    if (day === 3) {
      await expect(map(page).getByRole('button', { name: 'Acampamento de Abraão' })).toBeVisible()
    }
    if (day === 4) {
      await map(page).getByRole('button', { name: 'À beira do Mar Vermelho' }).click()
      await expect(page.getByRole('dialog', { name: 'À beira do Mar Vermelho' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Abrir a lição do Sinai' })).toBeVisible()
      await page.getByRole('button', { name: 'Fechar cena' }).click()
    }
    await expect(map(page).getByRole('button', { name: 'Revisar o dia' })).toBeEnabled()
    await map(page).getByRole('button', { name: 'Voltar ao mapa' }).click()
    await expect(map(page)).toHaveAttribute('data-level', 'world')
  }
})

test('amplia por toque, teclado e botões sem exibir a travessia antes da conclusão', async ({ page, context }) => {
  await openMap(page, 3)
  await expect(pin(page, 4)).toHaveAttribute('data-state', 'open')
  await expect(map(page).getByTestId('pilgrimage-red-sea-crossing')).toHaveCount(0)
  const start = await cssTransform(page)
  await map(page).getByRole('button', { name: 'Aproximar mapa' }).click()
  await expect.poll(() => cssTransform(page)).not.toBe(start)

  await viewport(page).focus()
  const zoomed = await cssTransform(page)
  await page.keyboard.press('ArrowUp')
  await expect.poll(() => cssTransform(page)).not.toBe(zoomed)

  const client = await context.newCDPSession(page)
  const box = (await viewport(page).boundingBox())!
  const y = box.y + box.height * 0.4
  const position = (left: number, right: number) => [{ x: box.x + left, y, id: 1 }, { x: box.x + right, y, id: 2 }]
  const beforePinch = await cssTransform(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: position(117, 220) })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: position(85, 257) })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => cssTransform(page)).not.toBe(beforePinch)
})

test('abre a mesma cena pelo mapa geral e pela região, com arte ampliada e fundo desfocado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await openMap(page, 2)
  const title = 'Acampamento de Abraão'
  const discovery = map(page).getByRole('button', { name: title })
  const dialog = page.getByRole('dialog', { name: title })

  await expect(discovery.locator('img')).toBeInViewport()
  await expect(discovery.getByText(title)).toBeHidden()
  await discovery.click()
  await expect(dialog.getByText('Gênesis 12:1–9')).toBeVisible()
  const layout = await dialog.evaluate((panel) => {
    const backdrop = panel.parentElement!
    const device = backdrop.getBoundingClientRect()
    const art = panel.querySelector('.pilgrimage-scene')!.getBoundingClientRect()
    return {
      heightFraction: art.height / device.height,
      centerOffset: Math.abs((art.left + art.right - device.left - device.right) / 2),
      blur: getComputedStyle(backdrop).backdropFilter,
    }
  })
  expect(layout.heightFraction).toBeGreaterThan(0.7)
  expect(layout.centerOffset).toBeLessThan(1)
  expect(layout.blur).toContain('blur')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  await map(page).getByRole('button', { name: 'Explorar região' }).click()
  await expect(map(page)).toHaveAttribute('data-level', 'region')
  await expect(discovery.getByText(title)).toBeInViewport()
  await expect(discovery.getByText('Gênesis 12:1–9')).toBeInViewport()
  await discovery.click()
  await expect(dialog.getByRole('img', { name: title })).toBeVisible()
})

test.describe('transições com movimento', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('sobrepõe a arte regional e restaura a câmera na transição inversa', async ({ page }) => {
    await openMap(page)
    await map(page).evaluate((element) => {
      const node = element as HTMLElement
      let overlays = 0
      new MutationObserver((mutations) => {
        for (const record of mutations) {
          for (const child of record.addedNodes) {
            if (child instanceof Element && child.matches('.pilgrimage-incoming')) overlays++
          }
        }
        node.dataset.observedOverlays = String(overlays)
      }).observe(node, { childList: true, subtree: true })
    })
    const prior = await cssTransform(page)
    await map(page).getByRole('button', { name: 'Explorar região' }).click()
    await expect(map(page)).toHaveAttribute('data-level', 'region')
    await map(page).getByRole('button', { name: 'Voltar ao mapa' }).click()
    await expect(map(page)).toHaveAttribute('data-level', 'world')
    await expect(map(page)).toHaveAttribute('data-observed-overlays', '2')
    await expect.poll(() => cssTransform(page)).toBe(prior)
  })
})

test('mantém o mapa-mestre aberto quando a arte da região falha', async ({ page }) => {
  await page.route(/(?:visao-do-todo-\d+|01_visao_do_todo)\.webp/, (route) => route.abort())
  await openMap(page)
  const prior = await cssTransform(page)
  await map(page).getByRole('button', { name: 'Explorar região' }).click()
  await expect(map(page).getByRole('status')).toContainText('Tente outra vez')
  await expect(map(page)).toHaveAttribute('data-level', 'world')
  await expect.poll(() => cssTransform(page)).toBe(prior)
})
