import { describe, expect, it } from 'vitest'
import {
  HOLISTIC_ASSESSMENT_TABS,
  HOLISTIC_MAX_TAB_ID,
  HOLISTIC_REGISTERED_TAB_IDS,
  HOLISTIC_TAB_COUNT,
  filterQuestionsForHolisticTab,
  holisticTabById,
  holisticTabDisplayNumber,
  questionsForDocumentTab,
} from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import { getVisibleSectionQuestions } from '@/features/service-users/initial-assessment/utils/visible-section-questions'
import { groupQuestionsBySpecRef } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

function yesNoQ(id: string, text: string, specRef: string, fieldKey?: string): InitialAssessmentQuestion {
  return {
    id,
    questionText: text,
    questionType: 'YES_NO',
    isRequired: true,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: { specRef, ...(fieldKey ? { fieldKey } : {}) },
  }
}

describe('questionsForDocumentTab', () => {
  it('does not inject fire safety onto holistic tab 1', () => {
    const fireYes = yesNoQ('fire-yes', 'Any fire safety risks identified?', '18.1', 'fireSafetyRisksIdentified')
    const lfb = yesNoQ('lfb', 'London Fire Brigade informed?', '18.2', 'londonFireBrigadeInformed')
    const manage = yesNoQ('manage', 'Can client manage home environment safely?', '3.3', 'manageHomeEnvironmentSafely')

    const section1: InitialAssessmentSection = {
      id: 's1',
      sectionNumber: 1,
      title: 'Section 1',
      sortOrder: 1,
      questions: [yesNoQ('rep', 'Representative involved in assessment?', '1.2')],
    }
    const section3: InitialAssessmentSection = {
      id: 's3',
      sectionNumber: 3,
      title: 'Section 3',
      sortOrder: 3,
      questions: [manage],
    }
    const section18: InitialAssessmentSection = {
      id: 's18',
      sectionNumber: 18,
      title: 'Fire Safety',
      sortOrder: 18,
      questions: [fireYes, lfb],
    }

    const tab = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 1)!
    const visible = new Map<number, InitialAssessmentQuestion[]>([
      [1, section1.questions],
      [3, section3.questions],
      [18, section18.questions],
    ])

    const tabQuestions = questionsForDocumentTab(tab, [section1, section3, section18], visible)
    const ids = new Set(tabQuestions.map((q) => q.id))

    expect(ids.has('fire-yes')).toBe(false)
    expect(ids.has('lfb')).toBe(false)
    expect(ids.has('manage')).toBe(false)
  })

  it('keeps frozen tab ids 1–18 and registers 19 / 20 / 21 / 22', () => {
    const ids = HOLISTIC_ASSESSMENT_TABS.map((t) => t.id)
    expect(ids).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]))
    expect(HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 19)?.enterpriseSection).toBe(16)
    expect(HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 20)?.enterpriseSection).toBe(17)
    expect(HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 21)?.enterpriseSection).toBe(15)
    expect(HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 22)?.enterpriseSection).toBe(18)
  })

  it('owns fire safety questions on holistic tab 22', () => {
    const fireYes = yesNoQ('fire-yes', 'Any fire safety risks identified?', '18.1', 'fireSafetyRisksIdentified')
    const section18: InitialAssessmentSection = {
      id: 's18',
      sectionNumber: 18,
      title: 'Fire Safety',
      sortOrder: 18,
      questions: [fireYes],
    }
    const tab = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 22)!
    const visible = new Map<number, InitialAssessmentQuestion[]>([[18, section18.questions]])
    const tabQuestions = questionsForDocumentTab(tab, [section18], visible)
    expect(tabQuestions.map((q) => q.id)).toContain('fire-yes')
  })

  it('includes §14.6 / §14.8 sign-off fields on holistic tab 16 save scope', () => {
    const assessorName: InitialAssessmentQuestion = {
      id: 'assessor-name',
      questionText: 'Assessor name',
      questionType: 'TEXT',
      isRequired: true,
      sortOrder: 1,
      riskFlag: false,
      carePlanTrigger: false,
      metadata: { specRef: '14.8', fieldKey: 'assessorName' },
    }
    const suAgrees = yesNoQ('su-agrees', 'Service user agrees with assessment?', '14.6', 'suSignatureObtained')

    const section14: InitialAssessmentSection = {
      id: 's14',
      sectionNumber: 14,
      title: 'Section 14',
      sortOrder: 14,
      questions: [suAgrees, assessorName],
    }

    const tab = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 16)!
    const tabQuestions = questionsForDocumentTab(tab, [section14], new Map())
    const ids = new Set(tabQuestions.map((q) => q.id))

    expect(ids.has('assessor-name')).toBe(true)
    expect(ids.has('su-agrees')).toBe(true)
  })

  it('iterates registered tab ids instead of 1..18', () => {
    expect(HOLISTIC_REGISTERED_TAB_IDS).toEqual(HOLISTIC_ASSESSMENT_TABS.map((tab) => tab.id))
    expect(HOLISTIC_TAB_COUNT).toBe(HOLISTIC_ASSESSMENT_TABS.length)
    expect(HOLISTIC_MAX_TAB_ID).toBe(22)
    expect(HOLISTIC_REGISTERED_TAB_IDS).toEqual(expect.arrayContaining([19, 20, 21, 22]))
    expect(HOLISTIC_REGISTERED_TAB_IDS).not.toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
  })
})

