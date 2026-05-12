import { test, expect } from '@playwright/test'

const hasApiCreds =
  Boolean(process.env.E2E_API_BASE_URL?.trim()) &&
  Boolean(process.env.E2E_LOGIN_EMAIL?.trim()) &&
  Boolean(process.env.E2E_LOGIN_PASSWORD?.trim())

test.describe('Employee wizard', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByTestId('login-email')).toBeVisible()
  })

  test('full add-employee path (requires API + creds)', async ({ page }) => {
    test.skip(!hasApiCreds, 'Set E2E_API_BASE_URL, E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD to run this test.')

    await page.goto('/auth/login')
    await page.getByTestId('login-email').fill(process.env.E2E_LOGIN_EMAIL!)
    await page.getByTestId('login-password').fill(process.env.E2E_LOGIN_PASSWORD!)
    await page.getByTestId('login-submit').click()
    await expect(page).not.toHaveURL(/\/auth\/login/)

    await page.goto('/employee/add')
    await expect(page.getByTestId('employee-wizard-title')).toContainText(/add employee/i)
  })
})
