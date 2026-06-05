import type { ReactNode } from 'react'
import { InitialAssessmentPainAssessmentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentPainAssessmentPanel'
import { InitialAssessmentPanelFieldList } from '@/features/service-users/initial-assessment/components/InitialAssessmentPanelFieldList'
import {
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import type { ServiceUserDetail } from '@/features/service-users/api'
import { isPainPanelTemplateQuestion } from '@/features/service-users/initial-assessment/utils/pain-questions'
import type { PainAssessmentMetadata } from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { SpecRefGroup } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'

type Props = {
  group: SpecRefGroup
  painAssessment: PainAssessmentMetadata
  disabled?: boolean
  serviceUserDetail?: ServiceUserDetail | null
  onPainAssessmentChange: (next: PainAssessmentMetadata) => void
  renderField: (q: InitialAssessmentQuestion) => ReactNode
  renderMultiSelect?: (q: InitialAssessmentQuestion) => ReactNode
  /** When false, only checklist fields show (Pain Assessment Tool is on its own tab). */
  showPainAssessmentTool?: boolean
}

export function InitialAssessmentSection5PainPanel({
  group,
  painAssessment,
  disabled,
  serviceUserDetail,
  onPainAssessmentChange,
  renderField,
  renderMultiSelect,
  showPainAssessmentTool = true,
}: Props) {
  const panelQuestionIds = new Set(
    group.questions.filter(isPainPanelTemplateQuestion).map((q) => q.id),
  )
  const gateQuestions = group.questions.filter(
    (q) =>
      !panelQuestionIds.has(q.id) &&
      (q.questionText === 'Pain / distress options' || q.questionText === 'Pain or distress identified?'),
  )
  const followUpQuestions = group.questions.filter(
    (q) => !panelQuestionIds.has(q.id) && !gateQuestions.some((g) => g.id === q.id),
  )

  return (
    <InitialAssessmentSection12PanelShell
      title={group.label}
      testId="ia-spec-group-5.3"
      bodyVariant="content"
    >
      <InitialAssessmentPanelFieldList
        questions={gateQuestions}
        renderField={renderField}
        renderMultiSelect={renderMultiSelect}
      />

      {showPainAssessmentTool ? (
        <InitialAssessmentPainAssessmentPanel
          value={painAssessment}
          disabled={disabled}
          serviceUserDetail={serviceUserDetail}
          onChange={onPainAssessmentChange}
        />
      ) : null}

      {followUpQuestions.length > 0 ? (
        <InitialAssessmentPanelFieldList
          questions={followUpQuestions}
          renderField={renderField}
          renderMultiSelect={renderMultiSelect}
        />
      ) : null}
    </InitialAssessmentSection12PanelShell>
  )
}
