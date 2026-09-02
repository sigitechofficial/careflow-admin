import { describe, expect, it } from 'vitest'
import { shouldShowQuestion } from './conditional-visibility'
import type { InitialAssessmentQuestion, InitialAssessmentSection } from '../types'

function q(
  id: string,
  questionText: string,
  questionType: InitialAssessmentQuestion['questionType'],
  metadata?: Record<string, unknown>,
): InitialAssessmentQuestion {
  return {
    id,
    questionText,
    questionType,
    isRequired: false,
    riskFlag: false,
    carePlanTrigger: false,
    sortOrder: 0,
    metadata: metadata ?? null,
  }
}

describe('Falls IA follow-up visibility', () => {
  const fallsYn = q('falls-yn', 'Falls in last 12 months?', 'YES_NO', {
    specRef: '12.7',
    fieldKey: 'fallsLast12Months',
  })
  const count = q('count', 'Number of falls (last 12 months)', 'NUMBER', {
    specRef: '12.7',
    showWhen: { gateTextIncludes: 'falls in last 12 months', yes: true },
  })
  const date = q('date', 'Most recent fall date', 'DATE', {
    specRef: '12.7',
    showWhen: { gateTextIncludes: 'falls in last 12 months', yes: true },
  })
  const injury = q('injury', 'Injury caused by fall?', 'YES_NO', {
    specRef: '12.7',
    showWhen: { gateTextIncludes: 'falls in last 12 months', yes: true },
  })
  const sections: InitialAssessmentSection[] = [
    {
      id: 's12',
      sectionNumber: 12,
      title: 'Mobility, ADL and Practical Support',
      sortOrder: 12,
      questions: [fallsYn, count, date, injury],
    },
  ]

  it('hides count/date/injury until Falls in last 12 months is Yes', () => {
    const unanswered = {}
    expect(shouldShowQuestion(fallsYn, sections, unanswered)).toBe(true)
    expect(shouldShowQuestion(count, sections, unanswered)).toBe(false)
    expect(shouldShowQuestion(date, sections, unanswered)).toBe(false)
    expect(shouldShowQuestion(injury, sections, unanswered)).toBe(false)

    const no = { [fallsYn.id]: { questionId: fallsYn.id, booleanValue: false, checked: false } }
    expect(shouldShowQuestion(count, sections, no)).toBe(false)

    const yes = { [fallsYn.id]: { questionId: fallsYn.id, booleanValue: true, checked: true } }
    expect(shouldShowQuestion(count, sections, yes)).toBe(true)
    expect(shouldShowQuestion(date, sections, yes)).toBe(true)
    expect(shouldShowQuestion(injury, sections, yes)).toBe(true)
  })
})

