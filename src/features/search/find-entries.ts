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
import { prepare, type FindEntry } from './search-engine'

const searchKey = (s?: Record<string, string>) => (s ? new URLSearchParams(s).toString() : '')
const keyOf = (href: string, search?: Record<string, string>) => `${href}?${searchKey(search)}`

/** Menu entries (sidebar): their section gives the "where" for each page. */
function menuEntries(items: NavItem[]): FindEntry[] {
  const out: FindEntry[] = []
  for (const item of items) {
    if (!item.children?.length) {
      out.push({ id: `menu:${item.href}`, kind: 'page', title: item.label, href: item.href })
      continue
    }
    for (const child of item.children) {
      if (child.ready === false || child.planned) continue
      out.push({
        id: `menu:${keyOf(child.href, child.search)}:${child.label}`,
        kind: child.search && Object.keys(child.search).length ? 'tab' : 'page',
        title: child.label,
        context: [item.label, child.section].filter((x, i, a) => x && a.indexOf(x) === i).join(' › '),
        keywords: child.description,
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
 */
export function useFindEntries() {
  const can = useAuthStore(s => s.can)
  const user = useAuthStore(s => s.user)
  return React.useMemo(() => {
    const role = user?.role
    const curated = role === 'temporary_inspector' ? inspectorOnlyNavItems : role === 'independent_reviewer' ? reviewerOnlyNavItems : null
    const menu = curated ?? filterNavByPermission(adminNavItems, can, role, hasOrganisationPayScope(user))
    const entries = menuEntries(menu)
    if (curated) return prepare(entries)

    const perms = user?.permissions ?? []
    const scheduleAccess = perms.some(p => p === 'schedule.read' || p.startsWith('schedule_') || p.startsWith('schedules.') || p.startsWith('scheduled_'))
    const allowed = (permissions: string[], schedule?: boolean) =>
      schedule ? scheduleAccess : !permissions.length || permissions.some(p => can(p as Permission))

    const seen = new Set(entries.map(e => keyOf(e.href, e.search)))
    for (const p of CATALOG_PAGES) {
      if (seen.has(keyOf(p.path)) || !allowed(p.permissions, p.scheduleAccess)) continue
      seen.add(keyOf(p.path))
      entries.push({ id: `page:${p.path}`, kind: 'page', title: p.title, href: p.path })
    }
    for (const t of CATALOG_TABS) {
      if (seen.has(keyOf(t.path, t.search)) || !allowed(t.permissions)) continue
      seen.add(keyOf(t.path, t.search))
      entries.push({ id: `tab:${keyOf(t.path, t.search)}`, kind: 'tab', title: t.label, context: t.pageTitle, href: t.path, search: t.search })
    }
    for (const s of CATALOG_SETTINGS) {
      if (!allowed(s.permissions)) continue
      entries.push({
        id: `setting:${keyOf(s.path, s.search)}:${s.group ?? ''}:${s.label}`,
        kind: 'setting',
        // A label like "Care app" means nothing alone: say which group it is in.
        title: s.label.length < 18 && s.group ? `${s.group}: ${s.label}` : s.label,
        context: [s.pageTitle, s.tabLabel, s.group].filter(Boolean).join(' › '),
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
      entries.push({ id: `howto:${h.question}`, kind: 'howto', title: h.question, keywords: h.words, answer: h.answer, href: h.href, search: h.search, highlight: h.highlight })
    }
    return prepare(entries)
  }, [can, user])
}
