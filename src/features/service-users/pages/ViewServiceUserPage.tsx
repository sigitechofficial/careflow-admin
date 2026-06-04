import { useParams, useSearch } from '@tanstack/react-router'
import { resolveServiceUserIdFromParams } from '@/features/service-users/service-user-route-id'
import { ServiceUserDashboard } from '@/features/service-users/dashboard/ServiceUserDashboard'

/** Route: `/service-users/:serviceUserId/view` — service user overview dashboard. */
export default function ViewServiceUserPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const search = useSearch({ strict: false }) as { focus?: string }
  const serviceUserId = resolveServiceUserIdFromParams(params.serviceUserId)

  if (!serviceUserId) {
    return (
      <div className="p-6 text-sm text-muted-foreground" data-testid="service-user-dashboard-missing-id">
        Missing service user id in the URL.
      </div>
    )
  }

  return (
    <div data-testid="service-user-view-page" data-focus={search.focus === 'flash' ? 'flash' : undefined}>
      <ServiceUserDashboard serviceUserId={serviceUserId} />
    </div>
  )
}
