import * as React from 'react'
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

  const busy = approve.isPending || markPaid.isPending || cancel.isPending
  const status = detail?.status ?? batch?.status

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

  const runAction = async (action: 'approve' | 'mark-paid' | 'cancel') => {
    if (!batch) return
    try {
      if (action === 'approve') {
        await approve.mutateAsync(batch.id)
        toastSuccess('Payout batch approved')
      } else if (action === 'mark-paid') {
        await markPaid.mutateAsync(batch.id)
        toastSuccess('Payout batch marked as bank paid')
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
                    Amounts are UK net pay (after W1/M1 PAYE/NI). Bank paid = UK net disbursed.
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
                      ? `Paid ${formatInstant(detail.paidAt)}`
                      : 'Not marked paid'}
                  </p>
                </ContentCard>
              </div>

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
                        <td className="px-3 py-2 text-right tabular-nums">{line.amount}</td>
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
            {canManage && status === 'DRAFT' ? (
              <Button
                type="button"
                disabled={busy}
                onClick={() => void runAction('approve')}
              >
                {approve.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Approve
              </Button>
            ) : null}
            {canManage && status === 'APPROVED' ? (
              <Button
                type="button"
                disabled={busy}
                onClick={() => void runAction('mark-paid')}
              >
                {markPaid.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Mark paid
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
