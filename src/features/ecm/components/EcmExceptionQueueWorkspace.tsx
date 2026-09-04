import * as React from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { EcmExceptionQueuePanel } from '@/features/ecm/components/EcmExceptionQueuePanel'
import { EcmOperationalPeriodCard } from '@/features/ecm/components/EcmOperationalPeriodCard'
import { EcmVisitDetailDialog } from '@/features/ecm/components/EcmVisitDetailDialog'
import { useEcmOperationalPeriod } from '@/features/ecm/hooks/useEcmOperationalPeriod'
import { useInvalidateEcmQueries } from '@/features/ecm/hooks/useEcm'
import { formatPeriodDayShort } from '@/features/ecm/utils/ecm-operational-period.util'
import { Button } from '@/shared/ui/button'

export function EcmExceptionQueueWorkspace({
  serviceUserId,
}: {
  serviceUserId?: string
}) {
  const {
    preset,
    setPreset,
    applyPreset,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    periodLabel,
    operationalToday,
    multiDay,
  } = useEcmOperationalPeriod('today')
  const invalidateEcm = useInvalidateEcmQueries()
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)

  return (
    <div className="space-y-4" data-testid="ecm-exception-queue-tab">
      <EcmOperationalPeriodCard
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        periodLabel={periodLabel}
        operationalToday={operationalToday}
        onPresetChange={setPreset}
        onApplyPreset={applyPreset}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        hideLocation={Boolean(serviceUserId)}
        testIdPrefix="ecm-exception-queue"
        footnote={
          <>
            Showing exceptions planned{' '}
            {multiDay ? (
              <>
                from{' '}
                <span className="font-medium text-foreground">
                  {formatPeriodDayShort(dateFrom)}
                </span>{' '}
                to{' '}
                <span className="font-medium text-foreground">{formatPeriodDayShort(dateTo)}</span>
              </>
            ) : (
              <span className="font-medium text-foreground">{formatPeriodDayShort(dateFrom)}</span>
            )}
            .
          </>
        }
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true)
            invalidateEcm()
            window.setTimeout(() => setRefreshing(false), 400)
          }}
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </EcmOperationalPeriodCard>
      <EcmExceptionQueuePanel
        onOpenVisit={(jobId) => {
          setSelectedJobId(jobId)
          setDetailOpen(true)
        }}
        serviceUserId={serviceUserId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        periodLabel={periodLabel}
      />
      <EcmVisitDetailDialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) invalidateEcm()
        }}
        jobId={selectedJobId}
      />
    </div>
  )
}
