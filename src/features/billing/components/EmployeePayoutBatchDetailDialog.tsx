import * as React from 'react'
import { PayableBreakdown } from '@/features/billing/components/PayableBreakdown'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { useAuthStore } from '@/features/auth/store'
import { ContentCard } from '@/shared/ui/content-section'
import { BillingStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import {
  useApproveEmployeePayoutBatch,
  useCancelEmployeePayoutBatch,
  useEmployeePayoutBatch,
  useMarkEmployeePayoutBatchPaid,
} from '@/features/billing/hooks/useEmployeePayouts'
import type { EmployeePayoutBatchRow } from '@/features/billing/api/employee-payouts.api'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: EmployeePayoutBatchRow | null
  canManage: boolean
}

export function EmployeePayoutBatchDetailDialog({
  open,
  onOpenChange,
  batch,
  canManage,
}: Props) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const detailQuery = useEmployeePayoutBatch(open && batch ? batch.id : undefined)
  const detail = detailQuery.data
  const approve = useApproveEmployeePayoutBatch()
  const markPaid = useMarkEmployeePayoutBatchPaid()
  const cancel = useCancelEmployeePayoutBatch()
  // Approving and recording the bank payment are separate powers from preparing a batch.
  const canApprove = useAuthStore(s => s.can('billing.employee_payouts.approve'))
  const canSettle = useAuthStore(s => s.can('billing.employee_payouts.settle'))
  const currentUserId = useAuthStore(s => s.makerCheckerUserId())

  const busy = approve.isPending || markPaid.isPending || cancel.isPending
  const status = detail?.status ?? batch?.status
  const preparedByMe = !!detail?.createdById && detail.createdById === currentUserId

  const today = new Date().toISOString().slice(0, 10)
  const [settling, setSettling] = React.useState(false)
  const [paymentReference, setPaymentReference] = React.useState('')
  const [settledOn, setSettledOn] = React.useState(today)
  const [settlementEvidence, setSettlementEvidence] = React.useState('')
  React.useEffect(() => {
    if (!open) {
      setSettling(false)
      setPaymentReference('')
      setSettledOn(today)
      setSettlementEvidence('')
    }
  }, [open, today])

  const submitSettlement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!batch) return
    try {
      await markPaid.mutateAsync({
        id: batch.id,
        paymentReference: paymentReference.trim(),
        settledOn,
        settlementEvidence: settlementEvidence.trim() || undefined,
      })
      toastSuccess('Bank payment recorded')
      setSettling(false)
    } catch (err) {
      toastApiError(err, 'Could not record the bank payment')
    }
  }

  const formatInstant = (iso: string | null | undefined) => {
    if (!iso) return null
    const day = dayKeyFromInstant(iso)
    return day ? `${formatDate(day)} ${formatTime(iso)}` : null
  }

  const formatDayRange = (from: string | null | undefined, to: string | null | undefined) => {
    if (!from && !to) return '—'
    if (from && to) return `${formatDate(from)} – ${formatDate(to)}`
    return formatDate(from || to || '')
  }

  const runAction = async (action: 'approve' | 'cancel') => {
    if (!batch) return
    try {
      if (action === 'approve') {
        await approve.mutateAsync(batch.id)
        toastSuccess('Payout batch approved')
      } else {
        await cancel.mutateAsync(batch.id)
        toastSuccess('Payout batch cancelled')
        onOpenChange(false)
      }
    } catch (e) {
      toastApiError(e, 'Payout action failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Payout batch</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[75vh] space-y-4 overflow-y-auto">
          {!batch ? null : detailQuery.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading payout batch…
            </div>
          ) : detailQuery.isError || !detail ? (
            <p className="text-sm text-destructive">Could not load payout batch.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">
                    {detail.ukPayrollRunLabel ?? detail.periodKey}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDayRange(detail.periodStart, detail.periodEnd)}
                    {detail.periodKey ? ` · ${detail.periodKey}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Amounts are UK net pay (after W1/M1 PAYE/NI). Payment recorded = UK net entered
                    as paid by the office.
                  </p>
                  {detail.notes ? (
                    <p className="mt-1 text-sm text-muted-foreground">{detail.notes}</p>
                  ) : null}
                </div>
                <BillingStatusBadge status={detail.status} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ContentCard className="space-y-1 p-3">
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="text-lg font-semibold tabular-nums">{detail.lineCount}</p>
                </ContentCard>
                <ContentCard className="space-y-1 p-3">
                  <p className="text-xs text-muted-foreground">Total to pay</p>
                  <p className="text-lg font-semibold tabular-nums text-primary">
                    {detail.totalAmount}
                  </p>
                </ContentCard>
                <ContentCard className="space-y-1 p-3">
                  <p className="text-xs text-muted-foreground">Audit</p>
                  <p className="text-xs text-muted-foreground">
                    {detail.approvedAt
                      ? `Approved ${formatInstant(detail.approvedAt)}`
                      : 'Not approved'}
                    <br />
                    {detail.paidAt
                      ? `Payment recorded ${detail.settlementConfirmed ? '' : 'manually '}${formatInstant(detail.paidAt)}`
                      : 'Payment not recorded'}
                    {detail.paymentReference ? (
                      <>
                        <br />
                        Ref {detail.paymentReference}
                        {detail.settledOn ? ` · paid ${formatDate(detail.settledOn)}` : ''}
                      </>
                    ) : null}
                    {detail.paidAt && !detail.settlementConfirmed ? (
                      <>
                        <br />
                        <span data-testid="payout-not-bank-confirmed">Not confirmed by a bank</span>
                      </>
                    ) : null}
                  </p>
                </ContentCard>
              </div>

              {status === 'DRAFT' && canApprove && preparedByMe ? (
                <p className="text-sm text-muted-foreground">
                  You prepared this batch, so a different user has to approve it.
                </p>
              ) : null}

              {settling ? (
                <form
                  onSubmit={e => void submitSettlement(e)}
                  className="space-y-3 rounded-lg border border-border p-3"
                >
                  <p className="text-sm font-medium">Record the bank payment</p>
                  <p className="text-xs text-muted-foreground">
                    Enter this only after the money has left the account. The batch is then shown
                    as “payment recorded manually”: the reference you type is your record, not
                    confirmation from the bank.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="payout-payment-reference" required>
                        Payment reference
                      </Label>
                      <Input
                        id="payout-payment-reference"
                        value={paymentReference}
                        onChange={e => setPaymentReference(e.target.value)}
                        placeholder="Bank or provider reference"
                        minLength={3}
                        maxLength={120}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="payout-settled-on" required>
                        Date paid
                      </Label>
                      <Input
                        id="payout-settled-on"
                        type="date"
                        value={settledOn}
                        max={today}
                        onChange={e => setSettledOn(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="payout-settlement-evidence">Where the evidence is held</Label>
                    <Input
                      id="payout-settlement-evidence"
                      value={settlementEvidence}
                      onChange={e => setSettlementEvidence(e.target.value)}
                      placeholder="e.g. bank statement line, provider report"
                      maxLength={1000}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={busy}>
                      {markPaid.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Record payment
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setSettling(false)}>
                      Back
                    </Button>
                  </div>
                </form>
              ) : null}

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Employee
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lines.map(line => (
                      <tr key={line.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          <div className="font-medium">{line.employeeName}</div>
                          <div className="text-xs text-muted-foreground">
                            {line.employeeNumber ? `#${line.employeeNumber}` : '—'}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {line.amount}
                          <PayableBreakdown
                            netPay={line.netPayValue ?? line.amountValue}
                            reimbursement={line.reimbursementValue ?? 0}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Badge variant="outline">{line.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DialogBody>
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {canApprove && status === 'DRAFT' ? (
              <Button
                type="button"
                disabled={busy || preparedByMe}
                onClick={() => void runAction('approve')}
              >
                {approve.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Approve
              </Button>
            ) : null}
            {canSettle && status === 'APPROVED' && !settling ? (
              <Button type="button" disabled={busy} onClick={() => setSettling(true)}>
                Record bank payment
              </Button>
            ) : null}
            {canManage && (status === 'DRAFT' || status === 'APPROVED') ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void runAction('cancel')}
              >
                {cancel.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Cancel batch
              </Button>
            ) : null}
          </div>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
