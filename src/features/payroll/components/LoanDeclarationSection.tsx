import * as React from 'react'

import { electionsFromLegacyFlags, syncLoanFlagsFromElections } from '@/features/payroll/data/uk-payroll-2026-27.catalog'
import { PayrollFieldLabel } from '@/features/payroll/components/PayrollFieldLabel'
import { useUpsertEmployeePayrollProfile } from '@/features/payroll/hooks/usePayroll'
import type { EmployeePayrollProfile } from '@/features/payroll/types/payroll.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { TooltipProvider } from '@/shared/ui/tooltip'

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
  | 'pensionOptedIn'
  | 'deductionElections'
>

// Who each plan is for, and its 2026-27 repayment threshold (GOV.UK; matches the payroll thresholds).
const PLANS = [
  {
    code: 'SL_PLAN_1',
    label: 'Plan 1',
    info: 'Course in England or Wales started before 1 September 2012, or a Northern Ireland student loan. 9% of pay above £26,900 a year (£2,241.66 a month).',
  },
  {
    code: 'SL_PLAN_2',
    label: 'Plan 2',
    info: 'Course in England or Wales started on or after 1 September 2012 (in England, before 1 August 2023). 9% of pay above £29,385 a year (£2,448.75 a month).',
  },
  {
    code: 'SL_PLAN_4',
    label: 'Plan 4 (Scotland)',
    info: 'Scottish student loan (SAAS). 9% of pay above £33,795 a year (£2,816.25 a month).',
  },
  {
    code: 'SL_PLAN_5',
    label: 'Plan 5',
    info: 'Course in England started on or after 1 August 2023. 9% of pay above £25,000 a year (£2,083.33 a month).',
  },
  {
    code: 'POSTGRAD_LOAN',
    label: 'Postgraduate loan',
    info: "Master's or doctoral loan (England or Wales). Can be on top of a student loan plan. 6% of pay above £21,000 a year (£1,750 a month).",
  },
] as const
const LOAN_CODES: ReadonlySet<string> = new Set(PLANS.map((p) => p.code))
const SOURCE_LABELS = { STARTER_CHECKLIST: 'Starter checklist', P45: 'P45', OTHER_RECORD: 'Other record' } as const

const electionsOf = (profile: Partial<Fields> | null | undefined) =>
  electionsFromLegacyFlags({
    studentLoanPlan1: profile?.studentLoanPlan1,
    studentLoanPlan2: profile?.studentLoanPlan2,
    studentLoanPlan4: profile?.studentLoanPlan4,
    studentLoanPlan5: profile?.studentLoanPlan5,
    postgraduateLoan: profile?.postgraduateLoan,
    pensionOptedIn: profile?.pensionOptedIn,
    deductionElections: profile?.deductionElections,
  })

