import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BarChart3, Loader2, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { EcmGraphFirstDashboard } from '@/features/ecm/components/EcmGraphFirstDashboard'
import { EcmComplianceOverviewPanel } from '@/features/ecm/components/EcmComplianceOverviewPanel'
import { EcmComplianceMethodCards } from '@/features/ecm/components/EcmComplianceMethodCards'
import { EcmOperationalPeriodCard } from '@/features/ecm/components/EcmOperationalPeriodCard'
import { useEcmOperationalPeriod } from '@/features/ecm/hooks/useEcmOperationalPeriod'
import { ecmKeys } from '@/features/ecm/keys'
import { formatPeriodDayShort } from '@/features/ecm/utils/ecm-operational-period.util'

export default function EcmGraphPage() {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = React.useState(false)

  const period = useEcmOperationalPeriod('today')
  const {
    preset,
    dateFrom,
    dateTo,
    periodLabel,
    operationalToday,
    operationalTimezone,
    setPreset,
    setDateFrom,
    setDateTo,
    applyPreset,
  } = period

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: ecmKeys.all })
    } finally {
      setRefreshing(false)
    }
  }

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

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        <div className="space-y-6">
          <EcmOperationalPeriodCard
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            periodLabel={periodLabel}
            operationalToday={operationalToday}
            operationalTimezone={operationalTimezone}
            onPresetChange={setPreset}
            onApplyPreset={applyPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            testIdPrefix="ecm-graph"
            footnote={
              <>
                {dateFrom === dateTo
                  ? formatPeriodDayShort(dateFrom)
                  : `${formatPeriodDayShort(dateFrom)} – ${formatPeriodDayShort(dateTo)}`}
                {' · '}
                ISO {dateFrom}
                {dateFrom !== dateTo ? ` → ${dateTo}` : ''}
              </>
            }
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9"
              disabled={refreshing}
              onClick={() => void onRefresh()}
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
              )}
              Refresh
            </Button>
          </EcmOperationalPeriodCard>

          <EcmComplianceMethodCards compact />

          <div className="space-y-10 border-t border-border pt-6">
            <EcmGraphFirstDashboard />
            <div className="border-t border-border pt-8">
              <EcmComplianceOverviewPanel hideMethodCards />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
