import { test, expect } from '@playwright/test'
import { instant } from '@next/playwright'

test('the signup screen is ready from the sign-in link', async ({ page }) => {
  await page.goto('/login')
  const link = page.locator('a[href="/signup"]')
  await expect(link).toBeVisible()
  await instant(page, async () => {
    await link.click()
    await page.waitForURL(url => url.pathname === '/signup' && url.search === '')
    await expect(page.getByRole('heading', { name: 'Create the account, confirm the email, start saving.' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toBeVisible()
  })
})

test('a private account page still requires a session', async ({ page }) => {
  await page.goto('/accounts')
  await page.waitForURL(url => url.pathname === '/login')
  await expect(page.getByRole('heading', { name: 'X accounts', exact: true })).toHaveCount(0)
})
