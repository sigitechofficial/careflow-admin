import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import { INCIDENT_SEVERITY_FORM_OPTIONS } from '@/features/incidents/components/IncidentFormControls'
import { useUpsertIncidentReview } from '@/features/incidents/hooks/useIncidents'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { CorrectedBadge } from '@/features/incidents/components/IncidentCorrectionMarks'
import {
  INCIDENT_SEVERITY_BADGE,
  type IncidentCorrectionEntry,
  type IncidentReview,
  type IncidentReviewCycle,
  type IncidentReviewSeverityDecision,
  type IncidentSeverityStep,
  type IncidentSeverity,
  type IncidentStatus,
  type UpsertIncidentReviewInput,
} from '@/features/incidents/types'

/** Red asterisk for required fields (same style as the raise form). */
function Req() {
  return <span className="ml-0.5 text-destructive dark:text-red-400" aria-hidden>*</span>
}

const severityLabel = (s: IncidentSeverity) =>
  INCIDENT_SEVERITY_FORM_OPTIONS.find((o) => o.value === s)?.label ?? s

/** Yes/No review questions, each with a one-line hint so "Yes" means the same to every manager. */
const REVIEW_QUESTIONS: { key: keyof UpsertIncidentReviewInput; label: string; hint: string }[] = [
  {
    key: 'safeguardingConcern',
    label: 'Safeguarding concern?',
    hint: 'The person may be at risk of abuse or neglect and the local authority may need to know.',
  },
  // Removed: it duplicated "Safeguarding concern?". Saved answers stay in the data and in earlier reviews.
  // { key: 'possibleAbuseOrNeglect', label: 'Possible abuse or neglect?', hint: '…' },
  {
    key: 'immediateRisk',
    label: 'Is anyone currently at immediate or ongoing risk?',
    hint: 'Someone could be harmed again before this is resolved (the person, staff or others).',
  },
  {
    key: 'furtherMedicalAttention',
    label: 'Further medical attention required?',
    hint: 'GP, nurse, 111 or hospital follow-up is still needed.',
  },
  // Hidden for now: to be replaced by a "Notifications & referrals" section (CQC, local authority,
  // RIDDOR, ICO, police, duty of candour). The saved value is still sent back unchanged on save.
  // { key: 'externalNotificationRequired', label: 'External notification required?' },
  {
    key: 'escalationRequired',
    label: 'Immediate senior management escalation required?',
    hint: 'A senior manager needs to know about this now.',
  },
]

function triToValue(v: boolean | null | undefined): string {
  return v === true ? 'yes' : v === false ? 'no' : ''
}
function valueToTri(v: string | undefined): boolean | undefined {
  return v === 'yes' ? true : v === 'no' ? false : undefined
}

