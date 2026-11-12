import * as React from 'react'
import {
  adminNavItems,
  filterNavByPermission,
  inspectorOnlyNavItems,
  reviewerOnlyNavItems,
} from '@/components/layout/Sidebar'
import type { NavItem } from '@/components/layout/sidebar-types'
import { useAuthStore } from '@/features/auth/store'
import type { Permission } from '@/features/auth/types'
import { hasOrganisationPayScope } from '@/features/auth/pay-scope'
import { CATALOG_PAGES, CATALOG_SETTINGS, CATALOG_TABS } from './catalog.generated'
import { HOW_TO_ANSWERS } from './how-to'
import { PAGE_WORDS } from './page-words'
import { prepare, type FindEntry } from './search-engine'

const searchKey = (s?: Record<string, string>) => (s ? new URLSearchParams(s).toString() : '')
const keyOf = (href: string, search?: Record<string, string>) => `${href}?${searchKey(search)}`
const dedupe = (parts: Array<string | undefined>) => parts.filter((x, i, a): x is string => Boolean(x) && a.indexOf(x) === i)

type MenuPlace = { href: string; search?: Record<string, string>; trail: string[] }

/** Where each menu page sits ("Quality › Incidents › All incidents"), from the full menu (names only). */
function menuPlaces(items: NavItem[]): MenuPlace[] {
  const out: MenuPlace[] = []
  for (const item of items) {
    if (!item.children?.length) {
      out.push({ href: item.href, trail: [item.label] })
      continue
    }
    for (const child of item.children) {
      if (child.planned) continue
      out.push({ href: child.href, search: child.search, trail: dedupe([item.label, child.section, child.label]) })
    }
  }
  return out
}

const PLACES = menuPlaces(adminNavItems)
const GENERIC_MENU_LABEL = /^(overview|dashboard|settings|reports?|list|view|home|all)$/i
const PAGE_TITLES = new Map(CATALOG_PAGES.map(p => [p.path, p.title]))
const sameSearch = (a?: Record<string, string>, b?: Record<string, string>) => searchKey(a) === searchKey(b)

/**
 * The menu place for exactly this address (and tab, when given). A page the menu only reaches through one of its
 * tabs ("Roles & permissions › Office users") is still placed there, by that link's trail.
 */
function menuPlace(path: string, search?: Record<string, string>): MenuPlace | undefined {
  const here = PLACES.filter(p => p.href === path)
  if (!here.length) return undefined
  return (
    here.find(p => sameSearch(p.search, search)) ??
    here.find(p => !p.search || !Object.keys(p.search).length) ??
    here.find(p => p.trail[p.trail.length - 1] === PAGE_TITLES.get(path)) ??
    here[0]
  )
}

/** The menu group for an area ("/incidents/…" → Quality & Compliance › Incidents), from its menu pages. */
function areaPlace(firstSegment: string): string[] {
  const inArea = PLACES.filter(p => p.href.startsWith(`/${firstSegment}/`) || p.href === `/${firstSegment}`)
  if (!inArea.length) return []
  // The steps all of them share, without the page names themselves.
  const shared = inArea[0]!.trail.slice(0, -1)
  for (const p of inArea.slice(1)) {
    let n = 0
    while (n < shared.length && p.trail[n] === shared[n]) n++
    shared.length = n
  }
  return shared.length ? shared : inArea[0]!.trail.slice(0, -1)
}

/**
 * Where a page or record lives, as menu steps. The page itself when the menu has it; otherwise the nearest
 * page above it ("/policies/123" → … › Policy Library), then pages not in the menu by their titles, then the
 * menu group for that part of the app ("/incidents/123" → Quality & Compliance › Incidents).
 */
export function locate(href: string, search?: Record<string, string>): string[] {
  return locateSteps(href, search).filter((step, i, all) => step !== all[i - 1])
}

function locateSteps(href: string, search?: Record<string, string>): string[] {
  const path = href.split('?')[0] ?? href
  const exact = menuPlace(path, search)
  if (exact) return exact.trail
  const parts = path.split('/').filter(Boolean)
  const below: string[] = []
  for (let n = parts.length - 1; n >= 1; n--) {
    const up = `/${parts.slice(0, n).join('/')}`
    const place = menuPlace(up)
    if (place) return [...place.trail, ...below]
    const title = PAGE_TITLES.get(up)
    if (title) below.unshift(title)
  }
  return [...areaPlace(parts[0] ?? ''), ...below]
}

/** The trail to a page: its menu place (named as in the menu), else where it sits, ending with the page. */
function trailTo(path: string, title: string, search?: Record<string, string>): string[] {
  const exact = menuPlace(path, search)
  if (exact) return exact.trail
  const place = locate(path, search)
  return place[place.length - 1] === title ? place : [...place, title]
}

