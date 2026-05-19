import { expect, type Page } from '@playwright/test'

export type E2eEmployeeDraft = {
  firstName: string
  lastName: string
  username: string
  email: string
  displayName: string
}

export function buildE2eEmployeeDraft(): E2eEmployeeDraft {
  const stamp = Date.now()
  const firstName = 'E2E'
  const lastName = `Employee${stamp}`
  return {
    firstName,
    lastName,
    username: `e2e.employee.${stamp}`,
    email: `e2e.employee.${stamp}@example.com`,
    displayName: `${firstName} ${lastName}`,
  }
}

/** Radix lookup select: skip the "— placeholder —" row and pick the first real option. */
export async function pickFirstLookupOption(page: Page, fieldId: string) {
  await page.locator(`#${fieldId}`).click()
  const option = page.getByRole('option').filter({ hasNotText: /^—/ }).first()
  await expect(option).toBeVisible({ timeout: 10000 })
  await option.click()
}

/** Pick Radix select option whose visible text matches (e.g. status "Active"). */
export async function pickLookupOptionByName(page: Page, fieldId: string, name: string | RegExp) {
  await page.locator(`#${fieldId}`).click()
  const opt =
    typeof name === 'string'
      ? page.getByRole('option', { name, exact: true })
      : page.getByRole('option').filter({ hasText: name })
  await expect(opt.first()).toBeVisible({ timeout: 10000 })
  await opt.first().click()
}

export async function waitForEmployeeLookups(page: Page) {
  await expect(page.getByTestId('employee-personal-form')).toBeVisible()
  await expect(page.getByLabel('Status')).toBeEnabled({ timeout: 20000 })
}

export async function fillPersonalStep(page: Page, draft: E2eEmployeeDraft) {
  await page.getByLabel('First name').fill(draft.firstName)
  await page.getByLabel('Last name').fill(draft.lastName)
  await page.getByLabel('Username').fill(draft.username)
  await page.getByLabel('Email').fill(draft.email)
  await page.getByLabel('Status').click()
  const activeOption = page.getByRole('option', { name: /^Active$/i })
  await expect(activeOption).toBeVisible({ timeout: 10_000 })
  await activeOption.click()
}

export async function fillEmploymentStep(page: Page) {
  await pickFirstLookupOption(page, 'workAreaId')
  await pickFirstLookupOption(page, 'roleId')
  await pickFirstLookupOption(page, 'locationId')
}

/** Extra employment lookups + start date (all optional in API except the three above). */
export async function fillEmploymentOptionalLookups(page: Page) {
  await pickFirstLookupOption(page, 'jobTitleId')
  await pickFirstLookupOption(page, 'rbacLevelId')
  await pickFirstLookupOption(page, 'gradeId')
  await pickFirstLookupOption(page, 'contractTypeId')
  await pickFirstLookupOption(page, 'travelPaymentTypeId')
  await pickFirstLookupOption(page, 'baseLocationId')
  const today = new Date().toISOString().slice(0, 10)
  await page.locator('#startDate').fill(today)
}

const WORKING_WEEK_DAY_COUNT = 5 /** Mon–Fri rows (first five in server week table). */

/** Persist Mon–Fri as fully available in the standard-week editor (server). */
export async function saveStandardWorkingWeek(page: Page) {
  const editor = page.getByTestId('employee-weekly-pattern-editor')
  await expect(editor).toBeVisible({ timeout: 15000 })
  for (let i = 0; i < WORKING_WEEK_DAY_COUNT; i++) {
    const row = editor.locator('tbody tr').nth(i)
    await row.getByRole('radio', { name: 'Fully' }).click()
    await row.locator('input[type="time"]').nth(0).fill('09:00')
    await row.locator('input[type="time"]').nth(1).fill('17:00')
  }
  await page.getByTestId('employee-save-working-week').click()
  await expect(page.getByTestId('employee-save-working-week')).not.toHaveText(/Saving/i, { timeout: 20000 })
  await expect(editor.getByText(/could not save working pattern/i)).toHaveCount(0)
}
