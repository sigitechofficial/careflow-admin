import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InitialAssessmentCognitionChecklistPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentCognitionChecklistPanel'
import { HOLISTIC_ASSESSMENT_TABS, filterQuestionsForHolisticTab } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import { groupQuestionsBySpecRef } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

function q(
  id: string,
  text: string,
  specRef: string,
  fieldKey?: string,
  sortOrder = 1,
): InitialAssessmentQuestion {
  return {
    id,
    questionText: text,
    questionType: 'YES_NO',
    isRequired: false,
    sortOrder,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: { specRef, ...(fieldKey ? { fieldKey } : {}) },
  }
}

describe('InitialAssessmentCognitionChecklistPanel', () => {
  it('receives the Tab 1 10.6a question group and does not invent a second panel', () => {
    const catalogue = [
      q('cog-level', 'Cognitive impairment level', '10.6', 'cognitiveImpairment', 20),
      q('dementia', 'Diagnosed dementia?', '10.6a', 'diagnosedDementia', 21),
      q('wandering', 'Wandering or exit-seeking?', '10.6a', 'wanderingOrExitSeeking', 211),
      q('ld', 'Learning disability?', '10.6a', undefined, 22),
      q('sleep', 'Sleeping pattern', '10.4', 'sleepingPattern', 11),
    ]
    const slice = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 1)?.multiSections?.find((s) =>
      s.specRefs?.includes('10.6a'),
    )
    expect(slice).toBeDefined()

    const groups = groupQuestionsBySpecRef(filterQuestionsForHolisticTab(catalogue, slice!), 10)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.specRef).toBe('10.6a')

    render(
      <InitialAssessmentCognitionChecklistPanel
        title={groups[0]!.label}
        questions={groups[0]!.questions}
        renderField={(question) => <span>{question.questionText}</span>}
        renderMultiSelect={(question) => <span>{question.questionText}</span>}
      />,
    )

    expect(screen.getByTestId('ia-spec-group-10.6a')).toBeInTheDocument()
    expect(screen.getByText('Diagnosed dementia?')).toBeInTheDocument()
    expect(screen.getByText('Wandering or exit-seeking?')).toBeInTheDocument()
    expect(screen.getByText('Learning disability?')).toBeInTheDocument()
    expect(screen.queryByText('Cognitive impairment level')).not.toBeInTheDocument()
    expect(screen.queryByText('Sleeping pattern')).not.toBeInTheDocument()
    expect(screen.queryAllByTestId('ia-spec-group-10.6a')).toHaveLength(1)
  })
})