describe('holistic tab display numbering and navigation order', () => {
  const HISTORICAL_TITLES: Array<[number, string]> = [
    [1, 'Personal Details & Medical History'],
    [2, 'Practical Task'],
    [3, 'Initial Mental Capacity Act Screening Tool'],
    [4, 'Total Skin Integrity Check'],
    [5, 'Waterlow Pressure Score'],
    [6, 'Equipment Selection'],
    [7, 'Alternative to MUST'],
    [8, 'Falls Screening'],
    [9, 'Moving and Handling Operations'],
    [10, 'Pain Assessment Tool'],
    [11, 'Aide Memorie to Establish Therapy Needs'],
    [12, 'Environment Assessment'],
    [13, 'Advance Care Planning'],
    [14, 'End of Life Assessment'],
    [15, 'Social and Clinical assessment outcome summary'],
    [16, 'Personalised Care/Support Plan'],
    [17, 'Mental Capacity Assessment Identified'],
    [18, 'Photography Consent Form'],
  ]

  it('existing tabs still display 1–18 with historical titles', () => {
    for (const [id, title] of HISTORICAL_TITLES) {
      const tab = holisticTabById(id)!
      expect(tab.title).toBe(title)
      expect(holisticTabDisplayNumber(tab)).toBe(id)
      expect(holisticTabDisplayNumber(id)).toBe(id)
    }
  })

  it('PEEP displays 19, Bed Rails 20, Infection 21, Fire Safety 22', () => {
    expect(holisticTabById(19)?.title).toBe('Personal Emergency Evacuation Plan (PEEP)')
    expect(holisticTabDisplayNumber(19)).toBe(19)
    expect(holisticTabById(20)?.title).toBe('Bed Rails')
    expect(holisticTabDisplayNumber(20)).toBe(20)
    expect(holisticTabById(21)?.title).toBe('Infection and Clinical Precautions')
    expect(holisticTabDisplayNumber(21)).toBe(21)
    expect(holisticTabById(22)?.title).toBe('Fire Safety')
    expect(holisticTabDisplayNumber(22)).toBe(22)
  })

  it('navigation order is exactly 1–22 and is not enterpriseSection order', () => {
    expect(HOLISTIC_ASSESSMENT_TABS.map((tab) => tab.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    ])
    expect(HOLISTIC_ASSESSMENT_TABS.map((tab) => holisticTabDisplayNumber(tab))).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    ])
    expect(HOLISTIC_ASSESSMENT_TABS.map((tab) => tab.enterpriseSection)).not.toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    ])
    expect(HOLISTIC_ASSESSMENT_TABS[18]?.title).toBe('Personal Emergency Evacuation Plan (PEEP)')
    expect(HOLISTIC_ASSESSMENT_TABS[19]?.title).toBe('Bed Rails')
    expect(HOLISTIC_ASSESSMENT_TABS[20]?.title).toBe('Infection and Clinical Precautions')
    expect(HOLISTIC_ASSESSMENT_TABS[21]?.title).toBe('Fire Safety')
  })

  it('keeps persisted internal holisticTabId and enterpriseSection mappings unchanged', () => {
    expect(holisticTabById(19)).toEqual(
      expect.objectContaining({ id: 19, displayNumber: 19, enterpriseSection: 16 }),
    )
    expect(holisticTabById(20)).toEqual(
      expect.objectContaining({ id: 20, displayNumber: 20, enterpriseSection: 17 }),
    )
    expect(holisticTabById(21)).toEqual(
      expect.objectContaining({ id: 21, displayNumber: 21, enterpriseSection: 15 }),
    )
    expect(holisticTabById(22)).toEqual(
      expect.objectContaining({ id: 22, displayNumber: 22, enterpriseSection: 18 }),
    )
    expect(holisticTabDisplayNumber(21)).not.toBe(holisticTabById(21)!.enterpriseSection)
    expect(holisticTabDisplayNumber(19)).not.toBe(holisticTabById(19)!.enterpriseSection)
  })

  it('URL/tab selection still opens the underlying internal tab', () => {
    expect(holisticTabById(21)?.enterpriseSection).toBe(15)
    expect(holisticTabById(15)?.title).toBe('Social and Clinical assessment outcome summary')
    expect(holisticTabById(15)?.enterpriseSection).toBe(14)
    for (const id of [1, 18, 19, 20, 21, 22]) {
      expect(holisticTabById(id)?.id).toBe(id)
    }
  })

  it('save/reload still scopes questions by frozen internal tab id', () => {
    const infectionQ = yesNoQ('ppe', 'PPE required?', '15.1', 'ppeRequired')
    const peepQ = yesNoQ('peep-need', 'PEEP required?', '16.1', 'peepRequired')
    const bedQ = yesNoQ('rails', 'Bed rails in use?', '17.1', 'bedRailsInUse')
    const fireQ = yesNoQ('fire-yes', 'Any fire safety risks identified?', '18.1', 'fireSafetyRisksIdentified')

    const sections: InitialAssessmentSection[] = [
      { id: 's15', sectionNumber: 15, title: 'Infection', sortOrder: 15, questions: [infectionQ] },
      { id: 's16', sectionNumber: 16, title: 'PEEP', sortOrder: 16, questions: [peepQ] },
      { id: 's17', sectionNumber: 17, title: 'Bed Rails', sortOrder: 17, questions: [bedQ] },
      { id: 's18', sectionNumber: 18, title: 'Fire Safety', sortOrder: 18, questions: [fireQ] },
    ]
    const visible = new Map<number, InitialAssessmentQuestion[]>([
      [15, [infectionQ]],
      [16, [peepQ]],
      [17, [bedQ]],
      [18, [fireQ]],
    ])

    const saved: Record<string, InitialAssessmentAnswerInput> = {
      [infectionQ.id]: { questionId: infectionQ.id, booleanValue: true, checked: true },
      [peepQ.id]: { questionId: peepQ.id, booleanValue: true, checked: true },
      [bedQ.id]: { questionId: bedQ.id, booleanValue: false, checked: false },
      [fireQ.id]: { questionId: fireQ.id, booleanValue: true, checked: true },
    }
    const reloaded = JSON.parse(JSON.stringify(saved)) as Record<string, InitialAssessmentAnswerInput>

    expect(questionsForDocumentTab(holisticTabById(19)!, sections, visible).map((q) => q.id)).toEqual(['peep-need'])
    expect(questionsForDocumentTab(holisticTabById(20)!, sections, visible).map((q) => q.id)).toEqual(['rails'])
    expect(questionsForDocumentTab(holisticTabById(21)!, sections, visible).map((q) => q.id)).toEqual(['ppe'])
    expect(questionsForDocumentTab(holisticTabById(22)!, sections, visible).map((q) => q.id)).toEqual(['fire-yes'])

    expect(reloaded[peepQ.id]?.booleanValue).toBe(true)
    expect(reloaded[bedQ.id]?.booleanValue).toBe(false)
    expect(reloaded[infectionQ.id]?.booleanValue).toBe(true)
    expect(reloaded[fireQ.id]?.booleanValue).toBe(true)
  })
})

