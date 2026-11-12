#!/usr/bin/env node
/**
 * Builds the "Find anything" catalogue (src/features/search/catalog.generated.ts) from the app's own source:
 *  - pages: every route in src/router.tsx with its title (pageTitles) and the permission its route requires;
 *  - tabs: the tab lists of tabbed pages (General Settings, Lookup data, Billing, Roles & permissions...);
 *  - settings: every option label on the settings screens, with its card and tab, and its help text;
 *  - record tabs: the tabs of a service user and of a staff member (for "Mary Jones medication").
 *
 *   node scripts/generate-search-catalog.mjs          write the file
 *   node scripts/generate-search-catalog.mjs --check  exit 1 when the file is out of date (also a test)
 *
 * New pages, tabs and settings are picked up by running it; the search test fails until it is run.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(ROOT, 'src')
const OUT = resolve(SRC, 'features/search/catalog.generated.ts')
const read = rel => readFileSync(resolve(SRC, rel), 'utf8')

/** Pages that are not for searching (sign-in, portal, internal tools). */
const EXCLUDED_PAGES = [/^\/auth/, /^\/portal/, /^\/in-progress$/, /^\/showcase$/, /^\/test-office-alerts$/, /^\/legal\//]

// ─── Pages ──────────────────────────────────────────────────────────────────
function parsePages() {
  const router = read('router.tsx')
  const titlesBlock = router.slice(router.indexOf('const pageTitles'), router.indexOf('\n}\n', router.indexOf('const pageTitles')))
  const titles = Object.fromEntries([...titlesBlock.matchAll(/^\s*'([^']+)':\s*'([^']+)'/gm)].map(m => [m[1], m[2]]))
  const pages = []
  const missingTitle = []
  for (const m of router.matchAll(/createRoute\(\{([\s\S]*?)\n\}\)/g)) {
    const block = m[1]
    const path = block.match(/\bpath:\s*'([^']+)'/)?.[1]
    if (!path || !path.startsWith('/') || path.includes('$')) continue
    if (EXCLUDED_PAGES.some(rx => rx.test(path))) continue
    const guard = block.match(/beforeLoad:\s*(requirePermission|requireAnyPermission|requireScheduleAccess)\(([^)]*)\)/)
    const permissions = guard ? [...guard[2].matchAll(/'([^']+)'/g)].map(x => x[1]) : []
    const title = titles[path]
    if (!title) {
      missingTitle.push(path)
      continue
    }
    pages.push({ path, title, permissions, scheduleAccess: guard?.[1] === 'requireScheduleAccess' || undefined })
  }
  pages.sort((a, b) => a.path.localeCompare(b.path))
  return { pages, missingTitle }
}

// ─── Tabs of tabbed pages ───────────────────────────────────────────────────
/** Pages whose tabs are opened by a URL parameter. */
const TABBED_PAGES = [
  { file: 'features/settings/pages/GeneralSettingsPage.tsx', array: 'GENERAL_SETTINGS_TABS', path: '/settings/general', param: 'tab' },
  { file: 'features/settings/pages/SettingsPage.tsx', array: 'SETTINGS_TABS', path: '/settings', param: 'tab' },
  { file: 'features/settings/components/RolesPermissionsPanel.tsx', array: 'SUB_TABS', path: '/settings/roles-permissions', param: 'sub' },
  { file: 'features/billing/pages/BillingManagementPage.tsx', array: 'BILLING_TABS', path: '/billing', param: 'tab' },
  { file: 'features/surveys/pages/SurveyFollowUpsPage.tsx', path: '/surveys/follow-ups', param: 'view', valueKey: 'value' },
  { file: 'features/azure-pricing/pages/AzurePricingPage.tsx', path: '/azure-pricing', param: 'tab', triggers: true },
]

function tabList(src, { array, valueKey = 'id', triggers }) {
  if (triggers) {
    return [...src.matchAll(/<TabsTrigger[^>]*value="([^"]+)"[^>]*>\s*(?:<[^>]+>\s*)*([^<{]+?)\s*</g)].map(m => ({ id: m[1], label: m[2].trim() }))
  }
  let body = src
  if (array) {
    const at = src.indexOf(`${array}`)
    body = src.slice(src.indexOf('[', src.indexOf('=', at)), src.indexOf('\n]', at) + 2)
  }
  const rx = new RegExp(`\\{\\s*${valueKey}:\\s*'([^']+)',\\s*label:\\s*'([^']+)'`, 'g')
  return [...body.matchAll(rx)].map(m => ({ id: m[1], label: m[2] }))
}

