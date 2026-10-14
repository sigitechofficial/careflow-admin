import * as React from 'react'

import { useCorrectLoanNotice, useLoanNotices, useRecordLoanNotice } from '@/features/payroll/hooks/usePayroll'
import type { EmployeeLoanNotice, EmployeePayrollProfile, LoanNoticeType } from '@/features/payroll/types/payroll.types'
import type { RecordLoanNoticeInput } from '@/features/payroll/types/payroll-api.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

const NOTICE_LABELS: Record<LoanNoticeType, string> = {
  SL1: 'SL1 — Start student loan',
  SL2: 'SL2 — Stop student loan',
  PGL1: 'PGL1 — Start postgraduate loan',
  PGL2: 'PGL2 — Stop postgraduate loan',
}
const STATUS_LABELS = { ACTIVE: 'Active', VOIDED: 'Voided (recorded in error)', CORRECTED: 'Corrected' } as const
type Plan = '1' | '2' | '4' | '5'

type LegacyFlags = Pick<
  EmployeePayrollProfile,
  'studentLoanPlan1' | 'studentLoanPlan2' | 'studentLoanPlan4' | 'studentLoanPlan5' | 'postgraduateLoan'
>

type Draft = {
  noticeType: LoanNoticeType
  plan: Plan | ''
  hmrcReference: string
  noticeDate: string
  receivedOn: string
  effectivePayday: string
  confirmed: boolean
}
const EMPTY: Draft = { noticeType: 'SL1', plan: '', hmrcReference: '', noticeDate: '', receivedOn: '', effectivePayday: '', confirmed: false }

const missingOf = (d: Draft) =>
  [
    d.noticeType === 'SL1' && !d.plan ? 'the student loan plan' : null,
    !d.noticeDate ? 'the date on the notice' : null,
    !d.receivedOn ? 'the date received' : null,
    !d.effectivePayday ? 'the effective payday' : null,
    !d.confirmed ? 'your confirmation of the effective payday' : null,
  ].filter(Boolean) as string[]

const bodyOf = (d: Draft): RecordLoanNoticeInput => ({
  noticeType: d.noticeType,
  ...(d.noticeType === 'SL1' && d.plan ? { studentLoanPlan: d.plan } : {}),
  ...(d.hmrcReference.trim() ? { hmrcReference: d.hmrcReference.trim() } : {}),
  noticeDate: d.noticeDate,
  receivedOn: d.receivedOn,
  effectivePayday: d.effectivePayday,
})

