import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { EcmGraphPanel } from '@/features/ecm/components/EcmGraphPanel'

export default function EcmGraphPage() {
  return (
    <div
      className="flex h-[calc(100dvh-3.5rem-2.5rem)] flex-col gap-4 overflow-hidden md:h-[calc(100dvh-3.5rem-3rem)]"
      data-testid="ecm-graph-page"
    >
      <PageHeader
        className="shrink-0"
        title="ECM graphs"
        description="Visual breakdown of live monitoring buckets, arrival and missed classifications, and daily KPIs."
        icon={<BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'ECM', href: '/ecm/live' },
          { label: 'Graph' },
        ]}
      />
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        <EcmGraphPanel />
      </div>
    </div>
  )
}
