import * as React from 'react'
import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { EcmGraphFirstDashboard } from '@/features/ecm/components/EcmGraphFirstDashboard'
import { EcmComplianceOverviewPanel } from '@/features/ecm/components/EcmComplianceOverviewPanel'
import { useScheduleAreas } from '@/features/scheduling/hooks/useScheduling'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'

export default function EcmGraphPage() {
  const { locationId: globalLocationId, isScoped: globalLocationScoped } =
    useGlobalLocationScope()
  const [scheduleAreaId, setScheduleAreaId] = React.useState('')

  const areasQuery = useScheduleAreas()
  const scopedAreas = React.useMemo(() => {
    const areas = areasQuery.data ?? []
    if (!globalLocationId) return areas
    return areas.filter((a) => a.location?.id === globalLocationId)
  }, [areasQuery.data, globalLocationId])

  React.useEffect(() => {
    if (!scheduleAreaId) return
    if (globalLocationScoped && !scopedAreas.some((a) => a.id === scheduleAreaId)) {
      setScheduleAreaId('')
    }
  }, [globalLocationScoped, scopedAreas, scheduleAreaId])

  return (
    <div className="flex flex-col gap-4" data-testid="ecm-graph-page">
      <PageHeader
        className="shrink-0"
        title="ECM graphs"
        description="Exception trends and branch comparison first. Same operational period and location as Live and Reports — click a series to list visits."
        icon={<BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'ECM', href: '/ecm/live' },
          { label: 'Graph' },
        ]}
      />
      <div className="space-y-10 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        <EcmGraphFirstDashboard
          scheduleAreaId={scheduleAreaId}
          onScheduleAreaIdChange={setScheduleAreaId}
          scopedAreas={scopedAreas}
        />
        <div className="border-t border-border pt-8">
          <EcmComplianceOverviewPanel scheduleAreaId={scheduleAreaId} />
        </div>
      </div>
    </div>
  )
}
