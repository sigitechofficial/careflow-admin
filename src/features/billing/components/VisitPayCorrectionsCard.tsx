import * as React from 'react'
import { ArrowRight, Check, History, RotateCcw, X } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { ContentCard } from '@/shared/ui/content-section'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import {
  useApprovePayItem,
  useRecordVisitPayCorrection,
  useRejectPayItem,
  useReversePayItem,
  useVisitPayCorrections,
} from '@/features/billing/hooks/usePayItems'
import {
  PAY_CORRECTION_STATUS_LABELS,
  type PayCorrectionDisplayStatus,
  type VisitPayCorrectionItem,
} from '@/features/billing/types/pay-items.types'
import { formatBillingDate } from '@/features/billing/types/billing-cards.types'

const STATUS_BADGE: Record<PayCorrectionDisplayStatus, 'warning' | 'success' | 'destructive' | 'secondary' | 'info'> = {
  PENDING_APPROVAL: 'warning',
  APPROVED_FOR_PAYROLL: 'info',
  INCLUDED_IN_PAYROLL: 'info',
  SETTLED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
  REVERSED: 'secondary',
}

const MIN_REASON_LENGTH = 5

export function formatCorrectionMoney(value: string | number | null | undefined, signed = false): string {
  const n = Number(value ?? 0)
  const sign = n < 0 ? '−' : signed && n > 0 ? '+' : ''
  return `${sign}£${Math.abs(n).toFixed(2)}`
}

function Figure({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums" data-testid={testId}>
        {value}
      </p>
    </div>
  )
}

type Props = {
  visitReconciliationId: string
  /** In a dialog opened for this purpose, say why there is nothing to show; inline, show nothing. */
  explainWhenNotSettled?: boolean
}

/**
 * Corrections to the pay of a visit that is already settled in payroll. The settled figure is
 * never edited: the office states what the visit should have paid, a second person approves the
 * difference, and the next visit pay run pays or recovers it.
 */