function parseTabs(pages) {
  const byPath = Object.fromEntries(pages.map(p => [p.path, p]))
  const tabs = []
  for (const cfg of TABBED_PAGES) {
    const page = byPath[cfg.path]
    if (!page) continue
    for (const t of tabList(read(cfg.file), cfg)) {
      tabs.push({ label: t.label, pageTitle: page.title, path: cfg.path, search: { [cfg.param]: t.id }, permissions: page.permissions })
    }
  }
  return tabs
}

// ─── Settings options ───────────────────────────────────────────────────────
/** Settings screens outside General Settings: file → where it is shown. */
const SETTINGS_SCREENS = [
  { file: 'features/settings/components/CompanyDetailsSettingsPanel.tsx', path: '/settings/company' },
  { file: 'features/learning/components/LearningSettingsPanel.tsx', path: '/learning/settings' },
  { file: 'features/payroll/pages/PayrollEmployerSettingsPage.tsx', path: '/payroll/employer' },
  { file: 'features/message-delivery/MessageDeliveryPage.tsx', path: '/message-delivery' },
  { file: 'features/crm/components/ReferralAutomationPanels.tsx', path: '/crm/referral-inbox' },
  { file: 'features/azure-pricing/components/ReportsSettingsTab.tsx', path: '/azure-pricing', search: { tab: 'reports' }, tabLabel: 'Reports' },
]

const aliasToFile = spec => {
  const base = spec.startsWith('@/') ? resolve(SRC, spec.slice(2)) : null
  if (!base) return null
  for (const ext of ['.tsx', '.ts', '/index.ts']) if (existsSync(base + ext)) return base + ext
  return null
}

/** key → text from object literals in this file and the files it imports (help texts held in TOOLTIPS objects). */
function stringTable(src) {
  const table = {}
  const add = s => {
    for (const m of s.matchAll(/^\s*(\w+):\s*\n?\s*'((?:[^'\\]|\\.)+)'/gm)) table[m[1]] ??= m[2].replace(/\\'/g, "'")
  }
  add(src)
  for (const m of src.matchAll(/from '(@\/[^']+)'/g)) {
    const f = aliasToFile(m[1])
    if (f && /settings|defaults|tooltips|labels/i.test(f)) add(readFileSync(f, 'utf8'))
  }
  return table
}

const clean = s => s.replace(/\s+/g, ' ').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&').trim()
const GENERIC = /^(yes|no|on|off|save|cancel|reset|edit|delete|remove|add|name|email|phone|notes?|description|type|status|from|to|date|time|minutes|hours|days|value|amount|search|select\b.*|more information|(add|remove|delete|edit|clear|close|open|move|show|hide)\s.{0,30})$/i

/** Options on one screen, each with the card/group it sits in, in reading order. */
function settingsIn(fileAbs, table) {
  const src = readFileSync(fileAbs, 'utf8')
  const out = []
  let group = null
  // Card and group titles, option labels, plain <label> text, in the order they appear.
  const rx =
    /<(?:GeneralSettingsCard|AppConfigGroup|SettingsSection|Card|Section)\b[^>]*\btitle=(?:"([^"]+)"|\{'([^']+)'\})|\blabel=(?:"([^"]+)"|\{'([^']+)'\})((?:(?!\/>|<\/)[\s\S]){0,400}?\bhint=(?:"([^"]+)"|\{(\w+)\.(\w+)\}))?|<label\b[^>]*>\s*(?:<input[^>]*\/>\s*)?(?:<span[^>]*>\s*)?([A-Z][^<{}]{3,120}?)\s*</g
  for (const m of src.matchAll(rx)) {
    const title = m[1] ?? m[2]
    if (title) {
      group = clean(title)
      continue
    }
    const label = clean(m[3] ?? m[4] ?? m[9] ?? '')
    if (!label || label.length < 3 || GENERIC.test(label)) continue
    const hint = m[6] ? clean(m[6]) : m[8] ? table[m[8]] : undefined
    out.push({ label, group, hint: hint ? clean(hint) : undefined })
  }
  return out
}

/** A screen and the settings components it renders (two levels), so sections split into files are included. */
function screenFiles(fileAbs, depth = 2, seen = new Set()) {
  if (seen.has(fileAbs)) return []
  seen.add(fileAbs)
  const files = [fileAbs]
  if (!depth) return files
  const src = readFileSync(fileAbs, 'utf8')
  for (const m of src.matchAll(/from '(@\/features\/[^']+)'/g)) {
    if (!/Settings|Panel|Card|Section/.test(m[1]) || /\/(ui|api|hooks|types)\b/.test(m[1])) continue
    const f = aliasToFile(m[1])
    if (f && f.endsWith('.tsx')) files.push(...screenFiles(f, depth - 1, seen))
  }
  return files
}

