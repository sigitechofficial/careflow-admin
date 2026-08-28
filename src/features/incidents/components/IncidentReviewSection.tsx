import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { useUpsertIncidentReview } from '@/features/incidents/hooks/useIncidents'
import type {
  IncidentReview,
  IncidentSeverity,
  UpsertIncidentReviewInput,
} from '@/features/incidents/types'

const selectClass =
  'h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const REVIEW_QUESTIONS: { key: keyof UpsertIncidentReviewInput; label: string }[] = [
  { key: 'investigationRequired', label: 'Investigation required?' },
  { key: 'safeguardingConcern', label: 'Safeguarding concern?' },
  { key: 'possibleAbuseOrNeglect', label: 'Possible abuse or neglect?' },
  { key: 'furtherMedicalAttention', label: 'Further medical attention required?' },
  { key: 'externalNotificationRequired', label: 'External notification required?' },
  { key: 'escalationRequired', label: 'Escalation required?' },
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
}: {
  incidentId: string
  review: IncidentReview | null
  canEdit: boolean
}) {
  const mutation = useUpsertIncidentReview(incidentId)
  const [confirmedSeverity, setConfirmedSeverity] = React.useState<string>(review?.confirmedSeverity ?? '')
  const [answers, setAnswers] = React.useState<Record<string, string>>(() => ({
    investigationRequired: triToValue(review?.investigationRequired),
    safeguardingConcern: triToValue(review?.safeguardingConcern),
    possibleAbuseOrNeglect: triToValue(review?.possibleAbuseOrNeglect),
    furtherMedicalAttention: triToValue(review?.furtherMedicalAttention),
    externalNotificationRequired: triToValue(review?.externalNotificationRequired),
    escalationRequired: triToValue(review?.escalationRequired),
  }))
  const [notes, setNotes] = React.useState(review?.managementNotes ?? '')

  function save() {
    const input: UpsertIncidentReviewInput = {
      confirmedSeverity: (confirmedSeverity || undefined) as IncidentSeverity | undefined,
      investigationRequired: valueToTri(answers.investigationRequired),
      safeguardingConcern: valueToTri(answers.safeguardingConcern),
      possibleAbuseOrNeglect: valueToTri(answers.possibleAbuseOrNeglect),
      furtherMedicalAttention: valueToTri(answers.furtherMedicalAttention),
      externalNotificationRequired: valueToTri(answers.externalNotificationRequired),
      escalationRequired: valueToTri(answers.escalationRequired),
      managementNotes: notes.trim() || undefined,
    }
    mutation.mutate(input)
  }

  if (!canEdit) {
    if (!review) return <p className="text-sm text-muted-foreground">No manager review recorded yet.</p>
    return (
      <dl className="space-y-2 text-sm">
        {REVIEW_QUESTIONS.map((q) => (
          <div key={q.key} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{q.label}</dt>
            <dd className="font-medium text-foreground">
              {review[q.key as keyof IncidentReview] === true
                ? 'Yes'
                : review[q.key as keyof IncidentReview] === false
                  ? 'No'
                  : '—'}
            </dd>
          </div>
        ))}
        {review.managementNotes && (
          <p className="mt-2 whitespace-pre-wrap border-t border-border pt-2 text-foreground">
            {review.managementNotes}
          </p>
        )}
      </dl>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Confirmed severity</label>
        <select className={`mt-1 ${selectClass}`} value={confirmedSeverity} onChange={(e) => setConfirmedSeverity(e.target.value)}>
          <option value="">Not set</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>
      {REVIEW_QUESTIONS.map((q) => (
        <div key={q.key} className="flex items-center justify-between gap-3">
          <label className="text-sm text-foreground">{q.label}</label>
          <select
            className="h-8 w-28 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={answers[q.key as string]}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
          >
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      ))}
      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Management notes</label>
        <Textarea className="mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button className="w-full" size="sm" loading={mutation.isPending} onClick={save}>
        Save review
      </Button>
    </div>
  )
}
