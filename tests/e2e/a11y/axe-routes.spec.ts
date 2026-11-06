/**
 * axe-core scan (WCAG 2.2 AA tags) of the login page and the major routes from the route audit.
 * Report-only: violations are attached to the HTML report and summarised in the console, but do
 * not fail the run. To make a route fail on violations, add its label to ENFORCED_ROUTES.
 * Run: cd care-admin && npx playwright test a11y/axe-routes --project=chromium
 */
import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { hasApiCreds, unauthenticatedStorage } from '../helpers/auth'
import { E2E_SKIP_NO_API, ROUTES } from '../helpers/constants'
import { getAccessToken, getFirstServiceUserId, majorRoutes } from '../helpers/routes'
import { createA11ySurvey, deleteA11ySurvey, type A11ySurvey } from '../helpers/surveys'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** Route labels (as in majorRoutes, plus 'Login') whose axe violations fail the test. */
const ENFORCED_ROUTES = new Set<string>([
  // Surveys: audited to WCAG 2.2 AA in November 2026 (careflow-api/docs/ACCESSIBILITY_STATEMENT.md).
  'Surveys list',
  'Survey',
  'Survey results',
  'Survey individual responses',
  'Survey preview',
  'Survey follow-ups',
  'Ready-made surveys',
  'Survey answer page',
  'Survey answer page: errors shown',
  'Portal surveys',
])

type Violation = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number]

async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  await page
    .locator('.animate-spin')
    .first()
    .waitFor({ state: 'hidden', timeout: 25_000 })
    .catch(() => {})
}

/** Scans the current page, attaches the violations and returns them. Fails only for enforced routes. */
async function scan(page: Page, label: string, testInfo: TestInfo): Promise<Violation[]> {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  await testInfo.attach(`axe ${label}`, {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  })
  if (ENFORCED_ROUTES.has(label)) {
    expect.soft(violations.map(v => `${v.id} (${v.nodes.length})`), `axe violations on ${label}`).toEqual([])
  }
  return violations
}

function summarise(results: { label: string; violations: Violation[] }[]): string {
  const lines = results.map(({ label, violations }) => {
    const nodes = violations.reduce((n, v) => n + v.nodes.length, 0)
    const rules = violations.map(v => `${v.id}[${v.impact ?? '?'}]×${v.nodes.length}`).join(', ')
    return `${label}: ${violations.length} rules, ${nodes} nodes${rules ? ` — ${rules}` : ''}`
  })
  const byRule = new Map<string, { impact: string; routes: number; nodes: number }>()
  for (const { violations } of results) {
    for (const v of violations) {
      const row = byRule.get(v.id) ?? { impact: v.impact ?? '?', routes: 0, nodes: 0 }
      row.routes += 1
      row.nodes += v.nodes.length
      byRule.set(v.id, row)
    }
  }
  const rules = [...byRule.entries()]
    .sort((a, b) => b[1].nodes - a[1].nodes)
    .map(([id, r]) => `${id} [${r.impact}]: ${r.nodes} nodes on ${r.routes} routes`)
  return ['axe violations by route', ...lines, '', 'axe violations by rule', ...rules].join('\n')
}

async function report(results: { label: string; violations: Violation[] }[], testInfo: TestInfo) {
  const summary = summarise(results)
  console.log(`\n${summary}\n`)
  await testInfo.attach('axe summary', { body: summary, contentType: 'text/plain' })
}

