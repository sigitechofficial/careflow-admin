import {
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { InitialAssessmentPanelFieldList } from '@/features/service-users/initial-assessment/components/InitialAssessmentPanelFieldList'
import { IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { ReactNode } from 'react'

type Props = {
  carePlanGroup?: { label: string; questions: InitialAssessmentQuestion[] }
  actionsGroup?: { label: string; questions: InitialAssessmentQuestion[] }
  managerGroup?: { label: string; questions: InitialAssessmentQuestion[] }
  renderField: (q: InitialAssessmentQuestion) => ReactNode
  renderMultiSelect: (q: InitialAssessmentQuestion) => ReactNode
}

export function InitialAssessmentSignOffWorkflowPanel({
  carePlanGroup,
  actionsGroup,
  managerGroup,
  renderField,
  renderMultiSelect,
}: Props) {
  if (!carePlanGroup && !actionsGroup && !managerGroup) return null

  return (
    <div className="space-y-6">
      {carePlanGroup ? (
        <InitialAssessmentSection12PanelShell
          title={carePlanGroup.label}
          testId="ia-spec-group-14.3"
          bodyVariant="content"
        >
          <p className={IA_HINT_CLASS}>
            Confirm generated care-plan recommendations were reviewed on the Schedule tab before submit.
          </p>
          <InitialAssessmentPanelFieldList
            questions={carePlanGroup.questions}
            renderField={renderField}
            renderMultiSelect={renderMultiSelect}
          />
        </InitialAssessmentSection12PanelShell>
      ) : null}

      {actionsGroup ? (
        <InitialAssessmentSection12PanelShell
          title={actionsGroup.label}
          testId="ia-spec-group-14.4"
          bodyVariant="content"
        >
          <p className={IA_HINT_CLASS}>
            Confirm open actions from this assessment were reviewed and assigned.
          </p>
          <InitialAssessmentPanelFieldList
            questions={actionsGroup.questions}
            renderField={renderField}
            renderMultiSelect={renderMultiSelect}
          />
        </InitialAssessmentSection12PanelShell>
      ) : null}

      {managerGroup ? (
        <InitialAssessmentSection12PanelShell
          title={managerGroup.label}
          testId="ia-spec-group-14.7"
          bodyVariant="content"
        >
          <p className={IA_HINT_CLASS}>
            Record whether manager review is required and if care can start. Final approval may also be
            completed on the Review tab after submit.
          </p>
          <InitialAssessmentPanelFieldList
            questions={managerGroup.questions}
            renderField={renderField}
            renderMultiSelect={renderMultiSelect}
          />
        </InitialAssessmentSection12PanelShell>
      ) : null}
    </div>
  )
}
