/**
 * One-off audit: login and walk service-user routes; fails on first load error.
 * Run: cd care-admin && npx playwright test audit-all-pages --project=chromium
 */
import { test, expect, type Page } from '@playwright/test'

const API = process.env.E2E_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
const EMAIL = process.env.E2E_LOGIN_EMAIL ?? 'admin@careadmin.local'
const PASSWORD = process.env.E2E_LOGIN_PASSWORD ?? 'Admin@12345'

const ERROR_PATTERNS = [
  /failed to fetch/i,
  /failed to load/i,
  /network error/i,
  /sign-in failed/i,
  /insufficient permissions/i,
  /unexpected api response/i,
]

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const body = (await res.json()) as { data?: { accessToken?: string }; message?: string }
  if (!res.ok || !body.data?.accessToken) {
    throw new Error(`API login failed: ${body.message ?? res.statusText}`)
  }
  return body.data.accessToken
}

async function getFirstServiceUserId(token: string): Promise<string> {
  const res = await fetch(`${API}/service-users?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const body = (await res.json()) as {
    data?: { id: string }[] | { items?: { id: string }[]; rows?: { id: string }[] }
  }
  if (!res.ok) throw new Error(`List service users failed: ${res.status}`)
  const raw = body.data
  const items = Array.isArray(raw)
    ? raw
    : (raw?.items ?? raw?.rows ?? [])
  const id = items[0]?.id
  if (!id) throw new Error('No service users in database — seed or create one first.')
  return id
}

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
    if (msg && ERROR_PATTERNS.some((p) => p.test(msg))) {
      throw new Error(`[${label}] UI error: ${msg}`)
    }
  }
  const spinner = page.locator('.animate-spin')
  if (await spinner.first().isVisible().catch(() => false)) {
    await expect(spinner.first()).toBeHidden({ timeout: 25_000 })
  }
}

test.describe('Service users audit', () => {
  test('login and check all service user pages', async ({ page }) => {
    test.setTimeout(300_000)

    const token = await getAccessToken()
    const suId = await getFirstServiceUserId(token)

    const topLevel: { path: string; label: string }[] = [
      { path: '/service-users/all', label: 'All Service Users' },
      { path: '/service-users/calendar', label: 'Service Users Calendar' },
      { path: '/service-users/initial-assessment-checklist', label: 'Initial Assessment Checklist' },
      { path: '/service-users/add', label: 'Add Service User' },
    ]

    for (const { path, label } of topLevel) {
      await test.step(label, async () => {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await assertPageHealthy(page, label)
      })
    }

    const suRoutes: { path: string; label: string }[] = [
      { path: `/service-users/${suId}/view`, label: 'View dashboard' },
      { path: `/service-users/${suId}/profile`, label: 'Profile' },
      { path: `/service-users/${suId}/medication`, label: 'Medication' },
      { path: `/service-users/${suId}/care-plan`, label: 'Care plan' },
      { path: `/service-users/${suId}/observations`, label: 'Observations' },
      { path: `/service-users/${suId}`, label: 'Edit profile (personal tab)' },
    ]

    for (const { path, label } of suRoutes) {
      await test.step(label, async () => {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await assertPageHealthy(page, label)
      })
    }

    const profileTabs = [
      'personal',
      'contacts',
      'about',
      'photos',
      'inventory',
      'allergies',
      'absences',
      'calendar',
      'privacy',
      'dom',
      'assessment',
      'funding',
      'charge-card',
      'visits',
      'invoices',
      'livein',
    ]
    for (const tab of profileTabs) {
      await test.step(`Profile tab: ${tab}`, async () => {
        await page.goto(`/service-users/${suId}/profile?tab=${tab}`, { waitUntil: 'domcontentloaded' })
        await assertPageHealthy(page, `profile ${tab}`)
      })
    }

    const tabs = [
      'contacts',
      'about',
      'photos',
      'inventory',
      'allergies',
      'documents',
      'absences',
      'calendar',
      'privacy',
      'dom',
      'assessment',
      'funding',
      'livein',
    ]

    for (const tab of tabs) {
      await test.step(`Edit tab: ${tab}`, async () => {
        await page.goto(`/service-users/${suId}?tab=${tab}`, { waitUntil: 'domcontentloaded' })
        await assertPageHealthy(page, `tab ${tab}`)
      })
    }
  })
})
