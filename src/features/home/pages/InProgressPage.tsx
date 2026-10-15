import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { LoadingSpinner } from '@/shared/ui/page-elements'
import { adminNavItems } from '@/components/layout/Sidebar'
import { NAV_MODULES, moduleLandingPath } from '@/components/layout/nav-modules'
import { ModuleIllustration, PageIllustration } from '@/components/layout/NavIllustration'

function titleFromSearch(search: unknown): string | undefined {
  if (search && typeof search === 'object' && 'title' in search) {
    const t = (search as { title?: unknown }).title
    if (typeof t !== 'string') return undefined
    const trimmed = t.trim()
    return trimmed || undefined
  }
  return undefined
}

/** Finds a planned menu page by its title so the page can say what it will do and where it lives. */
function findPlanned(title: string | undefined) {
  if (!title) return undefined
  for (const mod of adminNavItems) {
    const page = mod.children?.find((c) => c.planned && c.label === title)
    if (page) return { module: mod.label, page }
  }
  return undefined
}

/** Shown for menu links to features that are not built yet, and as the router default not-found view. */
export default function InProgressPage() {
  const contextTitle = useRouterState({
    select: (s) => titleFromSearch(s.location.search),
  })
  const plannedPage = React.useMemo(() => findPlanned(contextTitle), [contextTitle])
  const meta = plannedPage ? NAV_MODULES[plannedPage.module] : undefined
  const landing = plannedPage ? moduleLandingPath(plannedPage.module) : undefined

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-16 text-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-6">
        {meta && plannedPage ? (
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/60">
            <PageIllustration
              label={plannedPage.page.label}
              fallback={<ModuleIllustration label={plannedPage.module} fallback={<meta.Icon className="h-7 w-7" />} className="h-12 w-12" />}
              className="h-12 w-12"
            />
          </span>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner size="lg" />
            <span className="sr-only">In progress</span>
          </div>
        )}
        <div className="space-y-2">
          {plannedPage ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {plannedPage.module} · Coming soon
            </p>
          ) : null}
          <h1 className="text-xl font-semibold text-foreground">
            {plannedPage ? plannedPage.page.label : 'Page is in progress'}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {plannedPage?.page.description ? (
              <>
                {plannedPage.page.description} <span className="text-foreground">We are still building this page.</span>
              </>
            ) : contextTitle ? (
              <>
                We are still building <span className="font-medium text-foreground">{contextTitle}</span>. Check back
                soon.
              </>
            ) : (
              <>This page is not available yet. We are still building this part of CareAdmin.</>
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {landing && plannedPage ? (
          <Button asChild variant="outline" className="gap-2">
            <Link to={landing}>
              <ArrowLeft className="h-4 w-4" />
              Back to {plannedPage.module}
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" className="gap-2">
          <Link to="/">
            <Home className="h-4 w-4" />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  )
}
