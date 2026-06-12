import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { InitialAssessmentSection12FieldRow } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { groupedYesNoFieldOptions } from '@/features/service-users/initial-assessment/utils/field-render-options'
import { IA_CALLOUT_TEAL_CLASS, IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import type { InitialAssessmentAnswerInput, InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { isYesAnswer } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type { Section31FireQuestions } from '@/features/service-users/initial-assessment/utils/section-31-fire-safety'
import { shouldShowQuestion } from '@/features/service-users/initial-assessment/utils/conditional-visibility'
import type { InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import { cn } from '@/shared/lib/utils'
import type { InitialAssessmentFieldRenderOptions } from '@/features/service-users/initial-assessment/utils/field-render-options'

type Props = {
  fire: Section31FireQuestions
  allSections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  renderField: (q: InitialAssessmentQuestion, fieldOptions?: InitialAssessmentFieldRenderOptions) => ReactNode
  renderMultiSelect?: (q: InitialAssessmentQuestion) => ReactNode
  onOpenEnvironmentAssessmentTab?: () => void
}

function renderQuestion(
  q: InitialAssessmentQuestion,
  renderField: Props['renderField'],
  renderMultiSelect: Props['renderMultiSelect'],
  fieldOptions?: InitialAssessmentFieldRenderOptions,
) {
  if (q.questionType === 'MULTI_SELECT' && renderMultiSelect) return renderMultiSelect(q)
  return renderField(q, fieldOptions)
}

export function InitialAssessmentSection31FireSafetyPanel({
  fire,
  allSections,
  draftAnswers,
  renderField,
  renderMultiSelect,
  onOpenEnvironmentAssessmentTab,
}: Props) {
  const show = (q: InitialAssessmentQuestion | undefined) =>
    q ? shouldShowQuestion(q, allSections, draftAnswers) : false

  const fireRisksYes = fire.fireRisksIdentified
    ? isYesAnswer(draftAnswers[fire.fireRisksIdentified.id])
    : Boolean(fire.fireRisksDetails?.questionText.toLowerCase().includes('please state') &&
        draftAnswers[fire.fireRisksDetails?.id ?? '']?.textValue?.trim())

  const showEnvironmentLink = Boolean(fireRisksYes && onOpenEnvironmentAssessmentTab)

  if (
    !fire.fireRisksIdentified &&
    !fire.fireRisksDetails &&
    !fire.lfbInformed &&
    !fire.manageHomeSafely
  ) {
    return null
  }

  return (
    <div className="space-y-4 border-t border-border/60 pt-4" data-testid="ia-section-31-fire-safety">
      <p className="text-sm font-medium text-foreground">Fire safety and home environment</p>

      {fire.fireRisksIdentified ? (
        <InitialAssessmentSection12FieldRow>
          {renderQuestion(
            fire.fireRisksIdentified,
            renderField,
            renderMultiSelect,
            groupedYesNoFieldOptions(fire.fireRisksIdentified),
          )}
        </InitialAssessmentSection12FieldRow>
      ) : null}

      {!fire.fireRisksIdentified && fire.fireRisksDetails ? (
        <InitialAssessmentSection12FieldRow>
          {renderQuestion(fire.fireRisksDetails, renderField, renderMultiSelect)}
        </InitialAssessmentSection12FieldRow>
      ) : null}

      {fire.fireRisksIdentified && fireRisksYes && fire.fireRisksDetails && show(fire.fireRisksDetails) ? (
        <InitialAssessmentSection12FieldRow>
          {renderQuestion(fire.fireRisksDetails, renderField, renderMultiSelect)}
        </InitialAssessmentSection12FieldRow>
      ) : null}

      {showEnvironmentLink ? (
        <div className={cn(IA_CALLOUT_TEAL_CLASS, 'text-sm')}>
          <p className="font-medium text-teal-950 dark:text-teal-100">
            Complete the fire and home environment risk assessment on the Environment Assessment tab.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onOpenEnvironmentAssessmentTab}
          >
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
            Open Environment Assessment
          </Button>
          <p className={cn('mt-2', IA_HINT_CLASS)}>
            Record smoke alarms, access hazards, flooring, and other environmental risks there.
          </p>
        </div>
      ) : null}

      {fire.lfbInformed ? (
        <div className="space-y-4">
          <InitialAssessmentSection12FieldRow>
            {renderQuestion(
              fire.lfbInformed,
              renderField,
              renderMultiSelect,
              groupedYesNoFieldOptions(fire.lfbInformed),
            )}
          </InitialAssessmentSection12FieldRow>
          {fire.lfbDetails && show(fire.lfbDetails) ? (
            <InitialAssessmentSection12FieldRow>
              {renderQuestion(fire.lfbDetails, renderField, renderMultiSelect)}
            </InitialAssessmentSection12FieldRow>
          ) : null}
        </div>
      ) : null}

      {fire.manageHomeSafely ? (
        <div className="space-y-4">
          <InitialAssessmentSection12FieldRow>
            {renderQuestion(
              fire.manageHomeSafely,
              renderField,
              renderMultiSelect,
              groupedYesNoFieldOptions(fire.manageHomeSafely),
            )}
          </InitialAssessmentSection12FieldRow>
          {fire.safetyMeasures && show(fire.safetyMeasures) ? (
            <InitialAssessmentSection12FieldRow>
              {renderQuestion(fire.safetyMeasures, renderField, renderMultiSelect)}
            </InitialAssessmentSection12FieldRow>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
