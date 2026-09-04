import * as React from 'react'
import { EcmExceptionQueuePanel } from '@/features/ecm/components/EcmExceptionQueuePanel'
import { EcmVisitDetailDialog } from '@/features/ecm/components/EcmVisitDetailDialog'
import { useEcmOperationalPeriod } from '@/features/ecm/hooks/useEcmOperationalPeriod'
import { useInvalidateEcmQueries } from '@/features/ecm/hooks/useEcm'

export function EcmExceptionQueueWorkspace({
  serviceUserId,
}: {
  serviceUserId?: string
}) {
  const { dateFrom, dateTo, periodLabel } = useEcmOperationalPeriod('today')
  const invalidateEcm = useInvalidateEcmQueries()
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  return (
    <div className="space-y-4" data-testid="ecm-exception-queue-tab">
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
