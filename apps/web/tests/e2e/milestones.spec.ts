import { test, expect } from './fixtures'
import { markAsRead, openBook } from './flows'

test.describe('Marcos (badges)', () => {
  test('terminar o primeiro livro desbloqueia "Primeiro livro"', async ({ page, loginAs, backend }) => {
    await loginAs('marido')
    await openBook(page, backend.ids.hobbit)
    await markAsRead(page)

    await page.goto('/achievements')
    const marco = page.locator('li', { hasText: 'Primeiro livro' })
    await expect(marco.getByText('conquistado')).toBeVisible({ timeout: 20_000 })
  })
})