function parseSettings(pages, tabs) {
  const byPath = Object.fromEntries(pages.map(p => [p.path, p]))
  const settings = []
  const seen = new Set()
  const push = (screen, opts) => {
    const page = byPath[screen.path]
    if (!page) return
    for (const o of opts) {
      const key = `${screen.path}|${JSON.stringify(screen.search ?? {})}|${o.group}|${o.label}`
      if (seen.has(key)) continue
      seen.add(key)
      settings.push({
        label: o.label,
        group: o.group ?? undefined,
        pageTitle: page.title,
        tabLabel: screen.tabLabel,
        path: screen.path,
        search: screen.search,
        permissions: page.permissions,
        hint: o.hint,
      })
    }
  }
  // General Settings: each tab's panel.
  const gs = read('features/settings/pages/GeneralSettingsPage.tsx')
  const imports = Object.fromEntries([...gs.matchAll(/import \{ (\w+) \} from '(@\/[^']+)'/g)].map(m => [m[1], m[2]]))
  const gsTabs = Object.fromEntries(tabs.filter(t => t.path === '/settings/general').map(t => [t.search.tab, t.label]))
  for (const m of gs.matchAll(/activeTab === '([^']+)' && <(\w+)/g)) {
    const file = imports[m[2]] && aliasToFile(imports[m[2]])
    if (!file) continue
    const screen = { path: '/settings/general', search: { tab: m[1] }, tabLabel: gsTabs[m[1]] }
    for (const f of screenFiles(file)) push(screen, settingsIn(f, stringTable(readFileSync(f, 'utf8'))))
  }
  for (const s of SETTINGS_SCREENS) {
    const file = resolve(SRC, s.file)
    for (const f of screenFiles(file)) push(s, settingsIn(f, stringTable(readFileSync(f, 'utf8'))))
  }
  return settings
}

// ─── Tabs inside a record ───────────────────────────────────────────────────
function parseRecordTabs() {
  const su = read('features/service-users/components/ServiceUserModuleTabs.tsx')
  const serviceUser = []
  for (const m of su.matchAll(/label:\s*'([^']+)',\s*\n\s*to:\s*'([^']+)'(?:,\s*\n(?:\s*search:[^\n]*\n)?\s*permission:\s*'([^']+)')?/g)) {
    if (m[2] === '/service-users/$serviceUserId') continue // opens a panel on the profile, not a page of its own
    serviceUser.push({ label: m[1], path: m[2], permission: m[3] })
  }
  const emp = read('features/employees/components/EditEmployeeTabBar.tsx')
  const employee = [...emp.matchAll(/\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)'/g)].map(m => ({ id: m[1], label: m[2] }))
  return { serviceUser, employee }
}

// ─── Write ──────────────────────────────────────────────────────────────────
export function buildCatalog() {
  const { pages, missingTitle } = parsePages()
  const tabs = parseTabs(pages)
  const settings = parseSettings(pages, tabs)
  const recordTabs = parseRecordTabs()
  const json = v => JSON.stringify(v, (_, x) => (x === undefined ? undefined : x), 2)
  const text = `// Generated by scripts/generate-search-catalog.mjs: do not edit. Run \`node scripts/generate-search-catalog.mjs\`.
import type { CatalogPage, CatalogRecordTabs, CatalogSetting, CatalogTab } from './types'

export const CATALOG_PAGES: CatalogPage[] = ${json(pages)}

export const CATALOG_TABS: CatalogTab[] = ${json(tabs)}

export const CATALOG_SETTINGS: CatalogSetting[] = ${json(settings)}

export const CATALOG_RECORD_TABS: CatalogRecordTabs = ${json(recordTabs)}
`
  return { text, missingTitle, counts: { pages: pages.length, tabs: tabs.length, settings: settings.length } }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const { text, missingTitle, counts } = buildCatalog()
  if (missingTitle.length) console.warn(`Pages without a title in router.tsx pageTitles (not searchable): ${missingTitle.join(', ')}`)
  if (process.argv.includes('--check')) {
    if (missingTitle.length) {
      console.error('Give these pages a title in router.tsx pageTitles so they can be found:', missingTitle.join(', '))
      process.exit(1)
    }
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
    if (current.replace(/\r\n/g, '\n') !== text) {
      console.error('Search catalogue is out of date: run node scripts/generate-search-catalog.mjs')
      process.exit(1)
    }
    console.log('Search catalogue is up to date', counts)
  } else {
    writeFileSync(OUT, text)
    console.log('Wrote', OUT, counts)
  }
}