/** Menu entries (sidebar) the person can open. */
function menuEntries(items: NavItem[]): FindEntry[] {
  const out: FindEntry[] = []
  for (const item of items) {
    if (!item.children?.length) {
      out.push({ id: `menu:${item.href}`, kind: 'page', title: item.label, href: item.href, trail: [item.label] })
      continue
    }
    for (const child of item.children) {
      if (child.ready === false || child.planned) continue
      const trail = dedupe([item.label, child.section, child.label])
      // "Overview" or "Dashboard" means nothing in a list of results: use the page's own title.
      const title = GENERIC_MENU_LABEL.test(child.label) ? (PAGE_TITLES.get(child.href) ?? `${child.section ?? item.label} ${child.label.toLowerCase()}`) : child.label
      out.push({
        id: `menu:${keyOf(child.href, child.search)}:${child.label}`,
        kind: child.search && Object.keys(child.search).length ? 'tab' : 'page',
        title,
        context: trail.slice(0, -1).join(' › '),
        trail,
        keywords: child.description,
        aliases: PAGE_WORDS[keyOf(child.href, child.search)] ?? PAGE_WORDS[child.href],
        href: child.href,
        search: child.search,
      })
    }
  }
  return out
}

/**
 * Everything the signed-in person can open: menu pages, every other page, page tabs, settings options and
 * how-to answers, each only when their role allows the page it lives on (the same rule as the route guard).
 * Each has a trail: where it is in the menu, so people learn the way there.
 */
export function useFindEntries() {
  const can = useAuthStore(s => s.can)
  const user = useAuthStore(s => s.user)
  return React.useMemo(() => buildFindEntries(can, user), [can, user])
}

/** Everything one person can find (useFindEntries, without React: also for tests). */
export function buildFindEntries(can: (p: Permission) => boolean, user: { role?: string; permissions?: string[] } | null | undefined) {
  {
    const role = user?.role
    const curated = role === 'temporary_inspector' ? inspectorOnlyNavItems : role === 'independent_reviewer' ? reviewerOnlyNavItems : null
    const menu = curated ?? filterNavByPermission(adminNavItems, can, role as never, hasOrganisationPayScope(user as never))
    const entries = menuEntries(menu)
    if (curated) return prepare(entries)

    const perms = user?.permissions ?? []
    const scheduleAccess = perms.some(p => p === 'schedule.read' || p.startsWith('schedule_') || p.startsWith('schedules.') || p.startsWith('scheduled_'))
    const allowed = (permissions: string[], schedule?: boolean) =>
      schedule ? scheduleAccess : !permissions.length || permissions.some(p => can(p as Permission))

    const seen = new Set(entries.map(e => keyOf(e.href, e.search)))
    // A page the menu already lists under the same name (another address for it) is shown once.
    const menuTitles = new Set(entries.map(e => e.title.toLowerCase()))
    for (const p of CATALOG_PAGES) {
      if (seen.has(keyOf(p.path)) || menuTitles.has(p.title.toLowerCase()) || !allowed(p.permissions, p.scheduleAccess)) continue
      seen.add(keyOf(p.path))
      const trail = trailTo(p.path, p.title)
      entries.push({ id: `page:${p.path}`, kind: 'page', title: p.title, context: trail.slice(0, -1).join(' › '), aliases: PAGE_WORDS[p.path], trail, href: p.path })
    }
    for (const t of CATALOG_TABS) {
      if (seen.has(keyOf(t.path, t.search)) || !allowed(t.permissions)) continue
      seen.add(keyOf(t.path, t.search))
      const trail = dedupe([...trailTo(t.path, t.pageTitle), t.label])
      entries.push({ id: `tab:${keyOf(t.path, t.search)}`, kind: 'tab', title: t.label, context: trail.slice(0, -1).join(' › '), aliases: PAGE_WORDS[keyOf(t.path, t.search)], trail, href: t.path, search: t.search })
    }
    for (const s of CATALOG_SETTINGS) {
      if (!allowed(s.permissions)) continue
      const trail = dedupe([...trailTo(s.path, s.pageTitle), s.tabLabel, s.group])
      entries.push({
        id: `setting:${keyOf(s.path, s.search)}:${s.group ?? ''}:${s.label}`,
        kind: 'setting',
        // A label like "Care app" means nothing alone: say which group it is in.
        title: s.label.length < 18 && s.group ? `${s.group}: ${s.label}` : s.label,
        context: trail.join(' › '),
        trail,
        keywords: s.hint,
        href: s.path,
        search: s.search,
        highlight: s.label,
      })
    }
    const pageByPath = new Map(CATALOG_PAGES.map(p => [p.path, p]))
    for (const h of HOW_TO_ANSWERS) {
      // Only for someone who can open the place the answer points to.
      const page = pageByPath.get(h.href)
      if (h.permissions ? !allowed(h.permissions) : page ? !allowed(page.permissions, page.scheduleAccess) : false) continue
      const trail = page ? trailTo(h.href, page.title) : locate(h.href)
      entries.push({ id: `howto:${h.question}`, kind: 'howto', title: h.question, keywords: h.words, answer: h.answer, trail, href: h.href, search: h.search, highlight: h.highlight })
    }
    return prepare(entries)
  }
}
