import * as React from 'react'

import { useEmployeePensionAe, useRecordPensionAeEvent, useUpsertEmployeePayrollProfile } from '@/features/payroll/hooks/usePayroll'
import type { EmployeePayrollProfile } from '@/features/payroll/types/payroll.types'
import type { PensionAeEventInput } from '@/features/payroll/types/payroll-api.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

const EVENTS: Array<[PensionAeEventInput['type'], string]> = [
  ['POSTPONEMENT', 'Postponement (deferral date, end date, notice date)'],
  ['ENROLMENT_NOTICE_SENT', 'Enrolment information given'],
  ['OPT_IN_REQUEST', 'Opt-in request received'],
  ['JOINING_REQUEST', 'Joining request received'],
  ['OPT_OUT', 'Opt-out notice received (from the scheme)'],
  ['CEASE_MEMBERSHIP', 'Ceased active membership (after the opt-out period)'],
  ['RE_ENROLMENT_DUE', 'Re-enrolment date'],
]

/**
 * Loan / pension completion (implemented, unverified): automatic enrolment evidence (UK worker,
 * State Pension age date where it cannot be derived), the latest assessment from the UK run, the
 * duty dates, and the events (postponement, notices, opt-in / joining, opt-out, ceasing, re-enrolment).
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

  const row = (label: string, value: string | null | undefined) => (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value ?? '—'}</span>
    </div>
  )
  const eventError = record.error instanceof Error ? record.error.message : null
  const profileError = saveProfile.error instanceof Error ? saveProfile.error.message : null
  const needsEvidence = type === 'OPT_OUT' || type === 'CEASE_MEMBERSHIP'

  return (
    <section className="space-y-2 rounded-md border border-border p-3" data-testid="pension-ae">
      <h3 className="text-sm font-medium">Automatic enrolment</h3>
      <div className="grid gap-1 sm:grid-cols-2">
        {row('Latest assessment', ae?.lastCategory ? `${ae.lastCategory.replace(/_/g, ' ').toLowerCase()} (${ae.lastAssessedOn})` : 'Not assessed yet (assessed when tax and NI are calculated)')}
        {row('Automatic enrolment date', ae?.automaticEnrolmentDate)}
        {row('Enrolment deadline', ae?.enrolmentDeadline)}
        {row('Enrolment information given', ae?.enrolmentNoticeSentOn)}
        {row('Postponed', ae?.postponementFrom ? `${ae.postponementFrom} to ${ae.postponementEndsOn} (notice ${ae.postponementNoticeSentOn ?? '—'})` : null)}
        {row('Opt-in / joining request', ae?.optInRequestedOn ?? ae?.joiningRequestedOn)}
        {row('Opt-out', ae?.optOutReceivedOn ? `${ae.optOutReceivedOn} (${ae.optOutEvidenceRef ?? '—'})` : null)}
        {row('Ceased membership', ae?.ceasedOn)}
        {row('Re-enrolment date', ae?.reEnrolmentDueOn)}
      </div>
      {ae?.lastExplanation ? <p className="text-xs text-muted-foreground">{ae.lastExplanation}</p> : null}
      <p className="text-xs text-amber-700 dark:text-amber-300">
        The assessment never enrols or exempts anyone by itself. Missing date of birth, UK-worker evidence or State Pension age
        gives a review exception.
      </p>
      {canEdit ? (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block space-y-1 text-sm">
              <span>Ordinarily works in the UK</span>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={ukWorker} onChange={(e) => setUkWorker(e.target.value)} aria-label="Ordinarily works in the UK">
                <option value="">Not recorded</option>
                <option value="YES">Yes</option>
                <option value="NO">No</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>State Pension age date (only if not derivable)</span>
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
                Save evidence
              </Button>
            </div>
          </div>
          {profileError ? <p className="text-xs text-destructive" role="alert">{profileError}</p> : null}
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block space-y-1 text-sm sm:col-span-3">
              <span>Event</span>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={type} onChange={(e) => setType(e.target.value as PensionAeEventInput['type'])} aria-label="Automatic enrolment event">
                {EVENTS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Date</span>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Event date" />
            </label>
            {type === 'POSTPONEMENT' ? (
              <>
                <label className="block space-y-1 text-sm">
                  <span>Postponement ends</span>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="Postponement end date" />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Postponement notice given</span>
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
              A valid opt-out (within one month of joining or of the enrolment information) stops contributions and proposes refunds
              of contributions already in closed runs; a second person approves them under Payroll corrections.
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
      ) : null}
    </section>
  )
}
