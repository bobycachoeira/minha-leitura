import { test, expect } from './fixtures'

test.describe('Retrospectiva', () => {
  test('mostra o resumo do casal', async ({ page, loginAs }) => {
    await loginAs('esposa')
    await page.goto('/retrospective')
    await expect(page.getByRole('heading', { name: 'Retrospectiva' })).toBeVisible()
    await expect(page.getByText(/páginas · /)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/Você ×/)).toBeVisible()
  })
})
