import * as React from 'react'
import { FilePenLine } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { PayrollStatusBadge } from '@/features/payroll/components/PayrollStatusBadge'
import {
  useApproveEmployeePayAgreement,
  useCreateEmployeePayAgreement,
  useEmployeePayAgreements,
  useEndEmployeePayAgreement,
} from '@/features/payroll/hooks/usePayroll'
import type {
  EmployeePayAgreement,
  EmployeePayAgreementBasis,
  GuaranteeLeaveTreatment,
  GuaranteeQualifyingTime,
  SalaryCoverage,
  SalaryEntryPeriod,
  SalaryProrationMethod,
} from '@/features/payroll/types/payroll.types'

const gbp = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)

const BASIS_LABELS: Record<EmployeePayAgreementBasis, string> = {
  HOURLY_CARE: 'Hourly care',
  SALARIED: 'Salaried',
  HYBRID: 'Hybrid (salary and hourly work)',
}
const ENTRY_LABELS: Record<SalaryEntryPeriod, string> = { ANNUAL: 'a year', MONTHLY: 'a month', WEEKLY: 'a week' }
export const PRORATION_LABELS: Record<SalaryProrationMethod, string> = {
  EQUAL_PERIODS_CALENDAR_DAYS: 'Equal pay periods; a part period by calendar days',
  EQUAL_PERIODS_WORKING_DAYS: 'Equal pay periods; a part period by Monday to Friday days',
  CALENDAR_DAYS_365_25: 'Calendar days of a 365.25-day year (the amount varies with the month)',
}
export const COVERAGE_LABELS: Record<SalaryCoverage, string> = {
  ALL_VISIT_WORK: 'All visit work — visit wages are not paid on top',
  CONTRACTED_HOURS: 'Visit work up to the contracted weekly hours — hours beyond them are paid',
  NO_VISIT_WORK: 'Other duties only — visit work is paid as well',
}
export const GUARANTEE_QUALIFYING_LABELS: Record<GuaranteeQualifyingTime, string> = {
  VISITS: 'Visit time',
  VISITS_AND_TRAVEL: 'Visit time, and paid travel and waiting time',
}
export const GUARANTEE_LEAVE_LABELS: Record<GuaranteeLeaveTreatment, string> = {
  COUNT_PAID_LEAVE_HOURS: 'Paid leave hours count towards the guarantee',
  REDUCE_FOR_ABSENCE_DAYS: 'Each day of absence reduces the guarantee',
}
const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm'
const today = () => new Date().toISOString().slice(0, 10)

function describe(a: EmployeePayAgreement): string {
  const parts = [BASIS_LABELS[a.basis] ?? a.basis]
  if (a.annualSalary) {
    const entered =
      a.salaryEntryPeriod && a.salaryEntryPeriod !== 'ANNUAL' && a.salaryEntryAmount
        ? ` (entered as ${gbp(a.salaryEntryAmount)} ${ENTRY_LABELS[a.salaryEntryPeriod]})`
        : ''
    parts.push(`${gbp(a.annualSalary)} a year${entered}`)
  }
  if (a.contractedHours) parts.push(`${a.contractedHours} contracted hours a week`)
  if (a.guaranteedWeeklyHours) {
    parts.push(
      `${a.guaranteedWeeklyHours} guaranteed hours a week (${a.guaranteeTopUp === 'PAY_SHORTFALL' ? 'shortfall paid' : 'recorded only'})`,
    )
  }
  return parts.join(' · ')
}

/**
 * Pay agreements of one employee (WM-02 / WM-03): the history, and a form for the next one.
 * A salary states how a part period is paid and what work it already pays for; neither is assumed.
 * An agreement that carries or replaces a salary takes effect only when a second person approves it.
 */
