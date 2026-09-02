import { describe, expect, it } from 'vitest'
import {
  formatSectionNavMeta,
  overallAssessmentProgress,
  sectionProgress,
} from '@/features/service-users/initial-assessment/utils/section-progress'
import { textAnswerHasVisibleContent } from '@/features/service-users/initial-assessment/utils/secure-field'
import type {
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

function yesNoQ(id: string, text: string, required = false): InitialAssessmentQuestion {
  return {
    id,
    questionText: text,
    questionType: 'YES_NO',
    isRequired: required,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: { specRef: '5.1' },
  }
}

function sectionWithQuestions(n: number, questions: InitialAssessmentQuestion[]): InitialAssessmentSection {
  return {
    id: `sec-${n}`,
    sectionNumber: n,
    title: `Section ${n}`,
    sortOrder: n,
    questions,
  }
}

function textQ(id: string, text: string): InitialAssessmentQuestion {
  return {
    id,
    questionText: text,
    questionType: 'TEXT',
    isRequired: false,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: {},
  }
}

describe('section-progress', () => {
  it('counts explicit No as answered', () => {
    const q = yesNoQ('q1', 'Asthma present?')
    const sec = sectionWithQuestions(5, [q])
    const prog = sectionProgress(
      sec,
      { q1: { questionId: 'q1', checked: false, booleanValue: false } },
      [sec],
    )
    expect(prog.answered).toBe(1)
    expect(prog.total).toBe(1)
    expect(prog.percent).toBe(100)
  })

  it('formatSectionNavMeta shows fields not misleading percent', () => {
    expect(formatSectionNavMeta({ answered: 3, total: 8, requiredAnswered: 1, requiredTotal: 2, percent: 38 })).toBe(
      '3/8 fields · 1 required',
    )
  })

  it('does not count empty Summernote HTML as answered', () => {
    const q = textQ('q1', 'Notes')
    const sec = sectionWithQuestions(5, [q])
    const prog = sectionProgress(sec, { q1: { questionId: 'q1', textValue: '<p><br></p>' } }, [sec])
    expect(prog.answered).toBe(0)
    expect(prog.percent).toBe(0)
  })

  it('counts rich text with visible content as answered', () => {
    const q = textQ('q1', 'Notes')
    const sec = sectionWithQuestions(5, [q])
    const prog = sectionProgress(sec, { q1: { questionId: 'q1', textValue: '<p>Hello</p>' } }, [sec])
    expect(prog.answered).toBe(1)
    expect(prog.percent).toBe(100)
  })

  it('overall progress averages enterprise section percents', () => {
    const secA = sectionWithQuestions(1, [yesNoQ('a', 'A')])
    const secB = sectionWithQuestions(2, [yesNoQ('b', 'B')])
    const answers = {
      a: { questionId: 'a', checked: true, booleanValue: true },
    }
    expect(overallAssessmentProgress([secA, secB], answers, {})).toBe(50)
  })

  it('textAnswerHasVisibleContent ignores empty HTML', () => {
    expect(textAnswerHasVisibleContent('<p><br></p>')).toBe(false)
    expect(textAnswerHasVisibleContent('<p>Notes</p>')).toBe(true)
  })

  it('does not let hidden infection or fire children block completeness', () => {
    const parent = yesNoQ('infection', 'Are infection control precautions required?', true)
    parent.metadata = { specRef: '15.1', fieldKey: 'infectionPrecautionsRequired' }
    const child: InitialAssessmentQuestion = {
      id: 'ppe',
      questionText: 'PPE required',
      questionType: 'MULTI_SELECT',
      isRequired: true,
      sortOrder: 2,
      riskFlag: false,
      carePlanTrigger: false,
      metadata: {
        specRef: '15.2',
        fieldKey: 'ppeRequired',
        showWhen: { gateFieldKey: 'infectionPrecautionsRequired', yes: true },
      },
    }
    const sec = sectionWithQuestions(15, [parent, child])
    const prog = sectionProgress(
      sec,
      { infection: { questionId: 'infection', checked: false, booleanValue: false } },
      [sec],
    )
    expect(prog.requiredTotal).toBe(1)
    expect(prog.requiredAnswered).toBe(1)
    expect(prog.percent).toBe(100)
  })

  it('does not count optional invented measurements or secure codes toward completeness', () => {
    const parent = yesNoQ('unable', 'Unable to weigh using standard scales?', true)
    parent.metadata = { specRef: '4.10', fieldKey: 'unableToWeigh' }
    const muac: InitialAssessmentQuestion = {
      id: 'muac',
      questionText: 'Mid upper arm circumference (MUAC) (cm)',
      questionType: 'NUMBER',
      isRequired: false,
      sortOrder: 2,
      riskFlag: false,
      carePlanTrigger: false,
      metadata: { specRef: '4.10', fieldKey: 'muacCm', showWhen: { gateFieldKey: 'unableToWeigh', yes: true } },
    }
    const code: InitialAssessmentQuestion = {
      id: 'keysafe',
      questionText: 'Key safe code',
      questionType: 'TEXT',
      isRequired: false,
      sortOrder: 3,
      riskFlag: false,
      carePlanTrigger: false,
      metadata: { specRef: '1.2', fieldKey: 'keySafeCodeHolistic', secureField: true },
    }
    const sec = sectionWithQuestions(4, [parent, muac, code])
    const prog = sectionProgress(
      sec,
      { unable: { questionId: 'unable', checked: true, booleanValue: true } },
      [sec],
    )
    expect(prog.total).toBe(1)
    expect(prog.answered).toBe(1)
    expect(prog.percent).toBe(100)
  })

  it('does not count the Phase 1 QA completeness extras (optional measurements, secure codes, hidden other-accommodation)', () => {
    const typeQ: InitialAssessmentQuestion = {
      id: 'acc-type',
      questionText: 'Type of living accommodation',
      questionType: 'MULTI_SELECT',
      isRequired: false,
      sortOrder: 1,
      riskFlag: false,
      carePlanTrigger: false,
      metadata: { specRef: '1.2', fieldKey: 'accommodationType' },
    }
    const otherQ: InitialAssessmentQuestion = {
      id: 'acc-other',
      questionText: 'Other accommodation (please state)',
      questionType: 'TEXT',
      isRequired: false,
      sortOrder: 2,
      riskFlag: false,
      carePlanTrigger: false,
      metadata: {
        specRef: '1.2',
        fieldKey: 'accommodationOther',
        showWhen: { gateFieldKey: 'accommodationType', selectedIncludes: 'other' },
      },
    }
    const unable = yesNoQ('unable', 'Unable to weigh using standard scales?', false)
    unable.metadata = { specRef: '4.10', fieldKey: 'unableToWeigh' }
    const weight: InitialAssessmentQuestion = {
      id: 'weight',
      questionText: 'Weight (kg)',
      questionType: 'NUMBER',
      isRequired: false,
      sortOrder: 4,
      riskFlag: false,
      carePlanTrigger: false,
      metadata: { specRef: '4.10', fieldKey: 'weightKg' },
    }
    const muac: InitialAssessmentQuestion = {
      id: 'muac',
      questionText: 'Mid upper arm circumference (MUAC) (cm)',
      questionType: 'NUMBER',
      isRequired: false,
      sortOrder: 5,
      riskFlag: false,
      carePlanTrigger: false,
      metadata: { specRef: '4.10', fieldKey: 'muacCm', showWhen: { gateFieldKey: 'unableToWeigh', yes: true } },
    }
    const muacBand: InitialAssessmentQuestion = {
      id: 'muac-band',
      questionText: 'MUAC nutritional risk band',
      questionType: 'SINGLE_SELECT',
      isRequired: false,
      sortOrder: 6,
      riskFlag: false,
      carePlanTrigger: false,
      metadata: {
        specRef: '4.10',
        fieldKey: 'muacNutritionalRisk',
        showWhen: { gateFieldKey: 'unableToWeigh', yes: true },
      },
    }
    const keySafePresent = yesNoQ('ksp', 'Key safe present?', false)
    keySafePresent.metadata = { specRef: '1.2', fieldKey: 'keySafePresentHolistic' }
    const keySafeCode: InitialAssessmentQuestion = {
      id: 'ksc',
      questionText: 'Key safe code',
      questionType: 'TEXT',
      isRequired: false,
      sortOrder: 8,
      riskFlag: false,
      carePlanTrigger: false,
      metadata: { specRef: '1.2', fieldKey: 'keySafeCodeHolistic', secureField: true },
    }
    const filled = yesNoQ('filled', 'Taking prescribed medication?', true)
    const sec = sectionWithQuestions(1, [
      typeQ,
      otherQ,
      unable,
      weight,
      muac,
      muacBand,
      keySafePresent,
      keySafeCode,
      filled,
    ])
    const prog = sectionProgress(
      sec,
      {
        'acc-type': { questionId: 'acc-type', selectedOptions: ['private_house'] },
        unable: { questionId: 'unable', checked: true, booleanValue: true },
        ksp: { questionId: 'ksp', checked: true, booleanValue: true },
        filled: { questionId: 'filled', checked: true, booleanValue: true },
      },
      [sec],
    )
    expect(prog.answered).toBe(prog.total)
    expect(prog.percent).toBe(100)
  })

  it('does not count completenessExempt optional notes', () => {
    const parent = yesNoQ('rails', 'Are bed rails in use or being considered?', true)
    parent.metadata = { specRef: '17.1', fieldKey: 'bedRailsInUseOrConsidered' }
    const notes = textQ('notes', 'Bed rails additional notes')
    notes.isRequired = false
    notes.metadata = { specRef: '17.8', fieldKey: 'bedRailsNotes', completenessExempt: true }
    const sec = sectionWithQuestions(17, [parent, notes])
    const prog = sectionProgress(
      sec,
      { rails: { questionId: 'rails', checked: false, booleanValue: false } },
      [sec],
    )
    expect(prog.total).toBe(1)
    expect(prog.answered).toBe(1)
    expect(prog.percent).toBe(100)
  })
})
