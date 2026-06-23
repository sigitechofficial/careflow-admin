import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import type { BulkGenerateVisitPlanScheduleResponse } from '@/features/scheduling/api/bulk-visit-plan-schedule.api'
import { cn } from '@/shared/lib/utils'
import { formatBulkGenerateRotaSuccessDetail } from '@/features/scheduling/utils/bulk-generate-rota-result.util'

type Props = {
  results: BulkGenerateVisitPlanScheduleResponse['results']
}

export function BulkGenerateRotaResultRowsTable({ results }: Props) {
  return (
    <div className="max-h-[min(50vh,24rem)] overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-muted/90 text-left text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
          <tr>
            <th className="px-3 py-2">Service user</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Detail</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row) => (
            <tr key={row.planId} className="border-t border-border/70 align-top">
              <td className="px-3 py-2 font-medium">{row.serviceUserLabel}</td>
              <td className="px-3 py-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium capitalize',
                    row.status === 'success' && 'text-emerald-700',
                    row.status === 'failed' && 'text-destructive',
                    row.status === 'skipped' && 'text-amber-700',
                  )}
                >
                  {row.status === 'success' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : row.status === 'failed' ? (
                    <XCircle className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                  {row.status}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {row.status === 'success' ? (
                  <div className="space-y-1">
                    <p>{formatBulkGenerateRotaSuccessDetail(row)}</p>
                    {row.patternWarnings?.length ? (
                      <ul className="space-y-0.5 text-xs text-orange-800 dark:text-orange-200">
                        {row.patternWarnings.slice(0, 3).map((warning) => (
                          <li key={warning}>• {warning}</li>
                        ))}
                        {row.patternWarnings.length > 3 ? (
                          <li>+{row.patternWarnings.length - 3} more warnings</li>
                        ) : null}
                      </ul>
                    ) : null}
                    {row.rotaConflictWarnings?.length ? (
                      <ul className="space-y-0.5 text-xs text-red-800 dark:text-red-200">
                        {row.rotaConflictWarnings.slice(0, 3).map((warning) => (
                          <li key={warning}>• {warning}</li>
                        ))}
                        {row.rotaConflictWarnings.length > 3 ? (
                          <li>+{row.rotaConflictWarnings.length - 3} more warnings</li>
                        ) : null}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  row.error ?? row.skipReason ?? '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
