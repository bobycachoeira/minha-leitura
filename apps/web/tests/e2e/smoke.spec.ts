import { test, expect } from '@playwright/test'

/**
 * T125 — end-to-end smoke flow. Requires a running app + backend; skipped by
 * convention when E2E_BASE_URL is not provided (Playwright manages its own
 * dev server otherwise).
 */
test('shows the app shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Minha Leitura')).toBeVisible()
})

test('redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/library')
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
})
