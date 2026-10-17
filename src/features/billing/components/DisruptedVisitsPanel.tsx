import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { formatBillingDate } from '@/features/billing/types/billing-cards.types'
import { useDisruptionActions, useDisruptionDecisions, useUndecidedCancellations } from '@/features/billing/hooks/useTravelDisruptions'
import type { DisruptionDecision } from '@/features/billing/api/travel-disruptions.api'

const gbp = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
const STATUS_LABELS: Record<DisruptionDecision['status'], string> = {
  NEEDS_DECISION: 'Needs a decision',
  PENDING_APPROVAL: 'Awaiting approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}
const MIN_NOTE_LENGTH = 5

/**
 * Visits that did not go ahead as planned (Q13). A cancelled visit is not "nothing to pay" by
 * default: it is listed here until someone records what is paid for it. An approved rule proposes
 * the amount; with no rule a person decides. A second person approves, and an amount is then paid
 * in the next visit pay run.
 */
export function DisruptedVisitsPanel() {
  const canManage = useAuthStore(s => s.can('billing.payroll_runs.manage' as never))
  const undecided = useUndecidedCancellations()
  const decisions = useDisruptionDecisions()
  const { record, decide, approve } = useDisruptionActions()
  const [amounts, setAmounts] = React.useState<Record<string, string>>({})
  const [notes, setNotes] = React.useState<Record<string, string>>({})

  const cancellations = undecided.data ?? []
  const open = (decisions.data ?? []).filter(d => d.status === 'NEEDS_DECISION' || d.status === 'PENDING_APPROVAL')
  if (!cancellations.length && !open.length) return null

  const run = async (action: Promise<{ message: string }>, failure: string) => {
    try {
      toastSuccess((await action).message)
    } catch (err) {
      toastApiError(err, failure)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-300/60 bg-amber-50/40 p-4 dark:border-amber-900/60 dark:bg-amber-950/10" data-testid="disrupted-visits-panel">
      <div>
        <p className="text-sm font-medium text-foreground">Visits that did not go ahead as planned</p>
        <p className="text-xs text-muted-foreground">
          A cancelled visit is not treated as nothing to pay. Record what happened for the carer; the organisation’s approved rule
          proposes the amount, or a person decides where no rule covers it. A second person approves.
        </p>
      </div>

      {cancellations.length ? (
        <ul className="divide-y divide-border rounded-md border border-border bg-background" data-testid="undecided-cancellations">
          {cancellations.map(c => (
            <li key={`${c.scheduledJobId}:${c.employeeId}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
              <span>
                <span className="text-sm text-foreground">{c.jobName}</span> · due {formatBillingDate(c.scheduledStart)} ·{' '}
                {c.scheduledMinutes ?? '—'} min · cancelled with {c.noticeMinutes} min notice ({c.reasonCode.replace(/_/g, ' ').toLowerCase()}) ·
                no pay decision
              </span>
              {canManage ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={record.isPending}
                  onClick={() =>
                    void run(
                      record.mutateAsync({
                        employeeId: c.employeeId,
                        scheduledJobId: c.scheduledJobId,
                        eventType: 'CLIENT_CANCELLED',
                        eventAt: c.scheduledStart,
                        noticeMinutes: c.noticeMinutes,
                        scheduledMinutes: c.scheduledMinutes,
                        reason: `Visit cancelled (${c.reasonCode.replace(/_/g, ' ').toLowerCase()})`,
                      }),
                      'Could not record the cancellation.',
                    )
                  }
                >
                  Record for pay
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {open.length ? (
        <ul className="divide-y divide-border rounded-md border border-border bg-background" data-testid="disruption-decisions">
          {open.map(d => {
            const amount = Number(amounts[d.id])
            const note = (notes[d.id] ?? '').trim()
            const canDecide = (amounts[d.id] ?? '').trim() !== '' && amount >= 0 && note.length >= MIN_NOTE_LENGTH
            return (
              <li key={d.id} className="space-y-1 px-3 py-2 text-xs" data-testid="disruption-decision-item">
                <p className="text-sm text-foreground">
                  {d.eventLabel} · {formatBillingDate(d.eventAt)} · {STATUS_LABELS[d.status]}
                  {d.amount != null ? ` · ${gbp(d.amount)}` : ''}
                </p>
                <p className="text-muted-foreground">
                  {d.reason}
                  {d.decisionNote ? ` — ${d.decisionNote}` : ''}
                </p>
                {canManage ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-8 w-28"
                      value={amounts[d.id] ?? ''}
                      onChange={e => setAmounts(prev => ({ ...prev, [d.id]: e.target.value }))}
                      aria-label={`Amount to pay for ${d.eventLabel}`}
                    />
                    <Input
                      className="h-8 min-w-[200px] flex-1"
                      placeholder="Why this amount"
                      value={notes[d.id] ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [d.id]: e.target.value }))}
                      aria-label={`Reason for the amount for ${d.eventLabel}`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canDecide || decide.isPending}
                      onClick={() => void run(decide.mutateAsync({ id: d.id, amount, note }), 'Could not record the amount.')}
                    >
                      Set amount
                    </Button>
                    {d.status === 'PENDING_APPROVAL' ? (
                      <Button size="sm" disabled={approve.isPending} onClick={() => void run(approve.mutateAsync(d.id), 'Could not approve.')}>
                        Approve
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
