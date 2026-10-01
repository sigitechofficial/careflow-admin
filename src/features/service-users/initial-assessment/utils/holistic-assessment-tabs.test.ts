import { describe, expect, it } from 'vitest'
import {
  firstHolisticTabForEnterpriseSection,
  holisticTabForValidationIssue,
  holisticTabRef,
  resolveHolisticTabId,
  retiredHolisticTabIdsFor,
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

  it('keeps frozen tab ids, adds Consent (23) + Safeguarding (24) and retires Photography (18)', () => {
    const ids = HOLISTIC_ASSESSMENT_TABS.map((t) => t.id)
    expect(ids).toEqual(
      expect.arrayContaining([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24]),
    )
    expect(ids).not.toContain(18)
    expect(HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 19)?.enterpriseSection).toBe(16)
    expect(HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 20)?.enterpriseSection).toBe(17)
    expect(HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 21)?.enterpriseSection).toBe(15)
    expect(HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 22)?.enterpriseSection).toBe(18)
    expect(HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 23)?.enterpriseSection).toBe(2)
    expect(HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 24)?.enterpriseSection).toBe(13)
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

  it('iterates registered tab ids instead of 1..N', () => {
    expect(HOLISTIC_REGISTERED_TAB_IDS).toEqual(HOLISTIC_ASSESSMENT_TABS.map((tab) => tab.id))
    expect(HOLISTIC_TAB_COUNT).toBe(HOLISTIC_ASSESSMENT_TABS.length)
    expect(HOLISTIC_TAB_COUNT).toBe(23)
    expect(HOLISTIC_MAX_TAB_ID).toBe(24)
  })
})

