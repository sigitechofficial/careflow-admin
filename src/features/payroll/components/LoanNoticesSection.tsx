import * as React from 'react'

import { useLoanNotices, useRecordLoanNotice } from '@/features/payroll/hooks/usePayroll'
import type { EmployeeLoanNotice, EmployeePayrollProfile, LoanNoticeType } from '@/features/payroll/types/payroll.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

const NOTICE_LABELS: Record<LoanNoticeType, string> = {
  SL1: 'SL1 — Start student loan',
  SL2: 'SL2 — Stop student loan',
  PGL1: 'PGL1 — Start postgraduate loan',
  PGL2: 'PGL2 — Stop postgraduate loan',
}
type Plan = '1' | '2' | '4' | '5'

type LegacyFlags = Pick<
  EmployeePayrollProfile,
  'studentLoanPlan1' | 'studentLoanPlan2' | 'studentLoanPlan4' | 'studentLoanPlan5' | 'postgraduateLoan'
>

/**
 * Gate C14: record HMRC student / postgraduate loan notices (SL1, SL2, PGL1, PGL2) and show those
 * recorded, through the C13 endpoints. Recording a notice changes no profile field and no closed
 * pay: it applies to tax and NI calculated for paydays from its effective payday.
 */
export function LoanNoticesSection({
  employeeId,
  profile,
  canEdit,
}: {
  employeeId: string
  profile: Partial<LegacyFlags> | null | undefined
  canEdit: boolean
}) {
  const { data: notices = [], isLoading } = useLoanNotices(employeeId)
  const record = useRecordLoanNotice(employeeId)
  const [noticeType, setNoticeType] = React.useState<LoanNoticeType>('SL1')
  const [plan, setPlan] = React.useState<Plan | ''>('')
  const [hmrcReference, setHmrcReference] = React.useState('')
  const [noticeDate, setNoticeDate] = React.useState('')
  const [receivedOn, setReceivedOn] = React.useState('')
  const [effectivePayday, setEffectivePayday] = React.useState('')
  const [confirmed, setConfirmed] = React.useState(false)

  const legacy = [
    profile?.studentLoanPlan1 ? 'Plan 1' : null,
    profile?.studentLoanPlan2 ? 'Plan 2' : null,
    profile?.studentLoanPlan4 ? 'Plan 4' : null,
    profile?.studentLoanPlan5 ? 'Plan 5' : null,
    profile?.postgraduateLoan ? 'postgraduate loan' : null,
  ].filter(Boolean)
  const missing = [
    noticeType === 'SL1' && !plan ? 'the student loan plan' : null,
    !noticeDate ? 'the date on the notice' : null,
    !receivedOn ? 'the date received' : null,
    !effectivePayday ? 'the effective payday' : null,
    !confirmed ? 'your confirmation of the effective payday' : null,
  ].filter(Boolean)
  const error = record.error instanceof Error ? record.error.message : null
  const history = [...notices].sort(
    (a, b) => b.effectivePayday.localeCompare(a.effectivePayday) || b.createdAt.localeCompare(a.createdAt),
  )

  const onSubmit = async () => {
    try {
      await record.mutateAsync({
        noticeType,
        ...(noticeType === 'SL1' && plan ? { studentLoanPlan: plan } : {}),
        ...(hmrcReference.trim() ? { hmrcReference: hmrcReference.trim() } : {}),
        noticeDate,
        receivedOn,
        effectivePayday,
      })
      setPlan('')
      setHmrcReference('')
      setNoticeDate('')
      setReceivedOn('')
      setEffectivePayday('')
      setConfirmed(false)
    } catch {
      // Shown below from the mutation's error.
    }
  }

  return (
    <section className="space-y-3 rounded-md border border-border p-3" data-testid="loan-notices">
      <h3 className="text-sm font-medium">Student &amp; Postgraduate Loan Notices</h3>
      {legacy.length ? (
        <p className="text-xs text-amber-700 dark:text-amber-300" data-testid="loan-notices-legacy">
          This profile&apos;s loan settings ({legacy.join(', ')}) are not verified HMRC notices: check where they came from
          (starter checklist, P45 or HMRC). Until a notice is in force, payroll deducts using these settings.
        </p>
      ) : null}

      <div>
        <p className="text-xs font-medium text-muted-foreground">Recorded notices (most recent first)</p>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : history.length ? (
          <table className="mt-1 w-full text-left text-xs" data-testid="loan-notice-history">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-2 font-medium">Type</th>
                <th className="py-1 pr-2 font-medium">Plan</th>
                <th className="py-1 pr-2 font-medium">Reference</th>
                <th className="py-1 pr-2 font-medium">Notice date</th>
                <th className="py-1 pr-2 font-medium">Received</th>
                <th className="py-1 pr-2 font-medium">Effective payday</th>
              </tr>
            </thead>
            <tbody>
              {history.map((n: EmployeeLoanNotice) => (
                <tr key={n.id} className="border-t border-border/70">
                  <td className="py-1 pr-2">{n.noticeType}</td>
                  <td className="py-1 pr-2">{n.studentLoanPlan ? `Plan ${n.studentLoanPlan}` : '—'}</td>
                  <td className="py-1 pr-2">{n.hmrcReference ?? '—'}</td>
                  <td className="py-1 pr-2">{n.noticeDate}</td>
                  <td className="py-1 pr-2">{n.receivedOn}</td>
                  <td className="py-1 pr-2">{n.effectivePayday}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-muted-foreground">No notice recorded.</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Recorded notices cannot be edited or deleted here. An incorrect notice needs a controlled correction, not a
          change made directly in the database.
        </p>
      </div>

      {canEdit ? (
        <div className="space-y-2" data-testid="loan-notice-form">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Notice type</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={noticeType}
                onChange={(e) => setNoticeType(e.target.value as LoanNoticeType)}
                aria-label="Notice type"
              >
                {(Object.keys(NOTICE_LABELS) as LoanNoticeType[]).map((t) => (
                  <option key={t} value={t}>
                    {NOTICE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            {noticeType === 'SL1' ? (
              <label className="block space-y-1 text-sm">
                <span>Student loan plan</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as Plan | '')}
                  aria-label="Student loan plan"
                >
                  <option value="">Choose the plan on the notice</option>
                  <option value="1">Plan 1</option>
                  <option value="2">Plan 2</option>
                  <option value="4">Plan 4</option>
                  <option value="5">Plan 5</option>
                </select>
              </label>
            ) : null}
            <label className="block space-y-1 text-sm">
              <span>HMRC reference (if given)</span>
              <Input value={hmrcReference} onChange={(e) => setHmrcReference(e.target.value)} aria-label="HMRC reference" />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Date on the notice</span>
              <Input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} aria-label="Date on the notice" />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Date received</span>
              <Input type="date" value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} aria-label="Date received" />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Effective payroll payday</span>
              <Input
                type="date"
                value={effectivePayday}
                onChange={(e) => setEffectivePayday(e.target.value)}
                aria-label="Effective payroll payday"
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            The effective payday is the first payday on which the notice can practically be operated, on or after both the
            date on the notice and the day it was received. It is not worked out for you. Deductions are not backdated.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>I confirm this is the first payday on which this notice can be operated</span>
          </label>
          {missing.length ? <p className="text-xs text-muted-foreground">Still needed: {missing.join(', ')}.</p> : null}
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Recording a notice does not recalculate any pay and does not report anything to HMRC. It applies to tax and NI
            calculated for paydays from the effective payday; closed runs are not changed.
          </p>
          <Button size="sm" variant="outline" disabled={record.isPending || missing.length > 0} onClick={() => void onSubmit()}>
            Record notice
          </Button>
        </div>
      ) : null}
    </section>
  )
}
