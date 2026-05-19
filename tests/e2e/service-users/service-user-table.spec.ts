import { test } from '@playwright/test'
import { hasApiCreds, unauthenticatedStorage } from '../helpers/auth'
import { E2E_SKIP_NO_API } from '../helpers/constants'
import { DashboardPage } from '../pages/DashboardPage'
import { ServiceUsersPage } from '../pages/ServiceUsersPage'

test.describe('Service users: table', () => {
  test.describe('when logged out', () => {
    test.use({ storageState: unauthenticatedStorage })

    test('list route redirects to login', async ({ page }) => {
      await page.goto('/service-users/all')
      await page.waitForURL(/\/auth\/login/)
    })
  })

  test.describe('authenticated', () => {
    test.beforeEach(() => {
      test.skip(!hasApiCreds, E2E_SKIP_NO_API)
    })

    test('list page exposes table, search, and status filter', async ({ page }) => {
      const list = new ServiceUsersPage(page)

      await test.step('Navigate via sidebar', async () => {
        await new DashboardPage(page).goto()
        await new DashboardPage(page).openServiceUsersList()
      })

      await test.step('Verify list regions', async () => {
        await list.expectLoaded()
        await list.expectTableReady()
        await page.getByTestId('service-users-status-filter').selectOption('in_service')
        await page.getByTestId('service-users-search').fill('test')
      })
    })

    test('add form route is reachable from nav', async ({ page }) => {
      await new DashboardPage(page).goto()
      await page.getByRole('button', { name: 'Service Users' }).click()
      await page.getByTestId('nav-service-users-add').click()
      await page.waitForURL(/\/service-users\/add/)
      await page.getByTestId('service-user-add-form').waitFor({ state: 'visible' })
    })
  })
})
