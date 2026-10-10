import { History, Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { ContentCard } from '@/shared/ui/content-section'
import { Badge } from '@/shared/ui/badge'
import { useEmployeePayCardHistory } from '@/features/billing/hooks/usePayCards'
import { formatBillingDate } from '@/features/billing/types/billing-cards.types'

/** Dated history of a carer's own pay card (newest first). */
export function EmployeePayCardHistoryList({ employeeId }: { employeeId: string }) {
  const historyQuery = useEmployeePayCardHistory(employeeId)
  const rows = historyQuery.data?.history ?? []

  return (
    <ContentCard className="space-y-4 p-4" data-testid="employee-pay-card-history">
      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
          <History className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Pay card history</h3>
          <p className="text-xs text-muted-foreground">
            Which pay card applied to this carer and when. Visits are paid on the card in force on the visit date.
          </p>
        </div>
      </div>

      {historyQuery.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
        </p>
      ) : historyQuery.error ? (
        <p className="text-sm text-destructive">
          {historyQuery.error instanceof ApiError ? historyQuery.error.message : 'Could not load pay card history.'}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pay card has been assigned to this carer yet.</p>
      ) : (
        <ol className="divide-y divide-border rounded-lg border border-border">
          {rows.map(row => {
            const neverApplied =
              !!row.effectiveFrom && !!row.effectiveTo && row.effectiveTo.slice(0, 10) < row.effectiveFrom.slice(0, 10)
            return (
              <li key={row.id} className="space-y-1 px-3 py-2.5 text-sm" data-testid="employee-pay-card-history-row">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {row.payCard ? `${row.payCard.name} (${row.payCard.code})` : 'No own pay card (matching applies)'}
                  </span>
                  {row.isCurrent ? <Badge variant="success">Current</Badge> : null}
                  {row.isScheduled ? <Badge variant="info">Scheduled</Badge> : null}
                  {row.payCard?.assignmentLevel === 'INDIVIDUAL' ? <Badge variant="secondary">Personal</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {neverApplied
                    ? `Replaced on the day it started (${formatBillingDate(row.effectiveFrom)})`
                    : `${row.effectiveFrom ? formatBillingDate(row.effectiveFrom) : 'From the start'} → ${
                        row.effectiveTo ? formatBillingDate(row.effectiveTo) : 'open'
                      }`}
                  {row.createdByName ? ` · by ${row.createdByName}` : ''}
                  {` · saved ${formatBillingDate(row.createdAt)}`}
                </p>
                {row.reason ? <p className="text-xs text-foreground/80">Reason: {row.reason}</p> : null}
              </li>
            )
          })}
        </ol>
      )}
    </ContentCard>
  )
}
