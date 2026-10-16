import * as React from 'react'

import { PayrollFieldLabel } from '@/features/payroll/components/PayrollFieldLabel'
import { useUpsertEmployeePayrollProfile } from '@/features/payroll/hooks/usePayroll'
import type { EmployeePayrollProfile } from '@/features/payroll/types/payroll.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { TooltipProvider } from '@/shared/ui/tooltip'

type PensionFields = Pick<
  EmployeePayrollProfile,
  | 'pensionStatus'
  | 'pensionEnrolledFrom'
  | 'pensionSchemeRef'
  | 'pensionPolicyRef'
  | 'pensionContributionBasis'
  | 'pensionTaxRelief'
  | 'pensionEmployeeRatePercent'
  | 'pensionEmployerRatePercent'
>
type Choice = '' | 'ENROLLED' | 'NOT_ENROLLED'

/** The saved pension status, in words (Gate C17). */
export function pensionStatusLabel(profile: Partial<PensionFields> | null | undefined): string {
  if (profile?.pensionStatus === 'ENROLLED') return 'Enrolled'
  if (profile?.pensionStatus === 'NOT_ENROLLED') return 'Not enrolled (employer-recorded)'
  if (profile?.pensionStatus === 'OPTED_OUT') return 'Opted out (valid opt-out recorded)'
  if (profile?.pensionStatus === 'CEASED') return 'Ceased active membership'
  return 'Not yet recorded'
}

const rate = (v: string) => (v.trim() === '' ? NaN : Number(v))

/**
 * Gate C17: the C16 workplace pension settings (defined contribution, qualifying earnings, relief
 * at source) on the payroll profile, in simple steps: in the pension or not, then (if in) the date,
 * the scheme and the two rates, with a live total. Qualifying earnings and relief at source are the
 * only supported type, so they are confirmed with the rates instead of chosen from one-option
 * lists. Saves only these fields through the existing audited profile save; no rate, date or
 * reference is filled in for the person.
 */
