import { History, MapPin } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { LocationManagementPanel } from '@/features/settings/components/LocationManagementPanel'
import { useAuthStore } from '@/features/auth/store'
import { LOCATION_AUDIT_HISTORY_SEARCH } from '@/features/settings/location-management/location-management-audit'

export default function LocationManagementPage() {
  const canViewHistory = useAuthStore(s => s.can('audit.read') || s.can('audit_logs.read'))

  return (
    <div className="space-y-4" data-testid="location-management-page">
      <PageHeader
        title="Location Management"
        description="Manage zones, incident notifications, and service user and employee location assignments."
        icon={<MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Settings', href: '/settings' },
          { label: 'Location Management' },
        ]}
      >
        {canViewHistory ? (
          <Button asChild variant="outline" size="sm">
            <Link
              to="/admin/audit"
              search={LOCATION_AUDIT_HISTORY_SEARCH}
              data-testid="location-management-view-history"
            >
              <History className="mr-1.5 h-4 w-4" aria-hidden />
              View history
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      <div className="overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
        <LocationManagementPanel />
      </div>
    </div>
  )
}
