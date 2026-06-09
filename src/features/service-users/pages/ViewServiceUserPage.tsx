import { Link, useParams, useSearch } from '@tanstack/react-router'
import { resolveServiceUserIdFromParams } from '@/features/service-users/service-user-route-id'
import { ServiceUserDashboardClassic } from '@/features/service-users/dashboard/ServiceUserDashboardClassic'
import { ServiceUserDashboardWednesday } from '@/features/service-users/dashboard/ServiceUserDashboardWednesday'
import { ServiceUserDashboardSimple } from '@/features/service-users/dashboard/ServiceUserDashboard'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

/** Wed 3 Jun commit (fe82385) | Thu 4 Jun bento (09aeee0) | current simplified */
export type ServiceUserViewLayout = 'wed' | 'thu' | 'simple'

function resolveLayout(raw: string | undefined): ServiceUserViewLayout {
  if (raw === 'wed' || raw === 'simple') return raw
  // `classic` kept for links from the prior compare toggle
  return 'thu'
}

/** Route: `/service-users/:serviceUserId/view` — service user overview dashboard. */
export default function ViewServiceUserPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const search = useSearch({ strict: false }) as {
    focus?: string
    layout?: ServiceUserViewLayout | 'classic'
  }
  const serviceUserId = resolveServiceUserIdFromParams(params.serviceUserId)
  const layout = resolveLayout(search.layout)

  if (!serviceUserId) {
    return (
      <div className="p-6 text-sm text-muted-foreground" data-testid="service-user-dashboard-missing-id">
        Missing service user id in the URL.
      </div>
    )
  }

  const viewSearch = {
    ...(search.focus === 'flash' ? { focus: 'flash' as const } : {}),
  }

  const layoutLinks: { id: ServiceUserViewLayout; label: string; commit: string }[] = [
    { id: 'wed', label: 'Wed 3 Jun', commit: 'fe82385' },
    { id: 'thu', label: 'Thu 4 Jun', commit: '09aeee0' },
    { id: 'simple', label: 'New', commit: 'current' },
  ]

  return (
    <div
      data-testid="service-user-view-page"
      data-layout={layout}
      data-focus={search.focus === 'flash' ? 'flash' : undefined}
    >
      <div
        className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6"
        data-testid="service-user-view-layout-switcher"
      >
        <p className="text-xs text-muted-foreground">
          Compare layouts from git commits (Wed/Thu) against the current simplified view.
        </p>
        <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Dashboard layout">
          {layoutLinks.map(({ id, label, commit }) => (
            <Button
              key={id}
              variant="ghost"
              size="sm"
              className={cn('h-8 rounded-sm px-3', layout === id && 'bg-muted shadow-sm')}
              asChild
            >
              <Link
                to="/service-users/$serviceUserId/view"
                params={{ serviceUserId }}
                search={{ ...viewSearch, layout: id }}
                data-testid={`service-user-view-layout-${id}`}
                title={`Git: ${commit}`}
              >
                {label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {layout === 'simple' ? (
        <ServiceUserDashboardSimple serviceUserId={serviceUserId} />
      ) : layout === 'wed' ? (
        <ServiceUserDashboardWednesday serviceUserId={serviceUserId} />
      ) : (
        <ServiceUserDashboardClassic serviceUserId={serviceUserId} />
      )}
    </div>
  )
}
