import type { InitialAssessmentQuestion, InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import { specRefOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type { SectionNavStatus } from '@/features/service-users/initial-assessment/utils/validation-maps'
import type { ValidationIssue } from '@/features/service-users/initial-assessment/utils/submit-validation'
import {
  sectionProgress,
  type SectionProgressContext,
} from '@/features/service-users/initial-assessment/utils/section-progress'
import type { InitialAssessmentAnswerInput } from '@/features/service-users/initial-assessment/types'
import type { Section12PanelBlock } from '@/features/service-users/initial-assessment/utils/section-12-display-order'

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
}

export type HolisticAssessmentTab = {
  id: number
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
  /** Tab 1 — stacked enterprise sections from the main assessment pages. */
  multiSections?: Array<{ sectionNumber: number } & SectionQuestionFilter>
  /** §12 panel blocks for Practical Task / Equipment / Falls / Moving & Handling tabs. */
  section12Blocks?: Section12PanelBlock[]
  placeholderHint?: string
}

/**
 * Table of Contents — Initial Holistic Assessment and Care Needs Assessment.
 * Order matches the reference document (image 1).
 */
export const HOLISTIC_ASSESSMENT_TABS: HolisticAssessmentTab[] = [
  {
    id: 1,
    title: 'Personal Details & Medical History',
    kind: 'multi-section',
    enterpriseSection: 1,
    multiSections: [
      { sectionNumber: 1, specRefs: ['1.1'] },
      {
        sectionNumber: 1,
        questionTextsOnly: ['Reason for admission / starting care'],
      },
      {
        sectionNumber: 1,
        questionTextsOnly: ['Previous medical history (summary)', 'Allergies (summary)'],
      },
      {
        sectionNumber: 1,
        specRefs: ['1.2'],
        includeQuestionTexts: [
          'Family, representative, next of kin, advocate, key contacts',
          'Representative relationship',
          'Representative involved in assessment?',
          'Representative name',
        ],
      },
      { sectionNumber: 4 },
      { sectionNumber: 5, excludeSpecRefs: ['5.3'] },
      { sectionNumber: 6, excludeSpecRefs: ['6.8', '6.9', '6.10'] },
      { sectionNumber: 7 },
      { sectionNumber: 8 },
      { sectionNumber: 9 },
      { sectionNumber: 10, excludeSpecRefs: ['10.6', '10.6a', '10.7', '10.8'] },
    ],
  },
  {
    id: 2,
    title: 'Practical Task',
    kind: 'section12-blocks',
    enterpriseSection: 12,
    section12Blocks: [
      { kind: 'adl-worksheet-scores' },
      { kind: 'questions', specRef: '12.5a' },
      { kind: 'questions', specRef: '12.5b' },
      { kind: 'questions', specRef: '12.5d' },
      { kind: 'adl-worksheet-total' },
      { kind: 'practical-care' },
      { kind: 'questions', specRef: '12.10' },
    ],
  },
  {
    id: 3,
    title: 'Initial Mental Capacity Act Screening Tool',
    kind: 'mca-screening',
    enterpriseSection: 2,
    specRefs: ['2.mca'],
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
]

export const HOLISTIC_TAB_COUNT = HOLISTIC_ASSESSMENT_TABS.length

export function holisticTabById(id: number): HolisticAssessmentTab | undefined {
  return HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === id)
}

export function holisticTabTitle(id: number): string {
  return holisticTabById(id)?.title ?? `Section ${id}`
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

  if (fullSection) return questions

  return questions.filter((q) => applySectionFilter(q, filter))
}

/** All template questions that belong on a tab (for nav progress / validation). */
export function questionsForDocumentTab(
  tab: HolisticAssessmentTab,
  sections: InitialAssessmentSection[],
  visibleQuestionsBySection: Map<number, InitialAssessmentQuestion[]>,
): InitialAssessmentQuestion[] {
  if (
    tab.kind === 'waterlow' ||
    tab.kind === 'pain-tool' ||
    tab.kind === 'therapy-memoire' ||
    tab.kind === 'environment-assessment' ||
    tab.kind === 'advance-care-planning' ||
    tab.kind === 'end-of-life-assessment' ||
    tab.kind === 'clinical-outcome-summary' ||
    tab.kind === 'care-plan-objectives' ||
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
    return visibleQuestionsBySection.get(12) ?? []
  }

  if (tab.kind === 'placeholder') {
    return []
  }

  if (tab.kind === 'multi-section' && tab.multiSections?.length) {
    const out: InitialAssessmentQuestion[] = []
    for (const slice of tab.multiSections) {
      const visible = visibleQuestionsBySection.get(slice.sectionNumber) ?? []
      out.push(...filterQuestionsForHolisticTab(visible, slice))
    }
    return out
  }

  const visible = visibleQuestionsBySection.get(tab.enterpriseSection) ?? []
  return filterQuestionsForHolisticTab(visible, tab)
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
      tab.kind === 'section12-blocks' ||
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
