import { test, expect } from '@playwright/test'
import { hasApiCreds } from '../helpers/auth'
import { E2E_SKIP_NO_API } from '../helpers/constants'
import { DashboardPage } from '../pages/DashboardPage'

test.describe('Smoke: app shell', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeEach(() => {
    test.skip(!hasApiCreds, E2E_SKIP_NO_API)
  })

  test('theme can switch to dark', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.setDarkTheme()
  })

  test('sidebar can collapse on desktop', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.collapseSidebar()
    await dashboard.expandSidebar()
  })

  test('notification bell opens dropdown when available', async ({ page }) => {
    await new DashboardPage(page).goto()
    const bell = page.getByRole('button', { name: 'Notifications' })
    if (!(await bell.isVisible())) {
      test.skip(true, 'Notification bell hidden (needs API and notifications.read).')
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
