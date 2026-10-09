import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { adminNavItems, filterNavByPermission } from '@/components/layout/Sidebar'
import { NAV_MODULES, moduleLabelForSlug } from '@/components/layout/nav-modules'
import { ModuleIllustration, PageIllustration } from '@/components/layout/NavIllustration'
import type { SubNavItem } from '@/components/layout/sidebar-types'
import { ModuleInsights, hasModuleInsights } from '@/features/home/module-insights'

/** Landing page for a module picked on the rail: one tile per page, grouped by the panel's sub-headings. */
export default function ModuleHomePage() {
  const { module: slug } = useParams({ strict: false }) as { module?: string }
  const can = useAuthStore((s) => s.can)
  const role = useAuthStore((s) => s.user?.role)

  const label = slug ? moduleLabelForSlug(slug) : undefined
  const meta = label ? NAV_MODULES[label] : undefined
  const item = React.useMemo(
    () => filterNavByPermission(adminNavItems, can, role).find((i) => i.label === label),
    [can, role, label],
  )

  if (!label || !meta) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <p className="font-medium text-foreground">This area doesn't exist.</p>
        <Link to="/" className="mt-2 inline-block text-sm text-primary hover:underline">Go to Home</Link>
      </div>
    )
  }

  const pages = item?.children ?? []
  const groups: Array<{ section: string | undefined; pages: SubNavItem[] }> = []
  for (const p of pages) {
    const last = groups[groups.length - 1]
    if (last && last.section === p.section) last.pages.push(p)
    else groups.push({ section: p.section, pages: [p] })
  }

  return (
    <div className="space-y-6" data-testid={`module-home-${meta.slug}`}>
      <header className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-5 shadow-sm">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted/60">
          <ModuleIllustration label={label} fallback={<meta.Icon className="h-6 w-6" />} className="h-10 w-10" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold text-foreground">{label}</h1>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        </div>
      </header>

      {item && hasModuleInsights(meta.slug) ? (
        <section aria-labelledby="module-glance-heading" className="space-y-5">
          <h2 id="module-glance-heading" className="sr-only">
            {label} dashboard
          </h2>
          <ModuleInsights slug={meta.slug} />
        </section>
      ) : null}

      {pages.length > 0 && hasModuleInsights(meta.slug) ? (
        <h2 className="-mb-3 border-t border-border pt-6 font-display text-[15px] font-semibold text-foreground">Pages in {label}</h2>
      ) : null}

      {pages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          You don't have access to any pages in {label}. Ask an administrator if you need them.
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.section ?? 'pages'} className="space-y-3" aria-label={g.section ?? `${label} pages`}>
            {g.section ? (
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.section}</h2>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {g.pages.map((p) => {
                const linkProps = p.planned
                  ? { to: '/in-progress', search: { title: p.label } }
                  : p.search && Object.keys(p.search).length
                    ? { to: p.href, search: p.search }
                    : { to: p.href }
                return (
                  <Link
                    key={p.label}
                    {...linkProps}
                    data-testid={p.navTestId ? `tile-${p.navTestId}` : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      p.planned ? 'border-dashed border-border' : 'border-border',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/60 [&_svg]:h-[18px] [&_svg]:w-[18px]',
                        p.planned ? 'text-muted-foreground opacity-60 grayscale-[35%]' : 'text-foreground/80',
                      )}
                    >
                      <PageIllustration label={p.label} fallback={p.icon} className="h-7 w-7" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm font-medium', p.planned ? 'text-muted-foreground' : 'text-foreground')}>
                        {p.label}
                      </span>
                      {p.planned && p.description ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{p.description}</span>
                      ) : null}
                    </span>
                    {p.planned ? (
                      <span className="shrink-0 rounded bg-amber-100 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        Soon
                      </span>
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
