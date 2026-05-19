import { test } from '@playwright/test'
import { hasApiCreds, unauthenticatedStorage } from '../helpers/auth'
import { E2E_SKIP_NO_API } from '../helpers/constants'
import { DashboardPage } from '../pages/DashboardPage'
import { EmployeePage } from '../pages/EmployeePage'

test.describe('Employees: table', () => {
  test.describe('when logged out', () => {
    test.use({ storageState: unauthenticatedStorage })

    test('staff list redirects to login', async ({ page }) => {
      await page.goto('/employee/staff-list')
      await page.waitForURL(/\/auth\/login/)
    })
  })

  test.describe('authenticated', () => {
    test.beforeEach(() => {
      test.skip(!hasApiCreds, E2E_SKIP_NO_API)
    })

    test('staff list exposes tabs, filter, and table', async ({ page }) => {
      const employees = new EmployeePage(page)

      await test.step('Open staff list', async () => {
        await employees.gotoStaffList()
        await employees.expectStaffListLoaded()
      })

      await test.step('Status filter', async () => {
        await employees.filterStatus('All')
      })

      await test.step('Compliance tab', async () => {
        await employees.openTab('employee-tab-compliance')
        await page.getByTestId('employee-compliance-panel').waitFor({ state: 'visible' })
        await page.getByRole('heading', { name: 'Employee Compliance' }).waitFor({ state: 'visible' })
      })

      await test.step('Skills tab', async () => {
        await employees.openTab('employee-tab-skills')
        await page.getByTestId('employee-skills-panel').waitFor({ state: 'visible' })
      })

      await test.step('Non-core activity tab', async () => {
        await employees.openTab('employee-tab-non-core-activity')
        await page.getByTestId('employee-non-core-activity-panel').waitFor({ state: 'visible' })
      })

      await test.step('Reports tab', async () => {
        await employees.openTab('employee-tab-reports')
        await page.getByTestId('employee-reports-panel').waitFor({ state: 'visible' })
        await page
          .getByRole('button', { name: /Open report: Carer Activity Summary Report/i })
          .waitFor({ state: 'visible' })
      })

      await test.step('Return to staff list', async () => {
        await employees.openTab('employee-tab-staff-list')
      })
    })

    test('sidebar opens employee staff list', async ({ page }) => {
      await new DashboardPage(page).goto()
      await page.getByRole('button', { name: 'Employee' }).click()
      await page.getByTestId('nav-employee-staff-list').click()
      await page.waitForURL(/\/employee\/staff-list/)
      await new EmployeePage(page).expectStaffListLoaded()
    })
  })
})
