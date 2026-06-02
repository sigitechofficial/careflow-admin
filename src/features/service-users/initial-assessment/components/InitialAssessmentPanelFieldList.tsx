import {
  InitialAssessmentSection12FieldRow,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { isMultiSelectOptionsGridQuestion } from '@/features/service-users/initial-assessment/utils/multi-select-options-grid'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { ReactNode } from 'react'

type Props = {
  questions: InitialAssessmentQuestion[]
  renderField: (q: InitialAssessmentQuestion) => ReactNode
  renderMultiSelect?: (q: InitialAssessmentQuestion) => ReactNode
}

export function InitialAssessmentPanelFieldList({ questions, renderField, renderMultiSelect }: Props) {
  return (
    <div className="divide-y divide-border/60 rounded-lg border border-border/60">
      {questions.map((q) => (
        <div key={q.id} className="px-3">
          <InitialAssessmentSection12FieldRow>
            {isMultiSelectOptionsGridQuestion(q) && renderMultiSelect
              ? renderMultiSelect(q)
              : renderField(q)}
          </InitialAssessmentSection12FieldRow>
        </div>
      ))}
    </div>
  )
}