export function PayAgreementsPanel({
  employeeId,
  scheduleId,
  defaultPayCardId,
}: {
  employeeId: string
  scheduleId: string | null
  defaultPayCardId: string | null
}) {
  const canManage = useAuthStore(s => s.can('payroll.employees.manage'))
  const canApprove = useAuthStore(s => s.can('payroll.pay_agreements.approve'))
  const query = useEmployeePayAgreements(employeeId)
  const create = useCreateEmployeePayAgreement(employeeId)
  const approve = useApproveEmployeePayAgreement(employeeId)
  const end = useEndEmployeePayAgreement(employeeId)

  const [basis, setBasis] = React.useState<EmployeePayAgreementBasis>('HOURLY_CARE')
  const [effectiveFrom, setEffectiveFrom] = React.useState(today())
  const [entryPeriod, setEntryPeriod] = React.useState<SalaryEntryPeriod>('ANNUAL')
  const [entryAmount, setEntryAmount] = React.useState('')
  const [contractedHours, setContractedHours] = React.useState('')
  const [proration, setProration] = React.useState<SalaryProrationMethod | ''>('')
  const [coverage, setCoverage] = React.useState<SalaryCoverage | ''>('')
  const [guaranteedHours, setGuaranteedHours] = React.useState('')
  const [payShortfall, setPayShortfall] = React.useState(false)
  const [qualifying, setQualifying] = React.useState<GuaranteeQualifyingTime | ''>('')
  const [leaveTreatment, setLeaveTreatment] = React.useState<GuaranteeLeaveTreatment | ''>('')
  const [endDates, setEndDates] = React.useState<Record<string, string>>({})

  const agreements = query.data ?? []
  const salaried = basis !== 'HOURLY_CARE'
  const amount = Number(entryAmount)
  const hours = Number(contractedHours)
  const guaranteed = Number(guaranteedHours)
  const paidGuarantee = !salaried && payShortfall
  const salaryInEffect = agreements.some(
    a => a.status !== 'DRAFT' && ((a.annualSalary ?? 0) > 0 || a.guaranteeTopUp === 'PAY_SHORTFALL'),
  )
  const needsApproval = salaried || paidGuarantee || salaryInEffect
  const valid =
    !!effectiveFrom &&
    (!salaried ||
      (entryAmount.trim() !== '' &&
        amount > 0 &&
        proration !== '' &&
        coverage !== '' &&
        (coverage !== 'CONTRACTED_HOURS' || hours > 0))) &&
    (!paidGuarantee || (guaranteed > 0 && qualifying !== ''))

  const onAdd = () => {
    create.mutate(
      {
        basis,
        effectiveFrom,
        scheduleId,
        payCardId: defaultPayCardId,
        status: 'ACTIVE',
        ...(salaried
          ? {
              salaryEntryPeriod: entryPeriod,
              salaryEntryAmount: amount,
              contractedHours: contractedHours.trim() === '' ? null : hours,
              salaryProrationMethod: proration as SalaryProrationMethod,
              salaryCoverage: coverage as SalaryCoverage,
            }
          : guaranteedHours.trim() !== '' && guaranteed > 0
            ? {
                guaranteedWeeklyHours: guaranteed,
                ...(payShortfall
                  ? {
                      guaranteeTopUp: 'PAY_SHORTFALL' as const,
                      guaranteeQualifyingTime: qualifying as GuaranteeQualifyingTime,
                      guaranteeLeaveTreatment: leaveTreatment === '' ? null : leaveTreatment,
                    }
                  : {}),
              }
            : {}),
      },
      {
        onSuccess: () => {
          setEntryAmount('')
          setContractedHours('')
          setGuaranteedHours('')
          setPayShortfall(false)
        },
      },
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3" data-testid="pay-agreements-panel">
      <h4 className="inline-flex items-center gap-2 text-sm font-medium">
        <FilePenLine className="h-4 w-4 text-muted-foreground" aria-hidden />
        Pay agreements
      </h4>

      {agreements.length ? (
        <ul className="divide-y divide-border rounded-md border border-border" data-testid="pay-agreement-history">
          {agreements.map(a => (
            <li key={a.id} className="space-y-1 px-3 py-2 text-xs" data-testid="pay-agreement-item">
              <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                <span>{describe(a)}</span>
                <PayrollStatusBadge status={a.status} />
              </div>
              <p className="text-muted-foreground">
                From {a.effectiveFrom}
                {a.effectiveTo ? ` to ${a.effectiveTo}` : ''}
                {a.createdByName ? ` · entered by ${a.createdByName}` : ''}
                {a.approvedByName ? ` · approved by ${a.approvedByName}` : ''}
              </p>
              {a.annualSalary ? (
                <p className="text-muted-foreground">
                  Part period: {a.salaryProrationMethod ? PRORATION_LABELS[a.salaryProrationMethod] : PRORATION_LABELS.CALENDAR_DAYS_365_25}
                  {' · '}Salary pays for: {a.salaryCoverage ? COVERAGE_LABELS[a.salaryCoverage] : 'not recorded'}
                </p>
              ) : null}
              {a.guaranteeTopUp === 'PAY_SHORTFALL' ? (
                <p className="text-muted-foreground">
                  Counts towards the guarantee:{' '}
                  {a.guaranteeQualifyingTime ? GUARANTEE_QUALIFYING_LABELS[a.guaranteeQualifyingTime] : 'not recorded'}
                  {' · '}
                  {a.guaranteeLeaveTreatment
                    ? GUARANTEE_LEAVE_LABELS[a.guaranteeLeaveTreatment]
                    : 'A week with recorded absence is held for a person to decide'}
                </p>
              ) : null}
              {a.annualSalary && !a.salaryCoverage && a.status !== 'DRAFT' ? (
                <p className="text-amber-700 dark:text-amber-300" data-testid="pay-agreement-coverage-missing">
                  This agreement does not say what the salary pays for. The salary is paid and visit wages are held until a
                  new agreement records it.
                </p>
              ) : null}
              {a.status === 'DRAFT' && a.awaitingApproval ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-amber-700 dark:text-amber-300">
                    Not in effect: a second person must approve it.
                  </span>
                  {canApprove ? (
                    <Button size="sm" variant="outline" disabled={approve.isPending} onClick={() => approve.mutate(a.id)}>
                      Approve agreement
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {a.status === 'ACTIVE' && canManage ? (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="space-y-1">
                    <span className="text-muted-foreground">Last day it applies</span>
                    <Input
                      type="date"
                      className="h-8 w-40"
                      value={endDates[a.id] ?? ''}
                      onChange={e => setEndDates(prev => ({ ...prev, [a.id]: e.target.value }))}
                      aria-label={`Last day of the agreement from ${a.effectiveFrom}`}
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!endDates[a.id] || end.isPending}
                    onClick={() => end.mutate({ agreementId: a.id, effectiveTo: endDates[a.id] ?? '' })}
                  >
                    End agreement
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No pay agreement recorded.</p>
      )}

      {canManage ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">New pay agreement</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Basis</span>
              <select className={selectClass} value={basis} onChange={e => setBasis(e.target.value as EmployeePayAgreementBasis)}>
                <option value="HOURLY_CARE">Hourly care</option>
                <option value="SALARIED">Salaried</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Effective from</span>
              <Input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
            </label>
            {salaried ? (
              <>
                <label className="block space-y-1 text-sm">
                  <span>Salary</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={entryAmount}
                    onChange={e => setEntryAmount(e.target.value)}
                    aria-label="Salary amount"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Entered per</span>
                  <select
                    className={selectClass}
                    value={entryPeriod}
                    onChange={e => setEntryPeriod(e.target.value as SalaryEntryPeriod)}
                    aria-label="Salary entered per"
                  >
                    <option value="ANNUAL">Year</option>
                    <option value="MONTHLY">Month</option>
                    <option value="WEEKLY">Week</option>
                  </select>
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Contracted weekly hours</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.25"
                    value={contractedHours}
                    onChange={e => setContractedHours(e.target.value)}
                    aria-label="Contracted weekly hours"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>A part period is paid by</span>
                  <select
                    className={selectClass}
                    value={proration}
                    onChange={e => setProration(e.target.value as SalaryProrationMethod | '')}
                    aria-label="How a part period is paid"
                  >
                    <option value="">Choose…</option>
                    {(Object.keys(PRORATION_LABELS) as SalaryProrationMethod[]).map(key => (
                      <option key={key} value={key}>
                        {PRORATION_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1 text-sm sm:col-span-2">
                  <span>The salary already pays for</span>
                  <select
                    className={selectClass}
                    value={coverage}
                    onChange={e => setCoverage(e.target.value as SalaryCoverage | '')}
                    aria-label="What the salary pays for"
                  >
                    <option value="">Choose…</option>
                    {(Object.keys(COVERAGE_LABELS) as SalaryCoverage[]).map(key => (
                      <option key={key} value={key}>
                        {COVERAGE_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <>
                <label className="block space-y-1 text-sm">
                  <span>Guaranteed weekly hours (optional)</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.25"
                    value={guaranteedHours}
                    onChange={e => setGuaranteedHours(e.target.value)}
                    aria-label="Guaranteed weekly hours"
                  />
                </label>
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={payShortfall}
                    onChange={e => setPayShortfall(e.target.checked)}
                    aria-label="Pay the shortfall as a top-up"
                  />
                  <span>Hours short of the guarantee are paid as a top-up</span>
                </label>
                {payShortfall ? (
                  <>
                    <label className="block space-y-1 text-sm">
                      <span>Counts towards the guarantee</span>
                      <select
                        className={selectClass}
                        value={qualifying}
                        onChange={e => setQualifying(e.target.value as GuaranteeQualifyingTime | '')}
                        aria-label="What counts towards the guarantee"
                      >
                        <option value="">Choose…</option>
                        {(Object.keys(GUARANTEE_QUALIFYING_LABELS) as GuaranteeQualifyingTime[]).map(key => (
                          <option key={key} value={key}>
                            {GUARANTEE_QUALIFYING_LABELS[key]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span>A week with absence</span>
                      <select
                        className={selectClass}
                        value={leaveTreatment}
                        onChange={e => setLeaveTreatment(e.target.value as GuaranteeLeaveTreatment | '')}
                        aria-label="How absence affects the guarantee"
                      >
                        <option value="">Held for a person to decide</option>
                        {(Object.keys(GUARANTEE_LEAVE_LABELS) as GuaranteeLeaveTreatment[]).map(key => (
                          <option key={key} value={key}>
                            {GUARANTEE_LEAVE_LABELS[key]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {salaried
              ? 'These are the terms of this employee’s contract; none of them is assumed. Work the salary already pays for is not paid again as visit wages. Approved pay items and expenses are always paid as well.'
              : 'An agreement applies from its start date and replaces the one before it; earlier agreements stay as history.'}{' '}
            {needsApproval ? 'It takes effect when a second person approves it.' : ''}
          </p>
          <Button variant="outline" disabled={!valid || create.isPending} onClick={onAdd}>
            {needsApproval ? 'Save for approval' : 'Add agreement'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
