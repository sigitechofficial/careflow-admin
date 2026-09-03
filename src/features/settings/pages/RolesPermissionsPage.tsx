import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { RolesPermissionsPanel } from '@/features/settings/components/RolesPermissionsPanel'

export default function RolesPermissionsPage() {
  return (
    <div className="space-y-4" data-testid="roles-permissions-page">
      <PageHeader
        title="Roles & permissions"
        description="Manage office users, identity roles, and the permission matrix."
        icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Settings', href: '/settings' },
          { label: 'Roles & permissions' },
        ]}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
        <RolesPermissionsPanel />
      </div>
    </div>
  )
}
