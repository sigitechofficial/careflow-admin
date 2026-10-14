import * as React from 'react'

import { useUpsertEmployeePayrollProfile } from '@/features/payroll/hooks/usePayroll'
import type { EmployeePayrollProfile } from '@/features/payroll/types/payroll.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

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
  return 'Not yet recorded'
}

const rate = (v: string) => (v.trim() === '' ? NaN : Number(v))

/**
 * Gate C17: the C16 workplace pension settings (defined contribution, qualifying earnings, relief
 * at source) on the payroll profile. Saves only these fields through the existing audited profile
 * save; nothing is filled in or classified for the person.
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
  const [basis, setBasis] = React.useState(profile?.pensionContributionBasis ?? '')
  const [relief, setRelief] = React.useState(profile?.pensionTaxRelief === 'RAS' ? 'RAS' : '')
  const [employeeRate, setEmployeeRate] = React.useState(profile?.pensionEmployeeRatePercent?.toString() ?? '')
  const [employerRate, setEmployerRate] = React.useState(profile?.pensionEmployerRatePercent?.toString() ?? '')
  const [confirmed, setConfirmed] = React.useState(false)

  React.useEffect(() => {
    setChoice((profile?.pensionStatus ?? '') as Choice)
    setEnrolledFrom(profile?.pensionEnrolledFrom ?? '')
    setSchemeRef(profile?.pensionSchemeRef ?? '')
    setPolicyRef(profile?.pensionPolicyRef ?? '')
    setBasis(profile?.pensionContributionBasis ?? '')
    setRelief(profile?.pensionTaxRelief === 'RAS' ? 'RAS' : '')
    setEmployeeRate(profile?.pensionEmployeeRatePercent?.toString() ?? '')
    setEmployerRate(profile?.pensionEmployerRatePercent?.toString() ?? '')
    setConfirmed(false)
  }, [profile])

  const ee = rate(employeeRate)
  const er = rate(employerRate)
  const problems =
    choice === 'ENROLLED'
      ? [
          !enrolledFrom ? 'the enrolment effective date' : null,
          !schemeRef.trim() ? 'the pension scheme reference' : null,
          !policyRef.trim() ? 'the employer policy reference' : null,
          basis !== 'QUALIFYING_EARNINGS' ? 'the contribution basis' : null,
          relief !== 'RAS' ? 'the tax relief method' : null,
          !Number.isFinite(ee) || ee < 0 || ee > 100 ? 'a valid employee gross contribution %' : null,
          !Number.isFinite(er) || er < 0 || er > 100 ? 'a valid employer contribution %' : null,
          Number.isFinite(er) && er < 3 ? 'an employer contribution of at least 3%' : null,
          Number.isFinite(ee) && Number.isFinite(er) && ee + er < 8 ? 'a total contribution of at least 8%' : null,
          !confirmed ? 'your confirmation that these match the employer’s scheme rules' : null,
        ].filter(Boolean)
      : choice === 'NOT_ENROLLED'
        ? [!confirmed ? 'your confirmation as an authorised payroll manager' : null].filter(Boolean)
        : ['a pension status']
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

  return (
    <section className="space-y-2 rounded-md border border-border p-3" data-testid="workplace-pension">
      <h3 className="text-sm font-medium">Workplace Pension</h3>
      <p className="text-xs text-muted-foreground" data-testid="workplace-pension-saved">
        Saved: <span className="font-medium text-foreground">{pensionStatusLabel(profile)}</span>
        {profile?.pensionStatus === 'ENROLLED'
          ? ` · from ${profile.pensionEnrolledFrom ?? '—'} · scheme ${profile.pensionSchemeRef ?? '—'} · policy ${profile.pensionPolicyRef ?? '—'} · ${profile.pensionContributionBasis ?? '—'} · ${profile.pensionTaxRelief ?? '—'} · employee ${profile.pensionEmployeeRatePercent ?? '—'}% / employer ${profile.pensionEmployerRatePercent ?? '—'}%`
          : ''}
      </p>
      {!saved ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Tax and NI are not calculated for this person until their pension status is recorded.
        </p>
      ) : null}
      {canEdit ? (
        <div className="space-y-2">
          <label className="block space-y-1 text-sm">
            <span>Pension status</span>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm sm:max-w-xs"
              value={choice}
              onChange={(e) => {
                setChoice(e.target.value as Choice)
                setConfirmed(false)
              }}
              aria-label="Pension status"
            >
              <option value="" disabled={Boolean(saved)}>
                Not yet recorded
              </option>
              <option value="ENROLLED">ENROLLED</option>
              <option value="NOT_ENROLLED">NOT_ENROLLED</option>
            </select>
          </label>

          {choice === 'ENROLLED' ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>Enrolment effective date</span>
                <Input type="date" value={enrolledFrom} onChange={(e) => setEnrolledFrom(e.target.value)} aria-label="Enrolment effective date" />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Pension scheme reference</span>
                <Input value={schemeRef} onChange={(e) => setSchemeRef(e.target.value)} aria-label="Pension scheme reference" />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Employer policy reference</span>
                <Input value={policyRef} onChange={(e) => setPolicyRef(e.target.value)} aria-label="Employer policy reference" />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Contribution basis</span>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={basis} onChange={(e) => setBasis(e.target.value)} aria-label="Contribution basis">
                  <option value="">Choose</option>
                  <option value="QUALIFYING_EARNINGS">Qualifying earnings</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span>Tax relief method</span>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={relief} onChange={(e) => setRelief(e.target.value)} aria-label="Tax relief method">
                  <option value="">Choose</option>
                  <option value="RAS">Relief at source (RAS)</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span>Employee gross contribution %</span>
                <Input type="number" step="0.01" value={employeeRate} onChange={(e) => setEmployeeRate(e.target.value)} aria-label="Employee gross contribution %" />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Employer contribution %</span>
                <Input type="number" step="0.01" value={employerRate} onChange={(e) => setEmployerRate(e.target.value)} aria-label="Employer contribution %" />
              </label>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Supported: defined contribution on qualifying earnings with relief at source; at least 8% in total and at
                least 3% from the employer. Net pay arrangement and salary sacrifice are not supported. Enter the figures
                from the employer&apos;s actual scheme rules: nothing is filled in for you.
              </p>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>I confirm these settings match the employer&apos;s pension scheme rules</span>
              </label>
            </div>
          ) : null}

          {choice === 'NOT_ENROLLED' ? (
            <div className="space-y-1">
              <p className="text-xs text-amber-700 dark:text-amber-300" data-testid="workplace-pension-not-enrolled">
                NOT_ENROLLED is a status the employer records. It is not an automatic-enrolment eligibility assessment or
                proof of an exemption, and it does not permit leaving out an eligible worker: the separate
                automatic-enrolment assessment and its records are still required.
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
          <p className="text-xs text-muted-foreground">Saving these settings does not recalculate any payroll.</p>
          <Button size="sm" variant="outline" disabled={save.isPending || problems.length > 0} onClick={onSave}>
            Save pension settings
          </Button>
        </div>
      ) : null}
    </section>
  )
}
