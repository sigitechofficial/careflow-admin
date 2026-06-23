import { AlertTriangle } from 'lucide-react'
import type { BulkGenerateVisitPlanScheduleResponse } from '@/features/scheduling/api/bulk-visit-plan-schedule.api'
import { CARER_ROTA_CONFLICT_MESSAGE } from '@/features/scheduling/utils/schedule-job-carer-rota-conflict.util'

type WarningListProps = {
  warnings: string[]
  maxVisible?: number
  listClassName?: string
  overflowClassName?: string
}

function WarningList({
  warnings,
  maxVisible = 8,
  listClassName,
  overflowClassName,
}: WarningListProps) {
  if (!warnings.length) return null

  return (
    <ul className={listClassName ?? 'max-h-32 space-y-1 overflow-auto text-xs leading-relaxed'}>
      {warnings.slice(0, maxVisible).map((warning) => (
        <li key={warning}>• {warning}</li>
      ))}
      {warnings.length > maxVisible ? (
        <li className={overflowClassName}>+{warnings.length - maxVisible} more</li>
      ) : null}
    </ul>
  )
}

export function BulkGenerateRotaResultRotaConflictBanner({
  totals,
}: {
  totals: BulkGenerateVisitPlanScheduleResponse['totals']
}) {
  if ((totals.visitsWithRotaConflicts ?? 0) <= 0) return null

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-2">
          <p className="font-semibold">
            {totals.visitsWithRotaConflicts} visit
            {totals.visitsWithRotaConflicts === 1 ? '' : 's'} could not assign a carer
          </p>
          <p>{CARER_ROTA_CONFLICT_MESSAGE}</p>
          <WarningList
            warnings={totals.rotaConflictWarnings ?? []}
            overflowClassName="text-red-800/80 dark:text-red-200/80"
          />
        </div>
      </div>
    </div>
  )
}

export function BulkGenerateRotaResultPatternWarningBanner({
  totals,
}: {
  totals: BulkGenerateVisitPlanScheduleResponse['totals']
}) {
  if ((totals.visitsWithPatternWarnings ?? 0) <= 0) return null

  return (
    <div className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-950 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-2">
          <p className="font-semibold">
            {totals.visitsWithPatternWarnings} visit
            {totals.visitsWithPatternWarnings === 1 ? '' : 's'} outside carer working hours
          </p>
          <p className="text-orange-900/90 dark:text-orange-100/90">
            Planned carers were still assigned. Check Schedule Jobs for orange warnings on those
            visits.
          </p>
          <WarningList
            warnings={totals.patternWarnings ?? []}
            overflowClassName="text-orange-800/80 dark:text-orange-200/80"
          />
        </div>
      </div>
    </div>
  )
}
