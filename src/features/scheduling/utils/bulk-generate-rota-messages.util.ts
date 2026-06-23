import { CARER_ROTA_CONFLICT_MESSAGE } from '@/features/scheduling/utils/schedule-job-carer-rota-conflict.util'
import type { BulkGenerateVisitPlanScheduleResponse } from '@/features/scheduling/api/bulk-visit-plan-schedule.api'

export function buildBulkGenerateRotaConfirmMessage(
  planCount: number,
  fromDate: string,
  toDate: string,
): string {
  return `Generate rota visits for ${planCount} service user${planCount === 1 ? '' : 's'} from ${fromDate} to ${toDate}? Jobs will be created unallocated — assign carers on Schedule Jobs. Existing visits are skipped.`
}

export function buildBulkGenerateRotaSuccessToastMessage(
  data: BulkGenerateVisitPlanScheduleResponse,
): string {
  const warningSuffix = [
    (data.totals.visitsWithPatternWarnings ?? 0) > 0
      ? `${data.totals.visitsWithPatternWarnings} visit${data.totals.visitsWithPatternWarnings === 1 ? '' : 's'} outside working pattern (carers assigned with warning)`
      : null,
    (data.totals.visitsWithRotaConflicts ?? 0) > 0
      ? `${data.totals.visitsWithRotaConflicts} visit${data.totals.visitsWithRotaConflicts === 1 ? '' : 's'} could not assign carer (${CARER_ROTA_CONFLICT_MESSAGE.toLowerCase()})`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const suffix = warningSuffix ? ` · ${warningSuffix}` : ''
  return `${data.totals.visitsCreated} visits created across ${data.totals.succeeded} plan${data.totals.succeeded === 1 ? '' : 's'}.${suffix}`
}
