import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Home } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { LoadingSpinner } from '@/shared/ui/page-elements'

function titleFromSearch(search: unknown): string | undefined {
  if (search && typeof search === 'object' && 'title' in search) {
    const t = (search as { title?: unknown }).title
    if (typeof t !== 'string') return undefined
    const trimmed = t.trim()
    return trimmed || undefined
  }
  return undefined
}

/** Shown for sidebar links to features that are not implemented yet, and as the router default not-found view. */
export default function InProgressPage() {
  const contextTitle = useRouterState({
    select: (s) => titleFromSearch(s.location.search),
  })

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-16 text-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <LoadingSpinner size="lg" />
          <span className="sr-only">In progress</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">Page is in progress</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {contextTitle ? (
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
      <Button asChild variant="outline" className="gap-2">
        <Link to="/">
          <Home className="h-4 w-4" />
          Back to home
        </Link>
      </Button>
    </div>
  )
}
