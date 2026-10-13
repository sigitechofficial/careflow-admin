import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Ban, Check, Plus, Wallet, X } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import {
  useApprovePayItem,
  useCancelPayItem,
  usePayItems,
  useRejectPayItem,
} from '@/features/billing/hooks/usePayItems'
import {
  PAY_ITEM_STATUS_LABELS,
  PAY_ITEM_TYPE_OPTIONS,
  PAY_ITEM_UNIT_LABELS,
  payItemTypeLabel,
  type PayItem,
  type PayItemStatus,
  type PayItemUnit,
} from '@/features/billing/types/pay-items.types'
import { formatBillingDate } from '@/features/billing/types/billing-cards.types'
import { DisruptedVisitsPanel } from '@/features/billing/components/DisruptedVisitsPanel'

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'PENDING_APPROVAL', label: 'Awaiting approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: '', label: 'All' },
]

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
}

function money(value: string | number | null | undefined): string {
  const n = Number(value ?? 0)
  return `${n < 0 ? '−' : ''}£${Math.abs(n).toFixed(2)}`
}

function quantityLabel(item: PayItem): string {
  if (!item.unit || item.unit === 'AMOUNT') return 'Fixed amount'
  const unit = PAY_ITEM_UNIT_LABELS[item.unit as PayItemUnit]?.toLowerCase() ?? item.unit
  return `${Number(item.quantity ?? 0)} ${unit} × £${Number(item.rate ?? 0).toFixed(2)}`
}

/** Non-visit pay (bonus, adjustment, holiday, sick, on-call, live-in, training) with approval. */
export default function PayItemsPage() {
  const canManage = useAuthStore(s => s.can('billing.payroll_runs.manage' as never))
  const currentUserId = useAuthStore(s => s.user?.id ?? null)
  const [status, setStatus] = React.useState('PENDING_APPROVAL')
  const [wageType, setWageType] = React.useState('')
  const itemsQuery = usePayItems({ ...(status ? { status } : {}), ...(wageType ? { wageTypeCode: wageType } : {}) })
  const approveMutation = useApprovePayItem()
  const rejectMutation = useRejectPayItem()
  const cancelMutation = useCancelPayItem()
  const busy = approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending
  const rows = itemsQuery.data ?? []

  const onApprove = async (item: PayItem) => {
    try {
      const res = await approveMutation.mutateAsync(item.id)
      toastSuccess(res.message)
    } catch (err) {
      toastApiError(err, 'Could not approve pay item.')
    }
  }
  const onReject = async (item: PayItem) => {
    const reason = window.prompt(`Reason for rejecting ${payItemTypeLabel(item.wageTypeCode)} for ${item.employeeName}?`)
    if (!reason || reason.trim().length < 3) return
    try {
      await rejectMutation.mutateAsync({ id: item.id, reason: reason.trim() })
      toastSuccess('Pay item rejected.')
    } catch (err) {
      toastApiError(err, 'Could not reject pay item.')
    }
  }
  const onCancel = async (item: PayItem) => {
    if (!window.confirm(`Cancel this ${payItemTypeLabel(item.wageTypeCode).toLowerCase()} for ${item.employeeName}?`)) return
    try {
      const res = await cancelMutation.mutateAsync(item.id)
      toastSuccess(res.message)
    } catch (err) {
      toastApiError(err, 'Could not cancel pay item.')
    }
  }

  return (
    <div className="min-w-0 space-y-6 pb-10" data-testid="pay-items-page">
      <ContentSectionHeader
        icon={<Wallet className="h-5 w-5" />}
        iconClassName="bg-teal-500/10 text-teal-700 dark:text-teal-300"
        title="Pay items"
        description="Non-visit pay for carers: bonuses, manual adjustments, holiday and sick pay, on-call, live-in and training. Approved items are added to the next visit pay run that covers their date, then flow into UK payroll. Items in a locked pay run cannot be changed."
        action={
          canManage ? (
            <Button size="sm" asChild>
              <Link to="/billing/pay-items/new" className="inline-flex items-center gap-1.5" data-testid="pay-items-new">
                <Plus className="h-4 w-4" aria-hidden />
                New pay item
              </Link>
            </Button>
          ) : undefined
        }
      />

      <DisruptedVisitsPanel />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1" role="tablist" aria-label="Status">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value || 'all'}
              type="button"
              role="tab"
              aria-selected={status === f.value}
              onClick={() => setStatus(f.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                status === f.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-foreground/90">Type</span>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={wageType}
            onChange={e => setWageType(e.target.value)}
          >
            <option value="">All types</option>
            {PAY_ITEM_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {itemsQuery.error ? (
        <p className="text-sm text-destructive">
          {itemsQuery.error instanceof ApiError ? itemsQuery.error.message : 'Could not load pay items.'}
        </p>
      ) : null}

      <ContentCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[1100px] text-sm" data-testid="pay-items-table">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Carer</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Calculation</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Reason</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              {canManage ? <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {itemsQuery.isLoading ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">Loading pay items…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No pay items.</td>
              </tr>
            ) : (
              rows.map(item => {
                const ownItem = item.createdById != null && item.createdById === currentUserId
                const needsOtherApprover = item.requiresSecondApprover && ownItem
                const frozen = !!item.includedInPayrollRunId
                return (
                  <tr key={item.id} className="border-b border-border align-top last:border-0" data-testid="pay-item-row">
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatBillingDate(item.workDate)}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        to="/employee/$employeeId/edit"
                        params={{ employeeId: item.employeeId }}
                        search={{ tab: 'pay-card' }}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {item.employeeName}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">{payItemTypeLabel(item.wageTypeCode)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{quantityLabel(item)}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{money(item.amount)}</td>
                    <td className="px-3 py-2.5">
                      <p>{item.reason}</p>
                      {item.notes ? <p className="text-xs text-muted-foreground">{item.notes}</p> : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={STATUS_BADGE[item.status] ?? 'secondary'}>
                        {PAY_ITEM_STATUS_LABELS[item.status as PayItemStatus] ?? item.status}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.createdByName ? `Entered by ${item.createdByName}` : ''}
                        {item.approvedByName ? ` · approved by ${item.approvedByName}` : ''}
                        {item.rejectedByName ? ` · rejected by ${item.rejectedByName}: ${item.rejectionReason ?? ''}` : ''}
                      </p>
                      {frozen ? <p className="text-xs text-muted-foreground">Paid in {item.payrollRunLabel ?? 'locked pay run'}</p> : null}
                    </td>
                    {canManage ? (
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {item.status === 'PENDING_APPROVAL' ? (
                            <>
                              <Button
                                size="sm"
                                className="h-8"
                                leftIcon={<Check className="h-3.5 w-3.5" />}
                                disabled={busy || needsOtherApprover}
                                title={needsOtherApprover ? 'Needs a different approver' : undefined}
                                onClick={() => void onApprove(item)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                leftIcon={<X className="h-3.5 w-3.5" />}
                                disabled={busy}
                                onClick={() => void onReject(item)}
                              >
                                Reject
                              </Button>
                            </>
                          ) : null}
                          {(item.status === 'PENDING_APPROVAL' || item.status === 'APPROVED') && !frozen ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-destructive"
                              leftIcon={<Ban className="h-3.5 w-3.5" />}
                              disabled={busy}
                              onClick={() => void onCancel(item)}
                            >
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                        {needsOtherApprover ? (
                          <p className="mt-1 text-xs text-muted-foreground">Another user must approve this.</p>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </ContentCard>
    </div>
  )
}
