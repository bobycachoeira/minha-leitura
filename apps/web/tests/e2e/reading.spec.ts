import { test, expect } from './fixtures'

test.describe('Registro de leitura', () => {
  test('registrar páginas aparece no histórico e não duplica ao sincronizar', async ({
    page,
    loginAs,
    backend,
  }) => {
    await loginAs('marido')
    await page.goto(`/library/${backend.ids.dom}`)
    await page.getByLabel('Páginas lidas').fill('7')
    await page.getByRole('button', { name: 'Registrar' }).click()
    await expect(page.getByText('7 páginas')).toBeVisible()

    // dá tempo do push/pull e recarrega: deve continuar havendo UM só.
    await page.waitForTimeout(2500)
    await page.reload()
    await expect(page.getByText('7 páginas')).toHaveCount(1, { timeout: 15_000 })
  })

  test('excluir um lançamento remove do histórico', async ({ page, loginAs, backend }) => {
    await loginAs('marido')
    await page.goto(`/library/${backend.ids.dom}`)
    await page.getByLabel('Páginas lidas').fill('33')
    await page.getByRole('button', { name: 'Registrar' }).click()
    await page.getByRole('button', { name: 'Agora não' }).click()
    // Espera o push/pull para o registro local assumir o id do servidor.
    await page.waitForTimeout(2500)

    const item = page.locator('li', { hasText: '33 páginas' })
    await expect(item).toBeVisible()
    await item.getByRole('button', { name: 'Remover lançamento' }).click()
    await page.getByRole('button', { name: 'Excluir' }).click()
    await expect(item).toHaveCount(0, { timeout: 10_000 })
  })

  test('sessão com nota e citação aparecem no histórico', async ({ page, loginAs, backend }) => {
    await loginAs('marido')
    await page.goto(`/library/${backend.ids.dom}`)
    await page.getByLabel('Páginas lidas').fill('5')
    await page.getByRole('button', { name: 'Nota / citação' }).click()
    await page.getByLabel('Nota da sessão').fill('Sessão tranquila')
    await page.getByLabel('Citação', { exact: true }).fill('Um trecho marcante')
    await page.getByRole('button', { name: 'Registrar' }).click()
    await expect(page.getByText('Sessão tranquila')).toBeVisible()
    await expect(page.getByText('Um trecho marcante')).toBeVisible()
  })
})
