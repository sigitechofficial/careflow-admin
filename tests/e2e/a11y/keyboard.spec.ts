/**
 * Keyboard-only checks for the login form and the app shell (WCAG 2.1.1, 2.1.2, 2.4.3, 2.4.7).
 * Run: cd care-admin && npx playwright test a11y/keyboard --project=chromium
 */
import { test, expect, type Locator, type Page } from '@playwright/test'
import { hasApiCreds, unauthenticatedStorage } from '../helpers/auth'
import { E2E_SKIP_NO_API, ROUTES } from '../helpers/constants'

/** Focused and drawn with a visible indicator: a non-none outline or a focus ring (box-shadow). */
async function expectFocusVisible(locator: Locator) {
  await expect(locator).toBeFocused()
  await expect
    .poll(
      () =>
        locator.evaluate(el => {
          const s = getComputedStyle(el)
          const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0
          return outline || s.boxShadow !== 'none'
        }),
      { message: 'focused element has no visible outline or ring' },
    )
    .toBe(true)
}

/** Presses Tab (or Shift+Tab) until `target` has focus; fails after `max` presses. */
async function tabTo(page: Page, target: Locator, { back = false, max = 30 } = {}) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate(el => el === document.activeElement)) return
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab')
  }
  await expect(target, `not reached within ${max} ${back ? 'Shift+Tab' : 'Tab'} presses`).toBeFocused()
}

test.describe('Keyboard: login', () => {
  test.use({ storageState: unauthenticatedStorage })

  test('Tab and Shift+Tab move through the form with visible focus', async ({ page }) => {
    await page.goto(ROUTES.login)
    const email = page.getByTestId('login-email')
    const password = page.getByTestId('login-password')
    const submit = page.getByTestId('login-submit')
    await expect(email).toBeVisible()

    await tabTo(page, email)
    await expectFocusVisible(email)
    await page.keyboard.press('Tab')
    await expectFocusVisible(password)
    await page.keyboard.press('Tab')
    await expectFocusVisible(submit)
    await page.keyboard.press('Shift+Tab')
    await expectFocusVisible(password)
    await page.keyboard.press('Shift+Tab')
    await expectFocusVisible(email)
  })

  test('submits with Enter', async ({ page }) => {
    test.skip(!hasApiCreds, E2E_SKIP_NO_API)

    await page.goto(ROUTES.login)
    const email = page.getByTestId('login-email')
    await expect(email).toBeVisible()

    await tabTo(page, email)
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type(process.env.E2E_LOGIN_EMAIL!)
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('login-password')).toBeFocused()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type(process.env.E2E_LOGIN_PASSWORD!)
    await page.keyboard.press('Enter')

    await page.waitForURL(url => !url.pathname.includes('/auth/login'), { timeout: 60_000 })
  })
})

test.describe('Keyboard: app shell', () => {
  test.beforeEach(() => {
    test.skip(!hasApiCreds, E2E_SKIP_NO_API)
  })

  test.describe('mobile sidebar', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    // The mobile menu button has no accessible name yet, so it is found by its mobile-only class.
    const menuButton = (page: Page) => page.locator('header button.lg\\:hidden').first()
    const sidebar = (page: Page) => page.getByTestId('sidebar')

    test('opens with Enter and closes from its Close menu button', async ({ page }) => {
      await page.goto(ROUTES.serviceUsersAll)
      const trigger = menuButton(page)
      await expect(trigger).toBeVisible()
      await expect(sidebar(page)).not.toBeInViewport()

      await trigger.focus()
      await expectFocusVisible(trigger)
      await page.keyboard.press('Enter')
      await expect(sidebar(page)).toBeInViewport()

      const close = sidebar(page).getByRole('button', { name: 'Close menu' })
      await tabTo(page, close, { back: true, max: 80 })
      await expectFocusVisible(close)
      await page.keyboard.press('Enter')
      await expect(sidebar(page)).not.toBeInViewport()
    })

    // Known gap: the drawer has no Escape handler or focus management. Remove fixme once fixed.
    test.fixme('closes with Escape and returns focus to the menu button', async ({ page }) => {
      await page.goto(ROUTES.serviceUsersAll)
      const trigger = menuButton(page)
      await trigger.focus()
      await page.keyboard.press('Enter')
      await expect(sidebar(page)).toBeInViewport()

      await page.keyboard.press('Escape')
      await expect(sidebar(page)).not.toBeInViewport()
      await expectFocusVisible(trigger)
    })
  })

  test('dialog opens with Enter, closes with Escape and returns focus to its trigger', async ({ page }) => {
    await page.goto(ROUTES.showcase)
    const trigger = page.getByRole('button', { name: 'Open Dialog' })
    await expect(trigger).toBeVisible()

    await trigger.focus()
    await expectFocusVisible(trigger)
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Add New Service User' })
    await expect(dialog).toBeVisible()
    await expect
      .poll(() => dialog.evaluate(el => el.contains(document.activeElement)), {
        message: 'focus moved into the dialog',
      })
      .toBe(true)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expectFocusVisible(trigger)
  })
})
