import { test, expect } from '@playwright/test'
import { unauthenticatedStorage } from '../helpers/auth'
import { LoginPage } from '../pages/LoginPage'

test.describe('Smoke: login', () => {
  test.use({ storageState: unauthenticatedStorage })

  test('unauthenticated visit redirects to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/auth\/login/)
    await new LoginPage(page).expectVisible()
  })
})
