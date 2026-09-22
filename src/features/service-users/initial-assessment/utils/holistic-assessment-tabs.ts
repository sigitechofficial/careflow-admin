import type { InitialAssessmentQuestion, InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import { specRefOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { isAboutMeIaSpecRef } from '@/features/service-users/initial-assessment/utils/about-me-ia-questions'
import type { SectionNavStatus } from '@/features/service-users/initial-assessment/utils/validation-maps'
import type { ValidationIssue } from '@/features/service-users/initial-assessment/utils/submit-validation'
import {
  sectionProgress,
  type SectionProgressContext,
} from '@/features/service-users/initial-assessment/utils/section-progress'
import type { InitialAssessmentAnswerInput } from '@/features/service-users/initial-assessment/types'
import type { Section12PanelBlock } from '@/features/service-users/initial-assessment/utils/section-12-display-order'
import { listSignOffQuestions } from '@/features/service-users/initial-assessment/utils/sign-off-questions'

/** Tab content kinds aligned to the paper document Table of Contents (18 items). */
export type DocumentTabKind =
  | 'multi-section'
  | 'form-section'
  | 'mca-screening'
  | 'section12-blocks'
  | 'skin-integrity-check'
  | 'waterlow'
  | 'equipment-selection'
  | 'must-tool'
  | 'falls-screening'
  | 'moving-handling'
  | 'pain-tool'
  | 'therapy-memoire'
  | 'environment-assessment'
  | 'advance-care-planning'
  | 'end-of-life-assessment'
  | 'clinical-outcome-summary'
  | 'care-plan-objectives'
  | 'mental-capacity-checklist'
  | 'photography-consent'
  | 'placeholder'

export type SectionQuestionFilter = {
  specRefs?: string[]
  excludeSpecRefs?: string[]
  questionTextsOnly?: string[]
  includeQuestionTexts?: string[]
  additionalSpecRefs?: string[]
  /** Tab 1 ΓÇö render paper Section 7 ADL block (enterprise ┬º12 worksheet + footer). */
  paperSection7Adl?: boolean
  /** Tab 1 ΓÇö embed profile About Me editor (service user references). */
  aboutMeEmbed?: boolean
}

export type HolisticAssessmentTab = {
  /**
   * Frozen internal tab id. Used by URL `section=`, section comments, registry,
   * autofill, and save keys. Do not renumber persisted values 1–18 or 19–22.
   */
  id: number
  /**
   * User-facing Table of Contents number. Independent of `id` and of
   * `enterpriseSection` (catalogue §15 Infection / §16 PEEP / §17 Bed Rails /
   * §18 Fire must not drive this label).
   */
  displayNumber: number
  title: string
  kind: DocumentTabKind
  /** Primary enterprise section (save, attachments, comments). */
  enterpriseSection: number
  /** Single-section question filter (form-section / skin). */
  specRefs?: string[]
  excludeSpecRefs?: string[]
  questionTextsOnly?: string[]
  includeQuestionTexts?: string[]
  additionalSpecRefs?: string[]
  /** Tab 1 ΓÇö stacked enterprise sections from the main assessment pages. */
  multiSections?: Array<{ sectionNumber: number } & SectionQuestionFilter>
  /** ┬º12 panel blocks for Practical Task / Equipment / Falls / Moving & Handling tabs. */
  section12Blocks?: Section12PanelBlock[]
  placeholderHint?: string
}

function defineHolisticTab(
  tab: Omit<HolisticAssessmentTab, 'displayNumber'> & { displayNumber?: number },
): HolisticAssessmentTab {
  return { ...tab, displayNumber: tab.displayNumber ?? tab.id }
}

/**
 * Holistic document tabs. Array order is the visible navigation order:
 * historical tabs 1–18, then PEEP, Bed Rails, Infection, Fire Safety.
 * Do not sort this array by `enterpriseSection` or by numeric `id`.
 */
const HOLISTIC_ASSESSMENT_TAB_DEFS: Array<Omit<HolisticAssessmentTab, 'displayNumber'>> = [
  {
    id: 1,
    title: 'Personal Details & Medical History',
    kind: 'multi-section',
    enterpriseSection: 1,
    multiSections: [
      { sectionNumber: 1, specRefs: ['1.1'] },
      { sectionNumber: 1, aboutMeEmbed: true },
      { sectionNumber: 1, specRefs: ['1.3'] },
      { sectionNumber: 1, specRefs: ['1.4'] },
      { sectionNumber: 1, specRefs: ['1.5'] },
      { sectionNumber: 1, specRefs: ['1.6'] },
      { sectionNumber: 1, specRefs: ['1.7'] },
      { sectionNumber: 1, specRefs: ['1.8'] },
      {
        sectionNumber: 1,
        questionTextsOnly: ['Reason for admission / starting care'],
      },
      {
        sectionNumber: 1,
        questionTextsOnly: ['Previous medical history (summary)', 'Allergies (summary)'],
      },
      { sectionNumber: 1, specRefs: ['1.2'] },
      { sectionNumber: 4 },
      { sectionNumber: 5 },
      { sectionNumber: 6, specRefs: ['6.1'] },
      { sectionNumber: 6, specRefs: ['6.2'] },
      { sectionNumber: 6, specRefs: ['6.3'] },
      { sectionNumber: 6, specRefs: ['6.4'] },
      { sectionNumber: 7, specRefs: ['7.1', '7.2'] },
      { sectionNumber: 7, specRefs: ['7.3', '7.4'] },
      { sectionNumber: 7, specRefs: ['7.5', '7.6'] },
      { sectionNumber: 8, specRefs: ['8.1', '8.2'] },
      { sectionNumber: 8, specRefs: ['8.3'] },
      { sectionNumber: 8, specRefs: ['8.4'] },
      { sectionNumber: 8, specRefs: ['8.5', '8.6'] },
      { sectionNumber: 9 },
      {
        sectionNumber: 10,
        specRefs: ['10.1'],
        questionTextsOnly: [
          'Current mental health issues reported?',
          'Community Psychiatric Nurse involved?',
          'Previous mental health issues reported?',
        ],
      },
      {
        sectionNumber: 10,
        specRefs: ['10.2'],
        questionTextsOnly: [
          'Emotional wellbeing status',
          'Feels low in mood?',
          'Feels depressed?',
          'GP referral for mental health made?',
        ],
      },
      {
        sectionNumber: 10,
        specRefs: ['10.6'],
        questionTextsOnly: [
          'Cognitive impairment level',
          'AMT completed?',
          'Mental Capacity Assessment required?',
          'GP referral for cognition requested?',
          'GP referral for cognition made?',
        ],
      },
      {
        sectionNumber: 10,
        specRefs: ['10.6a'],
      },
      {
        sectionNumber: 10,
        specRefs: ['10.4'],
        questionTextsOnly: ['Sleeping pattern'],
      },
      {
        sectionNumber: 10,
        questionTextsOnly: ['Emotional health comments'],
      },
      { sectionNumber: 11, excludeSpecRefs: ['11.4'] },
      { sectionNumber: 12, paperSection7Adl: true },
    ],
  },
  {
    id: 2,
    title: 'Practical Task',
    kind: 'section12-blocks',
    enterpriseSection: 12,
    section12Blocks: [{ kind: 'practical-care' }],
  },
  {
    id: 3,
    title: 'Initial Mental Capacity Act Screening Tool',
    kind: 'mca-screening',
    enterpriseSection: 2,
    specRefs: ['2.mca', '2.9'],
  },
  {
    id: 4,
    title: 'Total Skin Integrity Check',
    kind: 'skin-integrity-check',
    enterpriseSection: 11,
  },
  {
    id: 5,
    title: 'Waterlow Pressure Score',
    kind: 'waterlow',
    enterpriseSection: 11,
  },
  {
    id: 6,
    title: 'Equipment Selection',
    kind: 'equipment-selection',
    enterpriseSection: 12,
  },
  {
    id: 7,
    title: 'Malnutrition Universal Screening Tool (MUST)',
    kind: 'must-tool',
    enterpriseSection: 6,
  },
  {
    id: 8,
    title: 'Falls Screening',
    kind: 'falls-screening',
    enterpriseSection: 12,
  },
  {
    id: 9,
    title: 'Moving and Handling Operations',
    kind: 'moving-handling',
    enterpriseSection: 12,
  },
  {
    id: 10,
    title: 'Pain Assessment Tool',
    kind: 'pain-tool',
    enterpriseSection: 5,
  },
  {
    id: 11,
    title: 'Aide Memorie to Establish Therapy Needs',
    kind: 'therapy-memoire',
    enterpriseSection: 5,
  },
  {
    id: 12,
    title: 'Environment Assessment',
    kind: 'environment-assessment',
    enterpriseSection: 3,
  },
  {
    id: 13,
    title: 'Advance Care Planning',
    kind: 'advance-care-planning',
    enterpriseSection: 13,
  },
  {
    id: 14,
    title: 'End of Life Assessment',
    kind: 'end-of-life-assessment',
    enterpriseSection: 13,
  },
  {
    id: 15,
    title: 'Social and Clinical assessment outcome summary',
    kind: 'clinical-outcome-summary',
    enterpriseSection: 14,
  },
  {
    id: 16,
    title: 'Personalised Care/Support Plan',
    kind: 'care-plan-objectives',
    enterpriseSection: 14,
  },
  {
    id: 17,
    title: 'Mental Capacity Assessment Identified',
    kind: 'mental-capacity-checklist',
    enterpriseSection: 10,
  },
  {
    id: 18,
    title: 'Photography Consent Form',
    kind: 'photography-consent',
    enterpriseSection: 11,
  },
  {
    id: 19,
    title: 'Personal Emergency Evacuation Plan (PEEP)',
    kind: 'form-section',
    enterpriseSection: 16,
  },
  {
    id: 20,
    title: 'Bed Rails',
    kind: 'form-section',
    enterpriseSection: 17,
  },
  {
    id: 21,
    title: 'Infection and Clinical Precautions',
    kind: 'form-section',
    enterpriseSection: 15,
  },
  {
    id: 22,
    title: 'Fire Safety',
    kind: 'form-section',
    enterpriseSection: 18,
  },
]

export const HOLISTIC_ASSESSMENT_TABS: HolisticAssessmentTab[] =
  HOLISTIC_ASSESSMENT_TAB_DEFS.map(defineHolisticTab)

export const HOLISTIC_TAB_COUNT = HOLISTIC_ASSESSMENT_TABS.length

/** Frozen internal tab ids in visible navigation order (not enterpriseSection order). */
export const HOLISTIC_REGISTERED_TAB_IDS = HOLISTIC_ASSESSMENT_TABS.map((tab) => tab.id)

export const HOLISTIC_MAX_TAB_ID = Math.max(...HOLISTIC_REGISTERED_TAB_IDS)

export function isRegisteredHolisticTabId(id: number): boolean {
  return HOLISTIC_ASSESSMENT_TABS.some((tab) => tab.id === id)
}

export function holisticTabById(id: number): HolisticAssessmentTab | undefined {
  return HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === id)
}

export function holisticTabTitle(id: number): string {
  return holisticTabById(id)?.title ?? `Section ${id}`
}

/** User-facing TOC number. Never derived from enterpriseSection. */
export function holisticTabDisplayNumber(tab: HolisticAssessmentTab | number): number {
  if (typeof tab === 'number') {
    return holisticTabById(tab)?.displayNumber ?? tab
  }
  return tab.displayNumber
}

export function firstHolisticTabForEnterpriseSection(sectionNumber: number): number {
  const tab = HOLISTIC_ASSESSMENT_TABS.find((t) => {
    if (t.enterpriseSection === sectionNumber && t.kind !== 'multi-section') return true
    if (t.multiSections?.some((s) => s.sectionNumber === sectionNumber)) return true
    return false
  })
  return tab?.id ?? HOLISTIC_ASSESSMENT_TABS[0]!.id
}

export function enterpriseSectionForHolisticTab(tabId: number): number {
  return holisticTabById(tabId)?.enterpriseSection ?? tabId
}

function applySectionFilter(
  q: InitialAssessmentQuestion,
  filter: SectionQuestionFilter,
): boolean {
  const text = q.questionText.trim()
  const ref = specRefOf(q)

  if (filter.questionTextsOnly?.length) {
    return filter.questionTextsOnly.includes(text)
  }

  if (filter.excludeSpecRefs?.length && ref && filter.excludeSpecRefs.includes(ref)) {
    if (!filter.includeQuestionTexts?.includes(text)) return false
  }

  const specSet = new Set(filter.specRefs ?? [])
  const additionalSet = new Set(filter.additionalSpecRefs ?? [])
  const includeSet = new Set(filter.includeQuestionTexts ?? [])

  const hasFilter =
    filter.specRefs?.length ||
    filter.additionalSpecRefs?.length ||
    filter.includeQuestionTexts?.length

  if (!hasFilter) return true

  if (includeSet.has(text)) return true
  if (ref && specSet.has(ref)) return true
  if (ref && additionalSet.has(ref)) return true

  return false
}

/** Stable React key for multi-section tab slices (section 1 appears multiple times on tab 1). */
export function holisticMultiSectionSliceKey(
  tabId: number,
  slice: { sectionNumber: number } & SectionQuestionFilter,
  index: number,
): string {
  if (slice.specRefs?.length) {
    return `${tabId}-sec-${slice.sectionNumber}-spec-${slice.specRefs.join(',')}`
  }
  if (slice.questionTextsOnly?.length) {
    return `${tabId}-sec-${slice.sectionNumber}-texts-${slice.questionTextsOnly.join('|')}`
  }
  if (slice.includeQuestionTexts?.length) {
    return `${tabId}-sec-${slice.sectionNumber}-inc-${slice.includeQuestionTexts.join('|')}`
  }
  if (slice.excludeSpecRefs?.length) {
    return `${tabId}-sec-${slice.sectionNumber}-excl-${slice.excludeSpecRefs.join(',')}`
  }
  if (slice.paperSection7Adl) {
    return `${tabId}-sec-${slice.sectionNumber}-paper-7-adl`
  }
  if (slice.aboutMeEmbed) {
    return `${tabId}-about-me-embed`
  }
  return `${tabId}-sec-${slice.sectionNumber}-full-${index}`
}

function questionMatchesTab(q: InitialAssessmentQuestion, tab: HolisticAssessmentTab): boolean {
  const filter: SectionQuestionFilter = {
    specRefs: tab.specRefs,
    excludeSpecRefs: tab.excludeSpecRefs,
    questionTextsOnly: tab.questionTextsOnly,
    includeQuestionTexts: tab.includeQuestionTexts,
    additionalSpecRefs: tab.additionalSpecRefs,
  }
  return applySectionFilter(q, filter)
}

/** Questions visible on a document tab. */
export function filterQuestionsForHolisticTab(
  questions: InitialAssessmentQuestion[],
  tab: HolisticAssessmentTab | SectionQuestionFilter,
): InitialAssessmentQuestion[] {
  const filter: SectionQuestionFilter =
    'kind' in tab
      ? {
          specRefs: tab.specRefs,
          excludeSpecRefs: tab.excludeSpecRefs,
          questionTextsOnly: tab.questionTextsOnly,
          includeQuestionTexts: tab.includeQuestionTexts,
          additionalSpecRefs: tab.additionalSpecRefs,
        }
      : tab

  const fullSection =
    !filter.specRefs?.length &&
    !filter.questionTextsOnly?.length &&
    !filter.includeQuestionTexts?.length &&
    !filter.additionalSpecRefs?.length &&
    !filter.excludeSpecRefs?.length

  if (filter.paperSection7Adl) return []

  if (fullSection) return questions

  return questions.filter((q) => applySectionFilter(q, filter))
}

/** All template questions that belong on a tab (for nav progress / validation). */
export function questionsForDocumentTab(
  tab: HolisticAssessmentTab,
  sections: InitialAssessmentSection[],
  visibleQuestionsBySection: Map<number, InitialAssessmentQuestion[]>,
): InitialAssessmentQuestion[] {
  if (tab.kind === 'care-plan-objectives') {
    const sec14 = sections.find((s) => s.sectionNumber === 14)
    return sec14 ? listSignOffQuestions(sec14.questions) : []
  }

  if (
    tab.kind === 'waterlow' ||
    tab.kind === 'pain-tool' ||
    tab.kind === 'therapy-memoire' ||
    tab.kind === 'environment-assessment' ||
    tab.kind === 'advance-care-planning' ||
    tab.kind === 'end-of-life-assessment' ||
    tab.kind === 'clinical-outcome-summary' ||
    tab.kind === 'skin-integrity-check' ||
    tab.kind === 'equipment-selection' ||
    tab.kind === 'must-tool' ||
    tab.kind === 'falls-screening' ||
    tab.kind === 'moving-handling' ||
    tab.kind === 'mca-screening' ||
    tab.kind === 'mental-capacity-checklist' ||
    tab.kind === 'photography-consent'
  ) {
    if (tab.kind === 'mca-screening') {
      const visible = visibleQuestionsBySection.get(tab.enterpriseSection) ?? []
      return filterQuestionsForHolisticTab(visible, tab)
    }
    return []
  }

  if (tab.kind === 'section12-blocks') {
    const blocks = tab.section12Blocks ?? []
    const questionBlocks = blocks.filter((b) => b.kind === 'questions')
    if (questionBlocks.length === 0) return []
    const visible = visibleQuestionsBySection.get(12) ?? []
    return visible.filter((q) => {
      const ref = specRefOf(q)
      return ref != null && questionBlocks.some((b) => b.specRef === ref)
    })
  }

  if (tab.kind === 'placeholder') {
    return []
  }

  if (tab.kind === 'multi-section' && tab.multiSections?.length) {
    const out: InitialAssessmentQuestion[] = []
    for (const slice of tab.multiSections) {
      if (slice.paperSection7Adl) continue
      if (slice.aboutMeEmbed) {
        const visible = visibleQuestionsBySection.get(1) ?? []
        out.push(...visible.filter((q) => isAboutMeIaSpecRef(specRefOf(q) ?? '')))
        continue
      }
      const visible = visibleQuestionsBySection.get(slice.sectionNumber) ?? []
      out.push(...filterQuestionsForHolisticTab(visible, slice))
    }
    return out
  }

  const visible = visibleQuestionsBySection.get(tab.enterpriseSection) ?? []
  return filterQuestionsForHolisticTab(visible, tab)
}

function isFullSection12BlocksTab(tab: HolisticAssessmentTab): boolean {
  if (tab.kind !== 'section12-blocks') return false
  const blocks = tab.section12Blocks
  if (!blocks?.length) return true
  return blocks.some(
    (b) =>
      b.kind === 'adl-worksheet-scores' ||
      b.kind === 'falls-panel' ||
      b.kind === 'transfer-matrix' ||
      b.kind === 'equipment-panel',
  )
}

function issueAppliesToTabQuestions(issue: ValidationIssue, tabQuestions: InitialAssessmentQuestion[]): boolean {
  const msg = issue.message
  if (msg.startsWith('Required: ')) {
    const text = msg.slice('Required: '.length)
    return tabQuestions.some((q) => q.questionText === text)
  }
  if (msg.startsWith('Assessor sign-off required: ')) {
    const text = msg.slice('Assessor sign-off required: '.length)
    return tabQuestions.some((q) => q.questionText === text)
  }
  return false
}

export function buildHolisticTabNavStatus(params: {
  tabs: HolisticAssessmentTab[]
  sections: InitialAssessmentSection[]
  visibleQuestionsBySection: Map<number, InitialAssessmentQuestion[]>
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  editable: boolean
  progressContext?: SectionProgressContext
  sectionBlocks: Map<number, ValidationIssue[]>
  sectionWarnings: Map<number, ValidationIssue[]>
  questionErrors: Map<string, string>
  revealFieldErrors: boolean
  waterlowComplete?: boolean
  painToolComplete?: boolean
  skinIntegrityCheckComplete?: boolean
  mustToolComplete?: boolean
  fallsScreeningComplete?: boolean
  movingHandlingComplete?: boolean
  therapyMemoireComplete?: boolean
  environmentAssessmentComplete?: boolean
  advanceCarePlanningComplete?: boolean
  endOfLifeAssessmentComplete?: boolean
  clinicalOutcomeSummaryComplete?: boolean
  carePlanObjectivesComplete?: boolean
  mentalCapacityChecklistComplete?: boolean
  photographyConsentComplete?: boolean
  equipmentSelectionComplete?: boolean
}): Map<number, SectionNavStatus> {
  const {
    tabs,
    sections,
    visibleQuestionsBySection,
    draftAnswers,
    editable,
    progressContext,
    sectionBlocks,
    sectionWarnings,
    questionErrors,
    revealFieldErrors,
    waterlowComplete,
    painToolComplete,
    skinIntegrityCheckComplete,
    mustToolComplete,
    fallsScreeningComplete,
    movingHandlingComplete,
    therapyMemoireComplete,
    environmentAssessmentComplete,
    advanceCarePlanningComplete,
    endOfLifeAssessmentComplete,
    clinicalOutcomeSummaryComplete,
    carePlanObjectivesComplete,
    mentalCapacityChecklistComplete,
    photographyConsentComplete,
    equipmentSelectionComplete,
  } = params

  const status = new Map<number, SectionNavStatus>()

  for (const tab of tabs) {
    if (tab.kind === 'placeholder') {
      status.set(tab.id, 'ok')
      continue
    }

    if (tab.kind === 'equipment-selection') {
      if (editable && !equipmentSelectionComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'waterlow') {
      if (editable && !waterlowComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'pain-tool') {
      if (editable && !painToolComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'therapy-memoire') {
      if (editable && !therapyMemoireComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'environment-assessment') {
      if (editable && !environmentAssessmentComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'advance-care-planning') {
      if (editable && !advanceCarePlanningComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'end-of-life-assessment') {
      if (editable && !endOfLifeAssessmentComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'clinical-outcome-summary') {
      if (editable && !clinicalOutcomeSummaryComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'care-plan-objectives') {
      if (editable && !carePlanObjectivesComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'mental-capacity-checklist') {
      if (editable && !mentalCapacityChecklistComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'photography-consent') {
      if (editable && !photographyConsentComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'must-tool') {
      if (editable && !mustToolComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'falls-screening') {
      if (editable && !fallsScreeningComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'moving-handling') {
      if (editable && !movingHandlingComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'skin-integrity-check') {
      if (editable && !skinIntegrityCheckComplete) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    const tabQuestions = questionsForDocumentTab(tab, sections, visibleQuestionsBySection)
    const enterprise = sections.find((s) => s.sectionNumber === tab.enterpriseSection)

    if (!enterprise && tabQuestions.length === 0) {
      status.set(tab.id, 'ok')
      continue
    }

    const isFullTab =
      isFullSection12BlocksTab(tab) ||
      (tab.kind === 'form-section' &&
        !tab.specRefs?.length &&
        !tab.questionTextsOnly?.length &&
        !tab.includeQuestionTexts?.length)

    const blocks = (sectionBlocks.get(tab.enterpriseSection) ?? []).filter((issue) =>
      isFullTab ? true : issueAppliesToTabQuestions(issue, tabQuestions),
    )
    const warnings = (sectionWarnings.get(tab.enterpriseSection) ?? []).filter((issue) =>
      isFullTab ? true : issueAppliesToTabQuestions(issue, tabQuestions),
    )

    const hasFieldError = tabQuestions.some((q) => questionErrors.has(q.id))
    const hasHardBlocks =
      blocks.some((b) => b.blocking) &&
      (revealFieldErrors || blocks.some((b) => !b.message.startsWith('Required: ')))

    const pseudoSection: InitialAssessmentSection = {
      ...(enterprise ?? sections[0]!),
      questions: tabQuestions,
    }
    const prog = sectionProgress(pseudoSection, draftAnswers, sections, progressContext)
    const requiredIncomplete = editable && prog.requiredTotal > 0 && prog.requiredAnswered < prog.requiredTotal

    if (hasHardBlocks || (revealFieldErrors && hasFieldError)) {
      status.set(tab.id, 'blocking')
    } else if (warnings.length > 0) {
      status.set(tab.id, 'warning')
    } else if (editable && (requiredIncomplete || (prog.total > 0 && prog.percent < 100))) {
      status.set(tab.id, 'incomplete')
    } else {
      status.set(tab.id, 'ok')
    }
  }

  return status
}
