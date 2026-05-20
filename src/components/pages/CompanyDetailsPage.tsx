import { Building2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-elements'
import { CompanyDetailsSettingsPanel } from '@/features/settings/components/CompanyDetailsSettingsPanel'

export default function CompanyDetailsPage() {
  return (
    <div className="space-y-4" data-testid="company-details-page">
      <PageHeader
        title="Manage Company Details"
        description="Organisation profile, contact details, and licensed modules."
        icon={<Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Settings', href: '/settings' },
          { label: 'Company Details' },
        ]}
      />
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <CompanyDetailsSettingsPanel />
      </div>
    </div>
  )
}