export function WorkplacePensionSection({
  employeeId,
  profile,
  canEdit,
}: {
  employeeId: string
  profile: Partial<PensionFields> | null | undefined
  canEdit: boolean
}) {
  const save = useUpsertEmployeePayrollProfile(employeeId)
  const saved = (profile?.pensionStatus ?? '') as Choice
  const [choice, setChoice] = React.useState<Choice>(saved)
  const [enrolledFrom, setEnrolledFrom] = React.useState(profile?.pensionEnrolledFrom ?? '')
  const [schemeRef, setSchemeRef] = React.useState(profile?.pensionSchemeRef ?? '')
  const [policyRef, setPolicyRef] = React.useState(profile?.pensionPolicyRef ?? '')
  const [employeeRate, setEmployeeRate] = React.useState(profile?.pensionEmployeeRatePercent?.toString() ?? '')
  const [employerRate, setEmployerRate] = React.useState(profile?.pensionEmployerRatePercent?.toString() ?? '')
  const [confirmed, setConfirmed] = React.useState(false)

  React.useEffect(() => {
    setChoice((profile?.pensionStatus ?? '') as Choice)
    setEnrolledFrom(profile?.pensionEnrolledFrom ?? '')
    setSchemeRef(profile?.pensionSchemeRef ?? '')
    setPolicyRef(profile?.pensionPolicyRef ?? '')
    setEmployeeRate(profile?.pensionEmployeeRatePercent?.toString() ?? '')
    setEmployerRate(profile?.pensionEmployerRatePercent?.toString() ?? '')
    setConfirmed(false)
  }, [profile])

  const ee = rate(employeeRate)
  const er = rate(employerRate)
  const ratesValid = Number.isFinite(ee) && Number.isFinite(er) && ee >= 0 && ee <= 100 && er >= 0 && er <= 100
  const problems =
    choice === 'ENROLLED'
      ? [
          !enrolledFrom ? 'the date they joined' : null,
          !schemeRef.trim() ? 'the pension scheme reference' : null,
          !policyRef.trim() ? 'the employer policy reference' : null,
          !Number.isFinite(ee) || ee < 0 || ee > 100 ? 'a valid carer %' : null,
          !Number.isFinite(er) || er < 0 || er > 100 ? 'a valid employer %' : null,
          Number.isFinite(er) && er < 3 ? 'an employer contribution of at least 3%' : null,
          Number.isFinite(ee) && Number.isFinite(er) && ee + er < 8 ? 'a total contribution of at least 8%' : null,
          !confirmed ? 'your confirmation that these match the employer’s scheme rules' : null,
        ].filter(Boolean)
      : choice === 'NOT_ENROLLED'
        ? [!confirmed ? 'your confirmation as an authorised payroll manager' : null].filter(Boolean)
        : ['yes or no']
  const error = save.error instanceof Error ? save.error.message : null

  const onSave = () => {
    const body =
      choice === 'ENROLLED'
        ? {
            pensionStatus: 'ENROLLED' as const,
            pensionEnrolledFrom: enrolledFrom,
            pensionSchemeRef: schemeRef.trim(),
            pensionPolicyRef: policyRef.trim(),
            pensionContributionBasis: 'QUALIFYING_EARNINGS' as const,
            pensionTaxRelief: 'RAS' as const,
            pensionEmployeeRatePercent: ee,
            pensionEmployerRatePercent: er,
          }
        : { pensionStatus: 'NOT_ENROLLED' as const }
    void save.mutateAsync(body).catch(() => undefined)
  }
  const pick = (next: Choice) => {
    setChoice(next)
    setConfirmed(false)
  }

  const now =
    profile?.pensionStatus === 'ENROLLED'
      ? `In the pension since ${profile.pensionEnrolledFrom ?? '—'} · carer ${profile.pensionEmployeeRatePercent ?? '—'}% + employer ${profile.pensionEmployerRatePercent ?? '—'}% · scheme ${profile.pensionSchemeRef ?? '—'}`
      : pensionStatusLabel(profile)

  return (
    <section className="space-y-3 rounded-md border border-border p-3" data-testid="workplace-pension">
      <div>
        <h3 className="text-sm font-medium">Workplace pension</h3>
        <p className="text-xs text-muted-foreground" data-testid="workplace-pension-saved">
          Now: <span className="font-medium text-foreground">{now}</span>
        </p>
      </div>
      {!saved ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Tax and NI are not calculated for this person until their pension status is recorded.
        </p>
      ) : null}
      {canEdit ? (
        <TooltipProvider delayDuration={200}>
          <div className="space-y-3">
            <fieldset className="space-y-1">
              <legend className="text-sm">Is this carer in the workplace pension?</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name={`pension-${employeeId}`} checked={choice === 'ENROLLED'} onChange={() => pick('ENROLLED')} />
                  Yes, enrolled
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name={`pension-${employeeId}`} checked={choice === 'NOT_ENROLLED'} onChange={() => pick('NOT_ENROLLED')} />
                  No, not enrolled
                </label>
              </div>
            </fieldset>

            {choice === 'ENROLLED' ? (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="block space-y-1 text-sm">
                    <PayrollFieldLabel label="Joined on" info="The date their pension membership starts (the enrolment date). Contributions are taken from pay on or after it." className="font-normal" />
                    <Input type="date" value={enrolledFrom} onChange={(e) => setEnrolledFrom(e.target.value)} aria-label="Enrolment effective date" />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <PayrollFieldLabel label="Scheme reference" info="The pension provider's reference for your scheme (e.g. from NEST, The People's Pension or your provider's letter)." className="font-normal" />
                    <Input value={schemeRef} onChange={(e) => setSchemeRef(e.target.value)} aria-label="Pension scheme reference" />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <PayrollFieldLabel label="Policy reference" info="Your own document that sets the rates (e.g. the pension policy or contract version)." className="font-normal" />
                    <Input value={policyRef} onChange={(e) => setPolicyRef(e.target.value)} aria-label="Employer policy reference" />
                  </label>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="block space-y-1 text-sm">
                    <PayrollFieldLabel label="Carer pays %" info="The carer's gross contribution, as a % of qualifying earnings. Payroll takes 80% of it from pay; the scheme claims the 20% tax relief (relief at source)." className="font-normal" />
                    <Input type="number" step="0.01" value={employeeRate} onChange={(e) => setEmployeeRate(e.target.value)} aria-label="Employee gross contribution %" />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <PayrollFieldLabel label="Employer pays %" info="What the employer adds, as a % of qualifying earnings. At least 3% by law." className="font-normal" />
                    <Input type="number" step="0.01" value={employerRate} onChange={(e) => setEmployerRate(e.target.value)} aria-label="Employer contribution %" />
                  </label>
                  <div className="space-y-1 text-sm">
                    <span className="block">Total</span>
                    <p className="flex h-9 items-center font-medium" data-testid="workplace-pension-total">
                      {ratesValid ? `${Math.round((ee + er) * 100) / 100}%` : '—'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  At least 8% in total, at least 3% from the employer. Enter the rates from your scheme rules: nothing is filled
                  in for you.
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                  <span>
                    I confirm these settings match the employer&apos;s pension scheme rules (a defined contribution scheme on
                    qualifying earnings with relief at source; net pay and salary sacrifice are not supported)
                  </span>
                </label>
              </>
            ) : null}

            {choice === 'NOT_ENROLLED' ? (
              <div className="space-y-1">
                <p className="text-xs text-amber-700 dark:text-amber-300" data-testid="workplace-pension-not-enrolled">
                  Only for a carer who is not in the pension. This is not an automatic-enrolment eligibility assessment and
                  does not allow leaving out an eligible worker: the automatic enrolment section below still applies.
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                  <span>As an authorised payroll manager, I confirm this person is not enrolled</span>
                </label>
              </div>
            ) : null}

            {problems.length && choice ? <p className="text-xs text-muted-foreground">Still needed: {problems.join(', ')}.</p> : null}
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button size="sm" variant="outline" disabled={save.isPending || problems.length > 0} onClick={onSave}>
              Save pension settings
            </Button>
            <p className="text-xs text-muted-foreground">Saving does not recalculate any payroll.</p>
          </div>
        </TooltipProvider>
      ) : null}
    </section>
  )
}