describe('holistic tab display numbering and navigation order', () => {
  // Home-visit order: consent → the person → health tools → home & safety → future planning → sign-off.
  // A. Core → B. Specialist / conditional → C. Outcome & sign-off
  const NAV_ORDER: Array<[number, string]> = [
    [23, 'Consent'],
    [1, 'Personal Details & Medical History'],
    [2, 'Practical Task'],
    [12, 'Environment & Home Safety'],
    [24, 'Safeguarding & Emergency'],
    [10, 'Pain Assessment Tool'],
    [11, 'Aide Memorie to Establish Therapy Needs'],
    [7, 'Alternative to MUST'],
    [3, 'Initial Mental Capacity Act Screening Tool'],
    [17, 'Mental Capacity Assessment Identified'],
    [4, 'Total Skin Integrity Check'],
    [5, 'Waterlow Pressure Score'],
    [8, 'Falls Screening'],
    [9, 'Moving and Handling Operations'],
    [6, 'Equipment Selection'],
    [22, 'Fire Safety'],
    [21, 'Infection and Clinical Precautions'],
    [20, 'Bed Rails'],
    [19, 'Personal Emergency Evacuation Plan (PEEP)'],
    [13, 'Advance Care Planning'],
    [14, 'End of Life Assessment'],
    [15, 'Clinical outcome summary (baseline)'],
    [16, 'Care Plan, Consent to Care & Sign-off'],
  ]

  it('navigates in home-visit order with display numbers 1–23', () => {
    expect(HOLISTIC_ASSESSMENT_TABS.map((tab) => [tab.id, tab.title])).toEqual(NAV_ORDER)
    expect(HOLISTIC_ASSESSMENT_TABS.map((tab) => holisticTabDisplayNumber(tab))).toEqual(
      NAV_ORDER.map((_, index) => index + 1),
    )
    for (const [id] of NAV_ORDER) {
      expect(holisticTabDisplayNumber(id)).toBe(NAV_ORDER.findIndex(([tabId]) => tabId === id) + 1)
    }
  })

  it('starts with Consent and ends with sign-off', () => {
    expect(HOLISTIC_ASSESSMENT_TABS[0]?.id).toBe(23)
    expect(HOLISTIC_ASSESSMENT_TABS.at(-1)?.id).toBe(16)
    expect(holisticTabRef(16)).toBe('Tab 23')
    expect(holisticTabRef(3)).toBe('Tab 9')
    expect(HOLISTIC_ASSESSMENT_TABS.map((t) => t.group)).toEqual([
      ...Array(5).fill('core'),
      ...Array(16).fill('specialist'),
      'finalisation',
      'finalisation',
    ])
  })

  it('keeps persisted internal holisticTabId and enterpriseSection mappings unchanged', () => {
    expect(holisticTabById(19)).toEqual(expect.objectContaining({ id: 19, enterpriseSection: 16 }))
    expect(holisticTabById(20)).toEqual(expect.objectContaining({ id: 20, enterpriseSection: 17 }))
    expect(holisticTabById(21)).toEqual(expect.objectContaining({ id: 21, enterpriseSection: 15 }))
    expect(holisticTabById(22)).toEqual(expect.objectContaining({ id: 22, enterpriseSection: 18 }))
    expect(holisticTabById(15)?.enterpriseSection).toBe(14)
  })

  it('URL/tab selection still opens the underlying internal tab; retired 18 resolves to Consent', () => {
    for (const id of [1, 3, 16, 19, 20, 21, 22, 23, 24]) {
      expect(holisticTabById(id)?.id).toBe(id)
      expect(resolveHolisticTabId(id)).toBe(id)
    }
    expect(holisticTabById(18)).toBeUndefined()
    expect(resolveHolisticTabId(18)).toBe(23)
    expect(retiredHolisticTabIdsFor(23)).toEqual([18])
    expect(resolveHolisticTabId(99)).toBeUndefined()
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
    section10Question('depressed', 'Feels depressed?', '10.2', { fieldKey: 'feelsDepressed', sortOrder: 8 }),
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
    expect(groups[0]!.label).toBe('Cognition and behaviour checklist')
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
        'Feels depressed?',
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

describe('tab re-order: hidden sections now have a home', () => {
  const q = (id: string, text: string, specRef: string, fieldKey?: string) => yesNoQ(id, text, specRef, fieldKey)
  const consent = q('c21', 'Has the Service User consented to this assessment?', '2.1')
  const careConsent = q('c22', 'Has the Service User consented to receive care and support?', '2.2')
  const explained = q('c23', 'Information explained in a way they understand?', '2.3')
  const capacity = q('c24', 'Capacity to consent appears intact?', '2.4')
  const bestInterest = q('c26', 'Best interest decision required?', '2.6')
  const sharing = q('c28', 'Consent to share with GP', '2.8')
  const dol = q('c29', 'Deprivation of liberty authorisation in place?', '2.9')
  const manageHome = q('h33', 'Can client manage home environment safely?', '3.3')
  const access = q('h35', 'Access instructions for staff', '3.5', 'accessInstructions')
  const keySafe = q('h36', 'Key safe location', '3.6', 'keySafeLocation')
  const safeguarding = q('s131', 'Any safeguarding concerns identified?', '13.1', 'safeguardingConcern')
  const nextReview = q('r141', 'Next review date', '14.1', 'nextReviewDate')
  const assessorName = q('a148', 'Assessor name', '14.8', 'assessorName')

  const section = (n: number, questions: InitialAssessmentQuestion[]): InitialAssessmentSection => ({
    id: `s${n}`,
    sectionNumber: n,
    title: `Section ${n}`,
    sortOrder: n,
    questions,
  })
  const sections = [
    section(1, []),
    section(2, [consent, careConsent, explained, capacity, bestInterest, sharing, dol]),
    section(3, [manageHome, access, keySafe]),
    section(13, [safeguarding]),
    section(14, [nextReview, assessorName]),
  ]
  const visible = new Map<number, InitialAssessmentQuestion[]>(sections.map((s) => [s.sectionNumber, s.questions]))
  const idsOn = (tabId: number) =>
    questionsForDocumentTab(holisticTabById(tabId)!, sections, visible).map((x) => x.id)

  it('Consent tab shows §2.1 / 2.3 / 2.4 / 2.8 — not consent to care, best interest or DoL', () => {
    expect(idsOn(23)).toEqual(['c21', 'c23', 'c24', 'c28'])
  })

  it('MCA Screening tab owns best interest (2.6) and deprivation of liberty (2.9)', () => {
    expect(idsOn(3)).toEqual(expect.arrayContaining(['c26', 'c29']))
    expect(idsOn(3)).not.toContain('c21')
  })

  it('final tab carries §14.1 review schedule, §2.2 consent to care and the sign-off', () => {
    expect(idsOn(16)).toEqual(['r141', 'c22', 'a148'])
  })

  it('Environment tab renders §3 except the access fields already on Tab 1', () => {
    expect(idsOn(12)).toEqual(['h33'])
    expect(idsOn(1)).toEqual(expect.arrayContaining(['h35', 'h36']))
  })

  it('Safeguarding & Emergency tab owns §13', () => {
    expect(idsOn(24)).toEqual(['s131'])
  })

  it('routes validation issues to the tab that shows the question', () => {
    const route = (sectionNumber: number, message: string) =>
      holisticTabForValidationIssue({ sectionNumber, message }, sections, visible)
    expect(route(2, `Required: ${careConsent.questionText}`)).toBe(16)
    expect(route(2, `Required: ${consent.questionText}`)).toBe(23)
    expect(route(3, `Required: ${access.questionText}`)).toBe(1)
    expect(route(13, `Required: ${safeguarding.questionText}`)).toBe(24)
    expect(route(14, 'Next review date is required (section 14)')).toBe(16)
    expect(route(2, 'MCA required but the MCA has not been completed')).toBe(3)
    expect(route(2, 'Consent to assessment is No')).toBe(23)
  })

  it('maps enterprise sections to the new tabs', () => {
    expect(firstHolisticTabForEnterpriseSection(2)).toBe(23)
    expect(firstHolisticTabForEnterpriseSection(3)).toBe(12)
    expect(firstHolisticTabForEnterpriseSection(13)).toBe(24)
    expect(firstHolisticTabForEnterpriseSection(14)).toBe(16)
    expect(firstHolisticTabForEnterpriseSection(11)).toBe(1)
  })
})