function section10Question(
  id: string,
  text: string,
  specRef: string,
  extra?: { fieldKey?: string; showWhen?: Record<string, unknown>; sortOrder?: number },
): InitialAssessmentQuestion {
  return {
    id,
    questionText: text,
    questionType: text.includes('support needed') ? 'TEXTAREA' : 'YES_NO',
    isRequired: false,
    sortOrder: extra?.sortOrder ?? 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: {
      specRef,
      ...(extra?.fieldKey ? { fieldKey: extra.fieldKey } : {}),
      ...(extra?.showWhen ? { showWhen: extra.showWhen } : {}),
    },
  }
}

function tab1Section10Fixture(): {
  section: InitialAssessmentSection
  questions: InitialAssessmentQuestion[]
} {
  const questions = [
    section10Question('mh-current', 'Current mental health issues reported?', '10.1', { sortOrder: 2 }),
    section10Question('cpn', 'Community Psychiatric Nurse involved?', '10.1', { sortOrder: 3 }),
    section10Question('mh-prev', 'Previous mental health issues reported?', '10.1', { sortOrder: 5 }),
    section10Question('ew-status', 'Emotional wellbeing status', '10.2', {
      fieldKey: 'emotionalWellbeing',
      sortOrder: 7,
    }),
    section10Question('low-mood', 'Feels low in mood?', '10.2', { fieldKey: 'feelsLowInMood', sortOrder: 8 }),
    section10Question('cog-level', 'Cognitive impairment level', '10.6', {
      fieldKey: 'cognitiveImpairment',
      sortOrder: 20,
    }),
    section10Question('dementia', 'Diagnosed dementia?', '10.6a', {
      fieldKey: 'diagnosedDementia',
      sortOrder: 21,
    }),
    section10Question('wandering', 'Wandering or exit-seeking?', '10.6a', {
      fieldKey: 'wanderingOrExitSeeking',
      showWhen: { gateTextIncludes: 'diagnosed dementia', yes: true },
      sortOrder: 211,
    }),
    section10Question('wandering-notes', 'Wandering or exit-seeking support needed', '10.6a', {
      fieldKey: 'wanderingSupportNotes',
      showWhen: { gateFieldKey: 'wanderingOrExitSeeking', yes: true },
      sortOrder: 212,
    }),
    section10Question('ld', 'Learning disability?', '10.6a', { sortOrder: 22 }),
    section10Question('sleep', 'Sleeping pattern', '10.4', { fieldKey: 'sleepingPattern', sortOrder: 11 }),
    section10Question('comments', 'Emotional health comments', '10.1', { sortOrder: 6 }),
  ]
  return {
    section: {
      id: 's10',
      sectionNumber: 10,
      title: 'Emotional wellbeing and cognition',
      sortOrder: 10,
      questions,
    },
    questions,
  }
}

