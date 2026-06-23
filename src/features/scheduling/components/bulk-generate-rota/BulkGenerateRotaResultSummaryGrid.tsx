import type { BulkGenerateVisitPlanScheduleResponse } from '@/features/scheduling/api/bulk-visit-plan-schedule.api'
import { BulkGenerateRotaResultSummaryStat } from '@/features/scheduling/components/bulk-generate-rota/BulkGenerateRotaResultSummaryStat'

type Props = {
  totals: BulkGenerateVisitPlanScheduleResponse['totals']
}

export function BulkGenerateRotaResultSummaryGrid({ totals }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <BulkGenerateRotaResultSummaryStat label="Visits created" value={totals.visitsCreated} tone="success" />
      <BulkGenerateRotaResultSummaryStat label="Visits skipped" value={totals.visitsSkipped} tone="warning" />
      <BulkGenerateRotaResultSummaryStat
        label="Pattern warnings"
        value={totals.visitsWithPatternWarnings ?? 0}
        tone={(totals.visitsWithPatternWarnings ?? 0) > 0 ? 'warning' : 'default'}
      />
      <BulkGenerateRotaResultSummaryStat
        label="Double bookings"
        value={totals.visitsWithRotaConflicts ?? 0}
        tone={(totals.visitsWithRotaConflicts ?? 0) > 0 ? 'danger' : 'default'}
      />
      <BulkGenerateRotaResultSummaryStat label="Plans succeeded" value={totals.succeeded} tone="success" />
      <BulkGenerateRotaResultSummaryStat
        label="Plans failed / skipped"
        value={totals.failed + totals.skipped}
        tone={totals.failed > 0 ? 'danger' : totals.skipped > 0 ? 'warning' : 'default'}
      />
    </div>
  )
}
