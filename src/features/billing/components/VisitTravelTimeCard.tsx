import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { combineOperationalDateAndHm, dayKeyFromInstant, formatOpsClockTime } from '@/shared/lib/operational-day.util'
import { useAuthStore } from '@/features/auth/store'
import { useTravelIntervalActions, useVisitTravelTime } from '@/features/billing/hooks/useTravelDisruptions'
import {
  TRAVEL_CATEGORY_LABELS,
  TRAVEL_POLICY_CATEGORIES,
  type TravelCategory,
  type TravelEvidence,
} from '@/features/billing/api/travel-disruptions.api'

const MIN_NOTE_LENGTH = 5
const selectClass = 'h-9 rounded-md border border-input bg-background px-2 text-sm'
const time = (iso: string) => formatOpsClockTime(iso)
const STATUS_LABELS = { PENDING: 'Awaiting approval', APPROVED: 'Approved', REJECTED: 'Rejected' } as const

/**
 * Time before a visit (TR-01 / TR-04 / TR-05 / TR-06). A gap between two visits is not travel by
 * itself: until someone says what it was, the pay run uses an estimate and says so. Intervals
 * entered here are approved by a second person and then decide travel and waiting time for the
 * visit. They are time only; mileage is entered and paid separately.
 */
export function VisitTravelTimeCard({ visitReconciliationId, visitDate }: { visitReconciliationId: string; visitDate: string }) {
  const canManage = useAuthStore(s => s.can('billing.visit_reconciliations.manage' as never))
  const query = useVisitTravelTime(visitReconciliationId)
  const { record, approve, reject } = useTravelIntervalActions(visitReconciliationId)
  const [category, setCategory] = React.useState<TravelCategory>('BETWEEN_SERVICE_USERS')
  const [evidence, setEvidence] = React.useState<TravelEvidence>('RECORDED')
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [payable, setPayable] = React.useState(false)
  const [note, setNote] = React.useState('')

  if (query.isLoading || query.error || !query.data) return null
  const data = query.data
  const policyCategory = TRAVEL_POLICY_CATEGORIES.includes(category)
  const valid = !!from && !!to && to > from && note.trim().length >= MIN_NOTE_LENGTH
  // Times are entered as the organisation's wall clock on the day of the visit.
  const day = /^\d{4}-\d{2}-\d{2}$/.test(visitDate) ? visitDate : dayKeyFromInstant(visitDate)

  const run = async (action: Promise<{ message: string }>, failure: string, after?: () => void) => {
    try {
      toastSuccess((await action).message)
      after?.()
    } catch (err) {
      toastApiError(err, failure)
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3" data-testid="visit-travel-time">
      <p className="text-sm font-medium text-foreground">Travel and waiting time before this visit</p>
      <p className="text-xs text-muted-foreground" data-testid="travel-basis">
        {data.basis === 'APPROVED_INTERVALS' && data.decided
          ? `Decided by approved intervals: ${data.decided.travelMinutes} min travel, ${data.decided.waitingMinutes} min waiting, ${data.decided.notPaidMinutes} min not paid.`
          : data.basis === 'RECORDED_ON_VISIT'
            ? `Travel minutes entered on the visit: ${data.recordedOnVisitMinutes ?? 0} min, not classified. Record what the time was to replace them.`
            : data.basis === 'ESTIMATED_FROM_GAP' && data.estimate
            ? `Estimate, not verified: ${data.estimate.gapMinutes} min since ${data.estimate.fromVisitRef} is read as ${data.estimate.travelMinutes} min travel and ${data.estimate.waitingMinutes} min waiting. Record what the time was to replace the estimate.`
            : 'No earlier visit that day, and nothing recorded.'}{' '}
        This is time only: mileage is entered and paid separately.
      </p>
      {data.intervals.length ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {data.intervals.map(interval => (
            <li key={interval.id} className="space-y-1 px-3 py-2 text-xs" data-testid="travel-interval-item">
              <p className="text-sm text-foreground">
                {time(interval.startAt)}–{time(interval.endAt)} · {interval.minutes} min · {TRAVEL_CATEGORY_LABELS[interval.category]}
                {interval.paid ? '' : ' · not paid'} · {STATUS_LABELS[interval.status]}
              </p>
              <p className="text-muted-foreground">
                {interval.evidence.toLowerCase()}
                {interval.note ? ` · ${interval.note}` : ''}
                {interval.createdByName ? ` · entered by ${interval.createdByName}` : ''}
                {interval.decidedByName ? ` · decided by ${interval.decidedByName}` : ''}
              </p>
              {interval.status === 'PENDING' && canManage && !data.visit.paySettled ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={approve.isPending} onClick={() => void run(approve.mutateAsync(interval.id), 'Could not approve the interval.')}>
                    Approve interval
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={reject.isPending}
                    onClick={() => void run(reject.mutateAsync({ id: interval.id, note: 'Rejected on review' }), 'Could not reject the interval.')}
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {data.visit.paySettled ? (
        <p className="text-xs text-muted-foreground">Pay for this visit is settled: travel time is corrected with a pay correction.</p>
      ) : canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-xs">
            <span className="font-medium text-foreground/90">What the time was</span>
            <select className={selectClass} value={category} onChange={e => setCategory(e.target.value as TravelCategory)} aria-label="Travel category">
              {(Object.keys(TRAVEL_CATEGORY_LABELS) as TravelCategory[]).map(key => (
                <option key={key} value={key}>
                  {TRAVEL_CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium text-foreground/90">From</span>
            <Input type="time" value={from} onChange={e => setFrom(e.target.value)} className="w-28" aria-label="Interval start" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium text-foreground/90">To</span>
            <Input type="time" value={to} onChange={e => setTo(e.target.value)} className="w-28" aria-label="Interval end" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium text-foreground/90">How it is known</span>
            <select className={selectClass} value={evidence} onChange={e => setEvidence(e.target.value as TravelEvidence)} aria-label="Evidence">
              <option value="RECORDED">Recorded (reported)</option>
              <option value="VERIFIED">Verified against evidence</option>
              <option value="ESTIMATED">Estimated</option>
            </select>
          </label>
          {policyCategory ? (
            <label className="flex items-center gap-2 pb-2 text-xs">
              <input type="checkbox" checked={payable} onChange={e => setPayable(e.target.checked)} aria-label="Paid under the employer's policy" />
              <span>Paid under the employer’s policy</span>
            </label>
          ) : null}
          <label className="min-w-[200px] flex-1 space-y-1 text-xs">
            <span className="font-medium text-foreground/90">Note</span>
            <Input value={note} onChange={e => setNote(e.target.value)} maxLength={500} aria-label="Interval note" />
          </label>
          <Button
            size="sm"
            disabled={!valid || record.isPending}
            onClick={() =>
              void run(
                record.mutateAsync({
                  toVisitReconciliationId: visitReconciliationId,
                  category,
                  evidence,
                  startAt: combineOperationalDateAndHm(day, from),
                  endAt: combineOperationalDateAndHm(day, to),
                  payable: policyCategory ? payable : undefined,
                  note: note.trim(),
                }),
                'Could not record the interval.',
                () => {
                  setFrom('')
                  setTo('')
                  setNote('')
                },
              )
            }
          >
            {record.isPending ? 'Recording…' : 'Record interval'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
