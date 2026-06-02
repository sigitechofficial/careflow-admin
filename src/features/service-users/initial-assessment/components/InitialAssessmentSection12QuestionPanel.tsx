import type { ReactNode } from 'react'
import type { SpecRefGroup } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { InitialAssessmentPanelFieldList } from '@/features/service-users/initial-assessment/components/InitialAssessmentPanelFieldList'
import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'

type Props = {
  group: SpecRefGroup
  renderField: (q: InitialAssessmentQuestion) => ReactNode
  renderMultiSelect?: (q: InitialAssessmentQuestion) => ReactNode
}

export function InitialAssessmentSection12QuestionPanel({ group, renderField, renderMultiSelect }: Props) {
  return (
    <InitialAssessmentSection12PanelShell title={group.label} testId={`ia-s12-${group.specRef}`} bodyVariant="content">
      <InitialAssessmentPanelFieldList
        questions={group.questions}
        renderField={renderField}
        renderMultiSelect={renderMultiSelect ?? renderField}
      />
    </InitialAssessmentSection12PanelShell>
  )
}
