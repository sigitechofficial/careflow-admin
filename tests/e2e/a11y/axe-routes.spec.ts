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

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** Route labels (as in majorRoutes, plus 'Login') whose axe violations fail the test. */
const ENFORCED_ROUTES = new Set<string>([])

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
})
