import { test, expect } from './fixtures'
import { MARIDO } from './fixtures'

test.describe('Autenticação', () => {
  test('visitante sem sessão é levado para Entrar', async ({ page }) => {
    await page.goto('/library')
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  })

  test('marido entra por Magic Link e conclui o 2FA', async ({ page, backend }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(MARIDO.email)
    await page.getByRole('button', { name: /Enviar link/i }).click()
    await expect(page.getByText(/Se o e-mail existir/)).toBeVisible()

    let token: string | null = null
    for (let i = 0; i < 50 && !token; i += 1) {
      await page.waitForTimeout(100)
      token = backend.magicTokenFor(MARIDO.email)
    }
    expect(token).toBeTruthy()

    await page.goto(`/login?token=${token}`)
    await expect(page.getByRole('heading', { name: /Verificação em duas etapas/ })).toBeVisible({
      timeout: 15_000,
    })
    await page.locator('input[placeholder="••••••"]').fill(backend.stepUpCode(MARIDO.email))
    await page.getByRole('button', { name: 'Verificar' }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Hoje', { exact: true })).toBeVisible({ timeout: 20_000 })
  })
})
