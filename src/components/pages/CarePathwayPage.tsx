import { Route } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-elements'
import { CarePathwayPanel } from '@/features/settings/components/CarePathwayPanel'

export default function CarePathwayPage() {
  return (
    <div className="space-y-4" data-testid="care-pathway-page">
      <PageHeader
        title="Care Pathway"
        description="Configure forms, care plan text, checklists, and actions for consistent care planning."
        icon={<Route className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Settings', href: '/settings' },
          { label: 'Care Pathway' },
        ]}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
        <CarePathwayPanel />
      </div>
    </div>
  )
}
