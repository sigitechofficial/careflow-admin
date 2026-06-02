import {
  InitialAssessmentSection12FieldRow,
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { IA_INTRO_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import { partitionVitalsSignsQuestions } from '@/features/service-users/initial-assessment/utils/vitals-validation'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { ReactNode } from 'react'

type Props = {
  title: string
  questions: InitialAssessmentQuestion[]
  renderField: (q: InitialAssessmentQuestion) => ReactNode
}

export function InitialAssessmentVitalsSignsPanel({ title, questions, renderField }: Props) {
  const { measurementQuestions, contextQuestion } = partitionVitalsSignsQuestions(questions)

  return (
    <InitialAssessmentSection12PanelShell title={title} testId="ia-spec-group-4.2" bodyVariant="content">
      <p className={IA_INTRO_CLASS}>
        Enter each measured value in the number box on the right. Add optional context at the bottom only when
        needed (e.g. cuff size, post-exertion, refused).
      </p>

      <div className="divide-y divide-border/60 rounded-lg border border-border/60">
        {measurementQuestions.map((q) => (
          <div key={q.id} className="px-3">
            <InitialAssessmentSection12FieldRow>{renderField(q)}</InitialAssessmentSection12FieldRow>
          </div>
        ))}
      </div>

      {contextQuestion ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3">
          {renderField(contextQuestion)}
        </div>
      ) : null}
    </InitialAssessmentSection12PanelShell>
  )
}
