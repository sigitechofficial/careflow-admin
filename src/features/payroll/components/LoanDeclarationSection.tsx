import * as React from 'react'

import { useUpsertEmployeePayrollProfile } from '@/features/payroll/hooks/usePayroll'
import type { EmployeePayrollProfile } from '@/features/payroll/types/payroll.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Fields = Pick<
  EmployeePayrollProfile,
  | 'loanDeclarationStatus'
  | 'loanDeclarationSource'
  | 'loanDeclarationDate'
  | 'studentLoanPlan1'
  | 'studentLoanPlan2'
  | 'studentLoanPlan4'
  | 'studentLoanPlan5'
  | 'postgraduateLoan'
>

/**
 * Loan / pension completion (implemented, unverified): the employee's student loan declaration
 * from the starter checklist or P45, with its source and date. "Not yet verified" stays as it is
 * until someone records it; the loan plans themselves are the existing profile deduction settings,
 * and an HMRC SL1 / SL2 / PGL1 / PGL2 notice always takes precedence.
 */
export function LoanDeclarationSection({
  employeeId,
  profile,
  canEdit,
}: {
  employeeId: string
  profile: Partial<Fields> | null | undefined
  canEdit: boolean
}) {
  const save = useUpsertEmployeePayrollProfile(employeeId)
  const [status, setStatus] = React.useState(profile?.loanDeclarationStatus ?? '')
  const [source, setSource] = React.useState(profile?.loanDeclarationSource ?? '')
  const [date, setDate] = React.useState(profile?.loanDeclarationDate ?? '')
  React.useEffect(() => {
    setStatus(profile?.loanDeclarationStatus ?? '')
    setSource(profile?.loanDeclarationSource ?? '')
    setDate(profile?.loanDeclarationDate ?? '')
  }, [profile])

  const plans = [
    profile?.studentLoanPlan1 ? 'Plan 1' : null,
    profile?.studentLoanPlan2 ? 'Plan 2' : null,
    profile?.studentLoanPlan4 ? 'Plan 4' : null,
    profile?.studentLoanPlan5 ? 'Plan 5' : null,
    profile?.postgraduateLoan ? 'Postgraduate loan' : null,
  ].filter(Boolean)
  const saved =
    profile?.loanDeclarationStatus === 'LOAN_DECLARED'
      ? 'Loan declared'
      : profile?.loanDeclarationStatus === 'NO_LOAN_CONFIRMED'
        ? 'No loan confirmed'
        : 'Not yet verified'
  const missing = [!status ? 'the declaration' : null, !source ? 'its source' : null, !date ? 'its date' : null].filter(Boolean)
  const error = save.error instanceof Error ? save.error.message : null

  return (
    <section className="space-y-2 rounded-md border border-border p-3" data-testid="loan-declaration">
      <h3 className="text-sm font-medium">Student loan declaration (starter checklist / P45)</h3>
      <p className="text-xs text-muted-foreground">
        Saved: <span className="font-medium text-foreground">{saved}</span>
        {profile?.loanDeclarationSource ? ` · ${profile.loanDeclarationSource.replace(/_/g, ' ').toLowerCase()}` : ''}
        {profile?.loanDeclarationDate ? ` · ${profile.loanDeclarationDate}` : ''} · plans on the profile: {plans.length ? plans.join(', ') : 'none'}
      </p>
      <p className="text-xs text-muted-foreground">
        An HMRC SL1 / SL2 / PGL1 / PGL2 notice always takes precedence. No plan is chosen for you: a declared loan with no plan
        recorded stops the calculation; more than one declared plan uses the lowest-threshold plan until an SL1 arrives (HMRC).
      </p>
      {canEdit ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block space-y-1 text-sm">
            <span>Declaration</span>
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as never)} aria-label="Loan declaration">
              <option value="" disabled={Boolean(profile?.loanDeclarationStatus)}>Not yet verified</option>
              <option value="LOAN_DECLARED">Loan declared</option>
              <option value="NO_LOAN_CONFIRMED">No loan confirmed</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Source</span>
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={source} onChange={(e) => setSource(e.target.value as never)} aria-label="Loan declaration source">
              <option value="">Choose</option>
              <option value="STARTER_CHECKLIST">Starter checklist</option>
              <option value="P45">P45</option>
              <option value="OTHER_RECORD">Other record</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Date of the declaration</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Loan declaration date" />
          </label>
          {error ? (
            <p className="text-xs text-destructive sm:col-span-3" role="alert">
              {error}
            </p>
          ) : null}
          <div className="sm:col-span-3">
            <Button
              size="sm"
              variant="outline"
              disabled={save.isPending || missing.length > 0}
              onClick={() =>
                void save
                  .mutateAsync({
                    loanDeclarationStatus: status as 'LOAN_DECLARED' | 'NO_LOAN_CONFIRMED',
                    loanDeclarationSource: source as 'STARTER_CHECKLIST' | 'P45' | 'OTHER_RECORD',
                    loanDeclarationDate: date,
                  })
                  .catch(() => undefined)
              }
            >
              Save loan declaration
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
