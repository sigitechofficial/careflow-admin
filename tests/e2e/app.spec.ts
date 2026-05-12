import { test, expect } from '@playwright/test'

test.describe('CareAdmin App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads the app with sidebar', async ({ page }) => {
    await expect(page.getByText('CareAdmin')).toBeVisible()
    await expect(page.getByText('Component Library')).toBeVisible()
  })

  test('sidebar navigation works', async ({ page }) => {
    await page.click('button:has-text("Service Users")')
    await expect(page.getByText('Component Library')).toBeVisible()
  })

  test('can toggle dark mode', async ({ page }) => {
    const themeButton = page.locator('button').filter({ hasText: /sun|moon|monitor/i }).first()
    await themeButton.click()
    await expect(page.locator('html')).toHaveClass(/dark|light/)
  })

  test('can collapse sidebar', async ({ page }) => {
    await page.click('button:has-text("Collapse")')
    await expect(page.locator('aside')).toHaveClass(/w-\[60px\]/)
  })

  test('dialog opens and closes', async ({ page }) => {
    await page.click('button:has-text("Open Dialog")')
    await expect(page.getByText('Add New Service User')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Add New Service User')).not.toBeVisible()
  })

  test('shows notification badge on bell', async ({ page }) => {
    const bell = page.locator('header button').nth(2)
    await bell.click()
    await expect(page.getByText('Notifications')).toBeVisible()
  })
})