test.describe('Accessibility: axe scan', () => {
  test.describe('logged out', () => {
    test.use({ storageState: unauthenticatedStorage })

    test('login page', async ({ page }, testInfo) => {
      await page.goto(ROUTES.login, { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('login-email')).toBeVisible()
      const violations = await scan(page, 'Login', testInfo)
      await report([{ label: 'Login', violations }], testInfo)
    })
  })

  test('major routes', async ({ page }, testInfo) => {
    test.skip(!hasApiCreds, E2E_SKIP_NO_API)
    test.setTimeout(600_000)

    const token = await getAccessToken()
    const suId = process.env.E2E_SERVICE_USER_ID ?? (await getFirstServiceUserId(token))

    const results: { label: string; violations: Violation[] }[] = []
    for (const { path, label } of majorRoutes(suId)) {
      await test.step(label, async () => {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await settle(page)
        results.push({ label, violations: await scan(page, label, testInfo) })
      })
    }
    await report(results, testInfo)
  })

  /**
   * Survey screens, enforced. Uses its own throwaway public survey (title starts "E2E A11Y"), made
   * through the API before the scan and deleted after it, so no real survey or answer is touched.
   */
  test.describe('surveys', () => {
    let survey: A11ySurvey | null = null
    let token = ''

    test.beforeAll(async () => {
      if (!hasApiCreds) return
      token = await getAccessToken()
      survey = await createA11ySurvey(token)
    })
    test.afterAll(async () => {
      if (survey) await deleteA11ySurvey(token, survey.id)
    })

    test('staff survey screens', async ({ page }, testInfo) => {
      test.skip(!hasApiCreds || !survey, E2E_SKIP_NO_API)
      test.setTimeout(300_000)
      const id = survey!.id
      const results: { label: string; violations: Violation[] }[] = []
      for (const { path, label } of [
        { path: '/surveys', label: 'Surveys list' },
        { path: `/surveys/${id}`, label: 'Survey' },
        { path: `/surveys/${id}/responses`, label: 'Survey results' },
        { path: `/surveys/${id}/preview`, label: 'Survey preview' },
        { path: '/surveys/follow-ups', label: 'Survey follow-ups' },
        { path: '/surveys/ready-made', label: 'Ready-made surveys' },
      ]) {
        await test.step(label, async () => {
          await page.goto(path, { waitUntil: 'domcontentloaded' })
          await settle(page)
          results.push({ label, violations: await scan(page, label, testInfo) })
        })
      }
      await test.step('Survey individual responses', async () => {
        await page.goto(`/surveys/${id}/responses`, { waitUntil: 'domcontentloaded' })
        await settle(page)
        await page.getByRole('tab', { name: 'Individual responses' }).click()
        await settle(page)
        results.push({ label: 'Survey individual responses', violations: await scan(page, 'Survey individual responses', testInfo) })
      })
      await report(results, testInfo)
    })

    test.describe('answer page (logged out)', () => {
      test.use({ storageState: unauthenticatedStorage })

      test('public survey link, before and after a too-early submit', async ({ page }, testInfo) => {
        test.skip(!hasApiCreds || !survey, E2E_SKIP_NO_API)
        await page.goto(`/survey/${survey!.shareToken}`, { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { level: 1, name: survey!.title })).toBeVisible()
        const results = [{ label: 'Survey answer page', violations: await scan(page, 'Survey answer page', testInfo) }]
        // Nothing answered: the error summary takes focus; scan the page with every error showing.
        await page.getByRole('button', { name: 'Submit response' }).click()
        await expect(page.getByRole('alert')).toBeFocused()
        results.push({ label: 'Survey answer page: errors shown', violations: await scan(page, 'Survey answer page: errors shown', testInfo) })
        await report(results, testInfo)
      })
    })

    test.describe('portal (logged out, then portal sign-in)', () => {
      test.use({ storageState: unauthenticatedStorage })

      test('portal surveys', async ({ page }, testInfo) => {
        // A portal account (person we support or family member) is needed; set both to run it.
        const email = process.env.E2E_PORTAL_EMAIL?.trim()
        const password = process.env.E2E_PORTAL_PASSWORD
        test.skip(!email || !password, 'Set E2E_PORTAL_EMAIL and E2E_PORTAL_PASSWORD to scan the portal surveys page.')
        await page.goto('/portal/login', { waitUntil: 'domcontentloaded' })
        await page.getByLabel('Email').fill(email!)
        await page.getByLabel('Password').fill(password!)
        await page.getByRole('button', { name: 'Sign in' }).click()
        await page.waitForURL(url => !url.pathname.startsWith('/portal/login'))
        await page.goto('/portal/surveys', { waitUntil: 'domcontentloaded' })
        await settle(page)
        await expect(page.getByRole('heading', { level: 1, name: 'Surveys' })).toBeVisible()
        await report([{ label: 'Portal surveys', violations: await scan(page, 'Portal surveys', testInfo) }], testInfo)
      })
    })
  })
})
