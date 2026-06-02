import { test, expect } from '@playwright/test'
import { hasApiCreds, unauthenticatedStorage } from '../helpers/auth'
import { E2E_SKIP_NO_API } from '../helpers/constants'
import {
  buildE2eServiceUserDraft,
  waitForServiceUserLookups,
  fillAddServiceUserForm,
} from '../helpers/service-user-form'
import { ServiceUsersPage } from '../pages/ServiceUsersPage'

test.describe('Service users: create', () => {
  test.describe('when logged out', () => {
    test.use({ storageState: unauthenticatedStorage })

    test('add route redirects to login', async ({ page }) => {
      await page.goto('/service-users/add')
      await expect(page).toHaveURL(/\/auth\/login/)
    })
  })

  test.describe('authenticated', () => {
    test.beforeEach(() => {
      test.skip(!hasApiCreds, E2E_SKIP_NO_API)
    })

    test('add form loads with stable test ids', async ({ page }) => {
      await page.goto('/service-users/add')
      await expect(page).toHaveURL(/\/service-users\/add/)
      await expect(page.getByTestId('service-user-add-form')).toBeVisible()
      await expect(page.getByTestId('service-user-first-name')).toBeVisible()
      await expect(page.getByTestId('service-user-save')).toBeVisible()
    })

    test('creates service user and shows new row on list', async ({ page }) => {
      test.setTimeout(120_000)
      const draft = buildE2eServiceUserDraft()
      const list = new ServiceUsersPage(page)

      await test.step('Fill add form', async () => {
        await page.goto('/service-users/add')
        await waitForServiceUserLookups(page)
        await fillAddServiceUserForm(page, draft)
      })

      await test.step('Save and land on list', async () => {
        await page.getByTestId('service-user-save').click()
        await expect(page).toHaveURL(/\/service-users\/all/, { timeout: 30_000 })
        await list.expectLoaded()
      })

      await test.step('Search for created record', async () => {
        await list.search(draft.lastName)
        await expect(page.getByTestId('service-users-status-filter')).toHaveValue('ACTIVE')
        const row = await list.expectRowWithName(draft.displayName)
        await expect(row.getByRole('link', { name: new RegExp(draft.firstName) })).toBeVisible()
      })
    })
  })
})
