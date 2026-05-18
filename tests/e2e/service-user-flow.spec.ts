import { test, expect } from '@playwright/test'
import { hasApiCreds, unauthenticatedStorage } from './helpers/auth'
import {
  buildE2eServiceUserDraft,
  waitForServiceUserLookups,
  fillAddServiceUserForm,
} from './helpers/service-user-form'

test.describe('Service user module', () => {
  test.describe('when logged out', () => {
    test.use({ storageState: unauthenticatedStorage })

    test('add route redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/service-users/add')
      await expect(page).toHaveURL(/\/auth\/login/)
    })
  })

  test.describe('authenticated flows', () => {
    test.beforeEach(() => {
      test.skip(!hasApiCreds, 'Set E2E_API_BASE_URL, E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD in `.env`.')
    })

    test('add service user form loads', async ({ page }) => {
      await page.goto('/service-users/add')
      await expect(page).toHaveURL(/\/service-users\/add/)
      await expect(page.getByTestId('service-user-add-form')).toBeVisible()
      await expect(page.getByTestId('service-user-add-form').getByText('Add Service User')).toBeVisible()
      await expect(page.getByTestId('service-user-first-name')).toBeVisible()
      await expect(page.getByTestId('service-user-save')).toBeVisible()
    })

    test('creates service user and shows new row on list', async ({ page }) => {
      test.setTimeout(120_000)

      const draft = buildE2eServiceUserDraft()

      await page.goto('/service-users/add')
      await waitForServiceUserLookups(page)
      await fillAddServiceUserForm(page, draft)

      await page.getByTestId('service-user-save').click()
      await expect(page).toHaveURL(/\/service-users\/all/, { timeout: 30000 })

      await expect(page.getByTestId('service-users-page')).toBeVisible()
      await page.getByTestId('service-users-search').fill(draft.lastName)
      await expect(page.getByTestId('service-users-status-filter')).toHaveValue('in_service')

      await expect(page.getByTestId('service-users-table')).toBeVisible({ timeout: 20000 })
      const row = page.locator('tbody tr').filter({ hasText: draft.displayName })
      await expect(row).toBeVisible({ timeout: 20000 })
      await expect(row.getByRole('link', { name: new RegExp(draft.firstName) })).toBeVisible()
    })
  })
})
