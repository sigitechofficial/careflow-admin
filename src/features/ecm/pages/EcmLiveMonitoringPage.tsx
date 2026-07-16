import { Radio } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { EcmLiveMonitoringPanel } from '@/features/ecm/components/EcmLiveMonitoringPanel'

export default function EcmLiveMonitoringPage() {
  return (
    <div className="flex flex-col gap-4" data-testid="ecm-live-monitoring-page">
      <PageHeader
        className="shrink-0"
        title="ECM live monitoring"
        description="Electronic Call Monitoring — planned vs actual attendance, timing exceptions, and follow-up."
        icon={<Radio className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'ECM', href: '/ecm/live' },
          { label: 'Live monitoring' },
        ]}
      />
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        <EcmLiveMonitoringPanel />
      </div>
    </div>
  )
}
