import type { ReactNode } from 'react'
import { InitialAssessmentSection12FieldRow } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { sortSection4GlucoseQuestions } from '@/features/service-users/initial-assessment/utils/section-4-physical-assessment-display-order'

type Props = {
  title: string
  questions: InitialAssessmentQuestion[]
  renderField: (q: InitialAssessmentQuestion) => ReactNode
}

/** Paper order: diabetic Yes/No, type when Yes, then peripheral blood glucose level. */
export function InitialAssessmentSection4GlucosePanel({ title, questions, renderField }: Props) {
  const ordered = sortSection4GlucoseQuestions(questions)

  return (
    <InitialAssessmentSection12PanelShell title={title} testId="ia-spec-group-4.4" bodyVariant="content">
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {ordered.map((q) => (
          <InitialAssessmentSection12FieldRow key={q.id}>
            {renderField(q)}
          </InitialAssessmentSection12FieldRow>
        ))}
      </div>
    </InitialAssessmentSection12PanelShell>
  )
}
