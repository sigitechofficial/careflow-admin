import { MapPin } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-elements'
import { LocationManagementPanel } from '@/features/settings/components/LocationManagementPanel'

export default function LocationManagementPage() {
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
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
        <LocationManagementPanel />
      </div>
    </div>
  )
}
