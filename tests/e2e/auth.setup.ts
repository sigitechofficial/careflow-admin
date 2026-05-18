import fs from 'node:fs'
import path from 'node:path'
import { test as setup } from '@playwright/test'
import { hasApiCreds, loginAsE2eUser, authStoragePath } from './helpers/auth'

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(path.dirname(authStoragePath), { recursive: true })

  if (!hasApiCreds) {
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })
    await page.context().storageState({ path: authStoragePath })
    return
  }

  await loginAsE2eUser(page)
  await page.context().storageState({ path: authStoragePath })
})
