import { expect, test, type Page } from '@playwright/test'

async function search(page: Page, reference: string) {
  await page.getByTestId('barra-inferior').getByRole('button', { name: 'Buscar na Bíblia' }).click()
  await page.getByLabel('Livro', { exact: true }).fill(reference)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
}

test('toca a narração oficial no capítulo e no versículo selecionado', async ({ page }) => {
  await page.route('**/*.supabase.co/**', (route) => route.abort())
  await page.addInitScript(() => {
    localStorage.setItem('pao:progress:v1', JSON.stringify({ version: 1, introSeen: true, started: true, completedDays: {} }))
  })
  await page.goto('/')
  await expect(page.getByTestId('splash')).toBeHidden()
  await search(page, 'Salmos 117')
  const media = page.waitForResponse(/\/audio\/bible\/2018\/sl\/117-[a-f0-9]+\.mp3/)
  await page.getByRole('button', { name: 'Ouvir capítulo' }).click()
  expect((await media).ok()).toBeTruthy()
  const activeVerse = page.locator('[data-current-verse]')
  const activeWord = activeVerse.locator('mark[data-current-word]')
  await expect(activeVerse.locator('sup')).toHaveText('1')
  await expect(activeWord).toBeVisible()
  await page.getByRole('button', { name: 'Pausar áudio' }).click()
  const pausedWord = await activeWord.textContent()
  await expect(activeWord).toHaveText(pausedWord!)
  await page.getByRole('combobox', { name: 'Velocidade da narração' }).selectOption('1.5')
  await page.getByRole('button', { name: 'Retomar áudio' }).click()
  await expect(activeWord).not.toHaveText(pausedWord!)
  await expect(activeVerse.locator('sup')).toHaveText('2')
  await expect(activeWord).toBeVisible()
  await page.getByRole('button', { name: 'Fechar leitor' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  await search(page, 'Salmos 117:2')
  await page.getByRole('button', { name: 'Ouvir versículo' }).click()
  await expect(activeVerse.locator('sup')).toHaveText('2')
  await expect(page.getByRole('button', { name: 'Ouvir versículo' })).toBeVisible({ timeout: 12_000 })
  await expect(activeVerse).toHaveCount(0)
})
