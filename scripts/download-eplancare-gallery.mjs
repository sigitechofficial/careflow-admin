/**
 * Download ePlan Care form icons using your logged-in browser session.
 *
 * 1. Log in at https://login.eplancare.com in Chrome/Edge
 * 2. Run: node scripts/download-eplancare-gallery.mjs
 *
 * Uses Playwright persistent profile (./playwright/.eplancare-profile) so you can
 * log in once in the headed window, then re-run headless.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const urlsFile = join(
  __dirname,
  '..',
  '..',
  'careadmin-backend',
  'prisma',
  'seeds',
  'data',
  'gallery-legacy-urls.txt',
)
const uploadDir = join(
  __dirname,
  '..',
  '..',
  'careadmin-backend',
  'uploads',
  'care-pathway',
  'imported',
)
const mapFile = join(
  __dirname,
  '..',
  '..',
  'careadmin-backend',
  'prisma',
  'seeds',
  'data',
  'gallery-import-map.json',
)
const profileDir = join(__dirname, '..', 'playwright', '.eplancare-profile')

const SLUG_ALIASES = {
  'pressure-ulcers': 'pressure-ulcer',
  'palliative-care': 'palliative',
}

function parseLines(raw) {
  return raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.startsWith('http'))
}

function slugFromUrl(url) {
  const file = (url.split('/').pop() ?? '').replace(/\.(png|jpe?g|webp)$/i, '')
  return SLUG_ALIASES[file] ?? file
}

function nameFromSlug(slug) {
  return slug
    .split('-')
    .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ')
}

async function main() {
  const lines = parseLines(readFileSync(urlsFile, 'utf8'))
  if (!lines.length) {
    console.error('No URLs in gallery-legacy-urls.txt')
    process.exit(1)
  }

  mkdirSync(uploadDir, { recursive: true })
  mkdirSync(profileDir, { recursive: true })

  const headed = process.argv.includes('--login')
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: !headed,
    acceptDownloads: true,
  })
  const page = context.pages()[0] ?? (await context.newPage())

  if (headed) {
    await page.goto('https://login.eplancare.com', { waitUntil: 'domcontentloaded' })
    console.log('Log in to ePlan Care in the browser window, then press Enter here…')
    await new Promise(resolve => process.stdin.once('data', resolve))
  }

  const map = []
  let ok = 0
  let fail = 0

  for (const url of lines) {
    const slug = slugFromUrl(url)
    const name = nameFromSlug(slug)
    const dest = join(uploadDir, `${slug}.png`)
    try {
      const res = await context.request.get(url)
      if (!res.ok()) throw new Error(`HTTP ${res.status()}`)
      const buf = await res.body()
      writeFileSync(dest, buf)
      map.push({ slug, name, fileUrl: `/uploads/care-pathway/imported/${slug}.png` })
      console.log(`OK  ${name}`)
      ok += 1
    } catch (e) {
      console.warn(`FAIL ${name}: ${e.message}`)
      fail += 1
    }
  }

  writeFileSync(mapFile, JSON.stringify(map, null, 2))
  await context.close()
  console.log(`\nDone: ${ok} downloaded, ${fail} failed.`)
  console.log('Run: cd ../careadmin-backend && npm run prisma:seed')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
