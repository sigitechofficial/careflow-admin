import {
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { InitialAssessmentMedicationListPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMedicationListPanel'
import { InitialAssessmentPanelFieldList } from '@/features/service-users/initial-assessment/components/InitialAssessmentPanelFieldList'
import { findQuestionByFieldKey, isYesAnswer } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { IA_CALLOUT_AMBER_CLASS, IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import { cn } from '@/shared/lib/utils'
import { ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  title: string
  specRef: string
  questions: InitialAssessmentQuestion[]
  allSections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  serviceUserId: string
  disabled: boolean
  onMarkVerified: () => void
  renderField: (q: InitialAssessmentQuestion) => ReactNode
  renderMultiSelect: (q: InitialAssessmentQuestion) => ReactNode
}

function insulinRiskActive(
  sections: InitialAssessmentSection[],
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
): boolean {
  for (const key of [
    'insulinAdministrationRequired',
    'insulinSupervisionRequired',
    'insulinPromptingRequired',
  ] as const) {
    const q = findQuestionByFieldKey(sections, key)
    if (q && isYesAnswer(draftAnswers[q.id])) return true
  }
  const controlled = sections
    .flatMap((s) => s.questions)
    .find((q) => q.questionText.toLowerCase() === 'controlled drugs in use?')
  if (controlled && isYesAnswer(draftAnswers[controlled.id])) return true
  const covert = sections
    .flatMap((s) => s.questions)
    .find((q) => q.questionText.toLowerCase() === 'covert medication required?')
  if (covert && isYesAnswer(draftAnswers[covert.id])) return true
  return false
}

export function InitialAssessmentMedicationSpecRefPanel({
  title,
  specRef,
  questions,
  allSections,
  draftAnswers,
  serviceUserId,
  disabled,
  onMarkVerified,
  renderField,
  renderMultiSelect,
}: Props) {
  if (specRef === '9.4') {
    return (
      <InitialAssessmentSection12PanelShell title={title} testId="ia-spec-group-9.4" bodyVariant="content">
        <p className={IA_HINT_CLASS}>
          Compare the eMAR list with what the service user and GP records show, then complete verification below.
        </p>
        <InitialAssessmentMedicationListPanel
          embedded
          serviceUserId={serviceUserId}
          sections={allSections}
          draftAnswers={draftAnswers}
          disabled={disabled}
          onMarkVerified={onMarkVerified}
        />
        <InitialAssessmentPanelFieldList
          questions={questions}
          renderField={renderField}
          renderMultiSelect={renderMultiSelect}
        />
      </InitialAssessmentSection12PanelShell>
    )
  }

  if (specRef === '9.3') {
    const highRisk = insulinRiskActive(allSections, draftAnswers)
    return (
      <InitialAssessmentSection12PanelShell title={title} testId="ia-spec-group-9.3" bodyVariant="content">
        {highRisk ? (
          <div className={cn(IA_CALLOUT_AMBER_CLASS, 'flex items-start gap-3 text-sm')}>
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <p className="text-amber-950 dark:text-amber-100">
              Insulin, controlled drugs, or covert medication flagged — ensure competence, protocols, and MAR
              configuration are in place before care starts.
            </p>
          </div>
        ) : null}
        <InitialAssessmentPanelFieldList
          questions={questions}
          renderField={renderField}
          renderMultiSelect={renderMultiSelect}
        />
      </InitialAssessmentSection12PanelShell>
    )
  }

  return null
}
