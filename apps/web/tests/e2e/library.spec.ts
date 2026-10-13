import { test, expect } from './fixtures'
import { addBook, openHome } from './flows'

test.describe('Estante & Desejos', () => {
  test('desejo vira estante no "Adquiri"', async ({ page, loginAs }) => {
    await loginAs('marido')
    const title = `Desejo E2E ${Date.now()}`
    await addBook(page, title, false)

    await page.getByRole('button', { name: /Desejos ·/ }).click()
    const tile = page.locator('li', { hasText: title })
    await expect(tile).toBeVisible()
    await tile.getByRole('button', { name: 'Adquiri' }).click()

    await page.getByRole('button', { name: /Estante ·/ }).click()
    await expect(page.locator('li', { hasText: title })).toBeVisible()
  })

  test('marido vê a resenha pública da parceira no livro', async ({ page, loginAs, backend }) => {
    await loginAs('marido')
    await openHome(page)
    await page.goto(`/library/${backend.ids.bichos}`)
    await expect(page.getByText('Maria Leitora avaliou')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Clássico atemporal.')).toBeVisible()
  })

  test('avaliação por meia-estrela persiste', async ({ page, loginAs, backend }) => {
    await loginAs('marido')
    await openHome(page)
    await page.goto(`/library/${backend.ids.dom}`)
    await page.getByRole('button', { name: '4.5 estrelas' }).click()
    await page.getByRole('button', { name: 'Salvar avaliação' }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: '4.5 estrelas' })).toBeVisible({ timeout: 15_000 })
  })
})
