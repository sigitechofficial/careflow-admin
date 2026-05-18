import { test, expect } from '@playwright/test'
import { hasApiCreds, unauthenticatedStorage } from './helpers/auth'
import {
  buildE2eEmployeeDraft,
  waitForEmployeeLookups,
  fillPersonalStep,
  fillEmploymentStep,
  fillEmploymentOptionalLookups,
  saveStandardWorkingWeek,
} from './helpers/employee-form'

test.describe('Employee module', () => {
  test.describe('when logged out', () => {
    test.use({ storageState: unauthenticatedStorage })

    test('staff list route redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/employee/staff-list')
      await expect(page).toHaveURL(/\/auth\/login/)
    })

    test('login page renders', async ({ page }) => {
      await page.goto('/auth/login')
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
      await expect(page.getByTestId('login-email')).toBeVisible()
    })
  })

  test.describe('authenticated flows', () => {
    test.beforeEach(() => {
      test.skip(!hasApiCreds, 'Set E2E_API_BASE_URL, E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD in `.env`.')
    })

    test('employee staff list: stable regions, tabs, and status filter', async ({ page }) => {
      await page.goto('/employee/staff-list')
      await expect(page.getByTestId('employee-management-page')).toBeVisible()
      await expect(page.getByTestId('employee-staff-list-panel')).toBeVisible()
      await expect(page.getByTestId('employee-staff-table')).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Staff List' })).toHaveAttribute('aria-selected', 'true')

      await expect(page.getByTestId('employee-status-filter')).toBeVisible()
      await page.getByTestId('employee-status-filter').selectOption('All')
      await expect(page.getByTestId('employee-status-filter')).toHaveValue('All')

      await page.getByTestId('employee-tab-compliance').click()
      await expect(page.getByRole('tab', { name: 'Compliance' })).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByTestId('employee-compliance-panel')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Employee Compliance' })).toBeVisible()

      await page.getByTestId('employee-tab-skills').click()
      await expect(page.getByTestId('employee-skills-panel')).toBeVisible()

      await page.getByTestId('employee-tab-non-core-activity').click()
      await expect(page.getByTestId('employee-non-core-activity-panel')).toBeVisible()

      await page.getByTestId('employee-tab-reports').click()
      await expect(page.getByTestId('employee-reports-panel')).toBeVisible()
      await expect(page.getByRole('button', { name: /Open report: Carer Activity Summary Report/i })).toBeVisible()

      await page.getByTestId('employee-tab-staff-list').click()
      await expect(page.getByRole('tab', { name: 'Staff List' })).toHaveAttribute('aria-selected', 'true')
    })

    test('sidebar can open employee staff list with stable nav test id', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/')
      await page.getByRole('button', { name: 'Employee' }).click()
      await page.getByTestId('nav-employee-staff-list').click()
      await expect(page).toHaveURL(/\/employee\/staff-list/)
      await expect(page.getByTestId('employee-staff-list-panel')).toBeVisible()
    })

    test('add employee wizard exposes labels and step controls', async ({ page }) => {
      await page.goto('/employee/add')
      await expect(page.getByTestId('employee-wizard-title')).toContainText(/add employee/i)
      await expect(page.getByTestId('employee-wizard')).toBeVisible()
      await expect(page.getByTestId('employee-personal-form')).toBeVisible()
      await expect(page.getByLabel('First name')).toBeVisible()
      await expect(page.getByLabel('Last name')).toBeVisible()
      await expect(page.getByTestId('employee-wizard-step-personal')).toBeVisible()
      await expect(page.getByTestId('employee-save-personal')).toBeVisible()
      await expect(page.getByTestId('employee-wizard-return-staff-list')).toBeVisible()
    })

    test('creates employee via wizard and shows new row on staff list', async ({ page }) => {
      test.setTimeout(120_000)
      const draft = buildE2eEmployeeDraft()

      await page.goto('/employee/add')
      await expect(page).toHaveURL(/\/employee\/add/)
      await waitForEmployeeLookups(page)
      await fillPersonalStep(page, draft)

      await page.getByTestId('employee-save-personal').click()
      await expect(page.getByRole('status')).toContainText(/employee created|complete employment/i, {
        timeout: 20000,
      })
      await expect(page.getByTestId('employee-employment-form')).toBeVisible()

      await fillEmploymentStep(page)
      await fillEmploymentOptionalLookups(page)
      await page.getByTestId('employee-save-employment').click()
      await expect(page.getByRole('status')).toContainText(/employment saved/i, { timeout: 20000 })
      await expect(page.getByTestId('employee-working-pattern-section')).toBeVisible()

      await saveStandardWorkingWeek(page)

      await page.getByTestId('employee-wizard-done').click()
      await expect(page).toHaveURL(/\/employee\/staff-list/)
      await expect(page.getByTestId('employee-staff-table')).toBeVisible()

      await page.getByTestId('employee-status-filter').selectOption('Active')
      await expect(page.getByTestId('employee-staff-loading')).not.toBeVisible({ timeout: 20000 })

      const row = page.locator('tbody tr').filter({ hasText: draft.displayName })
      await expect(row).toBeVisible({ timeout: 20000 })
      await expect(row).toContainText(draft.displayName)
      await expect(row).toContainText(/Active/i)
    })
  })
})
