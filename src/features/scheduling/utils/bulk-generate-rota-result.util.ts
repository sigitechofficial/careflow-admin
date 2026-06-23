import type { BulkVisitPlanScheduleResultItem } from '@/features/scheduling/api/bulk-visit-plan-schedule.api'

export function formatBulkGenerateRotaSuccessDetail(
  row: BulkVisitPlanScheduleResultItem,
): string {
  const parts = [
    `${row.visitsCreated ?? 0} created`,
    `${row.visitsSkipped ?? 0} already existed`,
  ]
  if ((row.visitsWithPatternWarnings ?? 0) > 0) {
    parts.push(`${row.visitsWithPatternWarnings} outside working pattern`)
  }
  if ((row.visitsWithRotaConflicts ?? 0) > 0) {
    parts.push(`${row.visitsWithRotaConflicts} double-booked`)
  }
  return parts.join(', ')
}
