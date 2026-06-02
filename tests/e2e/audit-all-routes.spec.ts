/**
 * Broad route audit: login and walk major app routes; fails on first load error.
 * Run: cd care-admin && npx playwright test audit-all-routes --project=chromium
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
  const items = Array.isArray(raw) ? raw : (raw?.items ?? raw?.rows ?? [])
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

    const routes: { path: string; label: string }[] = [
      { path: '/', label: 'Home' },
      { path: '/account', label: 'Account' },
      { path: '/employee/staff-list', label: 'Employee staff list' },
      { path: '/employee/compliance', label: 'Employee compliance' },
      { path: '/employee/skills', label: 'Employee skills' },
      { path: '/employee/documents', label: 'Employee documents' },
      { path: '/employee/add', label: 'Add employee' },
      { path: '/scheduling/view', label: 'View schedule' },
      { path: '/scheduling/build', label: 'Build schedule' },
      { path: '/scheduling/report', label: 'Scheduling report' },
      { path: '/scheduling/jobs', label: 'Manage schedule jobs' },
      { path: '/scheduling/list', label: 'Schedule list' },
      { path: '/scheduling/templates', label: 'Schedule templates' },
      { path: '/settings/general', label: 'General settings' },
      { path: '/settings/company', label: 'Company settings' },
      { path: '/settings/location-management', label: 'Location management' },
      { path: '/settings/care-pathway', label: 'Care pathway settings' },
      { path: '/accidents-incidents/view', label: 'Accidents view' },
      { path: '/accidents-incidents/raise', label: 'Raise accident' },
      { path: '/admin/security', label: 'Admin security' },
      { path: '/admin/audit', label: 'Audit log' },
      { path: '/service-users/all', label: 'Service users list' },
      { path: '/service-users/add', label: 'Add service user' },
      { path: '/service-users/initial-assessment-checklist', label: 'Initial assessment' },
      { path: `/service-users/${suId}/view`, label: 'View service user' },
      { path: `/service-users/${suId}/care-plan`, label: 'Care plan' },
      { path: `/service-users/${suId}/medication`, label: 'Medication' },
      { path: `/service-users/${suId}/observations`, label: 'Observations' },
    ]

    for (const { path, label } of routes) {
      await test.step(label, async () => {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await assertPageHealthy(page, label)
      })
    }
  })
})
