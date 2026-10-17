import * as React from 'react'
import { ShieldCheck } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { useReviewUkNmwAssessment } from '@/features/payroll/hooks/usePayroll'
import type { NmwReviewOutcome, UkNmwAssessment } from '@/features/payroll/types/payroll.types'

const WORK_TYPE_LABELS: Record<string, string> = {
  SALARIED_HOURS: 'Salaried hours work',
  TIME_WORK: 'Time work',
}
const CATEGORY_LABELS: Record<string, string> = {
  AGE_21_AND_OVER: 'Age 21 and over',
  AGE_18_TO_20: 'Age 18 to 20',
  UNDER_18: 'Under 18',
  APPRENTICE: 'Apprentice',
}
const OUTCOME_LABELS: Record<NmwReviewOutcome, string> = {
  EVIDENCE_SUPPORTS_COMPLIANCE: 'The evidence supports compliance',
  SHORTFALL_CONFIRMED: 'A shortfall is confirmed',
}

type BadgeVariant = 'warning' | 'success' | 'destructive' | 'secondary' | 'info'

function gbp(amount: number | null | undefined): string {
  return amount == null ? '—' : `£${Number(amount).toFixed(2)}`
}

/** What the assessment says, in the order that matters: a confirmed shortfall first. */
export function nmwAssessmentStatus(a: UkNmwAssessment): { label: string; variant: BadgeVariant } {
  if (a.issue === 'SHORTFALL') return { label: 'Shortfall confirmed', variant: 'destructive' }
  if (a.issue && a.reviewOutcome === 'EVIDENCE_SUPPORTS_COMPLIANCE') return { label: 'Reviewed: evidence supports compliance', variant: 'info' }
  if (a.issue) return { label: 'Not decided: needs review', variant: 'warning' }
  if (a.topUp > 0) return { label: 'Topped up to the minimum wage', variant: 'success' }
  return a.compliant ? { label: 'Compliant', variant: 'success' } : { label: 'Not assessed', variant: 'secondary' }
}

const hoursText = (value: number | null | undefined) => (value == null ? '—' : `${value}h`)

/**
 * Where a salaried worker stands in the calculation year, as the run worked it out. Nothing is
 * calculated here: these are the figures stored with the assessment.
 */
