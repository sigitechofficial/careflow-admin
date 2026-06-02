import { test, expect } from '@playwright/test'

test('navigate from list to overview without load error', async ({ page }) => {
  await page.goto('/service-users/all', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('service-users-page')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/Failed to load service users/i)).toHaveCount(0)

  const overview = page.getByTestId('su-action-overview').first()
  await expect(overview).toBeVisible({ timeout: 15_000 })
  await Promise.all([
    page.waitForURL(/\/service-users\/[0-9a-f-]+\/view$/i, { timeout: 30_000 }),
    overview.click(),
  ])

  await expect(page.getByText(/Failed to load service user/i)).toHaveCount(0)
  await expect(page.locator('.animate-spin').first()).toBeHidden({ timeout: 30_000 })
})