export function VisitPayCorrectionsCard({ visitReconciliationId, explainWhenNotSettled = false }: Props) {
  const canRead = useAuthStore(s => s.can('billing.payroll_runs.read' as never))
  const canManage = useAuthStore(s => s.can('billing.payroll_runs.manage' as never))
  const currentUserId = useAuthStore(s => s.makerCheckerUserId())
  const query = useVisitPayCorrections(visitReconciliationId, canRead)
  const recordMutation = useRecordVisitPayCorrection()
  const approveMutation = useApprovePayItem()
  const rejectMutation = useRejectPayItem()
  const reverseMutation = useReversePayItem()
  const [correctedAmount, setCorrectedAmount] = React.useState('')
  const [reason, setReason] = React.useState('')
  const busy =
    recordMutation.isPending || approveMutation.isPending || rejectMutation.isPending || reverseMutation.isPending

  if (!canRead) return null
  if (query.isLoading) {
    return explainWhenNotSettled ? <p className="text-sm text-muted-foreground">Loading pay corrections…</p> : null
  }
  if (query.error) {
    return (
      <p className="text-sm text-destructive" data-testid="visit-pay-corrections-error">
        {query.error instanceof ApiError ? query.error.message : 'Could not load pay corrections.'}
      </p>
    )
  }
  const data = query.data
  if (!data) return null
  if (!data.visit.paySettled) {
    return explainWhenNotSettled ? (
      <p className="text-sm text-muted-foreground" data-testid="visit-pay-corrections-not-settled">
        This visit is not in a locked payroll run yet. Change its payable time or amount directly.
      </p>
    ) : null
  }

  const corrected = Number(correctedAmount)
  const amountValid = correctedAmount.trim() !== '' && Number.isFinite(corrected) && corrected >= 0
  const newDifference = amountValid ? Math.round((corrected - Number(data.netAmount)) * 100) / 100 : null
  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH
  const canSubmit = amountValid && reasonValid && newDifference !== 0 && !busy
  const pending = data.items.some(i => i.displayStatus === 'PENDING_APPROVAL')

  const onRecord = async () => {
    if (!canSubmit) return
    try {
      const res = await recordMutation.mutateAsync({
        visitReconciliationId,
        correctedAmount: corrected,
        reason: reason.trim(),
      })
      toastSuccess(res.message)
      setCorrectedAmount('')
      setReason('')
    } catch (err) {
      toastApiError(err, 'Could not record the pay correction.')
    }
  }
  const onApprove = async (item: VisitPayCorrectionItem) => {
    try {
      const res = await approveMutation.mutateAsync(item.id)
      toastSuccess(res.message)
    } catch (err) {
      toastApiError(err, 'Could not approve the pay correction.')
    }
  }
  const onReject = async (item: VisitPayCorrectionItem) => {
    const text = window.prompt(`Reason for rejecting this ${formatCorrectionMoney(item.amount, true)} correction?`)
    if (!text || text.trim().length < 3) return
    try {
      await rejectMutation.mutateAsync({ id: item.id, reason: text.trim() })
      toastSuccess('Pay correction rejected.')
    } catch (err) {
      toastApiError(err, 'Could not reject the pay correction.')
    }
  }
  const onReverse = async (item: VisitPayCorrectionItem) => {
    const text = window.prompt(
      `Reverse this settled ${formatCorrectionMoney(item.amount, true)} correction? It can be reversed once. Reason:`,
    )
    if (!text) return
    if (text.trim().length < MIN_REASON_LENGTH) {
      toastError(`Give a reason of at least ${MIN_REASON_LENGTH} characters.`)
      return
    }
    try {
      const res = await reverseMutation.mutateAsync({ id: item.id, reason: text.trim() })
      toastSuccess(res.message)
    } catch (err) {
      toastApiError(err, 'Could not reverse the pay correction.')
    }
  }

  return (
    <ContentCard className="space-y-4 p-4" data-testid="visit-pay-corrections">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          Pay corrections
        </h4>
        <p className="text-xs text-muted-foreground">
          The pay of {data.visit.visitRef} is settled in{' '}
          {data.visit.settledBy === 'UK_PAYROLL_RUN' ? 'a closed UK payroll run' : 'a locked visit pay run'} and is
          not edited. A correction is approved by a second person and paid, or recovered, in the next visit pay run.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-muted/30 px-3 py-2">
        <Figure label="Original (settled)" value={formatCorrectionMoney(data.originalAmount)} testId="visit-pay-original" />
        <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Figure
          label={pending ? 'Corrected (incl. pending)' : 'Corrected'}
          value={formatCorrectionMoney(data.netAmount)}
          testId="visit-pay-corrected"
        />
        <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Figure
          label="Difference"
          value={formatCorrectionMoney(data.differenceAmount, true)}
          testId="visit-pay-difference"
        />
      </div>

      {data.items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No corrections have been recorded for this visit.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border" data-testid="visit-pay-correction-history">
          {data.items.map(item => {
            const ownItem = item.createdById != null && item.createdById === currentUserId
            return (
              <li key={item.id} className="space-y-1 px-3 py-2 text-sm" data-testid="visit-pay-correction-item">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium tabular-nums">{formatCorrectionMoney(item.amount, true)}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.sourceType === 'REVERSAL'
                      ? 'Reversal'
                      : `${formatCorrectionMoney(item.originalAmount)} → ${formatCorrectionMoney(item.correctedAmount)}`}
                  </span>
                  <Badge variant={STATUS_BADGE[item.displayStatus] ?? 'secondary'}>
                    {PAY_CORRECTION_STATUS_LABELS[item.displayStatus] ?? item.displayStatus}
                  </Badge>
                  {item.reversalItemId && item.displayStatus !== 'REVERSED' ? (
                    <span className="text-xs text-muted-foreground">Reversal awaiting approval</span>
                  ) : null}
                </div>
                <p>{item.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBillingDate(item.createdAt)}
                  {item.createdByName ? ` · entered by ${item.createdByName}` : ''}
                  {item.approvedByName ? ` · approved by ${item.approvedByName}` : ''}
                  {item.rejectedByName ? ` · rejected by ${item.rejectedByName}: ${item.rejectionReason ?? ''}` : ''}
                  {item.payrollRunLabel ? ` · paid in ${item.payrollRunLabel}` : ''}
                </p>
                {canManage && (item.displayStatus === 'PENDING_APPROVAL' || item.canReverse) ? (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {item.displayStatus === 'PENDING_APPROVAL' ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8"
                          leftIcon={<Check className="h-3.5 w-3.5" />}
                          disabled={busy || ownItem}
                          title={ownItem ? 'Needs a different approver' : undefined}
                          onClick={() => void onApprove(item)}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          leftIcon={<X className="h-3.5 w-3.5" />}
                          disabled={busy}
                          onClick={() => void onReject(item)}
                        >
                          Reject
                        </Button>
                        {ownItem ? (
                          <span className="text-xs text-muted-foreground">
                            You entered this. Another user must approve it.
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                        disabled={busy}
                        onClick={() => void onReverse(item)}
                      >
                        Reverse
                      </Button>
                    )}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {canManage ? (
        data.canRecordCorrection ? (
          <div className="space-y-3 border-t border-border pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">What the visit should have paid in total (£)</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={correctedAmount}
                  onChange={e => setCorrectedAmount(e.target.value)}
                  disabled={busy}
                  placeholder={Number(data.netAmount).toFixed(2)}
                  data-testid="visit-pay-correction-amount"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Why the settled amount was wrong</span>
                <Input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  disabled={busy}
                  maxLength={500}
                  placeholder="e.g. Visit ran 30 minutes longer than paid"
                  data-testid="visit-pay-correction-reason"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground" data-testid="visit-pay-correction-preview">
                {newDifference == null
                  ? 'Enter the corrected total to see the difference.'
                  : newDifference === 0
                    ? 'This is what the visit has already been settled at. There is nothing to correct.'
                    : newDifference > 0
                      ? `${formatCorrectionMoney(newDifference)} more will be paid in the next visit pay run, after approval.`
                      : `${formatCorrectionMoney(Math.abs(newDifference))} will be recovered in the next visit pay run, after approval.`}
              </p>
              <Button type="button" size="sm" onClick={() => void onRecord()} disabled={!canSubmit}>
                {recordMutation.isPending ? 'Recording…' : 'Record correction'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            A correction for this visit is awaiting approval. Approve or reject it before recording another.
          </p>
        )
      ) : null}
    </ContentCard>
  )
}

/** The corrections card on its own, for screens that list earnings rather than one visit. */
export function VisitPayCorrectionsDialog({
  visitReconciliationId,
  visitRef,
  onOpenChange,
}: {
  visitReconciliationId: string | null
  visitRef?: string
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!visitReconciliationId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pay corrections{visitRef ? ` — ${visitRef}` : ''}</DialogTitle>
          <DialogDescription>Original settled pay, corrections and reversals for this visit.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {visitReconciliationId ? (
            <VisitPayCorrectionsCard visitReconciliationId={visitReconciliationId} explainWhenNotSettled />
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