/**
 * The employee's student loan, in one step: has a loan or not, which plan(s) (from the starter
 * checklist or P45), where that came from and when, with one Save. The plans are the existing
 * profile deduction settings (the Tax & NI deductions panel is hidden), saved with the
 * declaration; other deduction settings are kept. An HMRC SL1 / SL2 / PGL1 / PGL2 notice, recorded
 * below, always takes precedence. Loan / pension completion: implemented, unverified.
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
  const savedPlans = React.useMemo(() => electionsOf(profile).filter((c) => LOAN_CODES.has(c)), [profile])
  const [status, setStatus] = React.useState(profile?.loanDeclarationStatus ?? '')
  const [plans, setPlans] = React.useState<string[]>(savedPlans)
  const [source, setSource] = React.useState(profile?.loanDeclarationSource ?? '')
  const [date, setDate] = React.useState(profile?.loanDeclarationDate ?? '')
  React.useEffect(() => {
    setStatus(profile?.loanDeclarationStatus ?? '')
    setPlans(savedPlans)
    setSource(profile?.loanDeclarationSource ?? '')
    setDate(profile?.loanDeclarationDate ?? '')
  }, [profile, savedPlans])

  const planLabels = PLANS.filter((p) => savedPlans.includes(p.code)).map((p) => p.label)
  const where = [
    profile?.loanDeclarationSource ? `from ${SOURCE_LABELS[profile.loanDeclarationSource]}` : null,
    profile?.loanDeclarationDate ?? null,
  ]
    .filter(Boolean)
    .join(', ')
  const now =
    profile?.loanDeclarationStatus === 'LOAN_DECLARED'
      ? `Has a student loan — ${planLabels.length ? planLabels.join(', ') : 'no plan chosen'}`
      : profile?.loanDeclarationStatus === 'NO_LOAN_CONFIRMED'
        ? 'No student loan'
        : planLabels.length
          ? `Not checked yet (plans set: ${planLabels.join(', ')})`
          : 'Not checked yet'
  const missing = [
    !status ? 'yes or no' : null,
    status === 'LOAN_DECLARED' && !plans.length ? 'the plan' : null,
    status && !source ? 'where you found it' : null,
    status && !date ? 'the date' : null,
  ].filter(Boolean)
  const error = save.error instanceof Error ? save.error.message : null

  const togglePlan = (code: string, on: boolean) =>
    setPlans((current) => (on ? [...current.filter((c) => c !== code), code] : current.filter((c) => c !== code)))

  const onSave = () => {
    // Keep every other deduction setting (e.g. pension); "No" clears the loan plans.
    const elections = [
      ...electionsOf(profile).filter((c) => !LOAN_CODES.has(c)),
      ...(status === 'LOAN_DECLARED' ? PLANS.map((p) => p.code).filter((c) => plans.includes(c)) : []),
    ]
    const flags = syncLoanFlagsFromElections(elections)
    void save
      .mutateAsync({
        loanDeclarationStatus: status as 'LOAN_DECLARED' | 'NO_LOAN_CONFIRMED',
        loanDeclarationSource: source as 'STARTER_CHECKLIST' | 'P45' | 'OTHER_RECORD',
        loanDeclarationDate: date,
        deductionElections: elections,
        studentLoanPlan1: flags.studentLoanPlan1,
        studentLoanPlan2: flags.studentLoanPlan2,
        studentLoanPlan4: flags.studentLoanPlan4,
        studentLoanPlan5: flags.studentLoanPlan5,
        postgraduateLoan: flags.postgraduateLoan,
      })
      .catch(() => undefined)
  }

  return (
    <section className="space-y-3 rounded-md border border-border p-3" data-testid="loan-declaration">
      <div>
        <h3 className="text-sm font-medium">Student loan</h3>
        <p className="text-xs text-muted-foreground" data-testid="loan-declaration-now">
          Now: <span className="font-medium text-foreground">{now}</span>
          {where ? ` · ${where}` : ''}
        </p>
      </div>

      {canEdit ? (
        <>
          <fieldset className="space-y-1">
            <legend className="text-sm">Does this carer have a student loan?</legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name={`loan-${employeeId}`} checked={status === 'LOAN_DECLARED'} onChange={() => setStatus('LOAN_DECLARED')} />
                Yes, has a loan
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name={`loan-${employeeId}`} checked={status === 'NO_LOAN_CONFIRMED'} onChange={() => setStatus('NO_LOAN_CONFIRMED')} />
                No loan
              </label>
            </div>
          </fieldset>

          {status === 'LOAN_DECLARED' ? (
            <TooltipProvider delayDuration={200}>
              <fieldset className="space-y-1">
                <legend className="text-sm">Which plan? (written on the P45 or starter checklist)</legend>
                <div className="flex flex-wrap gap-4 text-sm">
                  {PLANS.map((p) => (
                    <label key={p.code} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={plans.includes(p.code)}
                        onChange={(e) => togglePlan(p.code, e.target.checked)}
                        aria-label={p.label}
                      />
                      <PayrollFieldLabel label={p.label} info={p.info} className="font-normal" />
                    </label>
                  ))}
                </div>
              </fieldset>
            </TooltipProvider>
          ) : null}
          {status === 'NO_LOAN_CONFIRMED' && savedPlans.length ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">Saving “No loan” removes the plan(s) set for this carer.</p>
          ) : null}

          {status ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>Where did you find this?</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={source}
                  onChange={(e) => setSource(e.target.value as never)}
                  aria-label="Loan declaration source"
                >
                  <option value="">Choose</option>
                  <option value="STARTER_CHECKLIST">Starter checklist</option>
                  <option value="P45">P45</option>
                  <option value="OTHER_RECORD">Other record</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span>Date on that document</span>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Loan declaration date" />
              </label>
            </div>
          ) : null}

          {missing.length ? <p className="text-xs text-muted-foreground">Still needed: {missing.join(', ')}.</p> : null}
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button size="sm" variant="outline" disabled={save.isPending || missing.length > 0} onClick={onSave}>
            Save student loan
          </Button>
        </>
      ) : null}
      <p className="text-xs text-muted-foreground">If HMRC sends a loan letter (SL1, SL2, PGL1, PGL2), record it below: the letter always wins.</p>
    </section>
  )
}
