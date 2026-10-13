import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { useRecordMileageCorrection, useVisitMileageCorrections } from '@/features/billing/hooks/usePayItems'
import { PAY_ITEM_STATUS_LABELS } from '@/features/billing/types/pay-items.types'

const MIN_REASON_LENGTH = 5
const gbp = (value: string | number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(value))
const signed = (value: string | number, unit = '') => `${Number(value) > 0 ? '+' : ''}${unit === '£' ? gbp(value) : `${Number(value).toFixed(2)} mi`}`

/**
 * Mileage of a visit whose pay is settled (D-21). The paid line is not edited. The office states
 * the miles the journey should have had in total; the difference is reimbursed or recovered as
 * mileage in the next visit pay run, after a second person approves it. It is never a wage
 * adjustment, so it is not taxed or counted as pay.
 */
export function VisitMileageCorrectionCard({ visitReconciliationId }: { visitReconciliationId: string }) {
  const canManage = useAuthStore(s => s.can('billing.payroll_runs.manage' as never))
  const query = useVisitMileageCorrections(visitReconciliationId)
  const record = useRecordMileageCorrection()
  const [miles, setMiles] = React.useState('')
  const [reason, setReason] = React.useState('')

  if (query.isLoading || query.error || !query.data) return null
  const data = query.data
  const parsed = Number(miles)
  const valid = miles.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && parsed !== Number(data.netMiles)
  const reasonOk = reason.trim().length >= MIN_REASON_LENGTH

  const onRecord = async () => {
    try {
      const res = await record.mutateAsync({ visitReconciliationId, correctedMiles: parsed, reason: reason.trim() })
      toastSuccess(res.message)
      setMiles('')
      setReason('')
    } catch (err) {
      toastApiError(err, 'Could not record the mileage correction.')
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3" data-testid="visit-mileage-correction">
      <p className="text-sm font-medium text-foreground">Mileage correction</p>
      <p className="text-xs text-muted-foreground">
        Reimbursed so far: <span data-testid="mileage-net">{Number(data.netMiles).toFixed(2)} mi · {gbp(data.netAmount)}</span>
        {Number(data.differenceAmount) !== 0 ? ` (originally ${Number(data.originalMiles).toFixed(2)} mi · ${gbp(data.originalAmount)})` : ''}. A correction
        is mileage, not wages: it is paid or recovered in the next visit pay run after a second person approves it.
      </p>
      {!data.taxTreatmentVerified ? (
        <p className="text-xs text-amber-700 dark:text-amber-300" data-testid="mileage-not-verified">
          The tax treatment of this mileage has not been verified against HMRC approved amounts.
        </p>
      ) : null}
      {data.items.length ? (
        <ul className="divide-y divide-border rounded-md border border-border" data-testid="mileage-correction-history">
          {data.items.map(item => (
            <li key={item.id} className="space-y-0.5 px-3 py-2 text-xs" data-testid="mileage-correction-item">
              <p className="text-sm text-foreground">
                {signed(item.quantity ?? 0)} · {signed(item.amount, '£')} · {PAY_ITEM_STATUS_LABELS[item.status] ?? item.status}
                {item.isReversal ? ' · reversal' : ''}
              </p>
              <p className="text-muted-foreground">{item.reason}</p>
              <p className="text-muted-foreground">
                {item.createdAt.slice(0, 10)}
                {item.createdByName ? ` · entered by ${item.createdByName}` : ''}
                {item.approvedByName ? ` · approved by ${item.approvedByName}` : ''}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {canManage && data.canRecordCorrection ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-xs">
            <span className="font-medium text-foreground/90">Miles the journey should have had in total</span>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={miles}
              onChange={e => setMiles(e.target.value)}
              className="w-40"
              aria-label="Corrected total miles"
            />
          </label>
          <label className="min-w-[220px] flex-1 space-y-1 text-xs">
            <span className="font-medium text-foreground/90">Why the reimbursed miles were wrong</span>
            <Input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} aria-label="Reason for the mileage correction" />
          </label>
          <Button size="sm" onClick={() => void onRecord()} disabled={!valid || !reasonOk || record.isPending}>
            {record.isPending ? 'Recording…' : 'Record mileage correction'}
          </Button>
        </div>
      ) : !data.canRecordCorrection && data.items.some(i => i.status === 'PENDING_APPROVAL') ? (
        <p className="text-xs text-muted-foreground">A mileage correction is awaiting approval (Billing → Pay items).</p>
      ) : null}
    </div>
  )
}
