import { expect, type Page } from '@playwright/test'

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async expectLoaded() {
    await expect(this.page.getByText('CareAdmin', { exact: true }).first()).toBeVisible()
    await expect(this.page.getByRole('heading', { name: 'Handover Report' })).toBeVisible()
  }

  async openServiceUsersList() {
    await this.page.getByTestId('rail-service-users').click()
    await this.page.getByTestId('nav-service-users-all').click()
    await expect(this.page).toHaveURL(/\/service-users\/all/)
  }

  async setDarkTheme() {
    await this.page.getByTestId('theme-menu-trigger').click()
    await this.page.getByTestId('theme-dark').click()
    await expect(this.page.getByTestId('app-layout')).toHaveAttribute('data-theme', 'dark')
  }

  /** Office sidebar: page panel shows on hover by default; the rail button pins it open. */
  async pinPagePanel() {
    await this.page.getByTestId('sidebar-collapse-button').click()
    await expect(this.page.getByTestId('sidebar')).toHaveAttribute('data-pinned', 'true')
  }

  async unpinPagePanel() {
    await this.page.getByTestId('sidebar-collapse-button').click()
    await expect(this.page.getByTestId('sidebar')).toHaveAttribute('data-pinned', 'false')
  }
}
