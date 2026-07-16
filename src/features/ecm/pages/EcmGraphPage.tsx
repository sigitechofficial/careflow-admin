import * as React from 'react'
import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { EcmGraphFirstDashboard } from '@/features/ecm/components/EcmGraphFirstDashboard'
import { EcmComplianceOverviewPanel } from '@/features/ecm/components/EcmComplianceOverviewPanel'

export default function EcmGraphPage() {
  const [complianceDay, setComplianceDay] = React.useState<string | undefined>(undefined)

  const handlePeriodChange = React.useCallback((period: { dateFrom: string; dateTo: string }) => {
    setComplianceDay(period.dateTo)
  }, [])

  return (
    <div className="flex flex-col gap-4" data-testid="ecm-graph-page">
      <PageHeader
        className="shrink-0"
        title="ECM graphs"
        description="Graph-first monitoring — charts occupy most of the screen; visit tables appear only after you click a series."
        icon={<BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'ECM', href: '/ecm/live' },
          { label: 'Graph' },
        ]}
      />
      <div className="space-y-10 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        <EcmGraphFirstDashboard onPeriodChange={handlePeriodChange} />
        <div className="border-t border-border pt-8">
          <EcmComplianceOverviewPanel initialDate={complianceDay} />
        </div>
      </div>
    </div>
  )
}
