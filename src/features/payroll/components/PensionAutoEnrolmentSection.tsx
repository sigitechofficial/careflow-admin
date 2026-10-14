import * as React from 'react'

import { PayrollFieldLabel } from '@/features/payroll/components/PayrollFieldLabel'
import { useEmployeePensionAe, useRecordPensionAeEvent, useUpsertEmployeePayrollProfile } from '@/features/payroll/hooks/usePayroll'
import type { EmployeePayrollProfile } from '@/features/payroll/types/payroll.types'
import type { PensionAeEventInput } from '@/features/payroll/types/payroll-api.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { TooltipProvider } from '@/shared/ui/tooltip'

const EVENTS: Array<[PensionAeEventInput['type'], string]> = [
  ['ENROLMENT_NOTICE_SENT', 'Pension letter given to the carer (enrolment information)'],
  ['OPT_IN_REQUEST', 'Carer asked to join (opt-in request)'],
  ['JOINING_REQUEST', 'Carer asked to join (joining request)'],
  ['OPT_OUT', 'Carer opted out (opt-out notice from the scheme)'],
  ['CEASE_MEMBERSHIP', 'Carer left the pension (after the opt-out period)'],
  ['POSTPONEMENT', 'Enrolment postponed'],
  ['RE_ENROLMENT_DUE', 'Re-enrolment date'],
]

/**
 * Loan / pension completion (implemented, unverified): automatic enrolment evidence (UK worker,
 * State Pension age date where it cannot be derived), the latest assessment from the UK run, the
 * duty dates, and the events (postponement, notices, opt-in / joining, opt-out, ceasing, re-enrolment).
 * Only the dates that are recorded are listed; the event form is folded until needed.
 */
