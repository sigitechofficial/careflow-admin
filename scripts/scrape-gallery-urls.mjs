/**
 * Scrape img[src] from Settings → Care Pathway → Gallery (logged-in).
 * Writes careadmin-backend/prisma/seeds/data/gallery-legacy-urls.txt
 *
 * Requires dev servers: care-admin :5173, API :3000
 * Env: E2E_API_BASE_URL, E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD (or defaults)
 *
 * Run from care-admin: node scripts/scrape-gallery-urls.mjs
 */
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const adminRoot = join(__dirname, '..')
const outFile = join(
  adminRoot,
  '..',
  'careadmin-backend',
  'prisma',
  'seeds',
  'data',
  'gallery-legacy-urls.txt',
)
const orderFile = join(
  adminRoot,
  '..',
  'careadmin-backend',
  'prisma',
  'seeds',
  'data',
  'gallery-order.json',
)

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const EMAIL = process.env.E2E_LOGIN_EMAIL ?? 'admin@careadmin.local'
const PASSWORD = process.env.E2E_LOGIN_PASSWORD ?? 'Admin@12345'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' })
  await page.getByTestId('login-email').fill(EMAIL)
  await page.getByTestId('login-password').fill(PASSWORD)
  await Promise.all([
    page.waitForURL(url => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    }),
    page.getByTestId('login-submit').click(),
  ])

  await page.goto(`${BASE}/settings/care-pathway?tab=gallery`, { waitUntil: 'networkidle' })
  await page.getByTestId('picture-gallery-tab').waitFor({ timeout: 30_000 })

  const urls = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="picture-gallery-tab"]')
    if (!root) return []
    const legacy = src =>
      /^https?:\/\//i.test(src) &&
      !/localhost|127\.0\.0\.1/i.test(src) &&
      !src.includes('/uploads/care-pathway/')
    return [...root.querySelectorAll('img[src]')]
      .map(img => img.getAttribute('src') ?? '')
      .filter(legacy)
  })

  const names = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="picture-gallery-tab"]')
    if (!root) return []
    const legacy = src =>
      /^https?:\/\//i.test(src) &&
      !/localhost|127\.0\.0\.1/i.test(src) &&
      !src.includes('/uploads/care-pathway/')
    return [...root.querySelectorAll('.grid > div')]
      .map(cell => {
        const label = cell.querySelector('p')
        const img = cell.querySelector('img[src]')
        const src = img?.getAttribute('src') ?? ''
        const name = label?.textContent?.trim() ?? ''
        return name && legacy(src) ? { name, src } : null
      })
      .filter(Boolean)
  })

  await browser.close()

  const order = existsSync(orderFile) ? JSON.parse(readFileSync(orderFile, 'utf8')) : []
  const lines = []

  if (names.length) {
    for (const { name, src } of names) lines.push(`${name}|${src}`)
  } else if (urls.length && order.length) {
    for (let i = 0; i < Math.min(urls.length, order.length); i++) {
      lines.push(`${order[i].name}|${urls[i]}`)
    }
  } else {
    for (const u of urls) lines.push(u)
  }

  if (!lines.length) {
    console.log('No remote http(s) img URLs on gallery tab (icons may already be local /uploads).')
    process.exit(0)
  }

  writeFileSync(outFile, `${lines.join('\n')}\n`, 'utf8')
  console.log(`Wrote ${lines.length} URL(s) to ${outFile}`)
  console.log('Next: cd ../careadmin-backend && npm run import:gallery-urls && npm run prisma:seed')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
