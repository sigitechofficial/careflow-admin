import { expect, type Page } from '@playwright/test'

export class EmployeePage {
  constructor(private readonly page: Page) {}

  async gotoStaffList() {
    await this.page.goto('/employee/staff-list')
  }

  async expectStaffListLoaded() {
    await expect(this.page.getByTestId('employee-management-page')).toBeVisible()
    await expect(this.page.getByTestId('employee-staff-list-panel')).toBeVisible()
    await expect(this.page.getByTestId('employee-staff-table')).toBeVisible()
    await expect(this.page.getByTestId('employee-tab-staff-list')).toHaveAttribute('aria-selected', 'true')
  }

  async filterStatus(value: string) {
    await this.page.getByTestId('employee-status-filter').selectOption(value)
  }

  async expectStaffListReady() {
    await expect(this.page.getByTestId('employee-staff-loading')).not.toBeVisible({ timeout: 20_000 })
  }

  async expectRowWithName(displayName: string) {
    await this.expectStaffListReady()
    const row = this.page.getByRole('row').filter({ hasText: displayName })
    await expect(row).toBeVisible({ timeout: 20_000 })
    return row
  }

  /** Clicks a top-level employee module tab and asserts selection via stable test id. */
  async openTab(tabTestId: string) {
    const tab = this.page.getByTestId(tabTestId)
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
  }
}
