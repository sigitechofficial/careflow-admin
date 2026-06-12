import type { ReactNode } from 'react'
import { InitialAssessmentSection12FieldRow } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { InitialAssessmentSingleSelectOptionsGrid } from '@/features/service-users/initial-assessment/components/InitialAssessmentSingleSelectOptionsGrid'
import { fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { SpecRefGroup } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import type { InitialAssessmentAnswerInput } from '@/features/service-users/initial-assessment/types'

type RenderField = (
  q: InitialAssessmentQuestion,
  options?: { hideLabel?: boolean },
) => ReactNode

type IntroProps = {
  group: SpecRefGroup
  renderField: RenderField
}

/** Paper §5 intro — three yes/no questions with no subsection header. */
export function InitialAssessmentPaperSection5IntroPanel({ group, renderField }: IntroProps) {
  return (
    <div className="space-y-3" data-testid="ia-paper-section-5-intro">
      {group.questions.map((q) => (
        <InitialAssessmentSection12FieldRow key={q.id}>
          {renderField(q)}
        </InitialAssessmentSection12FieldRow>
      ))}
    </div>
  )
}

type SubsectionProps = {
  group: SpecRefGroup
  renderField: RenderField
  valueFor: (q: InitialAssessmentQuestion) => InitialAssessmentAnswerInput | undefined
  onChangeFor: (q: InitialAssessmentQuestion, patch: InitialAssessmentAnswerInput) => void
  questionErrors?: Map<string, string>
  disabled?: boolean
}

function renderYesNoGrid(
  questions: InitialAssessmentQuestion[],
  renderField: RenderField,
): ReactNode {
  if (questions.length === 0) return null
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {questions.map((q) => (
        <div key={q.id}>{renderField(q)}</div>
      ))}
    </div>
  )
}

/** Paper §5 subsections a, b, and sleeping — option grid plus yes/no tiles. */
export function InitialAssessmentPaperSection5SubsectionPanel({
  group,
  renderField,
  valueFor,
  onChangeFor,
  questionErrors,
  disabled,
}: SubsectionProps) {
  const selectQuestion = group.questions.find((q) => q.questionType === 'SINGLE_SELECT')
  const yesNoQuestions = group.questions.filter((q) => q.questionType === 'YES_NO')

  return (
    <InitialAssessmentSection12PanelShell
      title={group.label}
      testId={`ia-paper-section-5-${group.specRef}`}
      bodyVariant="content"
    >
      {selectQuestion ? (
        <InitialAssessmentSingleSelectOptionsGrid
          question={selectQuestion}
          value={valueFor(selectQuestion)}
          errorMessage={questionErrors?.get(selectQuestion.id)}
          disabled={disabled}
          hideLabel
          onChange={(patch) => onChangeFor(selectQuestion, patch)}
        />
      ) : null}
      {renderYesNoGrid(yesNoQuestions, renderField)}
    </InitialAssessmentSection12PanelShell>
  )
}

type CommentsProps = {
  question: InitialAssessmentQuestion
  renderField: RenderField
}

/** Paper §5 closing comment field. */
export function InitialAssessmentPaperSection5AdditionalCommentsPanel({ question, renderField }: CommentsProps) {
  return (
    <InitialAssessmentSection12PanelShell
      title="Emotional health additional comments"
      testId="ia-paper-section-5-additional-comments"
      bodyVariant="content"
    >
      <InitialAssessmentSection12FieldRow>{renderField(question, { hideLabel: true })}</InitialAssessmentSection12FieldRow>
    </InitialAssessmentSection12PanelShell>
  )
}

export function isPaperSection5AdditionalCommentsGroup(group: SpecRefGroup): boolean {
  return (
    group.questions.length === 1 &&
    group.questions[0]?.questionText.trim() === 'Emotional health comments'
  )
}

export function isPaperSection5IntroGroup(group: SpecRefGroup): boolean {
  if (group.specRef !== '10.1') return false
  return group.questions.every((q) => fieldKeyOf(q) !== 'emotionalWellbeing')
}
