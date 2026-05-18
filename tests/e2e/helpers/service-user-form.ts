import { expect, type Page } from '@playwright/test'

export type E2eServiceUserDraft = {
  firstName: string
  lastName: string
  displayName: string
  email: string
}

export function buildE2eServiceUserDraft(): E2eServiceUserDraft {
  const stamp = Date.now()
  const firstName = 'E2E'
  const lastName = `ServiceUser${stamp}`
  return {
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    email: `e2e.su.${stamp}@example.com`,
  }
}

/** Radix select on add service user form (`data-testid="service-user-{field}-select"`). */
export async function pickServiceUserSelect(page: Page, field: string) {
  await page.getByTestId(`service-user-${field}-select`).click()
  const option = page.getByRole('option').filter({ hasNotText: /^—/ }).first()
  await expect(option).toBeVisible({ timeout: 10000 })
  await option.click()
}

export async function pickServiceUserSelectByName(page: Page, field: string, name: string | RegExp) {
  await page.getByTestId(`service-user-${field}-select`).click()
  const opt =
    typeof name === 'string'
      ? page.getByRole('option', { name, exact: true })
      : page.getByRole('option').filter({ hasText: name })
  await expect(opt.first()).toBeVisible({ timeout: 10000 })
  await opt.first().click()
}

export async function waitForServiceUserLookups(page: Page) {
  await expect(page.getByTestId('service-user-add-form')).toBeVisible()
  await expect(page.getByTestId('service-user-statusId-select')).toBeEnabled({ timeout: 20000 })
}

/** In-service status (lookup code ACTIVE — matches list filter "In service (active)"). */
export async function pickInServiceStatus(page: Page) {
  await pickServiceUserSelectByName(page, 'statusId', /in service|active/i)
}

export async function fillAddServiceUserForm(page: Page, draft: E2eServiceUserDraft) {
  await page.getByTestId('service-user-first-name').fill(draft.firstName)
  await page.getByTestId('service-user-last-name').fill(draft.lastName)
  await pickInServiceStatus(page)

  await pickServiceUserSelect(page, 'careTypeId')
  await pickServiceUserSelect(page, 'fundingTypeId')
  await pickServiceUserSelect(page, 'riskLevelId')
  await page.getByTestId('service-user-locationId-select').click()
  const loc = page.getByRole('option').filter({ hasNotText: /^—/ }).first()
  await expect(loc).toBeVisible({ timeout: 10000 })
  await loc.click()

  await page.getByTestId('service-user-email').fill(draft.email)
  await page.getByTestId('service-user-date-of-birth').fill('1990-01-15')
  const today = new Date().toISOString().slice(0, 10)
  await page.getByTestId('service-user-service-start').fill(today)

  await page.getByTestId('service-user-address-line1').fill('1 E2E Test Street')
  await page.getByTestId('service-user-town').fill('London')
  await page.getByTestId('service-user-postcode').fill('SW1A 1AA')
}
