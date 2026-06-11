import type { ReactNode } from 'react'
import { InitialAssessmentConcernOptionsField } from '@/features/service-users/initial-assessment/components/InitialAssessmentConcernOptionsField'
import { InitialAssessmentPanelFieldList } from '@/features/service-users/initial-assessment/components/InitialAssessmentPanelFieldList'
import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import {
  inlineConcernFollowUpQuestionIds,
  isSection5ConcernOptionsQuestion,
  swallowingSharedFollowUpQuestions,
} from '@/features/service-users/initial-assessment/utils/section-5-concern-follow-ups'
import type { InitialAssessmentAnswerInput, InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { SpecRefGroup } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'

function selectedConcernValues(answer: InitialAssessmentAnswerInput | undefined): string[] {
  const raw = answer?.selectedOptions
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string' && raw) return [raw]
  return []
}

type Props = {
  group: SpecRefGroup
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  disabled?: boolean
  questionErrors?: Map<string, string>
  renderField: (q: InitialAssessmentQuestion) => ReactNode
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void
}

export function InitialAssessmentSection5SwallowingPanel({
  group,
  draftAnswers,
  disabled,
  questionErrors,
  renderField,
  onChange,
}: Props) {
  const inlineIds = inlineConcernFollowUpQuestionIds('swallowingConcerns', group.questions)
  const concernQuestion = group.questions.find((q) => fieldKeyOf(q) === 'swallowingConcerns')
  const selected = concernQuestion ? selectedConcernValues(draftAnswers[concernQuestion.id]) : []
  const hasSwallowingConcern = selected.some((value) => value !== 'no_concern')
  const sharedFollowUps = hasSwallowingConcern ? swallowingSharedFollowUpQuestions(group.questions) : []
  for (const q of sharedFollowUps) inlineIds.add(q.id)

  const remainingQuestions = group.questions.filter(
    (q) =>
      !isSection5ConcernOptionsQuestion(q) &&
      !inlineIds.has(q.id) &&
      q.questionText !== 'Swallowing or choking concerns?',
  )

  return (
    <InitialAssessmentSection12PanelShell
      title={group.label}
      testId="ia-spec-group-5.4"
      bodyVariant="content"
    >
      {concernQuestion ? (
        <InitialAssessmentConcernOptionsField
          question={concernQuestion}
          value={draftAnswers[concernQuestion.id]}
          followUpQuestions={group.questions}
          errorMessage={questionErrors?.get(concernQuestion.id)}
          disabled={disabled}
          onChange={(patch) => onChange(concernQuestion.id, patch)}
          renderField={renderField}
        />
      ) : null}

      {sharedFollowUps.length > 0 ? (
        <InitialAssessmentPanelFieldList questions={sharedFollowUps} renderField={renderField} />
      ) : null}

      {remainingQuestions.length > 0 ? (
        <InitialAssessmentPanelFieldList questions={remainingQuestions} renderField={renderField} />
      ) : null}
    </InitialAssessmentSection12PanelShell>
  )
}
