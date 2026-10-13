import { test, expect } from './fixtures'
import { openHome } from './flows'

test.describe('Sync offline', () => {
  test('registro offline sincroniza ao reconectar e não duplica', async ({
    page,
    context,
    loginAs,
    backend,
  }) => {
    await loginAs('marido')
    await openHome(page)
    await page.waitForTimeout(1500)
    await page.goto(`/library/${backend.ids.dom}`)
    await expect(page.getByRole('button', { name: 'Registrar' })).toBeVisible()

    await context.setOffline(true)
    await page.getByLabel('Páginas lidas').fill('12')
    await page.getByRole('button', { name: 'Registrar' }).click()
    await expect(page.getByText('12 páginas')).toBeVisible()

    await context.setOffline(false)
    await page.waitForTimeout(4000)

    const result = await backend.api<Array<{ pages: number }>>(
      `/api/reading-logs?space=${backend.space}&perPage=200`,
      { token: backend.marido.token },
    )
    const count = result.data.filter((log) => log.pages === 12).length
    expect(count).toBe(1)
  })
})
