import type { ReactNode } from 'react'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { FallsCaseFinding } from '@/features/service-users/initial-assessment/utils/falls-case-finding'
import {
  IA_CALLOUT_AMBER_CLASS,
  IA_CALLOUT_NEUTRAL_CLASS,
  IA_CALLOUT_TEAL_CLASS,
  IA_HINT_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  questions: InitialAssessmentQuestion[]
  caseFinding: FallsCaseFinding
  renderField: (q: InitialAssessmentQuestion) => ReactNode
}

const STATUS_COPY: Record<FallsCaseFinding['status'], { className: string; title: string; body: string }> = {
  required: {
    className: IA_CALLOUT_AMBER_CLASS,
    title: 'Falls assessment required',
    body: 'Complete the falls screen below (multifactorial falls assessment and actions).',
  },
  suggested: {
    className: IA_CALLOUT_TEAL_CLASS,
    title: 'Falls assessment suggested',
    body: 'Use your judgement — completing the falls screen below is recommended.',
  },
  not_needed: {
    className: IA_CALLOUT_NEUTRAL_CLASS,
    title: 'Falls assessment not needed',
    body: 'No falls, unsteadiness, fear of falling or clinical concern recorded.',
  },
  pending: {
    className: IA_CALLOUT_NEUTRAL_CLASS,
    title: 'Screening pending',
    body: 'Answer the questions above to see whether a falls assessment is needed.',
  },
}

/**
 * §12.7 falls history and concerns — always asked, with no consent gate, before the paper screen.
 * Case-finding only: no score is used to predict whether the person will fall (NICE NG249).
 */
export function InitialAssessmentFallsHistoryPanel({ questions, caseFinding, renderField }: Props) {
  if (!questions.length) return null
  const copy = STATUS_COPY[caseFinding.status]
  return (
    <div
      className="mb-6 space-y-4 rounded-sm border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-card"
      data-testid="ia-falls-history"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">Falls history and concerns</p>
        <p className={IA_HINT_CLASS}>Always answer — no consent needed for these questions.</p>
      </div>
      {questions.map((q) => (
        <div key={q.id}>{renderField(q)}</div>
      ))}
      <div className={copy.className} data-testid="ia-falls-case-finding">
        <p className="text-sm font-semibold">{copy.title}</p>
        <p className="text-sm">{copy.body}</p>
        {caseFinding.reasons.length ? (
          <p className={IA_HINT_CLASS}>Because: {caseFinding.reasons.join(' · ')}</p>
        ) : null}
      </div>
    </div>
  )
}
