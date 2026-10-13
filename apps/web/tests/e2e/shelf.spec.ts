import { test, expect } from './fixtures'
import { addBook, openHome } from './flows'

test.describe('Estante: status, próxima leitura e formato', () => {
  test('desejo NÃO tem "próxima leitura" nem "leitura atual"', async ({ page, loginAs }) => {
    await loginAs('marido')
    await openHome(page)
    const title = `DesejoSem E2E ${Date.now()}`
    await addBook(page, title, false)
    await page.getByRole('button', { name: /Desejos ·/ }).click()
    await page.locator('li', { hasText: title }).getByRole('link').first().click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tenho este livro' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Marcar como próxima leitura' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Definir como leitura atual' })).toHaveCount(0)
  })

  test('livro da estante permite marcar como próxima leitura e leitura atual', async ({ page, loginAs }) => {
    await loginAs('marido')
    await openHome(page)
    const title = `Estante E2E ${Date.now()}`
    await addBook(page, title, true)

    await page.getByRole('button', { name: /Estante ·/ }).click()
    await page.locator('li', { hasText: title }).getByRole('link').first().click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    await expect(page.getByRole('button', { name: 'Marcar como próxima leitura' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Definir como leitura atual' })).toBeVisible()
    await page.getByRole('button', { name: 'Marcar como próxima leitura' }).click()
    await expect(page.getByText('Próxima leitura', { exact: true })).toBeVisible({ timeout: 10_000 })
  })

  test('status "Ainda vou ler" existe e a fila ordena na Estante', async ({ page, loginAs }) => {
    await loginAs('marido')
    await openHome(page)
    const title = `FilaStatus E2E ${Date.now()}`
    await addBook(page, title, true)

    await page.getByRole('button', { name: /Estante ·/ }).click()
    await page.locator('li', { hasText: title }).getByRole('link').first().click()
    const select = page.locator('select').first()
    await expect(select.locator('option', { hasText: 'Ainda vou ler' })).toHaveCount(1)
    await select.selectOption('a_ler')

    await page.goto('/library')
    await page.getByRole('button', { name: /Estante ·/ }).click()
    const tile = page.locator('li', { hasText: title })
    await expect(tile.getByRole('button', { name: 'Subir na fila' })).toHaveCount(1, { timeout: 15_000 })
  })

  test('desejo não tem "Registrar leitura"; só depois de virar estante', async ({ page, loginAs }) => {
    await loginAs('marido')
    await openHome(page)
    const title = `DesejoReg E2E ${Date.now()}`
    await addBook(page, title, false)

    await page.getByRole('button', { name: /Desejos ·/ }).click()
    await page.locator('li', { hasText: title }).getByRole('link').first().click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    // Desejo: sem registro/leitura, mas com o CTA para virar estante.
    await expect(page.getByLabel('Páginas lidas')).toHaveCount(0)
    await expect(page.getByText('Histórico de leitura')).toHaveCount(0)
    await page.getByRole('button', { name: 'Tenho este livro' }).click()
    await page.getByRole('button', { name: 'E-reader' }).click()

    // Agora sim: registro disponível.
    await expect(page.getByLabel('Páginas lidas')).toBeVisible({ timeout: 10_000 })
  })
})
