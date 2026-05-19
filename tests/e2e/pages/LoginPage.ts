import { expect, type Page } from '@playwright/test'

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/auth/login')
  }

  async fillEmail(email: string) {
    await this.page.getByLabel('Email').fill(email)
  }

  async fillPassword(password: string) {
    await this.page.getByLabel('Password').fill(password)
  }

  async submit() {
    await this.page.getByTestId('login-submit').click()
  }

  async login(email: string, password: string) {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submit()
  }

  async expectVisible() {
    await expect(this.page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(this.page.getByTestId('login-email')).toBeVisible()
    await expect(this.page.getByTestId('login-password')).toBeVisible()
    await expect(this.page.getByTestId('login-submit')).toBeVisible()
  }

  async expectLoginError() {
    await expect(this.page.getByTestId('login-error')).toBeVisible()
  }
}
