import { expect, type Page } from '@playwright/test'

export class ServiceUsersPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/service-users/all')
  }

  async expectLoaded() {
    await expect(this.page.getByTestId('service-users-page')).toBeVisible()
    await expect(this.page.getByTestId('service-users-page-title')).toBeVisible()
    await expect(this.page.getByRole('heading', { name: 'Service User Management' })).toBeVisible()
  }

  async expectTableReady() {
    await expect(this.page.getByTestId('service-users-loading')).not.toBeVisible({ timeout: 20_000 })
    await expect(this.page.getByTestId('service-users-table')).toBeVisible()
  }

  async search(text: string) {
    await this.page.getByTestId('service-users-search').fill(text)
  }

  async expectRowWithName(displayName: string) {
    await this.expectTableReady()
    const row = this.page.getByRole('row').filter({ hasText: displayName })
    await expect(row).toBeVisible({ timeout: 20_000 })
    return row
  }

  async expectRowWithId(serviceUserId: string) {
    await expect(this.page.getByTestId(`service-user-row-${serviceUserId}`)).toBeVisible({ timeout: 20_000 })
  }
}
