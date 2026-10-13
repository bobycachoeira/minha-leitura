import { expect, type Page } from '@playwright/test'

/** Waits for the authenticated home (Today card). */
export async function openHome(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByText('Hoje', { exact: true })).toBeVisible({ timeout: 20_000 })
}

/** Adds a book via the manual form, as wishlist (owned=false) or shelf (owned=true). */
export async function addBook(page: Page, title: string, owned: boolean): Promise<void> {
  await page.goto('/library')
  await expect(page.getByText('Estante & Desejos')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Livro', exact: true }).click()
  await page.getByPlaceholder('O nome da obra').fill(title)
  await page.getByRole('button', { name: owned ? 'Tenho' : 'Desejos', exact: true }).click()
  await expect(page.getByText(owned ? 'Adicionado à Estante.' : 'Guardado nos Desejos.')).toBeVisible()
}

/** Opens a book detail page by id. */
export async function openBook(page: Page, bookId: string, title?: string): Promise<void> {
  await page.goto(`/library/${bookId}`)
  await expect(page.getByRole('button', { name: 'Voltar' })).toBeVisible({ timeout: 15_000 })
  if (title) await expect(page.getByRole('heading', { name: title })).toBeVisible()
}

/** Registers a reading log (pages) in the open book page. */
export async function registerReading(page: Page, pages: number, endPage?: number): Promise<void> {
  await page.getByLabel('Páginas lidas').fill(String(pages))
  if (endPage !== undefined) await page.getByLabel('Página atual').fill(String(endPage))
  await page.getByRole('button', { name: 'Registrar' }).click()
}

/** Marks the open book as "read" through the status select + finish prompt. */
export async function markAsRead(page: Page): Promise<void> {
  await page.locator('select').first().selectOption('lido')
  await page.getByRole('button', { name: 'Terminei nesta data' }).click()
  // The publish prompt opens after finishing; dismiss it.
  await page.getByRole('button', { name: 'Agora não' }).click()
}
