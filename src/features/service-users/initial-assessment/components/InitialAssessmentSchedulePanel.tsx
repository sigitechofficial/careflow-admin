import { findQuestionByFieldKey } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { formatAnswerForDisplay } from '@/features/service-users/initial-assessment/utils/answer-display'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
  InitialAssessmentSubmission,
} from '@/features/service-users/initial-assessment/types'

type Props = {
  submission: InitialAssessmentSubmission | null | undefined
  sections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
}

export function InitialAssessmentSchedulePanel({ submission, sections, draftAnswers }: Props) {
  const nextReviewQ = findQuestionByFieldKey(sections, 'nextReviewDate')
  const freqQ = findQuestionByFieldKey(sections, 'reviewFrequency')
  const reasonQ = findQuestionByFieldKey(sections, 'assessmentReason')

  const nextDate = nextReviewQ ? formatAnswerForDisplay(draftAnswers[nextReviewQ.id], nextReviewQ) : '—'
  const frequency = freqQ ? formatAnswerForDisplay(draftAnswers[freqQ.id], freqQ) : '—'
  const reason = reasonQ ? formatAnswerForDisplay(draftAnswers[reasonQ.id], reasonQ) : '—'

  const dateVal = nextReviewQ ? draftAnswers[nextReviewQ.id]?.dateValue : undefined
  const daysUntil =
    dateVal != null
      ? Math.ceil((new Date(dateVal).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review schedule from section 14 (governance). Values reflect the active submission&apos;s saved answers.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Assessment reason</p>
          <p className="mt-1 text-sm font-semibold">{reason}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Next review</p>
          <p className="mt-1 text-lg font-semibold text-teal-800 dark:text-teal-300">{nextDate}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Frequency</p>
          <p className="mt-1 text-lg font-semibold">{frequency}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Days until review</p>
          <p className="mt-1 text-lg font-semibold">
            {daysUntil != null && !Number.isNaN(daysUntil) ? daysUntil : '—'}
          </p>
        </div>
      </div>
      {submission ? (
        <p className="text-xs text-muted-foreground">
          Submission status: {submission.status.replace('_', ' ')} · Updated{' '}
          {new Date(submission.updatedAt).toLocaleString()}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No active submission.</p>
      )}
    </div>
  )
}
