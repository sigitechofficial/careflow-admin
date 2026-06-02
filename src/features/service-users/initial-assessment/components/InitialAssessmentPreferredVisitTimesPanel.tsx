import type { ReactNode } from 'react'
import { preferredVisitTimesQuestion } from '@/features/service-users/initial-assessment/utils/preferred-visit-times'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import {
  IA_HINT_CLASS,
  IA_PANEL_TITLE_CLASS,
  IA_SUBSECTION_PANEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { cn } from '@/shared/lib/utils'

type Props = {
  questions: InitialAssessmentQuestion[]
  renderField: (q: InitialAssessmentQuestion) => ReactNode
}

/** Standalone panel for preferred visit times (outside person-centred cards). */
export function InitialAssessmentPreferredVisitTimesPanel({ questions, renderField }: Props) {
  const question = preferredVisitTimesQuestion(questions)
  if (!question) return null

  const field = renderField(question)
  if (!field) return null

  return (
    <section
      className={IA_SUBSECTION_PANEL_CLASS}
      data-testid="ia-preferred-visit-times-panel"
      aria-labelledby="ia-preferred-visit-times-heading"
    >
      <div className="border-b border-border px-4 py-3">
        <h3 id="ia-preferred-visit-times-heading" className={IA_PANEL_TITLE_CLASS}>
          Preferred visit times
        </h3>
        <p className={cn('mt-0.5', IA_HINT_CLASS)}>Rota and scheduling preferences</p>
      </div>
      <div className="p-4">
        {field}
      </div>
    </section>
  )
}
