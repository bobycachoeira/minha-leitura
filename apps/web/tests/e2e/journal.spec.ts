import { test, expect } from './fixtures'

test.describe('Diário', () => {
  test('mostra a citação da esposa e a busca filtra', async ({ page, loginAs }) => {
    await loginAs('esposa')
    await page.goto('/journal')
    await expect(page.getByText('Capitu, olhos de ressaca')).toBeVisible({ timeout: 20_000 })

    const search = page.getByPlaceholder('Buscar em notas e citações')
    await search.fill('ressaca')
    await expect(page.getByText('Capitu, olhos de ressaca')).toBeVisible()

    await search.fill('zzzz-nao-existe')
    await expect(page.getByText(/Nada no diário/)).toBeVisible()
  })
})
