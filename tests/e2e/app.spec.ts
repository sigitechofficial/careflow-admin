import { test, expect } from '@playwright/test'
import { hasApiCreds, unauthenticatedStorage } from './helpers/auth'

test.describe('CareAdmin App', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.describe('unauthenticated', () => {
    test.use({ storageState: unauthenticatedStorage })

    test('visit to home redirects to login', async ({ page }) => {
      await page.goto('/')
      await expect(page).toHaveURL(/\/auth\/login/)
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    })
  })

  test.describe('authenticated shell', () => {
    test.beforeEach(() => {
      test.skip(!hasApiCreds, 'Set E2E_API_BASE_URL, E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD in `.env`.')
    })

    test('loads home with sidebar brand', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByText('CareAdmin', { exact: true }).first()).toBeVisible()
      await expect(page.getByText('Handover Report')).toBeVisible()
    })

    test('sidebar navigation opens service users', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Service Users' }).click()
      await page.getByRole('link', { name: 'All Service Users' }).click()
      await expect(page).toHaveURL(/\/service-users/)
    })

    test('can change theme from header menu', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Theme' }).click()
      await page.getByRole('menuitem', { name: 'Dark' }).click()
      await expect(page.locator('html')).toHaveClass(/dark/)
    })

    test('can collapse sidebar on desktop', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Collapse' }).click()
      await expect(page.locator('aside')).toHaveClass(/w-\[60px\]/)
    })

    test('notification bell opens dropdown when available', async ({ page }) => {
      await page.goto('/')
      const bell = page.getByRole('button', { name: 'Notifications' })
      if (!(await bell.isVisible())) {
        test.skip(true, 'Notification bell hidden (needs API URL and notifications.read).')
      }
      await bell.click()
      await expect(page.getByText('Notifications', { exact: true }).first()).toBeVisible()
    })

    test('UI showcase dialog opens and closes', async ({ page }) => {
      await page.goto('/showcase')
      await expect(page.getByRole('heading', { name: 'Component Library' })).toBeVisible()
      await page.getByRole('button', { name: 'Open Dialog' }).click()
      await expect(page.getByText('Add New Service User')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByText('Add New Service User')).not.toBeVisible()
    })
  })
})
