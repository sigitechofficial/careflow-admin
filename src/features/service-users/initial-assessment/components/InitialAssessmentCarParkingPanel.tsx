import {
  InitialAssessmentSection12FieldRow,
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import {
  CAR_PARKING_FIELD_KEYS,
  carParkingRiskSummary,
  singleSelectOptionValue,
} from '@/features/service-users/initial-assessment/utils/car-parking-risk.util'
import { fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { IA_CALLOUT_NEUTRAL_CLASS, IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
} from '@/features/service-users/initial-assessment/types'
import { cn } from '@/shared/lib/utils'
import type { ReactNode } from 'react'

const FIELD_ORDER: string[] = [
  CAR_PARKING_FIELD_KEYS.arrangements,
  CAR_PARKING_FIELD_KEYS.roadsideAvailable,
  CAR_PARKING_FIELD_KEYS.likelihood,
  CAR_PARKING_FIELD_KEYS.severity,
  CAR_PARKING_FIELD_KEYS.controlMeasures,
  CAR_PARKING_FIELD_KEYS.otherRisks,
]

type Props = {
  title: string
  questions: InitialAssessmentQuestion[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  renderField: (q: InitialAssessmentQuestion) => ReactNode
}

function sortQuestions(questions: InitialAssessmentQuestion[]): InitialAssessmentQuestion[] {
  return [...questions].sort((a, b) => {
    const ai = FIELD_ORDER.indexOf(fieldKeyOf(a) ?? '')
    const bi = FIELD_ORDER.indexOf(fieldKeyOf(b) ?? '')
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })
}

function findQuestion(
  questions: InitialAssessmentQuestion[],
  fieldKey: string,
): InitialAssessmentQuestion | undefined {
  return questions.find((q) => fieldKeyOf(q) === fieldKey)
}

export function InitialAssessmentCarParkingPanel({
  title,
  questions,
  draftAnswers,
  renderField,
}: Props) {
  const ordered = sortQuestions(questions)
  const likelihoodQ = findQuestion(questions, CAR_PARKING_FIELD_KEYS.likelihood)
  const severityQ = findQuestion(questions, CAR_PARKING_FIELD_KEYS.severity)
  const likelihoodValue = likelihoodQ
    ? singleSelectOptionValue(draftAnswers[likelihoodQ.id])
    : undefined
  const severityValue = severityQ ? singleSelectOptionValue(draftAnswers[severityQ.id]) : undefined
  const riskSummary = carParkingRiskSummary(likelihoodValue, severityValue)

  return (
    <InitialAssessmentSection12PanelShell
      title={title}
      hint="Assess staff safety when parking and accessing the property."
      testId="ia-spec-group-3.12"
      bodyVariant="content"
    >
      <p className={cn(IA_CALLOUT_NEUTRAL_CLASS, 'text-sm')}>
        Record where carers can park, any access constraints, and the risk of harm without control measures
        in place. Control measures and local considerations (e.g. bus routes) help staff plan safe visits.
      </p>

      {ordered.map((q) => {
        const fieldKey = fieldKeyOf(q)
        const showScoreAfter = fieldKey === CAR_PARKING_FIELD_KEYS.severity

        return (
          <div key={q.id}>
            <InitialAssessmentSection12FieldRow>{renderField(q)}</InitialAssessmentSection12FieldRow>
            {showScoreAfter && riskSummary ? (
              <div
                className="mb-2 rounded-md border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/30"
                data-testid="ia-car-parking-risk-summary"
              >
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <p className="font-medium text-amber-950 dark:text-amber-100">
                    Score: <span className="tabular-nums">{riskSummary.score}</span>
                  </p>
                  <p className="font-medium text-amber-950 dark:text-amber-100">
                    Risk rating: {riskSummary.ratingLabel}
                  </p>
                </div>
                <p className={cn('mt-1', IA_HINT_CLASS)}>
                  Based on likelihood and severity without control measures. Add control measures below to
                  document how risk is reduced.
                </p>
              </div>
            ) : null}
          </div>
        )
      })}
    </InitialAssessmentSection12PanelShell>
  )
}
