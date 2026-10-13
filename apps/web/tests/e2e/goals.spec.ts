import { test, expect } from './fixtures'
import { openHome } from './flows'

test.describe('Metas e constância', () => {
  test('marido bate a meta diária e o card Hoje mostra batida', async ({ page, loginAs }) => {
    await loginAs('marido')
    await openHome(page)
    await page.reload()
    await openHome(page)
    await expect(page.getByText(/Meta de páginas de hoje batida/i)).toBeVisible({ timeout: 20_000 })
  })

  test('tela de metas lista a meta ativa e a sequência', async ({ page, loginAs }) => {
    await loginAs('marido')
    await page.goto('/goals')
    await expect(page.getByRole('heading', { name: 'Metas', exact: true })).toBeVisible()
    await expect(page.getByText('10 páginas no dia', { exact: true })).toBeVisible({ timeout: 15_000 })
  })
})
