import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { prefillKeyForQuestion } from '@/features/service-users/initial-assessment/utils/question-prefill'
import { sortPersonalDetailsQuestions } from '@/features/service-users/initial-assessment/utils/section-1-personal-details-order'
import { isMultiSelectOptionsGridQuestion } from '@/features/service-users/initial-assessment/utils/multi-select-options-grid'
import type { InitialAssessmentFieldRenderOptions } from '@/features/service-users/initial-assessment/utils/field-render-options'
import type { SpecRefGroup } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'

type Props = {
  group: SpecRefGroup
  renderField: (q: InitialAssessmentQuestion, fieldOptions?: InitialAssessmentFieldRenderOptions) => ReactNode
  renderMultiSelect?: (q: InitialAssessmentQuestion) => ReactNode
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
    fieldKeyOf(q) === 'keySafeCodeHolistic' ||
    q.questionType === 'TEXTAREA'

  return cn('min-w-0', fullRow && 'sm:col-span-2')
}

export function InitialAssessmentSection1PersonalDetailsPanel({
  group,
  renderField,
  renderMultiSelect,
}: Props) {
  const ordered = sortPersonalDetailsQuestions(
    group.questions.filter((q) => fieldKeyOf(q) !== 'poNumber'),
  )

  if (ordered.length === 0) return null

  return (
    <div className="space-y-5" data-testid="ia-section1-personal-details">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {ordered.map((q) => (
          <div key={q.id} className={gridItemClass(q)}>
            {renderQuestion(q, renderField, renderMultiSelect)}
          </div>
        ))}
      </div>
    </div>
  )
}
