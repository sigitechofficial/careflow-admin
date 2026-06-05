import { test, expect } from '@playwright/test'
import { hasApiCreds } from '../helpers/auth'
import { E2E_SKIP_NO_API as SKIP_MSG } from '../helpers/constants'
import {
  autofillInitialAssessmentViaApi,
  HOLISTIC_TAB_COUNT,
  IA_FILL_LEVEL_LABELS,
  type IaFillLevel,
} from '../helpers/initial-assessment-autofill'

const LEVEL = (process.env.E2E_IA_FILL_LEVEL ?? 'low').toLowerCase() as IaFillLevel
const SERVICE_USER_ID = process.env.E2E_IA_SERVICE_USER_ID?.trim() ?? ''
const CONDITION_LABEL = IA_FILL_LEVEL_LABELS[LEVEL] ?? LEVEL

function submissionStatusBadge(page: import('@playwright/test').Page) {
  return page.getByTestId('ia-submission-status')
}

async function expectSubmissionStatus(
  page: import('@playwright/test').Page,
  pattern: RegExp,
) {
  const badge = submissionStatusBadge(page)
  await expect(badge).toBeVisible({ timeout: 30_000 })
  await expect(badge).toHaveText(pattern)
}

test.describe('Initial assessment: Playwright autofill', () => {
  test.beforeEach(() => {
    test.skip(!hasApiCreds, SKIP_MSG)
    test.skip(!SERVICE_USER_ID, 'Set E2E_IA_SERVICE_USER_ID (from dev UI or env).')
    test.skip(!['low', 'normal', 'critical'].includes(LEVEL), `Invalid E2E_IA_FILL_LEVEL: ${LEVEL}`)
  })

  test(`fill assessment (${CONDITION_LABEL})`, async ({ page, request }) => {
    test.setTimeout(600_000)

    const { submissionId, sectionsFilled, answersSaved, metadataKeysSaved } =
      await autofillInitialAssessmentViaApi(request, SERVICE_USER_ID, LEVEL)

    await page.goto(
      `/service-users/initial-assessment?serviceUserId=${SERVICE_USER_ID}&section=1&tab=form`,
      { waitUntil: 'domcontentloaded' },
    )
    await expect(page.getByTestId('initial-assessment-enterprise-page')).toBeVisible({
      timeout: 60_000,
    })

    await test.step('Confirm submission status badge', async () => {
      await expectSubmissionStatus(page, /in progress|submitted|reviewed|draft/i)
    })

    const sectionNav = page.getByTestId('ia-section-nav')
    await expect(sectionNav).toBeVisible({ timeout: 15_000 })

    await test.step(`Holistic document nav shows ${HOLISTIC_TAB_COUNT} tabs`, async () => {
      await expect(sectionNav.getByRole('button')).toHaveCount(HOLISTIC_TAB_COUNT, {
        timeout: 15_000,
      })
    })

    if (LEVEL === 'critical') {
      await test.step('Very critical: broad template + worksheet coverage', async () => {
        expect(sectionsFilled).toBeGreaterThanOrEqual(10)
        expect(answersSaved).toBeGreaterThan(50)
        expect(metadataKeysSaved).toBeGreaterThanOrEqual(20)
      })
    } else if (LEVEL === 'normal') {
      await test.step('Moderate: submitted or still in progress', async () => {
        await expectSubmissionStatus(page, /in progress|submitted/i)
        expect(sectionsFilled).toBeGreaterThan(3)
        expect(answersSaved).toBeGreaterThan(10)
        expect(metadataKeysSaved).toBeGreaterThanOrEqual(20)
      })
    } else {
      await test.step('Stable: low-risk fill and submit (or in progress)', async () => {
        await expectSubmissionStatus(page, /in progress|submitted/i)
        const navButtons = sectionNav.getByRole('button')
        await expect(navButtons.first()).toBeVisible({ timeout: 15_000 })
        expect(sectionsFilled).toBeGreaterThan(3)
        expect(answersSaved).toBeGreaterThan(10)
        expect(metadataKeysSaved).toBeGreaterThanOrEqual(20)
      })
    }

    await test.step('Worksheet panels render after autofill', async () => {
      await sectionNav.getByRole('button', { name: /Photography Consent/i }).click()
      await expect(page.getByTestId('ia-photography-consent-panel')).toBeVisible({
        timeout: 15_000,
      })
      await expect(page.locator('#photo-consent-surname')).toHaveValue('E2E')

      await sectionNav.getByRole('button', { name: /Equipment Selection/i }).click()
      await expect(page.getByTestId('ia-equipment-selection-panel')).toBeVisible({
        timeout: 15_000,
      })
      await expect(page.locator('#equipment-selection-risk')).not.toHaveValue('')
    })

    // eslint-disable-next-line no-console
    console.log(
      `IA autofill (${CONDITION_LABEL} / ${LEVEL}) — submission ${submissionId}, ${sectionsFilled} template sections, ${answersSaved} answers, ${metadataKeysSaved} metadata keys`,
    )
  })
})
