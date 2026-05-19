import { test, expect } from '@playwright/test'
import { hasApiCreds, unauthenticatedStorage } from '../helpers/auth'
import { E2E_SKIP_NO_API } from '../helpers/constants'
import { DashboardPage } from '../pages/DashboardPage'

test.describe('Auth: logout', () => {
  test.beforeEach(() => {
    test.skip(!hasApiCreds, E2E_SKIP_NO_API)
  })

  test('sign out returns to login', async ({ page }) => {
    await test.step('Open dashboard', async () => {
      await new DashboardPage(page).goto()
    })
    await test.step('Sign out from sidebar', async () => {
      await page.getByTestId('sidebar-sign-out-button').click()
    })
    await test.step('Verify login page', async () => {
      await expect(page).toHaveURL(/\/auth\/login/)
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    })
  })
})

test.describe('Auth: logout (unauthenticated guard)', () => {
  test.use({ storageState: unauthenticatedStorage })

  test('employee list redirects when logged out', async ({ page }) => {
    await page.goto('/employee/staff-list')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
