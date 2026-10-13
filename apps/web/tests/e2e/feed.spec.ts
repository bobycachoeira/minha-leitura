import { test, expect } from './fixtures'
import { openHome } from './flows'

test.describe('Mural / feed', () => {
  test('marido publica no mural e vê no feed', async ({ page, loginAs }) => {
    await loginAs('marido')
    await openHome(page)
    const text = `Post E2E ${Date.now()}`
    await page.locator('textarea').first().fill(text)
    await page.getByRole('button', { name: 'Publicar' }).click()
    await expect(page.getByText(text)).toBeVisible({ timeout: 15_000 })
  })
})
