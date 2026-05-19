import { test, expect } from '@playwright/test'
import { hasApiCreds, unauthenticatedStorage } from '../helpers/auth'
import { E2E_SKIP_NO_API } from '../helpers/constants'
import { LoginPage } from '../pages/LoginPage'

test.describe('Auth: login', () => {
  test.use({ storageState: unauthenticatedStorage })

  test('login page renders with accessible fields', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.expectVisible()
  })

  test('invalid credentials show login error', async ({ page }) => {
    test.skip(!hasApiCreds, E2E_SKIP_NO_API)

    const login = new LoginPage(page)
    await login.goto()
    await login.login('invalid@careadmin.local', 'wrong-password-not-valid')
    await expect(page).toHaveURL(/\/auth\/login/)
    await login.expectLoginError()
  })
})
