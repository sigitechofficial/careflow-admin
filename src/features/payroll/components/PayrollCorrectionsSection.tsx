import * as React from 'react'

import { useAuthStore } from '@/features/auth/store'
import { useDeductionAdjustmentActions, useDeductionAdjustments, useUkPayrollPayslips } from '@/features/payroll/hooks/usePayroll'
import type { PayrollDeductionAdjustment } from '@/features/payroll/types/payroll.types'
import type { ProposeDeductionAdjustmentInput } from '@/features/payroll/types/payroll-api.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

const KINDS: Array<[ProposeDeductionAdjustmentInput['kind'], string]> = [
  ['STUDENT_LOAN', 'Student loan'],
  ['POSTGRADUATE_LOAN', 'Postgraduate loan'],
  ['PENSION_EMPLOYEE', 'Pension (employee deduction)'],
  ['PENSION_EMPLOYER', 'Pension (employer contribution)'],
]
const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)

/**
 * Loan / pension completion (implemented, unverified): maker/checker corrections of loan and
 * pension amounts in closed runs. A closed run is never changed: an approved refund or reversal is
 * applied in the next run of the same tax year. Under-deductions are refused (HMRC / employer
 * intervention).
 */
export function PayrollCorrectionsSection({ employeeId, canPropose }: { employeeId: string; canPropose: boolean }) {
  const { data: rows = [] } = useDeductionAdjustments(employeeId)
  const { data: payslips = [] } = useUkPayrollPayslips(null)
  const actions = useDeductionAdjustmentActions(employeeId)
  const canReview = useAuthStore((s) => s.can('payroll.runs.close'))
  const currentUserId = useAuthStore((s) => s.user?.id ?? null)
  const closedRuns = payslips.filter((p) => p.employeeId === employeeId)
  const [kind, setKind] = React.useState<ProposeDeductionAdjustmentInput['kind']>('STUDENT_LOAN')
  const [sourceRunId, setSourceRunId] = React.useState('')
  const [corrected, setCorrected] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [evidenceRef, setEvidenceRef] = React.useState('')
  const proposeError = actions.propose.error instanceof Error ? actions.propose.error.message : null
  const reviewError = actions.review.error instanceof Error ? actions.review.error.message : null
  const correctedNumber = corrected.trim() === '' ? NaN : Number(corrected)

  return (
    <section className="space-y-2 rounded-md border border-border p-3" data-testid="payroll-corrections">
      <h3 className="text-sm font-medium">Payroll corrections (closed runs)</h3>
      <p className="text-xs text-muted-foreground">
        Closed payroll is never rewritten. An approved refund or reversal is applied when tax and NI are next calculated in a run of
        the same tax year; an under-deduction needs HMRC or employer intervention and is not recovered here.
      </p>
      {rows.length ? (
        <table className="w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-2 font-medium">Kind</th>
              <th className="py-1 pr-2 font-medium">Was / should be</th>
              <th className="py-1 pr-2 font-medium">Correction</th>
              <th className="py-1 pr-2 font-medium">Reason</th>
              <th className="py-1 pr-2 font-medium">Status</th>
              <th className="py-1 pr-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((a: PayrollDeductionAdjustment) => (
              <tr key={a.id} className="border-t border-border/70 align-top">
                <td className="py-1 pr-2">{KINDS.find(([k]) => k === a.kind)?.[1] ?? a.kind}</td>
                <td className="py-1 pr-2">
                  {gbp(a.originalAmount)} / {gbp(a.correctedAmount)}
                </td>
                <td className="py-1 pr-2">{gbp(a.amount)}</td>
                <td className="py-1 pr-2">
                  {a.reason} · {a.evidenceRef}
                </td>
                <td className="py-1 pr-2">
                  {a.status.toLowerCase()}
                  {a.appliedRunId ? ' · applied' : a.status === 'APPROVED' ? ' · awaiting a run' : ''}
                </td>
                <td className="py-1 pr-2">
                  {a.status === 'PROPOSED' && canReview && currentUserId !== a.proposedById ? (
                    <span className="flex gap-1">
                      <Button size="sm" variant="outline" disabled={actions.review.isPending} onClick={() => void actions.review.mutateAsync({ id: a.id, decision: 'APPROVE' }).catch(() => undefined)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" disabled={actions.review.isPending} onClick={() => void actions.review.mutateAsync({ id: a.id, decision: 'REJECT' }).catch(() => undefined)}>
                        Reject
                      </Button>
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-xs text-muted-foreground">No corrections.</p>
      )}
      {reviewError ? <p className="text-xs text-destructive" role="alert">{reviewError}</p> : null}
      {canPropose ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block space-y-1 text-sm">
            <span>Amount to correct</span>
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value as ProposeDeductionAdjustmentInput['kind'])} aria-label="Correction kind">
              {KINDS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Closed run</span>
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={sourceRunId} onChange={(e) => setSourceRunId(e.target.value)} aria-label="Closed run">
              <option value="">Choose</option>
              {closedRuns.map((p) => (
                <option key={p.runEmployeeId} value={p.ukPayrollRunId}>
                  {p.runLabel} · {p.paymentDate}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Should have been (£)</span>
            <Input type="number" step="0.01" value={corrected} onChange={(e) => setCorrected(e.target.value)} aria-label="Corrected amount" />
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>Reason</span>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Correction reason" />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Evidence reference</span>
            <Input value={evidenceRef} onChange={(e) => setEvidenceRef(e.target.value)} aria-label="Correction evidence" />
          </label>
          {proposeError ? <p className="text-xs text-destructive sm:col-span-3" role="alert">{proposeError}</p> : null}
          <div className="sm:col-span-3">
            <Button
              size="sm"
              variant="outline"
              disabled={
                actions.propose.isPending || !sourceRunId || !Number.isFinite(correctedNumber) || correctedNumber < 0 || reason.trim().length < 5 || evidenceRef.trim().length < 2
              }
              onClick={() =>
                void actions.propose
                  .mutateAsync({ employeeId, kind, sourceRunId, correctedAmount: correctedNumber, reason: reason.trim(), evidenceRef: evidenceRef.trim() })
                  .catch(() => undefined)
              }
            >
              Propose correction
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
