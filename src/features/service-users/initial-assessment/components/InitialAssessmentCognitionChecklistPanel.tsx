import {
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { InitialAssessmentPanelFieldList } from '@/features/service-users/initial-assessment/components/InitialAssessmentPanelFieldList'
import { IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { ReactNode } from 'react'

type Props = {
  title: string
  questions: InitialAssessmentQuestion[]
  renderField: (q: InitialAssessmentQuestion) => ReactNode
  renderMultiSelect: (q: InitialAssessmentQuestion) => ReactNode
}

/** §10.6a cognition and behaviour yes/no checklist — compact panel rows. */
export function InitialAssessmentCognitionChecklistPanel({
  title,
  questions,
  renderField,
  renderMultiSelect,
}: Props) {
  return (
    <InitialAssessmentSection12PanelShell title={title} testId="ia-spec-group-10.6a" bodyVariant="content">
      <p className={IA_HINT_CLASS}>
        Tick each statement that applies. Derived concern gates update automatically from your answers.
      </p>
      <InitialAssessmentPanelFieldList
        questions={questions}
        renderField={renderField}
        renderMultiSelect={renderMultiSelect}
      />
    </InitialAssessmentSection12PanelShell>
  )
}
