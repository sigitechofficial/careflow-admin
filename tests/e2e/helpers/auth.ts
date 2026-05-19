import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'

const e2eDir = path.dirname(fileURLToPath(import.meta.url))

export const authStoragePath = path.resolve(e2eDir, '../../../playwright/.auth/user.json')

/** Use on tests that must run logged out (overrides project storageState). */
export const unauthenticatedStorage = { cookies: [] as const, origins: [] as const }

export const hasApiCreds =
  Boolean(process.env.E2E_API_BASE_URL?.trim()) &&
  Boolean(process.env.E2E_LOGIN_EMAIL?.trim()) &&
  Boolean(process.env.E2E_LOGIN_PASSWORD?.trim())

const LOGIN_TIMEOUT_MS = 60_000

/** Signs in via the login page using E2E_* env vars from `.env`. */
export async function loginAsE2eUser(page: Page) {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('login-email')).toBeVisible({ timeout: LOGIN_TIMEOUT_MS })

  await page.getByTestId('login-email').fill(process.env.E2E_LOGIN_EMAIL!)
  await page.getByTestId('login-password').fill(process.env.E2E_LOGIN_PASSWORD!)

  const submit = page.getByTestId('login-submit')
  await expect(submit).toBeEnabled()

  await Promise.all([
    page.waitForURL(url => !url.pathname.includes('/auth/login'), {
      timeout: LOGIN_TIMEOUT_MS,
      waitUntil: 'domcontentloaded',
    }),
    submit.click(),
  ])

  if (page.url().includes('/auth/login')) {
    const errorBanner = page.getByTestId('login-error')
    const msg = (await errorBanner.textContent().catch(() => null))?.trim()
    throw new Error(
      msg
        ? `E2E login failed: ${msg}. Check E2E_LOGIN_* in .env and that the API at ${process.env.E2E_API_BASE_URL} is running.`
        : `E2E login did not leave /auth/login. Ensure the API at ${process.env.E2E_API_BASE_URL} is running and credentials are valid.`,
    )
  }
}
