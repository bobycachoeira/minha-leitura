import { test, expect } from './fixtures'
import { addBook, openHome } from './flows'

test.describe('Próxima leitura (fila)', () => {
  test('marcar como próxima leitura fixa no topo da Estante', async ({ page, loginAs, backend }) => {
    await loginAs('marido')
    await openHome(page)
    await page.goto(`/library/${backend.ids.sapiens}`)
    await page.getByRole('button', { name: 'Tenho este livro' }).click()
    await expect(page.getByText('Na estante')).toBeVisible()
    const markButton = page.getByRole('button', { name: 'Marcar como próxima leitura' })
    if ((await markButton.count()) > 0) await markButton.click()
    await expect(page.getByText('Próxima leitura', { exact: true })).toBeVisible({ timeout: 10_000 })

    await page.goto('/library')
    await page.getByRole('button', { name: /Estante ·/ }).click()
    const tile = page.locator('li', { hasText: 'Sapiens E2E' })
    await expect(tile.getByText('Próximo da fila')).toBeVisible({ timeout: 15_000 })
  })

  test('setas reordenam a fila na Estante', async ({ page, loginAs }) => {
    await loginAs('marido')
    await openHome(page)
    const title = `Fila E2E ${Date.now()}`
    await addBook(page, title, true)
    await page.getByRole('button', { name: /Estante ·/ }).click()
    const tile = page.locator('li', { hasText: title })
    await expect(tile).toBeVisible({ timeout: 15_000 })
    // A nova entra no fim da fila: "Subir" deve estar habilitado.
    const up = tile.getByRole('button', { name: 'Subir na fila' })
    await expect(up).toBeEnabled({ timeout: 10_000 })
    await up.click()
    await expect(page.getByText('Próximo da fila').first()).toBeVisible()
  })
})