describe('Phase 1 IA parent/child visibility', () => {
  function yn(id: string, text: string, metadata?: Record<string, unknown>): InitialAssessmentQuestion {
    return q(id, text, 'YES_NO', metadata)
  }

  it('hides choking, DoLS, oral, insulin, covert, infection and wandering children when the parent is No', () => {
    const parents = [
      yn('choking', 'Swallowing or choking concerns?'),
      yn('dols', 'DoLS / LPS authorisation in place?', { fieldKey: 'dolsLpsAuthorisationInPlace' }),
      yn('oral', 'Oral health concern?', { fieldKey: 'oralHealthConcern' }),
      yn('insulin', 'Insulin administration required?', { fieldKey: 'insulinAdministrationRequired' }),
      yn('covert', 'Covert medication required?', { fieldKey: 'covertMedicationRequired' }),
      yn('infection', 'Are infection control precautions required?', { fieldKey: 'infectionPrecautionsRequired' }),
      yn('dementia', 'Diagnosed dementia?', { fieldKey: 'diagnosedDementia' }),
    ]
    const children: InitialAssessmentQuestion[] = [
      q('choking-with', 'What does choking occur with?', 'MULTI_SELECT', {
        fieldKey: 'chokingOccursWith',
        showWhen: { gateTextIncludes: 'swallowing or choking concerns', yes: true },
      }),
      q('dols-body', 'DoLS / LPS authorising body', 'TEXT', {
        fieldKey: 'dolsAuthorisingBody',
        showWhen: { gateTextIncludes: 'DoLS / LPS authorisation in place', yes: true },
      }),
      q('mouth', 'Mouth-care routine or support required', 'TEXTAREA', {
        fieldKey: 'mouthCareSupportRoutine',
        showWhen: { gateTextIncludes: 'oral health concern', yes: true },
      }),
      q('insulin-prompt', 'Insulin prompting required?', 'YES_NO', {
        fieldKey: 'insulinPromptingRequired',
        showWhen: { gateFieldKey: 'insulinAdministrationRequired', yes: true },
      }),
      q('covert-legal', 'Covert medication legal basis or best-interest notes', 'TEXTAREA', {
        fieldKey: 'covertMedicationLegalBasis',
        showWhen: { gateFieldKey: 'covertMedicationRequired', yes: true },
      }),
      q('ppe', 'PPE required', 'MULTI_SELECT', {
        fieldKey: 'ppeRequired',
        showWhen: { gateFieldKey: 'infectionPrecautionsRequired', yes: true },
      }),
      yn('wandering', 'Wandering or exit-seeking?', {
        fieldKey: 'wanderingOrExitSeeking',
        showWhen: { gateTextIncludes: 'diagnosed dementia', yes: true },
      }),
    ]
    const section: InitialAssessmentSection = {
      id: 's-phase1',
      sectionNumber: 99,
      title: 'Phase 1',
      sortOrder: 99,
      questions: [...parents, ...children],
    }
    const sections = [section]
    const noAnswers = Object.fromEntries(
      parents.map((p) => [p.id, { questionId: p.id, booleanValue: false, checked: false }]),
    )
    for (const child of children) {
      expect(shouldShowQuestion(child, sections, noAnswers)).toBe(false)
    }
    const yesAnswers = Object.fromEntries(
      parents.map((p) => [p.id, { questionId: p.id, booleanValue: true, checked: true }]),
    )
    for (const child of children) {
      expect(shouldShowQuestion(child, sections, yesAnswers)).toBe(true)
    }
  })

  it('shows wandering only when diagnosed dementia is Yes, and support notes only when wandering is Yes', () => {
    const dementia = yn('dementia', 'Diagnosed dementia?', { fieldKey: 'diagnosedDementia', specRef: '10.6a' })
    const wandering = yn('wandering', 'Wandering or exit-seeking?', {
      fieldKey: 'wanderingOrExitSeeking',
      specRef: '10.6a',
      showWhen: { gateTextIncludes: 'diagnosed dementia', yes: true },
    })
    const notes = q('wandering-notes', 'Wandering or exit-seeking support needed', 'TEXTAREA', {
      fieldKey: 'wanderingSupportNotes',
      specRef: '10.6a',
      showWhen: { gateFieldKey: 'wanderingOrExitSeeking', yes: true },
    })
    const section: InitialAssessmentSection = {
      id: 's10',
      sectionNumber: 10,
      title: 'Section 10',
      sortOrder: 10,
      questions: [dementia, wandering, notes],
    }
    const sections = [section]

    expect(shouldShowQuestion(wandering, sections, {})).toBe(false)
    expect(shouldShowQuestion(notes, sections, {})).toBe(false)

    const dementiaNo = { [dementia.id]: { questionId: dementia.id, booleanValue: false, checked: false } }
    expect(shouldShowQuestion(wandering, sections, dementiaNo)).toBe(false)
    expect(shouldShowQuestion(notes, sections, dementiaNo)).toBe(false)

    const dementiaYes = { [dementia.id]: { questionId: dementia.id, booleanValue: true, checked: true } }
    expect(shouldShowQuestion(wandering, sections, dementiaYes)).toBe(true)
    expect(shouldShowQuestion(notes, sections, dementiaYes)).toBe(false)

    const wanderingYes = {
      ...dementiaYes,
      [wandering.id]: { questionId: wandering.id, booleanValue: true, checked: true },
    }
    expect(shouldShowQuestion(notes, sections, wanderingYes)).toBe(true)
  })
})

describe('MCA screening visibility', () => {
  it('hides 2.mca questions when MCA required is No, and shows them when Yes', () => {
    const required = q('mca-required', 'MCA required?', 'YES_NO', {
      specRef: '2.5',
      fieldKey: 'mcaRequired',
    })
    const screening = q(
      'mca-stage-1',
      'Does the person have an impairment or disturbance in the functioning of the mind or brain?',
      'YES_NO',
      { specRef: '2.mca', fieldKey: 'mcaStage1Impairment' },
    )
    const sections: InitialAssessmentSection[] = [
      {
        id: 's2',
        sectionNumber: 2,
        title: 'Section 2',
        sortOrder: 2,
        questions: [required, screening],
      },
    ]
    expect(
      shouldShowQuestion(screening, sections, {
        [required.id]: { questionId: required.id, booleanValue: false, checked: false },
      }),
    ).toBe(false)
    expect(
      shouldShowQuestion(screening, sections, {
        [required.id]: { questionId: required.id, booleanValue: true, checked: true },
      }),
    ).toBe(true)
  })
})

describe('Other accommodation completeness visibility', () => {
  it('hides Other accommodation unless accommodation type includes other', () => {
    const type = q('acc-type', 'Type of living accommodation', 'MULTI_SELECT', {
      specRef: '1.2',
      fieldKey: 'accommodationType',
    })
    const other = q('acc-other', 'Other accommodation (please state)', 'TEXT', {
      specRef: '1.2',
      fieldKey: 'accommodationOther',
      showWhen: { gateFieldKey: 'accommodationType', selectedIncludes: 'other' },
    })
    const sections: InitialAssessmentSection[] = [
      { id: 's1', sectionNumber: 1, title: 'About', sortOrder: 1, questions: [type, other] },
    ]
    expect(
      shouldShowQuestion(other, sections, {
        [type.id]: { questionId: type.id, selectedOptions: ['private_house'] },
      }),
    ).toBe(false)
    expect(
      shouldShowQuestion(other, sections, {
        [type.id]: { questionId: type.id, selectedOptions: ['other'] },
      }),
    ).toBe(true)
  })
})
