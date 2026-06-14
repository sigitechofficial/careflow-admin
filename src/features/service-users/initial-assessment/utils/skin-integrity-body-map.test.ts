import { describe, expect, it } from 'vitest'
import type { InitialAssessmentQuestion, InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import {
  isSkinIntegrityBodyMapGateQuestion,
  skinIntegrityBodyMapGateAnsweredYes,
} from '@/features/service-users/initial-assessment/utils/skin-integrity-body-map'

function yesNoQuestion(
  partial: Partial<InitialAssessmentQuestion> & Pick<InitialAssessmentQuestion, 'id' | 'questionText'>,
): InitialAssessmentQuestion {
  return {
    questionType: 'YES_NO',
    isRequired: false,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: {},
    ...partial,
  }
}

describe('skin integrity body map gates', () => {
  it('recognises metadata and field-key gates', () => {
    expect(
      isSkinIntegrityBodyMapGateQuestion(
        yesNoQuestion({
          id: '1',
          questionText: 'Skin condition or concern?',
          metadata: { fieldKey: 'skinCondition', bodyMapModule: true },
        }),
      ),
    ).toBe(true)
    expect(
      isSkinIntegrityBodyMapGateQuestion(
        yesNoQuestion({
          id: '2',
          questionText: 'Pressure ulcer risk assessment completed (including photography)?',
          metadata: { bodyMapModule: true },
        }),
      ),
    ).toBe(true)
    expect(
      isSkinIntegrityBodyMapGateQuestion(
        yesNoQuestion({ id: '3', questionText: 'Fluid chart required?' }),
      ),
    ).toBe(false)
  })

  it('detects when any gate is answered yes in section 11', () => {
    const sections: InitialAssessmentSection[] = [
      {
        id: 's11',
        sectionNumber: 11,
        title: 'Skin',
        sortOrder: 11,
        questions: [
          yesNoQuestion({
            id: 'wounds',
            questionText: 'Currently has ulcers or wounds?',
            metadata: { fieldKey: 'hasWounds', bodyMapModule: true },
          }),
        ],
      },
    ]

    expect(skinIntegrityBodyMapGateAnsweredYes(sections, {})).toBe(false)
    expect(
      skinIntegrityBodyMapGateAnsweredYes(sections, {
        wounds: { questionId: 'wounds', booleanValue: true },
      }),
    ).toBe(true)
  })
})
