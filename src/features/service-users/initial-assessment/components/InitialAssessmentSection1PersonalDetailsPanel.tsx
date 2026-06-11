import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { prefillKeyForQuestion } from '@/features/service-users/initial-assessment/utils/question-prefill'
import {
  SECTION_1_1_ASSESSOR_QUESTIONS,
  SECTION_1_1_LPOA_QUESTIONS,
  sortPersonalDetailsQuestions,
} from '@/features/service-users/initial-assessment/utils/section-1-personal-details-order'
import { isHolisticKeySafeQuestion } from '@/features/service-users/initial-assessment/utils/section-1-key-safe-fields'
import { isMultiSelectOptionsGridQuestion } from '@/features/service-users/initial-assessment/utils/multi-select-options-grid'
import type { InitialAssessmentFieldRenderOptions } from '@/features/service-users/initial-assessment/utils/field-render-options'
import type { SpecRefGroup } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'

type Props = {
  group: SpecRefGroup
  renderField: (q: InitialAssessmentQuestion, fieldOptions?: InitialAssessmentFieldRenderOptions) => ReactNode
  renderMultiSelect?: (q: InitialAssessmentQuestion) => ReactNode
}

function normalizeQuestionText(text: string): string {
  return text
    .trim()
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

const LPOA_SET = new Set(SECTION_1_1_LPOA_QUESTIONS.map(normalizeQuestionText))
const ASSESSOR_SET = new Set(SECTION_1_1_ASSESSOR_QUESTIONS.map(normalizeQuestionText))

function isLpoaQuestion(q: InitialAssessmentQuestion): boolean {
  return LPOA_SET.has(normalizeQuestionText(q.questionText))
}

function isAssessorQuestion(q: InitialAssessmentQuestion): boolean {
  return ASSESSOR_SET.has(normalizeQuestionText(q.questionText))
}

function renderQuestion(
  q: InitialAssessmentQuestion,
  renderField: Props['renderField'],
  renderMultiSelect?: Props['renderMultiSelect'],
) {
  if (isMultiSelectOptionsGridQuestion(q) && renderMultiSelect) return renderMultiSelect(q)
  return renderField(q)
}

function gridItemClass(q: InitialAssessmentQuestion): string {
  const fullRow =
    prefillKeyForQuestion(q) === 'addressContact' ||
    fieldKeyOf(q) === 'gpContactDetails' ||
    fieldKeyOf(q) === 'lpoaContactDetails' ||
    q.questionType === 'TEXTAREA'

  return cn('min-w-0', fullRow && 'sm:col-span-2')
}

function FieldGrid({
  questions,
  renderField,
  renderMultiSelect,
}: {
  questions: InitialAssessmentQuestion[]
  renderField: Props['renderField']
  renderMultiSelect?: Props['renderMultiSelect']
}) {
  if (questions.length === 0) return null
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {questions.map((q) => (
        <div key={q.id} className={gridItemClass(q)}>
          {renderQuestion(q, renderField, renderMultiSelect)}
        </div>
      ))}
    </div>
  )
}

export function InitialAssessmentSection1PersonalDetailsPanel({
  group,
  renderField,
  renderMultiSelect,
}: Props) {
  const ordered = sortPersonalDetailsQuestions(
    group.questions.filter((q) => fieldKeyOf(q) !== 'poNumber'),
  )

  const lpoaQuestions = ordered.filter(isLpoaQuestion)
  const assessorQuestions = ordered.filter(isAssessorQuestion)
  const coreQuestions = ordered.filter(
    (q) => !isLpoaQuestion(q) && !isAssessorQuestion(q) && !isHolisticKeySafeQuestion(q),
  )

  return (
    <div className="space-y-5" data-testid="ia-section1-personal-details">
      <FieldGrid
        questions={coreQuestions}
        renderField={renderField}
        renderMultiSelect={renderMultiSelect}
      />

      {lpoaQuestions.length > 0 || assessorQuestions.length > 0 ? (
        <div className="space-y-4">
          {lpoaQuestions.length > 0 ? (
            <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Lasting Power of Attorney (LPOA)</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {lpoaQuestions.map((q) => (
                  <div key={q.id} className={gridItemClass(q)}>
                    {renderQuestion(q, renderField, renderMultiSelect)}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {assessorQuestions.length > 0 ? (
            <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Assessor</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {assessorQuestions.map((q) => (
                  <div key={q.id} className={gridItemClass(q)}>
                    {renderQuestion(q, renderField, renderMultiSelect)}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