/** The notice fields, shared by recording a notice and by a correction's replacement. */
function NoticeFields({ draft, onChange, prefix = '' }: { draft: Draft; onChange: (d: Draft) => void; prefix?: string }) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch })
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span>Notice type</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={draft.noticeType}
            onChange={(e) => set({ noticeType: e.target.value as LoanNoticeType })}
            aria-label={`${prefix}Notice type`}
          >
            {(Object.keys(NOTICE_LABELS) as LoanNoticeType[]).map((t) => (
              <option key={t} value={t}>
                {NOTICE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        {draft.noticeType === 'SL1' ? (
          <label className="block space-y-1 text-sm">
            <span>Student loan plan</span>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={draft.plan}
              onChange={(e) => set({ plan: e.target.value as Plan | '' })}
              aria-label={`${prefix}Student loan plan`}
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
          <Input value={draft.hmrcReference} onChange={(e) => set({ hmrcReference: e.target.value })} aria-label={`${prefix}HMRC reference`} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Date on the notice</span>
          <Input type="date" value={draft.noticeDate} onChange={(e) => set({ noticeDate: e.target.value })} aria-label={`${prefix}Date on the notice`} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Date received</span>
          <Input type="date" value={draft.receivedOn} onChange={(e) => set({ receivedOn: e.target.value })} aria-label={`${prefix}Date received`} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Effective payroll payday</span>
          <Input
            type="date"
            value={draft.effectivePayday}
            onChange={(e) => set({ effectivePayday: e.target.value })}
            aria-label={`${prefix}Effective payroll payday`}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        The effective payday is the first payday on which the notice can practically be operated, on or after both the
        date on the notice and the day it was received. It is not worked out for you. Deductions are not backdated.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.confirmed} onChange={(e) => set({ confirmed: e.target.checked })} />
        <span>{prefix}I confirm this is the first payday on which this notice can be operated</span>
      </label>
    </>
  )
}

type Correction = { notice: EmployeeLoanNotice; mode: 'VOID' | 'REPLACE'; draft: Draft; reason: string; evidence: string; confirmed: boolean }

/**
 * Gate C14/C15: record HMRC student / postgraduate loan notices (SL1, SL2, PGL1, PGL2), show those
 * recorded, and correct one entered wrongly in Careflow (C13 and C15 endpoints). Recording or
 * correcting a notice changes no profile field and no closed pay.
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
  const correct = useCorrectLoanNotice(employeeId)
  const [draft, setDraft] = React.useState<Draft>(EMPTY)
  const [correction, setCorrection] = React.useState<Correction | null>(null)

  const legacy = [
    profile?.studentLoanPlan1 ? 'Plan 1' : null,
    profile?.studentLoanPlan2 ? 'Plan 2' : null,
    profile?.studentLoanPlan4 ? 'Plan 4' : null,
    profile?.studentLoanPlan5 ? 'Plan 5' : null,
    profile?.postgraduateLoan ? 'postgraduate loan' : null,
  ].filter(Boolean)
  const missing = missingOf(draft)
  const error = record.error instanceof Error ? record.error.message : null
  const correctionError = correct.error instanceof Error ? correct.error.message : null
  const history = [...notices].sort(
    (a, b) => b.effectivePayday.localeCompare(a.effectivePayday) || b.createdAt.localeCompare(a.createdAt),
  )
  const correctionMissing = correction
    ? [
        correction.reason.trim().length < 5 ? 'the reason (at least 5 characters)' : null,
        correction.evidence.trim().length < 2 ? 'the evidence reference' : null,
        !correction.confirmed ? 'your confirmation that this corrects Careflow’s record only' : null,
        ...(correction.mode === 'REPLACE' ? missingOf(correction.draft).map((m) => `for the correct notice, ${m}`) : []),
      ].filter(Boolean)
    : []

  const onSubmit = async () => {
    try {
      await record.mutateAsync(bodyOf(draft))
      setDraft(EMPTY)
    } catch {
      // Shown below from the mutation's error.
    }
  }
  const startCorrection = (notice: EmployeeLoanNotice, mode: Correction['mode']) => {
    correct.reset()
    setCorrection({
      notice,
      mode,
      reason: '',
      evidence: '',
      confirmed: false,
      draft: {
        noticeType: notice.noticeType,
        plan: notice.studentLoanPlan ?? '',
        hmrcReference: notice.hmrcReference ?? '',
        noticeDate: notice.noticeDate,
        receivedOn: notice.receivedOn,
        effectivePayday: notice.effectivePayday,
        confirmed: false,
      },
    })
  }
  const onCorrect = async () => {
    if (!correction) return
    try {
      await correct.mutateAsync({
        noticeId: correction.notice.id,
        body: {
          reason: correction.reason.trim(),
          evidenceReference: correction.evidence.trim(),
          ...(correction.mode === 'REPLACE' ? { replacement: bodyOf(correction.draft) } : {}),
        },
      })
      setCorrection(null)
    } catch {
      // Shown below from the mutation's error.
    }
  }

  return (
    <section className="space-y-3 rounded-md border border-border p-3" data-testid="loan-notices">
      <h3 className="text-sm font-medium">HMRC loan letters (SL1, SL2, PGL1, PGL2)</h3>
      {legacy.length ? (
        <p className="text-xs text-amber-700 dark:text-amber-300" data-testid="loan-notices-legacy">
          The plans set for this carer ({legacy.join(', ')}) are not verified HMRC notices: payroll uses them until an HMRC
          letter is recorded here.
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
                <th className="py-1 pr-2 font-medium">Status</th>
                {canEdit ? <th className="py-1 pr-2 font-medium">Correction</th> : null}
              </tr>
            </thead>
            <tbody>
              {history.map((n) => {
                const status = n.status ?? 'ACTIVE'
                return (
                  <tr key={n.id} className="border-t border-border/70 align-top" data-testid="loan-notice-row">
                    <td className="py-1 pr-2">{n.noticeType}</td>
                    <td className="py-1 pr-2">{n.studentLoanPlan ? `Plan ${n.studentLoanPlan}` : '—'}</td>
                    <td className="py-1 pr-2">{n.hmrcReference ?? '—'}</td>
                    <td className="py-1 pr-2">{n.noticeDate}</td>
                    <td className="py-1 pr-2">{n.receivedOn}</td>
                    <td className="py-1 pr-2">{n.effectivePayday}</td>
                    <td className="py-1 pr-2">
                      {STATUS_LABELS[status]}
                      {status !== 'ACTIVE' && n.voidReason ? (
                        <span className="block text-muted-foreground">
                          {n.voidReason} · evidence {n.voidEvidenceRef}
                          {n.voidedAt ? ` · ${n.voidedAt.slice(0, 10)}` : ''}
                        </span>
                      ) : null}
                      {n.replacesId ? <span className="block text-muted-foreground">Replaces an entry recorded in error</span> : null}
                    </td>
                    {canEdit ? (
                      <td className="py-1 pr-2">
                        {status === 'ACTIVE' ? (
                          <span className="flex flex-col gap-1">
                            <Button size="sm" variant="outline" onClick={() => startCorrection(n, 'REPLACE')}>
                              Correct entry
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => startCorrection(n, 'VOID')}>
                              Recorded in error
                            </Button>
                          </span>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-muted-foreground">No notice recorded.</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Recorded notices cannot be edited or deleted here. An entry recorded wrongly is corrected with a reason and
          evidence, and the original stays in the history.
        </p>
      </div>

      {canEdit && correction ? (
        <div className="space-y-2 rounded-md border border-amber-500/40 p-2" data-testid="loan-notice-correction">
          <p className="text-sm font-medium">
            {correction.mode === 'REPLACE' ? 'Correct entry' : 'Recorded in error'}: {correction.notice.noticeType}
            {correction.notice.hmrcReference ? ` ${correction.notice.hmrcReference}` : ''}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            This only corrects Careflow&apos;s record of a notice that was entered wrongly. It does not stop or change a
            genuine HMRC instruction: a valid SL1 or PGL1 stays in force until HMRC sends a later notice. Payroll that is
            already closed cannot be changed this way.
          </p>
          <label className="block space-y-1 text-sm">
            <span>Reason for the correction</span>
            <Input value={correction.reason} onChange={(e) => setCorrection({ ...correction, reason: e.target.value })} aria-label="Reason for the correction" />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Evidence reference (HMRC notice or document)</span>
            <Input value={correction.evidence} onChange={(e) => setCorrection({ ...correction, evidence: e.target.value })} aria-label="Evidence reference" />
          </label>
          {correction.mode === 'REPLACE' ? (
            <NoticeFields draft={correction.draft} onChange={(d) => setCorrection({ ...correction, draft: d })} prefix="Correct notice: " />
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={correction.confirmed} onChange={(e) => setCorrection({ ...correction, confirmed: e.target.checked })} />
            <span>I confirm this corrects Careflow&apos;s record only</span>
          </label>
          {correctionMissing.length ? <p className="text-xs text-muted-foreground">Still needed: {correctionMissing.join(', ')}.</p> : null}
          {correctionError ? (
            <p className="text-xs text-destructive" role="alert">
              {correctionError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={correct.isPending || correctionMissing.length > 0} onClick={() => void onCorrect()}>
              Save correction
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCorrection(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <details className="rounded-md border border-border p-2">
          <summary className="cursor-pointer text-sm font-medium">Record an HMRC letter</summary>
          <div className="mt-2 space-y-2" data-testid="loan-notice-form">
            <NoticeFields draft={draft} onChange={setDraft} />
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
        </details>
      ) : null}
    </section>
  )
}
