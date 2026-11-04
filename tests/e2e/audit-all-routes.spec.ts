/**
 * Broad route audit: login and walk major app routes; fails on first load error.
 * Run: cd care-admin && npx playwright test audit-all-routes --project=chromium
 */
import { test, expect, type Page } from '@playwright/test'
import { getAccessToken, getFirstServiceUserId, majorRoutes } from './helpers/routes'

const ERROR_PATTERNS = [
  /failed to fetch/i,
  /failed to load/i,
  /network error/i,
  /sign-in failed/i,
  /insufficient permissions/i,
  /unexpected api response/i,
]

async function assertPageHealthy(page: Page, label: string) {
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
  const text = await page.locator('body').innerText()
  for (const pat of ERROR_PATTERNS) {
    if (pat.test(text)) {
      const snippet = text.match(pat)?.[0] ?? pat.source
      throw new Error(`[${label}] Error on page: "${snippet}"`)
    }
  }
  const loginError = page.getByTestId('login-error')
  if (await loginError.isVisible().catch(() => false)) {
    throw new Error(`[${label}] Login error: ${await loginError.textContent()}`)
  }
  const destructive = page.locator('.text-destructive').filter({ hasText: /failed|error|fetch/i })
  if ((await destructive.count()) > 0) {
    const msg = (await destructive.first().textContent())?.trim()
    if (msg && ERROR_PATTERNS.some(p => p.test(msg))) {
      throw new Error(`[${label}] UI error: ${msg}`)
    }
  }
  const spinner = page.locator('.animate-spin')
  if (await spinner.first().isVisible().catch(() => false)) {
    await expect(spinner.first()).toBeHidden({ timeout: 25_000 })
  }
}

test.describe('Major routes audit', () => {
  test('login and check home, employee, scheduling, settings, account, admin', async ({ page }) => {
    test.setTimeout(360_000)

    const token = await getAccessToken()
    const suId = process.env.E2E_SERVICE_USER_ID ?? (await getFirstServiceUserId(token))

    const routes = majorRoutes(suId)

    for (const { path, label } of routes) {
      await test.step(label, async () => {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await assertPageHealthy(page, label)
      })
    }
  })
})
