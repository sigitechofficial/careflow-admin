import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ContentCard } from '@/shared/ui/content-section'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import {
  useDismissPayEvaluationFailure,
  usePayEvaluationFailures,
  useRetryPayEvaluationFailure,
} from '@/features/billing/hooks/useVisitReconciliations'
import type { PayEvaluationFailure } from '@/features/billing/types/visit-reconciliation.types'
import { formatBillingDate } from '@/features/billing/types/billing-cards.types'

const CATEGORY_LABELS: Record<string, string> = {
  EMPLOYMENT_RECORD_MISSING: 'No employment record',
  PAY_CARD_UNRESOLVED: 'Pay card not resolved',
  INVALID_TIMES: 'Invalid times',
  LOCKED_HISTORY: 'Pay already settled',
  RECORD_MISSING: 'Record missing',
  BUSINESS_RULE: 'Needs attention',
  DATABASE: 'System error',
  UNEXPECTED: 'System error',
}

const MIN_REASON_LENGTH = 5

/**
 * Pay calculations that failed (R-17). A visit listed here has no pay worked out yet: it is not
 * paid as zero, and it stays here until the calculation succeeds or someone dismisses it.
 * Shows nothing when there is no open failure.
 */
export function PayEvaluationFailuresCard({ locationId }: { locationId?: string | null }) {
  const canRead = useAuthStore(s => s.can('billing.visit_reconciliations.read' as never))
  const canManage = useAuthStore(s => s.can('billing.visit_reconciliations.manage' as never))
  const query = usePayEvaluationFailures(locationId, canRead)
  const retry = useRetryPayEvaluationFailure()
  const dismiss = useDismissPayEvaluationFailure()
  const busy = retry.isPending || dismiss.isPending

  if (!canRead || query.isLoading) return null
  if (query.error) {
    // A branch user without a chosen branch is told so by the list below; no second message here.
    if (query.error instanceof ApiError && query.error.status === 403) return null
    return (
      <p className="text-sm text-destructive" data-testid="pay-evaluation-failures-error">
        Could not load failed pay calculations.
      </p>
    )
  }
  const rows = query.data ?? []
  if (rows.length === 0) return null

  const onRetry = async (row: PayEvaluationFailure) => {
    try {
      const res = await retry.mutateAsync(row.id)
      if (res.data.succeeded) toastSuccess(res.message)
      else toastError('Still failing', res.message)
    } catch (err) {
      toastApiError(err, 'Could not retry the pay calculation.')
    }
  }
  const onDismiss = async (row: PayEvaluationFailure) => {
    const reason = window.prompt(
      `Dismiss this failed pay calculation${row.visitRef ? ` for ${row.visitRef}` : ''}? Nothing will be paid for it. Reason:`,
    )
    if (!reason) return
    if (reason.trim().length < MIN_REASON_LENGTH) {
      toastError(`Give a reason of at least ${MIN_REASON_LENGTH} characters.`)
      return
    }
    try {
      const res = await dismiss.mutateAsync({ id: row.id, reason: reason.trim() })
      toastSuccess(res.message)
    } catch (err) {
      toastApiError(err, 'Could not dismiss the failure.')
    }
  }

  return (
    <ContentCard className="space-y-3 border-warning/40 p-4" data-testid="pay-evaluation-failures">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
          Pay not calculated ({rows.length})
        </h3>
        <p className="text-xs text-muted-foreground">
          The pay for these visits could not be worked out. They are not in any pay run and are not paid as £0. Fix
          the cause where one is given, then retry.
        </p>
      </div>
      <ul className="divide-y divide-border rounded-md border border-border">
        {rows.map(row => (
          <li key={row.id} className="space-y-1 px-3 py-2 text-sm" data-testid="pay-evaluation-failure">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs">{row.visitRef ?? 'Visit without a pay record'}</span>
              <Badge variant={row.kind === 'TECHNICAL' ? 'destructive' : 'warning'}>
                {CATEGORY_LABELS[row.category] ?? row.category}
              </Badge>
              {row.employeeName ? <span>{row.employeeName}</span> : null}
              {row.serviceUserName ? (
                <span className="text-muted-foreground">visiting {row.serviceUserName}</span>
              ) : null}
            </div>
            <p>{row.message}</p>
            <p className="text-xs text-muted-foreground">
              Reference {row.reference} · first {formatBillingDate(row.firstOccurredAt)} · last{' '}
              {formatBillingDate(row.lastOccurredAt)} · failed {row.occurrences} time
              {row.occurrences === 1 ? '' : 's'}
            </p>
            {canManage ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {row.retryable ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                    disabled={busy}
                    onClick={() => void onRetry(row)}
                  >
                    Retry
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  leftIcon={<X className="h-3.5 w-3.5" />}
                  disabled={busy}
                  onClick={() => void onDismiss(row)}
                >
                  Dismiss
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </ContentCard>
  )
}
