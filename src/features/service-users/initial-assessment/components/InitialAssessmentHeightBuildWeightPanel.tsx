import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import {
  isPreAssessmentFormEnabled,
  PRE_ASSESSMENT_MUAC_FORM_KEY,
} from '@/features/service-users/initial-assessment/utils/pre-assessment-form-enabled'
import type { ReactNode } from 'react'

type Props = {
  title: string
  questions: InitialAssessmentQuestion[]
  renderField: (q: InitialAssessmentQuestion) => ReactNode
}

function findByFieldKey(questions: InitialAssessmentQuestion[], key: string) {
  return questions.find((q) => fieldKeyOf(q) === key)
}

function findByText(questions: InitialAssessmentQuestion[], text: string) {
  return questions.find((q) => q.questionText.trim() === text)
}

/** Paper §4.10 — build, height, weight, unable-to-weigh gate, and MUAC alternative. */
export function InitialAssessmentHeightBuildWeightPanel({ title, questions, renderField }: Props) {
  const { data: generalSettings } = useGeneralSettings()
  const muacFormEnabled = isPreAssessmentFormEnabled(generalSettings, PRE_ASSESSMENT_MUAC_FORM_KEY)

  const buildQ = findByText(questions, 'Build type (frail / small / medium / large / obese)')
  const heightQ = findByText(questions, 'Height band or height (cm)')
  const unableQ = findByFieldKey(questions, 'unableToWeigh')
  const weightQ = findByFieldKey(questions, 'weightKg') ?? findByText(questions, 'Weight (kg)')
  const reasonQ = findByFieldKey(questions, 'unableToWeighReason')
  const muacCmQ = findByFieldKey(questions, 'muacCm')
  const muacRiskQ = findByFieldKey(questions, 'muacNutritionalRisk')

  const showMuac = Boolean(muacCmQ ?? muacRiskQ)

  return (
    <InitialAssessmentSection12PanelShell title={title} testId="ia-spec-group-4.10" bodyVariant="content">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {buildQ ? <div>{renderField(buildQ)}</div> : null}
          {heightQ ? <div>{renderField(heightQ)}</div> : null}
        </div>

        {unableQ ? <div>{renderField(unableQ)}</div> : null}

        {weightQ ? <div className="sm:max-w-xs">{renderField(weightQ)}</div> : null}

        {showMuac ? (
          <div
            className="space-y-4 rounded-lg border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"
            data-testid="ia-muac-panel"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                Nutritional risk using Mid Upper Arm Circumference (MUAC)
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Record MUAC when standard weighing is not possible. Bands follow BAPEN-style green / amber / red
                interpretation.
                {muacFormEnabled
                  ? ' The standalone MUAC pre-assessment form is enabled for your organisation (Settings → Pre Assessment).'
                  : ' Enable “Nutritional Risk using MUAC” under Settings → Pre Assessment to use the standalone form alongside this section.'}
              </p>
            </div>
            {reasonQ ? <div>{renderField(reasonQ)}</div> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {muacCmQ ? <div>{renderField(muacCmQ)}</div> : null}
              {muacRiskQ ? <div>{renderField(muacRiskQ)}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </InitialAssessmentSection12PanelShell>
  )
}
