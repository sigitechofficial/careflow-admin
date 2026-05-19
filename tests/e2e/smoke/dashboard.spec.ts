import { test } from '@playwright/test'
import { hasApiCreds } from '../helpers/auth'
import { E2E_SKIP_NO_API } from '../helpers/constants'
import { DashboardPage } from '../pages/DashboardPage'

test.describe('Smoke: dashboard', () => {
  test.beforeEach(() => {
    test.skip(!hasApiCreds, E2E_SKIP_NO_API)
  })

  test('home dashboard loads for authenticated user', async ({ page }) => {
    await test.step('Open home', async () => {
      await new DashboardPage(page).goto()
    })
    await test.step('Verify shell', async () => {
      await new DashboardPage(page).expectLoaded()
    })
  })
})
