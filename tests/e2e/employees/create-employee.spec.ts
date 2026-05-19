import { test, expect } from '@playwright/test'
import { hasApiCreds } from '../helpers/auth'
import { E2E_SKIP_NO_API } from '../helpers/constants'
import {
  buildE2eEmployeeDraft,
  waitForEmployeeLookups,
  fillPersonalStep,
  fillEmploymentStep,
  fillEmploymentOptionalLookups,
  saveStandardWorkingWeek,
} from '../helpers/employee-form'
import { EmployeePage } from '../pages/EmployeePage'

test.describe('Employees: create', () => {
  test.beforeEach(() => {
    test.skip(!hasApiCreds, E2E_SKIP_NO_API)
  })

  test('add wizard exposes labels and step controls', async ({ page }) => {
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
    const employees = new EmployeePage(page)

    await test.step('Personal details', async () => {
      await page.goto('/employee/add')
      await expect(page).toHaveURL(/\/employee\/add/)
      await waitForEmployeeLookups(page)
      await fillPersonalStep(page, draft)
      await page.getByTestId('employee-save-personal').click()
      await expect(page.getByRole('status')).toContainText(/employee created|complete employment/i, {
        timeout: 20_000,
      })
      await expect(page.getByTestId('employee-employment-form')).toBeVisible()
    })

    await test.step('Employment details', async () => {
      await fillEmploymentStep(page)
      await fillEmploymentOptionalLookups(page)
      await page.getByTestId('employee-save-employment').click()
      await expect(page.getByRole('status')).toContainText(/employment saved/i, { timeout: 20_000 })
      await expect(page.getByTestId('employee-working-pattern-section')).toBeVisible()
    })

    await test.step('Working pattern', async () => {
      await saveStandardWorkingWeek(page)
    })

    await test.step('Finish wizard and verify list', async () => {
      await page.getByTestId('employee-wizard-done').click()
      await expect(page).toHaveURL(/\/employee\/staff-list/)
      await employees.expectStaffListLoaded()
      await employees.filterStatus('Active')
      await employees.expectStaffListReady()
      const row = await employees.expectRowWithName(draft.displayName)
      await expect(row).toContainText(/Active/i)
    })
  })
})
