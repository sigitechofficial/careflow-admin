/**
 * Manual browser repro: login → list → click overview. Logs API calls + errors.
 * Run: node scripts/debug-spa-nav.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5175'
const API = process.env.API_URL ?? 'http://localhost:3000'

const apiCalls = []

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  page.on('console', (msg) => {
    const t = msg.type()
    if (t === 'error' || t === 'warning') {
      console.log(`[console.${t}]`, msg.text())
    }
  })

  page.on('requestfailed', (req) => {
    console.log('[requestfailed]', req.method(), req.url(), req.failure()?.errorText)
  })

  page.on('response', async (res) => {
    const url = res.url()
    if (!url.startsWith(API)) return
    const status = res.status()
    let bodyPreview = ''
    try {
      const ct = res.headers()['content-type'] ?? ''
      if (ct.includes('json')) {
        const json = await res.json()
        bodyPreview =
          json?.data === undefined
            ? 'no data key'
            : Array.isArray(json.data)
              ? `array[${json.data.length}]`
              : typeof json.data === 'object' && json.data
                ? 'object'
                : String(json.data)
      }
    } catch {
      bodyPreview = '(parse error)'
    }
    const entry = { url, status, bodyPreview }
    apiCalls.push(entry)
    console.log(`[api] ${status} ${url} → ${bodyPreview}`)
  })

  console.log('1. Login page')
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle', timeout: 60_000 })

  await page.getByTestId('login-email').fill('admin@careadmin.local')
  await page.getByTestId('login-password').fill('Admin@12345')
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 60_000 }),
    page.getByTestId('login-submit').click(),
  ])

  console.log('2. Service users list (SPA goto)')
  apiCalls.length = 0
  await page.goto(`${BASE}/service-users/all`, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(2000)
  const listErr = (await page.locator('body').innerText()).includes('Failed to load')
  console.log('   List shows error:', listErr)

  console.log('3. Click overview immediately (stress race)')
  apiCalls.length = 0
  await page.getByTestId('su-action-overview').first().click({ noWaitAfter: true })
  await page.waitForTimeout(500)
  const midErr = (await page.locator('body').innerText()).includes('Failed to load')
  console.log('   Error within 500ms:', midErr)

  console.log('4. Wait for view settle')
  await page.waitForURL(/\/service-users\/[0-9a-f-]+\/view$/i, { timeout: 30_000 })
  await page.waitForTimeout(3000)
  const viewText = await page.locator('body').innerText()
  const viewErr = viewText.includes('Failed to load')
  console.log('   View URL:', page.url())
  console.log('   View shows error:', viewErr)
  if (viewErr) {
    const snippet = viewText.match(/Failed to load[^\n]*/)?.[0]
    console.log('   Error snippet:', snippet)
  }
  console.log('   API calls during click:', apiCalls.length)
  for (const c of apiCalls) console.log('   ', c.status, c.url.replace(API, ''), c.bodyPreview)

  console.log('5. Browser back to list (SPA)')
  apiCalls.length = 0
  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForTimeout(2500)
  const backListErr = (await page.locator('body').innerText()).includes('Failed to load')
  console.log('   Back list URL:', page.url())
  console.log('   Back list shows error:', backListErr)

  console.log('6. Sidebar link to list again')
  await page.getByRole('link', { name: /service users/i }).first().click()
  await page.waitForTimeout(2500)
  const navListErr = (await page.locator('body').innerText()).includes('Failed to load')
  console.log('   Nav list URL:', page.url())
  console.log('   Nav list shows error:', navListErr)

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