function AnnualPosition({ a, status, formatDate }: { a: UkNmwAssessment; status: string; formatDate: (value: string) => string }) {
  const assessed = !!a.calcYearStart && !!a.calcYearEnd && a.annualBasicHours != null
  const before = a.yearHoursBefore ?? 0
  const facts: Array<[string, string]> = assessed
    ? [
        ['Contracted weekly hours', hoursText(a.contractedWeeklyHours)],
        ['Annualisation method', `Weekly hours × ${a.weeksPerYear} weeks (approved)`],
        ['Basic hours of the year', hoursText(a.annualBasicHours)],
        ['Calculation year', `${formatDate(a.calcYearStart as string)} – ${formatDate(a.calcYearEnd as string)}`],
        ['Hours counted before this period', hoursText(before)],
        ['Hours counted to date', hoursText(Math.round((before + a.workedHours) * 100) / 100)],
        ['Excess hours counted here', hoursText(a.excessHours ?? 0)],
        ['Result', a.topUp > 0 ? `${status}: ${gbp(a.topUp)} added by this run` : status],
      ]
    : [
        ['Contracted weekly hours', hoursText(a.contractedWeeklyHours)],
        ['Annualisation method', a.issue === 'POLICY_REVIEW_REQUIRED' ? 'None approved' : '—'],
        ['Result', status],
      ]
  return (
    <div className="rounded-md border border-border bg-background p-3" data-testid="nmw-annual-position">
      <p className="text-sm font-medium">Position in the calculation year</p>
      {!assessed ? (
        <p className="mt-1 text-xs text-muted-foreground">
          The year was not assessed{a.issueMessage ? `: ${a.issueMessage}` : '.'}
        </p>
      ) : null}
      <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export type NmwComplianceSectionProps = {
  runId: string
  assessments: UkNmwAssessment[]
  employees: Array<{ employeeId: string; displayName: string }>
  /** Only an open run is reviewed; a closed run's assessments are a record. */
  runOpen: boolean
  /** The user holds the power to close payroll. */
  canReview: boolean
  /** The user created this run, so someone else reviews its exceptions. */
  createdRun: boolean
  formatDate?: (value: string) => string
}

/** Minimum wage position of each salaried employee on a UK payroll run, and the review of what is not decided. */
export function NmwComplianceSection({
  runId,
  assessments,
  employees,
  runOpen,
  canReview,
  createdRun,
  formatDate = v => v,
}: NmwComplianceSectionProps) {
  const reviewMut = useReviewUkNmwAssessment(runId)
  const [unresolvedOnly, setUnresolvedOnly] = React.useState(false)
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [outcome, setOutcome] = React.useState<NmwReviewOutcome | ''>('')
  const [note, setNote] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const nameOf = (employeeId: string) => employees.find(e => e.employeeId === employeeId)?.displayName ?? 'Employee'
  const blocking = assessments.filter(a => a.blocksClose)
  const rows = unresolvedOnly ? blocking : assessments

  const openDetails = (id: string) => {
    setOpenId(current => (current === id ? null : id))
    setOutcome('')
    setNote('')
    setError(null)
  }
  const onReview = async (a: UkNmwAssessment) => {
    if (!outcome) return
    setError(null)
    try {
      const res = await reviewMut.mutateAsync({ assessmentId: a.id, note: note.trim(), outcome })
      toastSuccess(res.message)
      setOutcome('')
      setNote('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record the review.')
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border" data-testid="nmw-compliance-section">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Minimum wage compliance</p>
            <p className="text-xs text-muted-foreground">
              Made each time gross is calculated, for employees paid a salary. Hourly work is assessed by the visit pay run that
              pays it.
            </p>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-foreground">
          <input type="checkbox" checked={unresolvedOnly} onChange={e => setUnresolvedOnly(e.target.checked)} />
          Unresolved only
        </label>
      </div>

      {blocking.length > 0 ? (
        <div
          className="border-b border-border bg-amber-50/70 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
          data-testid="nmw-blocking"
          role="status"
        >
          <p className="font-medium">
            {blocking.length} minimum wage exception{blocking.length === 1 ? '' : 's'} stop{blocking.length === 1 ? 's' : ''} this
            run being closed
          </p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {blocking.map(a => (
              <li key={a.id}>
                {nameOf(a.employeeId)}: {a.issueMessage ?? a.issue}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="border-b border-border bg-muted/20 text-muted-foreground">
            <tr>
              <th className="py-2.5 pl-4 pr-3 font-medium">Employee</th>
              <th className="py-2.5 pr-3 font-medium">Pay reference period</th>
              <th className="py-2.5 pr-3 font-medium">Classification</th>
              <th className="py-2.5 pr-3 text-right font-medium">Hours</th>
              <th className="py-2.5 pr-3 text-right font-medium">Relevant pay</th>
              <th className="py-2.5 pr-3 text-right font-medium">Minimum rate</th>
              <th className="py-2.5 pr-3 text-right font-medium">Shortfall</th>
              <th className="py-2.5 pr-3 text-right font-medium">Top-up in this run</th>
              <th className="py-2.5 pr-3 font-medium">Assessment</th>
              <th className="py-2.5 pr-3 font-medium">Review</th>
              <th className="py-2.5 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                  {assessments.length === 0
                    ? 'No minimum wage assessments yet. Calculate gross to make them.'
                    : 'Nothing unresolved.'}
                </td>
              </tr>
            ) : (
              rows.map(a => {
                const status = nmwAssessmentStatus(a)
                const isOpen = openId === a.id
                return (
                  <React.Fragment key={a.id}>
                    <tr className="border-b border-border/70 align-top" data-testid="nmw-assessment-row">
                      <td className="py-3 pl-4 pr-3 font-medium text-foreground">{nameOf(a.employeeId)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {formatDate(a.periodStart)} – {formatDate(a.periodEnd)}
                      </td>
                      <td className="py-3 pr-3">
                        <p>{WORK_TYPE_LABELS[a.workType] ?? a.workType}</p>
                        <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[a.category] ?? a.category}</p>
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">
                        <p>{a.hours > 0 ? `${a.hours}h` : '—'}</p>
                        {a.workedHours > 0 ? <p className="text-xs text-muted-foreground">{a.workedHours}h worked</p> : null}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">{gbp(a.pay)}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{gbp(a.requiredHourly)}/h</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{a.shortfall ? gbp(a.shortfall) : '—'}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{a.topUp > 0 ? gbp(a.topUp) : '—'}</td>
                      <td className="py-3 pr-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {a.issueMessage && a.blocksClose ? <p className="mt-1 max-w-xs text-xs text-muted-foreground">{a.issueMessage}</p> : null}
                      </td>
                      <td className="py-3 pr-3">
                        {a.reviewOutcome ? (
                          <>
                            <p>{OUTCOME_LABELS[a.reviewOutcome]}</p>
                            <p className="max-w-xs text-xs text-muted-foreground">
                              {a.reviewedByName ?? 'Reviewer'}
                              {a.reviewedAt ? `, ${formatDate(a.reviewedAt.slice(0, 10))}` : ''}: {a.reviewNote}
                            </p>
                          </>
                        ) : a.blocksClose ? (
                          'Not reviewed'
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Button size="sm" variant="outline" className="h-8" aria-expanded={isOpen} onClick={() => openDetails(a.id)}>
                          {isOpen ? 'Hide' : 'Details'}
                        </Button>
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr className="border-b border-border/70 bg-muted/10">
                        <td colSpan={11} className="space-y-3 px-4 py-3" data-testid="nmw-assessment-detail">
                          <p className="text-sm">
                            <span className="font-medium">Calculation:</span> {a.note ?? '—'}
                          </p>
                          {a.workType === 'SALARIED_HOURS' ? <AnnualPosition a={a} status={status.label} formatDate={formatDate} /> : null}
                          {a.issue === 'SHORTFALL' ? (
                            <p className="text-sm text-destructive" data-testid="nmw-shortfall-confirmed">
                              A shortfall is confirmed (the calculation puts it at up to {gbp(a.shortfall)}). It cannot be cleared by a
                              review: pay the top-up or correct the pay, then calculate gross again.
                            </p>
                          ) : null}
                          {a.canReview ? (
                            !runOpen ? (
                              <p className="text-sm text-muted-foreground">This run is not open, so its assessments are a record.</p>
                            ) : !canReview ? (
                              <p className="text-sm text-muted-foreground" data-testid="nmw-review-no-permission">
                                Reviewing a minimum wage exception needs the power to close payroll.
                              </p>
                            ) : createdRun ? (
                              <p className="text-sm text-muted-foreground" data-testid="nmw-review-own-run">
                                You created this run, so a different user must review its exceptions.
                              </p>
                            ) : (
                              <div className="max-w-2xl space-y-2 rounded-md border border-border bg-background p-3" data-testid="nmw-review-form">
                                <p className="text-sm font-medium">Record a review</p>
                                <p className="text-xs text-muted-foreground">
                                  A review settles a question of fact. It cannot waive a shortfall: if pay is short, confirm it, and
                                  the run stays blocked until the pay is corrected and gross is calculated again.
                                </p>
                                <label className="block space-y-1 text-sm">
                                  <span className="text-xs font-medium text-foreground/90">What the review found</span>
                                  <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    value={outcome}
                                    onChange={e => setOutcome(e.target.value as NmwReviewOutcome | '')}
                                  >
                                    <option value="">Choose…</option>
                                    {(Object.keys(OUTCOME_LABELS) as NmwReviewOutcome[]).map(o => (
                                      <option key={o} value={o}>
                                        {OUTCOME_LABELS[o]}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="block space-y-1 text-sm">
                                  <span className="text-xs font-medium text-foreground/90">Facts the review rests on</span>
                                  <textarea
                                    className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                  />
                                </label>
                                {error ? (
                                  <p className="text-sm text-destructive" role="alert">
                                    {error}
                                  </p>
                                ) : null}
                                <Button
                                  size="sm"
                                  disabled={!outcome || note.trim().length < 20 || reviewMut.isPending}
                                  onClick={() => void onReview(a)}
                                >
                                  Record review
                                </Button>
                              </div>
                            )
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