export function PensionAutoEnrolmentSection({
  employeeId,
  profile,
  canEdit,
}: {
  employeeId: string
  profile: Partial<Pick<EmployeePayrollProfile, 'pensionUkWorker' | 'statePensionAgeDate' | 'pensionStatus'>> | null | undefined
  canEdit: boolean
}) {
  const { data: ae } = useEmployeePensionAe(employeeId)
  const saveProfile = useUpsertEmployeePayrollProfile(employeeId)
  const record = useRecordPensionAeEvent(employeeId)
  const [ukWorker, setUkWorker] = React.useState(profile?.pensionUkWorker == null ? '' : profile.pensionUkWorker ? 'YES' : 'NO')
  const [spa, setSpa] = React.useState(profile?.statePensionAgeDate ?? '')
  const [type, setType] = React.useState<PensionAeEventInput['type']>('ENROLMENT_NOTICE_SENT')
  const [date, setDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [noticeSentOn, setNoticeSentOn] = React.useState('')
  const [evidenceRef, setEvidenceRef] = React.useState('')
  React.useEffect(() => {
    setUkWorker(profile?.pensionUkWorker == null ? '' : profile.pensionUkWorker ? 'YES' : 'NO')
    setSpa(profile?.statePensionAgeDate ?? '')
  }, [profile])

  const row = (label: string, value: string | null | undefined) =>
    value ? (
      <div key={label} className="flex justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{value}</span>
      </div>
    ) : null
  const recorded = [
    row('Automatic enrolment date', ae?.automaticEnrolmentDate),
    row('Enrolment deadline', ae?.enrolmentDeadline),
    row('Pension letter given', ae?.enrolmentNoticeSentOn),
    row('Postponed', ae?.postponementFrom ? `${ae.postponementFrom} to ${ae.postponementEndsOn} (notice ${ae.postponementNoticeSentOn ?? '—'})` : null),
    row('Asked to join', ae?.optInRequestedOn ?? ae?.joiningRequestedOn),
    row('Opted out', ae?.optOutReceivedOn ? `${ae.optOutReceivedOn} (${ae.optOutEvidenceRef ?? '—'})` : null),
    row('Left the pension', ae?.ceasedOn),
    row('Re-enrolment date', ae?.reEnrolmentDueOn),
  ].filter(Boolean)
  const eventError = record.error instanceof Error ? record.error.message : null
  const profileError = saveProfile.error instanceof Error ? saveProfile.error.message : null
  const needsEvidence = type === 'OPT_OUT' || type === 'CEASE_MEMBERSHIP'

  return (
    <section className="space-y-3 rounded-md border border-border p-3" data-testid="pension-ae">
      <div>
        <h3 className="text-sm font-medium">Automatic enrolment</h3>
        <p className="text-xs text-muted-foreground" data-testid="pension-ae-latest">
          Latest check:{' '}
          <span className="font-medium text-foreground">
            {ae?.lastCategory
              ? `${ae.lastCategory.replace(/_/g, ' ').toLowerCase()} (${ae.lastAssessedOn})`
              : 'not checked yet (checked when tax and NI are calculated)'}
          </span>
        </p>
        {ae?.lastExplanation ? <p className="text-xs text-muted-foreground">{ae.lastExplanation}</p> : null}
      </div>
      {recorded.length ? <div className="grid gap-1 sm:grid-cols-2">{recorded}</div> : null}
      <p className="text-xs text-amber-700 dark:text-amber-300">
        The check never enrols or exempts anyone by itself. A missing date of birth, UK-worker answer or State Pension age gives
        a review exception.
      </p>
      {canEdit ? (
        <TooltipProvider delayDuration={200}>
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <fieldset className="space-y-1">
                <legend className="text-sm">Does this carer normally work in the UK?</legend>
                <div className="flex h-9 flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" name={`ae-uk-${employeeId}`} checked={ukWorker === 'YES'} onChange={() => setUkWorker('YES')} />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name={`ae-uk-${employeeId}`} checked={ukWorker === 'NO'} onChange={() => setUkWorker('NO')} />
                    No
                  </label>
                </div>
              </fieldset>
              <label className="block space-y-1 text-sm">
                <PayrollFieldLabel
                  label="State Pension age date"
                  info="Leave empty: it is worked out from the date of birth. Fill it in only when it cannot be worked out."
                  className="font-normal"
                />
                <Input type="date" value={spa} onChange={(e) => setSpa(e.target.value)} aria-label="State Pension age date" />
              </label>
              <div className="flex items-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saveProfile.isPending || !ukWorker}
                  onClick={() =>
                    void saveProfile
                      .mutateAsync({ pensionUkWorker: ukWorker === 'YES', statePensionAgeDate: spa || null })
                      .catch(() => undefined)
                  }
                >
                  Save
                </Button>
              </div>
            </div>
            {profileError ? <p className="text-xs text-destructive" role="alert">{profileError}</p> : null}

            <details className="rounded-md border border-border p-2">
              <summary className="cursor-pointer text-sm font-medium">Record a pension event (letter given, opt-out, postponement…)</summary>
              <div className="mt-2 space-y-2">
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="block space-y-1 text-sm sm:col-span-3">
                    <span>What happened?</span>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={type}
                      onChange={(e) => setType(e.target.value as PensionAeEventInput['type'])}
                      aria-label="Automatic enrolment event"
                    >
                      {EVENTS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span>{type === 'POSTPONEMENT' ? 'Postponed from' : 'Date'}</span>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Event date" />
                  </label>
                  {type === 'POSTPONEMENT' ? (
                    <>
                      <label className="block space-y-1 text-sm">
                        <span>Postponement ends</span>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="Postponement end date" />
                      </label>
                      <label className="block space-y-1 text-sm">
                        <span>Postponement letter given</span>
                        <Input type="date" value={noticeSentOn} onChange={(e) => setNoticeSentOn(e.target.value)} aria-label="Postponement notice date" />
                      </label>
                    </>
                  ) : null}
                  {needsEvidence ? (
                    <label className="block space-y-1 text-sm">
                      <span>Evidence reference</span>
                      <Input value={evidenceRef} onChange={(e) => setEvidenceRef(e.target.value)} aria-label="Event evidence reference" />
                    </label>
                  ) : null}
                </div>
                {type === 'OPT_OUT' ? (
                  <p className="text-xs text-muted-foreground">
                    A valid opt-out (within one month of joining or of the pension letter) stops contributions and proposes refunds of
                    contributions already in closed runs; a second person approves them under Payroll corrections.
                  </p>
                ) : null}
                {eventError ? <p className="text-xs text-destructive" role="alert">{eventError}</p> : null}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={record.isPending || !date || (type === 'POSTPONEMENT' && !endDate) || (needsEvidence && !evidenceRef.trim())}
                  onClick={() =>
                    void record
                      .mutateAsync({
                        type,
                        date,
                        ...(type === 'POSTPONEMENT' ? { endDate, ...(noticeSentOn ? { noticeSentOn } : {}) } : {}),
                        ...(evidenceRef.trim() ? { evidenceRef: evidenceRef.trim() } : {}),
                      })
                      .catch(() => undefined)
                  }
                >
                  Record event
                </Button>
              </div>
            </details>
          </div>
        </TooltipProvider>
      ) : null}
    </section>
  )
}
