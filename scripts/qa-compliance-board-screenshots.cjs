const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', '.qa-screenshots')
fs.mkdirSync(OUT, { recursive: true })

async function login(page) {
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' })
  await page.getByTestId('login-email').waitFor({ timeout: 15000 })
  await page.getByTestId('login-email').fill('admin@careadmin.local')
  await page.getByTestId('login-password').fill('Admin@12345')
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/auth/login') && r.status() < 400, {
      timeout: 20000,
    }),
    page.getByTestId('login-submit').click(),
  ])
  await page.waitForTimeout(600)
}

async function openBoard(page) {
  await page.goto('http://localhost:5173/employee/compliance', { waitUntil: 'domcontentloaded' })
  await page.getByTestId('compliance-board').waitFor({ timeout: 45000 })
  await page
    .waitForFunction(() => {
      const board = document.querySelector('[data-testid="compliance-board"]')
      if (!board) return false
      return !board.textContent?.includes('Loading compliance board')
    }, { timeout: 45000 })
    .catch(() => {})
  // Bring matrix into viewport (page has large org summary above tabs)
  const table = page.getByTestId('compliance-board-table-card')
  if (await table.count()) {
    await table.scrollIntoViewIfNeeded()
  } else {
    await page.getByTestId('compliance-board-filters').scrollIntoViewIfNeeded()
  }
  await page.waitForTimeout(500)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const results = []

  async function withPage(width, height, fn) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    page.setDefaultTimeout(45000)
    await login(page)
    await openBoard(page)
    const out = await fn(page)
    await context.close()
    return out
  }

  await withPage(1440, 900, async (page) => {
    const file = path.join(OUT, '01-desktop-1440.png')
    await page.screenshot({ path: file })
    // Also full board region
    const board = page.getByTestId('compliance-board')
    await board.screenshot({ path: path.join(OUT, '01b-board-region-1440.png') })
    results.push({ file })
    console.log('saved', file)
  })

  await withPage(1280, 800, async (page) => {
    const file = path.join(OUT, '02-laptop-1280.png')
    await page.screenshot({ path: file })
    console.log('saved', file)
  })

  await withPage(1024, 768, async (page) => {
    const file = path.join(OUT, '03-laptop-1024.png')
    await page.screenshot({ path: file })
    console.log('saved', file)
  })

  await withPage(1440, 900, async (page) => {
    const scroller = page
      .locator('[data-testid="compliance-board-table-card"] .overflow-x-auto')
      .first()
    if (await scroller.count()) {
      await scroller.evaluate((el) => {
        el.scrollLeft = Math.floor(el.scrollWidth * 0.55)
      })
      await page.waitForTimeout(400)
    }
    const file = path.join(OUT, '04-desktop-scrolled-right.png')
    await page.screenshot({ path: file })
    await page
      .getByTestId('compliance-board-table-card')
      .screenshot({ path: path.join(OUT, '04b-table-scrolled.png') })
    console.log('saved', file)
  })

  await withPage(1440, 900, async (page) => {
    await page.getByTestId('compliance-board-issues-only').check()
    await page.waitForTimeout(1500)
    await page.getByTestId('compliance-board-table-card').scrollIntoViewIfNeeded()
    const file = path.join(OUT, '05-filter-issues-only.png')
    await page.screenshot({ path: file })
    console.log('saved', file)
  })

  await withPage(1440, 900, async (page) => {
    await page.getByTestId('compliance-board-filters').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    const file = path.join(OUT, '06-filters-bar.png')
    await page.screenshot({ path: file })
    console.log('saved', file)
  })

  await withPage(1440, 900, async (page) => {
    const link = page.locator('[data-testid="compliance-board"] tbody a').first()
    if (await link.count()) {
      await link.click()
      await page.waitForTimeout(1500)
      const file = path.join(OUT, '07-after-employee-click.png')
      await page.screenshot({ path: file })
      console.log('saved', file, page.url())
    }
  })

  await withPage(1440, 900, async (page) => {
    await page.getByTestId('compliance-board-search').fill('zzz-no-match-xyz-999')
    await page.waitForTimeout(1500)
    await page.getByTestId('compliance-board-table-card').scrollIntoViewIfNeeded()
    const file = path.join(OUT, '08-empty-search.png')
    await page.screenshot({ path: file })
    console.log('saved', file)
  })

  // Mid-scroll sticky check: scroll table horizontally to near end
  await withPage(1440, 900, async (page) => {
    const scroller = page
      .locator('[data-testid="compliance-board-table-card"] .overflow-x-auto')
      .first()
    if (await scroller.count()) {
      await scroller.evaluate((el) => {
        el.scrollLeft = el.scrollWidth
      })
      await page.waitForTimeout(400)
    }
    await page
      .getByTestId('compliance-board-table-card')
      .screenshot({ path: path.join(OUT, '10-sticky-far-right.png') })
    console.log('saved sticky far right')
  })

  console.log('done', results.length)
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