describe('Tab 1 §10.6a cognition / dementia', () => {
  const tab1 = () => HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 1)!

  it('includes existing §10.6a questions on Tab 1 between cognition and sleep', () => {
    const { section, questions } = tab1Section10Fixture()
    const visible = new Map<number, InitialAssessmentQuestion[]>([[10, questions]])
    const tabQuestions = questionsForDocumentTab(tab1(), [section], visible)
    const texts = tabQuestions.map((q) => q.questionText)

    expect(texts).toContain('Diagnosed dementia?')
    expect(texts).toContain('Wandering or exit-seeking?')
    expect(texts).toContain('Wandering or exit-seeking support needed')
    expect(texts).toContain('Learning disability?')

    expect(texts.indexOf('Cognitive impairment level')).toBeLessThan(texts.indexOf('Diagnosed dementia?'))
    expect(texts.indexOf('Diagnosed dementia?')).toBeLessThan(texts.indexOf('Sleeping pattern'))
  })

  it('does not use questionTextsOnly for 10.6a so wandering children stay on the slice', () => {
    const slice = tab1().multiSections?.find((s) => s.specRefs?.includes('10.6a'))
    expect(slice).toEqual({ sectionNumber: 10, specRefs: ['10.6a'] })
    expect(slice?.questionTextsOnly).toBeUndefined()

    const { questions } = tab1Section10Fixture()
    const filtered = filterQuestionsForHolisticTab(questions, slice!)
    expect(filtered.map((q) => q.metadata?.specRef)).toEqual(filtered.map(() => '10.6a'))
    expect(filtered.map((q) => q.questionText)).toEqual(
      expect.arrayContaining([
        'Diagnosed dementia?',
        'Wandering or exit-seeking?',
        'Wandering or exit-seeking support needed',
        'Learning disability?',
      ]),
    )
  })

  it('groups the Tab 1 10.6a slice for InitialAssessmentCognitionChecklistPanel', () => {
    const { questions } = tab1Section10Fixture()
    const slice = tab1().multiSections?.find((s) => s.specRefs?.includes('10.6a'))
    const groups = groupQuestionsBySpecRef(filterQuestionsForHolisticTab(questions, slice!), 10)

    expect(groups).toHaveLength(1)
    expect(groups[0]!.specRef).toBe('10.6a')
    expect(groups[0]!.label).toBe('10.6a Cognition and behaviour checklist')
    expect(groups[0]!.questions.map((q) => q.metadata?.fieldKey ?? q.questionText)).toEqual(
      expect.arrayContaining(['diagnosedDementia', 'wanderingOrExitSeeking', 'wanderingSupportNotes']),
    )
    expect(groups[0]!.questions.every((q) => q.metadata?.specRef === '10.6a')).toBe(true)
  })

  it('leaves existing Tab 1 §10.1 / 10.2 / 10.6 / 10.4 slices unchanged', () => {
    const { section, questions } = tab1Section10Fixture()
    const visible = new Map<number, InitialAssessmentQuestion[]>([[10, questions]])
    const texts = questionsForDocumentTab(tab1(), [section], visible).map((q) => q.questionText)

    expect(texts).toEqual(
      expect.arrayContaining([
        'Current mental health issues reported?',
        'Community Psychiatric Nurse involved?',
        'Previous mental health issues reported?',
        'Emotional wellbeing status',
        'Feels low in mood?',
        'Cognitive impairment level',
        'Sleeping pattern',
        'Emotional health comments',
      ]),
    )

    const slices = tab1().multiSections?.filter((s) => s.sectionNumber === 10) ?? []
    expect(slices.map((s) => s.specRefs ?? s.questionTextsOnly)).toEqual([
      ['10.1'],
      ['10.2'],
      ['10.6'],
      ['10.6a'],
      ['10.4'],
      ['Emotional health comments'],
    ])
    expect(slices.find((s) => s.specRefs?.[0] === '10.1')?.questionTextsOnly).toEqual([
      'Current mental health issues reported?',
      'Community Psychiatric Nurse involved?',
      'Previous mental health issues reported?',
    ])
    expect(slices.find((s) => s.specRefs?.[0] === '10.6')?.questionTextsOnly).toContain('Cognitive impairment level')
    expect(slices.find((s) => s.questionTextsOnly?.[0] === 'Emotional health comments')).toBeTruthy()

    const allSlices = tab1().multiSections ?? []
    expect(allSlices.some((s) => s.sectionNumber === 4 && !s.specRefs && !s.questionTextsOnly)).toBe(true)
    expect(allSlices.some((s) => s.sectionNumber === 9 && !s.specRefs && !s.questionTextsOnly)).toBe(true)
    expect(allSlices.find((s) => s.sectionNumber === 11)?.excludeSpecRefs).toEqual(['11.4'])
    expect(allSlices.filter((s) => s.sectionNumber === 10)).toHaveLength(6)
  })

  it('preserves 10.6a answers in Tab 1 save/reload scope with wandering conditionals', () => {
    const { section, questions } = tab1Section10Fixture()
    const dementia = questions.find((q) => q.id === 'dementia')!
    const wandering = questions.find((q) => q.id === 'wandering')!
    const notes = questions.find((q) => q.id === 'wandering-notes')!

    const saved: Record<string, InitialAssessmentAnswerInput> = {
      [dementia.id]: { questionId: dementia.id, booleanValue: true, checked: true },
      [wandering.id]: { questionId: wandering.id, booleanValue: true, checked: true },
      [notes.id]: { questionId: notes.id, textValue: 'Door sensors and supervised outdoor time' },
    }
    const reloaded = JSON.parse(JSON.stringify(saved)) as Record<string, InitialAssessmentAnswerInput>

    const visibleAfterReload = getVisibleSectionQuestions(section, [section], reloaded)
    expect(visibleAfterReload.map((q) => q.id)).toEqual(
      expect.arrayContaining(['dementia', 'wandering', 'wandering-notes', 'ld', 'cog-level', 'sleep']),
    )

    const tabQuestions = questionsForDocumentTab(
      tab1(),
      [section],
      new Map([[10, visibleAfterReload]]),
    )
    const byId = new Map(tabQuestions.map((q) => [q.id, q]))
    expect(byId.has('dementia')).toBe(true)
    expect(byId.has('wandering')).toBe(true)
    expect(byId.has('wandering-notes')).toBe(true)
    expect(reloaded[dementia.id]?.booleanValue).toBe(true)
    expect(reloaded[wandering.id]?.booleanValue).toBe(true)
    expect(reloaded[notes.id]?.textValue).toBe('Door sensors and supervised outdoor time')
  })
})
