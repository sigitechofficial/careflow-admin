import { Link } from '@tanstack/react-router'
import { AlertCircle, AlertTriangle, CheckCircle2, ExternalLink, XCircle } from 'lucide-react'
import type { BulkGenerateVisitPlanScheduleResponse } from '@/features/scheduling/api/bulk-visit-plan-schedule.api'
import { CARER_ROTA_CONFLICT_MESSAGE } from '@/features/scheduling/api/bulk-visit-plan-schedule.api'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: BulkGenerateVisitPlanScheduleResponse | null
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-xl font-semibold tabular-nums',
          tone === 'success' && 'text-emerald-700',
          tone === 'warning' && 'text-amber-700',
          tone === 'danger' && 'text-destructive',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function formatSuccessDetail(row: BulkGenerateVisitPlanScheduleResponse['results'][number]): string {
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

export function BulkGenerateRotaResultDialog({ open, onOpenChange, result }: Props) {
  if (!result) return null

  const { totals } = result
  const hasPatternWarnings = (totals.visitsWithPatternWarnings ?? 0) > 0
  const hasRotaConflicts = (totals.visitsWithRotaConflicts ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Rota generation complete</DialogTitle>
          <DialogDescription>
            {result.fromDate} → {result.toDate}
            {result.backfillDays > 0 ? ` · ${result.backfillDays} backfill day${result.backfillDays === 1 ? '' : 's'}` : ''}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SummaryStat label="Visits created" value={totals.visitsCreated} tone="success" />
            <SummaryStat label="Visits skipped" value={totals.visitsSkipped} tone="warning" />
            <SummaryStat
              label="Pattern warnings"
              value={totals.visitsWithPatternWarnings ?? 0}
              tone={(totals.visitsWithPatternWarnings ?? 0) > 0 ? 'warning' : 'default'}
            />
            <SummaryStat
              label="Double bookings"
              value={totals.visitsWithRotaConflicts ?? 0}
              tone={(totals.visitsWithRotaConflicts ?? 0) > 0 ? 'danger' : 'default'}
            />
            <SummaryStat label="Plans succeeded" value={totals.succeeded} tone="success" />
            <SummaryStat
              label="Plans failed / skipped"
              value={totals.failed + totals.skipped}
              tone={totals.failed > 0 ? 'danger' : totals.skipped > 0 ? 'warning' : 'default'}
            />
          </div>

          {hasRotaConflicts ? (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p className="font-semibold">
                    {totals.visitsWithRotaConflicts} visit
                    {totals.visitsWithRotaConflicts === 1 ? '' : 's'} could not assign a carer
                  </p>
                  <p>{CARER_ROTA_CONFLICT_MESSAGE}</p>
                  {totals.rotaConflictWarnings?.length ? (
                    <ul className="max-h-32 space-y-1 overflow-auto text-xs leading-relaxed">
                      {totals.rotaConflictWarnings.slice(0, 8).map(warning => (
                        <li key={warning}>• {warning}</li>
                      ))}
                      {totals.rotaConflictWarnings.length > 8 ? (
                        <li className="text-red-800/80 dark:text-red-200/80">
                          +{totals.rotaConflictWarnings.length - 8} more
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {hasPatternWarnings ? (
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
                  {totals.patternWarnings?.length ? (
                    <ul className="max-h-32 space-y-1 overflow-auto text-xs leading-relaxed">
                      {totals.patternWarnings.slice(0, 8).map(warning => (
                        <li key={warning}>• {warning}</li>
                      ))}
                      {totals.patternWarnings.length > 8 ? (
                        <li className="text-orange-800/80 dark:text-orange-200/80">
                          +{totals.patternWarnings.length - 8} more
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

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
                {result.results.map(row => (
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
                          <p>{formatSuccessDetail(row)}</p>
                          {row.patternWarnings?.length ? (
                            <ul className="space-y-0.5 text-xs text-orange-800 dark:text-orange-200">
                              {row.patternWarnings.slice(0, 3).map(warning => (
                                <li key={warning}>• {warning}</li>
                              ))}
                              {row.patternWarnings.length > 3 ? (
                                <li>+{row.patternWarnings.length - 3} more warnings</li>
                              ) : null}
                            </ul>
                          ) : null}
                          {row.rotaConflictWarnings?.length ? (
                            <ul className="space-y-0.5 text-xs text-red-800 dark:text-red-200">
                              {row.rotaConflictWarnings.slice(0, 3).map(warning => (
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
        </DialogBody>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild>
            <Link to="/scheduling/schedule-jobs">
              Open Schedule Jobs
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