export function IncidentReviewSection({
  incidentId,
  review,
  canEdit,
  currentSeverity,
  reportedByName,
  corrections,
  status,
  severityDecision,
  severityChanges,
  reviewCycles,
}: {
  incidentId: string
  review: IncidentReview | null
  canEdit: boolean
  /** The incident's severity now. */
  currentSeverity: IncidentSeverity
  /** Carer who reported it (their severity is the starting point). */
  reportedByName?: string | null
  /** Corrections on the incident (a severity correction shows the "Corrected" badge). */
  corrections?: IncidentCorrectionEntry[]
  /** Incident status — the decision can only be made while the review is open. */
  status: IncidentStatus
  /** What was decided about the severity at review (confirmed, or changed with a reason). */
  severityDecision?: IncidentReviewSeverityDecision | null
  /** Every severity step (reported, corrections, review changes) for the full chain. */
  severityChanges?: IncidentSeverityStep[]
  /** Earlier review cycles of a reopened incident (read-only). */
  reviewCycles?: IncidentReviewCycle[]
}) {
  const mutation = useUpsertIncidentReview(incidentId)
  // Severity decision (first review only): no default, so confirming is a deliberate choice.
  const severityDecided = Boolean(review?.confirmedSeverity)
  const [severityChoice, setSeverityChoice] = React.useState<'confirm' | 'change' | ''>('')
  const [newSeverity, setNewSeverity] = React.useState<IncidentSeverity | ''>('')
  const [severityReason, setSeverityReason] = React.useState('')
  const [problem, setProblem] = React.useState<string | null>(null)
  const reviewOpen = status === 'REPORTED' || status === 'UNDER_REVIEW' || status === 'REOPENED'
  const [decision, setDecision] = React.useState<'INVESTIGATE' | 'NO_INVESTIGATION' | ''>('')
  const [decisionReason, setDecisionReason] = React.useState('')
  const [changeReason, setChangeReason] = React.useState('')
  const [showSeverityHistory, setShowSeverityHistory] = React.useState(false)
  const [answers, setAnswers] = React.useState<Record<string, string>>(() => ({
    safeguardingConcern: triToValue(review?.safeguardingConcern),
    immediateRisk: triToValue(review?.immediateRisk),
    furtherMedicalAttention: triToValue(review?.furtherMedicalAttention),
    externalNotificationRequired: triToValue(review?.externalNotificationRequired),
    escalationRequired: triToValue(review?.escalationRequired),
  }))
  const [notes, setNotes] = React.useState(review?.managementNotes ?? '')
  const [protectiveAction, setProtectiveAction] = React.useState(review?.protectiveAction ?? '')
  const [showPreviousReviews, setShowPreviousReviews] = React.useState(false)

  function save() {
    if (!severityDecided && !severityChoice) return setProblem('Confirm or change the severity')
    if (severityChoice === 'change' && !newSeverity) return setProblem('Choose the new severity')
    if (severityChoice === 'change' && !severityReason.trim())
      return setProblem('Give a reason for changing the severity')
    if (decision === 'NO_INVESTIGATION' && !decisionReason.trim())
      return setProblem('Give a reason why no investigation is needed')
    if (answers.immediateRisk === 'yes' && !protectiveAction.trim())
      return setProblem('Describe the immediate protective action required or taken')
    if (changedAfterDecision && !changeReason.trim()) return setProblem('Give a reason for the change')
    setProblem(null)
    const severityDecision: Pick<UpsertIncidentReviewInput, 'confirmedSeverity' | 'severityReason'> =
      severityChoice === 'change'
        ? { confirmedSeverity: newSeverity as IncidentSeverity, severityReason: severityReason.trim() }
        : severityChoice === 'confirm'
          ? { confirmedSeverity: currentSeverity }
          : {}
    const input: UpsertIncidentReviewInput = {
      ...severityDecision,
      ...(reviewOpen && decision
        ? {
            decision,
            decisionReason: decision === 'NO_INVESTIGATION' ? decisionReason.trim() : undefined,
          }
        : {}),
      safeguardingConcern: valueToTri(answers.safeguardingConcern),
      immediateRisk: valueToTri(answers.immediateRisk),
      protectiveAction: answers.immediateRisk === 'yes' ? protectiveAction.trim() : undefined,
      furtherMedicalAttention: valueToTri(answers.furtherMedicalAttention),
      externalNotificationRequired: valueToTri(answers.externalNotificationRequired),
      escalationRequired: valueToTri(answers.escalationRequired),
      managementNotes: notes.trim() || undefined,
      ...(changedAfterDecision ? { changeReason: changeReason.trim() } : {}),
    }
    mutation.mutate(input, {
      onSuccess: () => {
        setSeverityChoice('')
        setNewSeverity('')
        setSeverityReason('')
        setDecision('')
        setDecisionReason('')
        setChangeReason('')
      },
    })
  }

  // After the decision the review is a record: any change needs a reason (shown on the timeline).
  const lockedReview = Boolean(review) && !reviewOpen
  const changedAfterDecision =
    lockedReview &&
    (REVIEW_QUESTIONS.some(
      (q) => answers[q.key as string] !== triToValue(review?.[q.key as keyof IncidentReview] as boolean | null),
    ) ||
      notes.trim() !== (review?.managementNotes ?? '').trim() ||
      (answers.immediateRisk === 'yes' ? protectiveAction.trim() : '') !== (review?.protectiveAction ?? '').trim())

  // "No investigation" is allowed, but flagged when the answers suggest one is usually needed.
  const effectiveSeverity =
    severityChoice === 'change' && newSeverity ? newSeverity : currentSeverity
  const investigationAdvised = [
    answers.safeguardingConcern === 'yes' && 'a safeguarding concern was raised',
    (effectiveSeverity === 'HIGH' || effectiveSeverity === 'CRITICAL') &&
      `the severity is ${severityLabel(effectiveSeverity).toLowerCase()}`,
  ].filter(Boolean) as string[]
  const decisionLabel = (d: string | null | undefined) =>
    d === 'INVESTIGATE' ? 'Investigate' : d === 'NO_INVESTIGATION' ? 'No investigation needed' : 'Not decided'
  const decisionText = decisionLabel(review?.decision)

  const sevBadge = (s: IncidentSeverity) => (
    <Badge variant={INCIDENT_SEVERITY_BADGE[s]} size="sm">
      {severityLabel(s)}
    </Badge>
  )
  const updatedLater =
    review?.updatedAt && review.reviewedAt
      ? new Date(review.updatedAt).getTime() - new Date(review.reviewedAt).getTime() > 5000
      : false
  /** "Reviewed by X · date · Decision: … · Last updated by Y · date". */
  const reviewSummary = review ? (
    <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      Reviewed by <span className="font-medium text-foreground">{review.reviewedByName ?? 'Unknown'}</span>
      {review.reviewedAt ? ` · ${formatOrganisationDateTime(review.reviewedAt)}` : ''} · Decision:{' '}
      <span className="font-medium text-foreground">{decisionText}</span>
      {updatedLater && (
        <>
          {' '}
          · Last updated by <span className="font-medium text-foreground">{review.updatedByName ?? 'Unknown'}</span> ·{' '}
          {formatOrganisationDateTime(review.updatedAt)}
        </>
      )}
    </p>
  ) : null

  const severityCorrected = Boolean(corrections?.some((c) => c.fieldKey === 'severity'))
  // Every value the severity has had, oldest first: Medium → High → Critical → High.
  const chain: IncidentSeverity[] = (() => {
    const steps = severityChanges ?? []
    const first = steps[0]
    if (!first) return [currentSeverity]
    // Start from what was reported (or, for older records, the first "from"), then each change.
    const start = first.fromSeverity ?? first.toSeverity
    return [start, ...steps.slice(first.fromSeverity ? 0 : 1).map((x) => x.toSeverity)]
  })()
  const changeSteps = (severityChanges ?? []).filter((x) => x.fromSeverity)
  const SOURCE_LABEL: Record<IncidentSeverityStep['source'], string> = {
    REPORTED: 'Reported',
    CORRECTION: 'Correction',
    REVIEW: 'Review',
    OTHER: 'Changed',
  }
  /** One line with the whole chain: [Medium] → [High] → [Critical] → [High]; plus "Corrected". */
  const severityLine = (
    <p className="flex flex-wrap items-center gap-1.5 text-sm text-foreground">
      {chain.map((sev, i) => (
        <React.Fragment key={`${sev}-${i}`}>
          {i > 0 && (
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
          )}
          {sevBadge(sev)}
        </React.Fragment>
      ))}
      <CorrectedBadge corrections={corrections} fieldKeys={['severity']} />
      {!severityDecided && !severityCorrected && reportedByName && (
        <span className="text-xs text-muted-foreground">reported by {reportedByName}</span>
      )}
      {severityDecision && !severityDecision.changed && (
        <span className="text-xs text-muted-foreground">confirmed at review</span>
      )}
    </p>
  )
  /** Reason (when changed) and who decided, under the severity line; plus every change on request. */
  const decisionDetails = severityDecision ? (
    <div className="space-y-1 text-sm">
      {severityDecision.reason && (
        <p className="whitespace-pre-wrap text-foreground">
          <span className="text-muted-foreground">Reason: </span>
          {severityDecision.reason}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {severityDecision.changed ? 'Changed' : 'Confirmed'} at review by {severityDecision.byName ?? 'Unknown'} ·{' '}
        {formatOrganisationDateTime(severityDecision.at)}
      </p>
    </div>
  ) : null

  const severityHistory =
    changeSteps.length > 1 ? (
      <div className="text-sm">
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setShowSeverityHistory((v) => !v)}
        >
          {showSeverityHistory ? 'Hide changes' : `View all changes (${changeSteps.length})`}
        </button>
        {showSeverityHistory && (
          <ol className="mt-2 space-y-2 border-l border-border pl-3">
            {(severityChanges ?? []).map((step, i) => (
              <li key={`${step.at}-${i}`} className="space-y-0.5">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{SOURCE_LABEL[step.source]}</span>
                  {step.fromSeverity && (
                    <>
                      {sevBadge(step.fromSeverity)}
                      <span aria-hidden className="text-muted-foreground">
                        →
                      </span>
                    </>
                  )}
                  {sevBadge(step.toSeverity)}
                </p>
                {step.reason && <p className="whitespace-pre-wrap text-foreground">{step.reason}</p>}
                <p className="text-xs text-muted-foreground">
                  {step.source === 'REPORTED' ? (reportedByName ?? step.byName ?? 'Reporter') : (step.byName ?? 'Unknown')}{' '}
                  · {formatOrganisationDateTime(step.at)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    ) : null

  const yesNo = (v: boolean | null) => (v === true ? 'Yes' : v === false ? 'No' : 'Not answered')
  /** Earlier review cycles (the incident was reopened); read-only history. */
  const previousReviews =
    reviewCycles && reviewCycles.length > 0 ? (
      <div className="rounded-lg border border-border p-3 text-sm">
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => setShowPreviousReviews((v) => !v)}
        >
          {showPreviousReviews ? 'Hide previous reviews' : `Previous reviews (${reviewCycles.length})`}
        </button>
        {showPreviousReviews && (
          <ol className="mt-3 space-y-4">
            {[...reviewCycles].reverse().map((c) => (
              <li key={c.id} className="space-y-1.5 border-l-2 border-border pl-3">
                <p className="font-medium text-foreground">Review {c.cycleNumber}</p>
                <p className="text-xs text-muted-foreground">
                  Reviewed by {c.reviewedByName ?? 'Unknown'}
                  {c.reviewedAt ? ` · ${formatOrganisationDateTime(c.reviewedAt)}` : ''}
                  {c.lastUpdatedAt && c.reviewedAt && c.lastUpdatedAt !== c.reviewedAt
                    ? ` · last updated by ${c.lastUpdatedByName ?? 'Unknown'} · ${formatOrganisationDateTime(c.lastUpdatedAt)}`
                    : ''}
                </p>
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground">Severity at review:</span>
                  {c.confirmedSeverity ? sevBadge(c.confirmedSeverity) : 'Not decided'}
                </p>
                <p>
                  <span className="text-muted-foreground">Decision: </span>
                  {decisionLabel(c.decision)}
                  {c.decisionReason ? ` — ${c.decisionReason}` : ''}
                </p>
                <dl className="space-y-0.5">
                  {(
                    [
                      ['Safeguarding concern', c.safeguardingConcern],
                      ['Possible abuse or neglect', c.possibleAbuseOrNeglect],
                      ['Immediate or ongoing risk', c.immediateRisk],
                      ['Further medical attention', c.furtherMedicalAttention],
                      ['External notification required', c.externalNotificationRequired],
                      ['Immediate senior management escalation', c.escalationRequired],
                    ] as const
                  )
                    // Older questions only appear when they were answered.
                    .filter(([label, v]) =>
                      label === 'Possible abuse or neglect' || label === 'External notification required'
                        ? v !== null
                        : true,
                    )
                    .map(([label, v]) => (
                      <div key={label} className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="text-foreground">{yesNo(v)}</dd>
                      </div>
                    ))}
                </dl>
                {c.immediateRisk && c.protectiveAction && (
                  <p className="whitespace-pre-wrap">
                    <span className="text-muted-foreground">Protective action: </span>
                    {c.protectiveAction}
                  </p>
                )}
                {c.managementNotes && (
                  <p className="whitespace-pre-wrap">
                    <span className="text-muted-foreground">Notes: </span>
                    {c.managementNotes}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Incident reopened by {c.archivedByName ?? 'Unknown'} · {formatOrganisationDateTime(c.archivedAt)}
                  {c.reopenReason ? ` — ${c.reopenReason}` : ''}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    ) : null

  if (!canEdit) {
    if (!review)
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">No manager review recorded yet.</p>
          {previousReviews}
        </div>
      )
    return (
      <div className="space-y-3">
      {reviewSummary}
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Severity</dt>
          <dd className="space-y-1 text-right font-medium text-foreground">
            {severityLine}
            {decisionDetails}
            {severityHistory}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Decision</dt>
          <dd className="font-medium text-foreground">{decisionText}</dd>
        </div>
        {REVIEW_QUESTIONS.map((q) => (
          <div key={q.key} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{q.label}</dt>
            <dd className="font-medium text-foreground">
              {review[q.key as keyof IncidentReview] === true
                ? 'Yes'
                : review[q.key as keyof IncidentReview] === false
                  ? 'No'
                  : 'Not answered'}
            </dd>
          </div>
        ))}
        {review.immediateRisk && review.protectiveAction && (
          <div>
            <p className="text-muted-foreground">Immediate protective action</p>
            <p className="whitespace-pre-wrap text-foreground">{review.protectiveAction}</p>
          </div>
        )}
        {review.managementNotes && (
          <div className="mt-2 border-t border-border pt-2">
            <p className="text-muted-foreground">Manager&apos;s review notes</p>
            <p className="whitespace-pre-wrap text-foreground">{review.managementNotes}</p>
          </div>
        )}
      </dl>
      {previousReviews}
      </div>
    )
  }

  /** New severity + reason, shown when "Change severity" is chosen (first decision or later). */
  const changeSeverityFields = (
    <>
      {severityChoice === 'change' && (
        <div className="space-y-2 pl-6">
          <p className="text-xs font-medium text-foreground">
            New severity
            <Req />
          </p>
          <div className="space-y-1.5">
            {INCIDENT_SEVERITY_FORM_OPTIONS.filter((o) => o.value !== currentSeverity).map((o) => (
              <label key={o.value} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="review-new-severity"
                  className="mt-0.5"
                  checked={newSeverity === o.value}
                  onChange={() => setNewSeverity(o.value)}
                />
                <span>
                  <span className="font-medium text-foreground">{o.label}</span>{' '}
                  <span className="text-muted-foreground">({o.hint})</span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs font-medium text-foreground">
            Reason
            <Req />
          </p>
          <Textarea
            id="review-severity-reason"
            rows={2}
            maxLength={2000}
            value={severityReason}
            onChange={(e) => setSeverityReason(e.target.value)}
            placeholder="Reason for the change (required)"
            aria-label="Reason for changing the severity"
            // The shared 60% placeholder is too faint here (it is the only prompt for this field).
            className="placeholder:text-muted-foreground dark:placeholder:text-foreground/75"
          />
        </div>
      )}
    </>
  )

  return (
    <div className="space-y-3">
      {reviewSummary}
      <fieldset className="space-y-2 rounded-lg border border-border p-3">
        <legend className="px-1 text-xs uppercase tracking-wide text-muted-foreground">
          Severity
          {!severityDecided && <Req />}
        </legend>
        {severityLine}
        {severityDecided ? (
          <div className="space-y-2">
            {decisionDetails}
            {severityHistory}
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={severityChoice === 'change'}
                onChange={(e) => setSeverityChoice(e.target.checked ? 'change' : '')}
              />
              Change severity
            </label>
            {changeSeverityFields}
          </div>
        ) : (
          <div className="space-y-2">
            <label
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm',
                severityChoice === 'confirm' ? 'border-primary bg-primary/5' : 'border-border',
              )}
            >
              <input
                type="radio"
                name="review-severity"
                checked={severityChoice === 'confirm'}
                onChange={() => setSeverityChoice('confirm')}
              />
              Confirm {severityLabel(currentSeverity)}
            </label>
            <label
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm',
                severityChoice === 'change' ? 'border-primary bg-primary/5' : 'border-border',
              )}
            >
              <input
                type="radio"
                name="review-severity"
                checked={severityChoice === 'change'}
                onChange={() => setSeverityChoice('change')}
              />
              Change severity
            </label>
            {changeSeverityFields}
          </div>
        )}
      </fieldset>
      {REVIEW_QUESTIONS.map((q) => (
        <div key={q.key}>
          <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-sm text-foreground" id={`review-q-${q.key}`}>
              {q.label}
            </span>
            <p className="text-xs text-muted-foreground">{q.hint}</p>
          </div>
          <div role="radiogroup" aria-labelledby={`review-q-${q.key}`} className="flex shrink-0 gap-3">
            {(['yes', 'no'] as const).map((v) => (
              <label key={v} className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground">
                <input
                  type="radio"
                  name={`review-q-${q.key}`}
                  checked={answers[q.key as string] === v}
                  onChange={() => setAnswers((a) => ({ ...a, [q.key]: v }))}
                />
                {v === 'yes' ? 'Yes' : 'No'}
              </label>
            ))}
          </div>
          </div>
          {q.key === 'immediateRisk' && answers.immediateRisk === 'yes' && (
            <div className="mt-2 space-y-1 pl-0">
              <p className="text-xs font-medium text-foreground">
                What immediate protective action is required or has been taken?
                <Req />
              </p>
              <Textarea
                rows={2}
                maxLength={4000}
                value={protectiveAction}
                onChange={(e) => setProtectiveAction(e.target.value)}
                placeholder="e.g. Removed the staff member from the visit, arranged urgent medical support, increased supervision, made the environment safe, contacted safeguarding / emergency services"
                aria-label="Immediate protective action"
                className="placeholder:text-muted-foreground dark:placeholder:text-foreground/75"
              />
            </div>
          )}
        </div>
      ))}
      <div>
        <label className="text-sm font-medium text-foreground">Manager&apos;s review notes</label>
        <Textarea className="mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <fieldset className="space-y-2 rounded-lg border border-border p-3">
        <legend className="px-1 text-xs uppercase tracking-wide text-muted-foreground">Decision</legend>
        {!reviewOpen ? (
          <p className="text-sm text-foreground">
            {decisionText}
            <span className="ml-1 text-xs text-muted-foreground">(decided at review)</span>
          </p>
        ) : (
          <div className="space-y-2">
            {(
              [
                ['INVESTIGATE', 'Investigate'],
                ['NO_INVESTIGATION', 'No investigation needed — ready to close'],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm',
                  decision === value ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <input
                  type="radio"
                  name="review-decision"
                  checked={decision === value}
                  onChange={() => setDecision(value)}
                />
                {label}
              </label>
            ))}
            {decision === 'NO_INVESTIGATION' && (
              <div className="space-y-2 pl-6">
                {investigationAdvised.length > 0 && (
                  <p className="rounded-md border border-warning/40 bg-warning/10 p-2 text-sm text-warning">
                    An investigation is usually needed because {investigationAdvised.join(', ')}. You can still
                    continue — the reason is kept in the audit trail.
                  </p>
                )}
                <p className="text-xs font-medium text-foreground">
                  Reason
                  <Req />
                </p>
                <Textarea
                  rows={2}
                  maxLength={2000}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Why no investigation is needed (required)"
                  aria-label="Why no investigation is needed"
                  className="placeholder:text-muted-foreground dark:placeholder:text-foreground/75"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {decision
                ? decision === 'INVESTIGATE'
                  ? 'Saving moves the incident to Under Investigation.'
                  : 'Saving moves the incident to Awaiting Closure.'
                : 'Leave this empty to save the review and decide later.'}
            </p>
          </div>
        )}
      </fieldset>

      {changedAfterDecision && (
        <div className="space-y-1 rounded-lg border border-warning/40 bg-warning/5 p-3">
          <p className="text-xs font-medium text-foreground">
            Reason for the change
            <Req />
          </p>
          <p className="text-xs text-muted-foreground">
            The decision was already made, so changes to the review are recorded on the timeline.
          </p>
          <Textarea
            rows={2}
            maxLength={2000}
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="e.g. Family raised a new concern"
            aria-label="Reason for changing the review"
            className="placeholder:text-muted-foreground dark:placeholder:text-foreground/75"
          />
        </div>
      )}

      {problem && (
        <p role="alert" className="text-sm text-destructive dark:text-red-400">
          {problem}
        </p>
      )}
      <Button className="w-full" size="sm" loading={mutation.isPending} onClick={save}>
        Save review
      </Button>
      {previousReviews}
    </div>
  )
}
