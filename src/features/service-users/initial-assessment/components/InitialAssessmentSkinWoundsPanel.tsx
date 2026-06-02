import {
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { InitialAssessmentPanelFieldList } from '@/features/service-users/initial-assessment/components/InitialAssessmentPanelFieldList'
import { findQuestionByFieldKey, isYesAnswer } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { IA_CALLOUT_AMBER_CLASS, IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import { cn } from '@/shared/lib/utils'
import { Bandage } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  title: string
  questions: InitialAssessmentQuestion[]
  allSections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  renderField: (q: InitialAssessmentQuestion) => ReactNode
  renderMultiSelect: (q: InitialAssessmentQuestion) => ReactNode
}

export function InitialAssessmentSkinWoundsPanel({
  title,
  questions,
  allSections,
  draftAnswers,
  renderField,
  renderMultiSelect,
}: Props) {
  const woundsQ = findQuestionByFieldKey(allSections, 'hasWounds')
  const activeWounds = woundsQ ? isYesAnswer(draftAnswers[woundsQ.id]) : false

  return (
    <InitialAssessmentSection12PanelShell title={title} testId="ia-spec-group-11.2" bodyVariant="content">
      {activeWounds ? (
        <div className={cn(IA_CALLOUT_AMBER_CLASS, 'flex items-start gap-3 text-sm')}>
          <Bandage className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
          <p className="text-amber-950 dark:text-amber-100">
            Active wounds or ulcers — complete wound details, body map if required, and ensure district nurse /
            tissue viability follow-up is recorded.
          </p>
        </div>
      ) : (
        <p className={IA_HINT_CLASS}>
          Complete wound grading and care plan fields only when ulcers or wounds are present.
        </p>
      )}
      <InitialAssessmentPanelFieldList
        questions={questions}
        renderField={renderField}
        renderMultiSelect={renderMultiSelect}
      />
    </InitialAssessmentSection12PanelShell>
  )
}
