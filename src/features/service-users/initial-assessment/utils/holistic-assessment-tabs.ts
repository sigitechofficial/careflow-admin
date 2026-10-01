import type { InitialAssessmentQuestion, InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import { isMcaRequiredYes } from '@/features/service-users/initial-assessment/utils/mca-required'
import { specRefOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { isAboutMeIaSpecRef } from '@/features/service-users/initial-assessment/utils/about-me-ia-questions'
import type { SectionNavStatus } from '@/features/service-users/initial-assessment/utils/validation-maps'
import {
  specialistTabForMessage,
  type SpecialistStatus,
} from '@/features/service-users/initial-assessment/utils/specialist-relevance-rules'
import type { ValidationIssue } from '@/features/service-users/initial-assessment/utils/submit-validation'
import {
  sectionProgress,
  type SectionProgressContext,
} from '@/features/service-users/initial-assessment/utils/section-progress'
import type { InitialAssessmentAnswerInput } from '@/features/service-users/initial-assessment/types'
import type { Section12PanelBlock } from '@/features/service-users/initial-assessment/utils/section-12-display-order'
import { listSignOffQuestions } from '@/features/service-users/initial-assessment/utils/sign-off-questions'
import { fallsCaseFindingFromAnswers } from '@/features/service-users/initial-assessment/utils/falls-case-finding'

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
  | 'consent'
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
  /** Tab 1 — current conditions (register shown read-only; new ones staged, promoted on submit). */
  conditionsRegisterEmbed?: boolean
  /** Tab 1 — visible group heading shown above this slice (display only; slices keep their data). */
  groupHeading?: string
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
  /** Core / specialist / finalisation — set from the navigation order below. */
  group?: HolisticTabGroup
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
  /** Template questions rendered below a tool panel (e.g. §3 under the Environment worksheet). */
  appendedSection?: { sectionNumber: number } & SectionQuestionFilter
  /**
   * Questions a custom panel on this tab renders from another section (e.g. §3.5/§3.6 inside the
   * Tab 1 home-access panel). In save / progress / validation scope only — not rendered as a slice.
   */
  scopeOnlySections?: Array<{ sectionNumber: number } & SectionQuestionFilter>
  placeholderHint?: string
}

/**
 * Holistic document tab definitions. Ids are frozen (URL `section=`, section comments, autofill, saved
 * data). The visible order and `displayNumber` come from HOLISTIC_TAB_GROUP_ORDER.
 */
const HOLISTIC_ASSESSMENT_TAB_DEFS: HolisticAssessmentTab[] = [
  {
    id: 23,
    displayNumber: 1,
    title: 'Consent',
    kind: 'consent',
    enterpriseSection: 2,
    specRefs: ['2.1', '2.3', '2.4', '2.8', '2.11', '2.12'],
  },
  {
    id: 1,
    displayNumber: 2,
    title: 'Personal Details & Medical History',
    kind: 'multi-section',
    enterpriseSection: 1,
    multiSections: [
      { sectionNumber: 1, specRefs: ['1.1'], groupHeading: 'About the person and contacts' },
      { sectionNumber: 1, specRefs: ['1.2'] },
      { sectionNumber: 1, aboutMeEmbed: true, groupHeading: 'What matters to the person' },
      { sectionNumber: 1, specRefs: ['1.3'] },
      { sectionNumber: 1, specRefs: ['1.4'] },
      { sectionNumber: 1, specRefs: ['1.5'] },
      { sectionNumber: 1, specRefs: ['1.6'] },
      { sectionNumber: 1, specRefs: ['1.7'] },
      { sectionNumber: 1, specRefs: ['1.8'] },
      // §1.10 social wellbeing — with what matters to the person
      { sectionNumber: 1, specRefs: ['1.10'] },
      {
        sectionNumber: 1,
        questionTextsOnly: ['Reason for admission / starting care'],
        groupHeading: 'Health',
      },
      // §1.9 recent hospital stay — straight after why care is starting
      { sectionNumber: 1, specRefs: ['1.9'] },
      {
        sectionNumber: 1,
        questionTextsOnly: [
          'Previous medical history (summary)',
          'Allergies (summary)',
          'Is palliative or end-of-life care currently relevant or documented by an appropriate healthcare professional?',
          'End of life — who documented it / what needs clarifying',
        ],
      },
      { sectionNumber: 1, conditionsRegisterEmbed: true },
      // §1.11 the person's own smoking / alcohol / drug use — with the health history
      { sectionNumber: 1, specRefs: ['1.11'] },
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
      // Core screen for restrictions (deprivation of liberty) — detail lives on the Mental Capacity tab.
      { sectionNumber: 2, specRefs: ['2.9a'], groupHeading: 'Daily living and safety' },
      { sectionNumber: 12, paperSection7Adl: true },
    ],
    // §3.5 access instructions / door code and §3.6 key-safe location render inside the §1.2 home-access panel.
    scopeOnlySections: [{ sectionNumber: 3, specRefs: ['3.5', '3.6'] }],
  },
  {
    id: 2,
    displayNumber: 3,
    title: 'Practical Task',
    kind: 'section12-blocks',
    enterpriseSection: 12,
    section12Blocks: [{ kind: 'practical-care' }],
  },
  { id: 10, displayNumber: 4, title: 'Pain Assessment Tool', kind: 'pain-tool', enterpriseSection: 5 },
  {
    id: 11,
    displayNumber: 5,
    title: 'Aide Memorie to Establish Therapy Needs',
    kind: 'therapy-memoire',
    enterpriseSection: 5,
  },
  { id: 7, displayNumber: 6, title: 'Alternative to MUST', kind: 'must-tool', enterpriseSection: 6 },
  {
    id: 3,
    displayNumber: 7,
    title: 'Initial Mental Capacity Act Screening Tool',
    kind: 'mca-screening',
    enterpriseSection: 2,
    specRefs: ['2.mca', '2.6', '2.9'],
  },
  {
    id: 17,
    displayNumber: 8,
    title: 'Mental Capacity Assessment Identified',
    kind: 'mental-capacity-checklist',
    enterpriseSection: 10,
  },
  { id: 4, displayNumber: 9, title: 'Total Skin Integrity Check', kind: 'skin-integrity-check', enterpriseSection: 11 },
  { id: 5, displayNumber: 10, title: 'Waterlow Pressure Score', kind: 'waterlow', enterpriseSection: 11 },
  { id: 8, displayNumber: 11, title: 'Falls Screening', kind: 'falls-screening', enterpriseSection: 12 },
  { id: 9, displayNumber: 12, title: 'Moving and Handling Operations', kind: 'moving-handling', enterpriseSection: 12 },
  { id: 6, displayNumber: 13, title: 'Equipment Selection', kind: 'equipment-selection', enterpriseSection: 12 },
  {
    id: 12,
    displayNumber: 14,
    title: 'Environment & Home Safety',
    kind: 'environment-assessment',
    enterpriseSection: 3,
    // §3.5 / §3.6 already render on Tab 1's home-access panel — don't ask twice.
    appendedSection: { sectionNumber: 3, excludeSpecRefs: ['3.5', '3.6'] },
  },
  { id: 22, displayNumber: 15, title: 'Fire Safety', kind: 'form-section', enterpriseSection: 18 },
  {
    id: 21,
    displayNumber: 16,
    title: 'Infection and Clinical Precautions',
    kind: 'form-section',
    enterpriseSection: 15,
  },
  { id: 20, displayNumber: 17, title: 'Bed Rails', kind: 'form-section', enterpriseSection: 17 },
  {
    id: 19,
    displayNumber: 18,
    title: 'Personal Emergency Evacuation Plan (PEEP)',
    kind: 'form-section',
    enterpriseSection: 16,
  },
  { id: 24, displayNumber: 19, title: 'Safeguarding & Emergency', kind: 'form-section', enterpriseSection: 13 },
  { id: 13, displayNumber: 20, title: 'Advance Care Planning', kind: 'advance-care-planning', enterpriseSection: 13 },
  { id: 14, displayNumber: 21, title: 'End of Life Assessment', kind: 'end-of-life-assessment', enterpriseSection: 13 },
  {
    id: 15,
    displayNumber: 22,
    title: 'Clinical outcome summary (baseline)',
    kind: 'clinical-outcome-summary',
    enterpriseSection: 14,
  },
  {
    id: 16,
    displayNumber: 23,
    title: 'Care Plan, Consent to Care & Sign-off',
    kind: 'care-plan-objectives',
    enterpriseSection: 14,
  },
]

/** Retired tab ids that still resolve (old URLs / saved section comments). 18 = Photography Consent → Consent. */
const HOLISTIC_TAB_ALIASES: Readonly<Record<number, number>> = { 18: 23 }

export type HolisticTabGroup = 'core' | 'specialist' | 'finalisation'

export const HOLISTIC_TAB_GROUP_LABEL: Readonly<Record<HolisticTabGroup, string>> = {
  core: 'Core assessment',
  specialist: 'Specialist assessments (as needed)',
  finalisation: 'Outcome & sign-off',
}

/**
 * Navigation order: A. Core / holistic assessment (always), B. specialist / conditional assessments
 * (Required / Suggested / Not needed / Screening pending from the Core answers), C. outcome and
 * finalisation. The on-screen number follows this order; ids stay frozen.
 */
const HOLISTIC_TAB_GROUP_ORDER: ReadonlyArray<{ group: HolisticTabGroup; ids: number[] }> = [
  { group: 'core', ids: [23, 1, 2, 12, 24] },
  { group: 'specialist', ids: [10, 11, 7, 3, 17, 4, 5, 8, 9, 6, 22, 21, 20, 19, 13, 14] },
  { group: 'finalisation', ids: [15, 16] },
]

export const HOLISTIC_ASSESSMENT_TABS: HolisticAssessmentTab[] = HOLISTIC_TAB_GROUP_ORDER.flatMap(({ group, ids }) =>
  ids.map((id) => ({ ...HOLISTIC_ASSESSMENT_TAB_DEFS.find((t) => t.id === id)!, group })),
).map((tab, index) => ({ ...tab, displayNumber: index + 1 }))

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

/** Resolves a tab id from a URL / saved key, following retired-tab aliases. */
export function resolveHolisticTabId(id: number): number | undefined {
  const target = HOLISTIC_TAB_ALIASES[id] ?? id
  return isRegisteredHolisticTabId(target) ? target : undefined
}

/** Retired tab ids that now resolve to `tabId` (e.g. 23 → [18]). */
export function retiredHolisticTabIdsFor(tabId: number): number[] {
  return Object.entries(HOLISTIC_TAB_ALIASES)
    .filter(([, target]) => target === tabId)
    .map(([retired]) => Number(retired))
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

/** User-facing reference such as "Tab 6" — uses the display number, never the frozen id. */
export function holisticTabRef(id: number): string {
  return `Tab ${holisticTabDisplayNumber(id)}`
}

/** Sections whose questions live on a later tab than the first tab sharing that enterprise section. */
const ENTERPRISE_SECTION_TAB_OVERRIDES: Readonly<Record<number, number>> = {
  14: 16, // §14 review / sign-off lives on the final tab, not the outcome summary
}

export function firstHolisticTabForEnterpriseSection(sectionNumber: number): number {
  const override = ENTERPRISE_SECTION_TAB_OVERRIDES[sectionNumber]
  if (override != null) return override
  const tab = HOLISTIC_ASSESSMENT_TABS.find((t) => {
    if (t.enterpriseSection === sectionNumber && t.kind !== 'multi-section') return true
    if (t.multiSections?.some((s) => s.sectionNumber === sectionNumber)) return true
    return false
  })
  return tab?.id ?? HOLISTIC_ASSESSMENT_TABS[0]!.id
}

const MCA_TAB_ID = 3
const MCA_ISSUE_RE = /\bmca\b|mental capacity|capacity|best interest|deprivation of liberty|\bdols\b/i

/**
 * Tab that shows the question a validation issue is about. Issues carry an enterprise § number;
 * several tabs can share a section, so match the question first and fall back to the section.
 */
export function holisticTabForValidationIssue(
  issue: Pick<ValidationIssue, 'sectionNumber' | 'message'>,
  sections: InitialAssessmentSection[],
  visibleQuestionsBySection: Map<number, InitialAssessmentQuestion[]>,
): number {
  const prefix = ['Required: ', 'Assessor sign-off required: '].find((p) => issue.message.startsWith(p))
  if (prefix) {
    const text = issue.message.slice(prefix.length)
    const tab = HOLISTIC_ASSESSMENT_TABS.find((t) =>
      questionsForDocumentTab(t, sections, visibleQuestionsBySection).some((q) => q.questionText === text),
    )
    if (tab) return tab.id
  }
  const specialistTab = specialistTabForMessage(issue.message)
  if (specialistTab != null) return specialistTab
  if (issue.sectionNumber === 2 && MCA_ISSUE_RE.test(issue.message)) return MCA_TAB_ID
  return firstHolisticTabForEnterpriseSection(issue.sectionNumber)
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
  if (slice.conditionsRegisterEmbed) {
    return `${tabId}-conditions-register`
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
  if (filter.conditionsRegisterEmbed) return []

  if (fullSection) return questions

  return questions.filter((q) => applySectionFilter(q, filter))
}

/** §2.2 consent to care is agreed at the end of the visit, once the person knows the plan. */
export const FINAL_TAB_CONSENT_TO_CARE_SPEC_REFS = ['2.2'] as const
/** §14.1 assessment reason / date / next review / frequency / reviewer / notes. */
export const FINAL_TAB_REVIEW_SPEC_REFS = ['14.1'] as const

/** §14.1 review schedule + §2.2 consent to care shown above the sign-off on the final tab. */
export function finalTabReviewQuestions(
  visibleQuestionsBySection: Map<number, InitialAssessmentQuestion[]>,
): InitialAssessmentQuestion[] {
  return [
    ...filterQuestionsForHolisticTab(visibleQuestionsBySection.get(14) ?? [], {
      specRefs: [...FINAL_TAB_REVIEW_SPEC_REFS],
    }),
    ...filterQuestionsForHolisticTab(visibleQuestionsBySection.get(2) ?? [], {
      specRefs: [...FINAL_TAB_CONSENT_TO_CARE_SPEC_REFS],
    }),
  ]
}

/** All template questions that belong on a tab (for nav progress / validation). */
export function questionsForDocumentTab(
  tab: HolisticAssessmentTab,
  sections: InitialAssessmentSection[],
  visibleQuestionsBySection: Map<number, InitialAssessmentQuestion[]>,
): InitialAssessmentQuestion[] {
  if (tab.kind === 'care-plan-objectives') {
    const sec14 = sections.find((s) => s.sectionNumber === 14)
    return [
      ...finalTabReviewQuestions(visibleQuestionsBySection),
      ...(sec14 ? listSignOffQuestions(sec14.questions) : []),
    ]
  }

  if (tab.appendedSection) {
    const { sectionNumber, ...filter } = tab.appendedSection
    return filterQuestionsForHolisticTab(visibleQuestionsBySection.get(sectionNumber) ?? [], filter)
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
    tab.kind === 'mental-capacity-checklist'
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
      if (slice.conditionsRegisterEmbed) continue
      if (slice.aboutMeEmbed) {
        const visible = visibleQuestionsBySection.get(1) ?? []
        out.push(...visible.filter((q) => isAboutMeIaSpecRef(specRefOf(q) ?? '')))
        continue
      }
      const visible = visibleQuestionsBySection.get(slice.sectionNumber) ?? []
      out.push(...filterQuestionsForHolisticTab(visible, slice))
    }
    for (const { sectionNumber, ...filter } of tab.scopeOnlySections ?? []) {
      out.push(...filterQuestionsForHolisticTab(visibleQuestionsBySection.get(sectionNumber) ?? [], filter))
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
  /** Specialist relevance by tab id (Required / Suggested / Not needed / Screening pending). */
  specialistStatus?: ReadonlyMap<number, SpecialistStatus>
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
    specialistStatus,
  } = params

  const status = new Map<number, SectionNavStatus>()
  const allBlocks = [...sectionBlocks.values()].flat()
  const allWarnings = [...sectionWarnings.values()].flat()

  const questionStatusForTab = (tab: HolisticAssessmentTab): SectionNavStatus => {
    const tabQuestions = questionsForDocumentTab(tab, sections, visibleQuestionsBySection)
    const sectionNumber = tab.appendedSection?.sectionNumber ?? tab.enterpriseSection
    const enterprise = sections.find((s) => s.sectionNumber === sectionNumber)
    if (!enterprise && tabQuestions.length === 0) return 'ok'

    const isFullTab =
      !tab.appendedSection &&
      (isFullSection12BlocksTab(tab) ||
        (tab.kind === 'form-section' &&
          !tab.specRefs?.length &&
          !tab.questionTextsOnly?.length &&
          !tab.includeQuestionTexts?.length))

    // Full-section tabs own every issue for their §; filtered tabs (which can mix sections, e.g. the
    // final tab's §2.2 + §14) own the issues about the questions they actually show.
    const blocks = isFullTab
      ? (sectionBlocks.get(sectionNumber) ?? [])
      : allBlocks.filter((issue) => issueAppliesToTabQuestions(issue, tabQuestions))
    const warnings = isFullTab
      ? (sectionWarnings.get(sectionNumber) ?? [])
      : allWarnings.filter((issue) => issueAppliesToTabQuestions(issue, tabQuestions))

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

    if (hasHardBlocks || (revealFieldErrors && hasFieldError)) return 'blocking'
    if (warnings.length > 0) return 'warning'
    if (editable && (requiredIncomplete || (prog.total > 0 && prog.percent < 100))) return 'incomplete'
    return 'ok'
  }

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
      const questionStatus = tab.appendedSection ? questionStatusForTab(tab) : 'ok'
      if (questionStatus === 'blocking' || questionStatus === 'warning') {
        status.set(tab.id, questionStatus)
      } else if (editable && (!environmentAssessmentComplete || questionStatus === 'incomplete')) {
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
      // Objectives worksheet + §14.1 review schedule + §2.2 consent to care + sign-off.
      const questionStatus = questionStatusForTab(tab)
      if (questionStatus === 'blocking' || questionStatus === 'warning') {
        status.set(tab.id, questionStatus)
      } else if (editable && (!carePlanObjectivesComplete || questionStatus === 'incomplete')) {
        status.set(tab.id, 'incomplete')
      } else {
        status.set(tab.id, 'ok')
      }
      continue
    }

    if (tab.kind === 'mental-capacity-checklist') {
      const mcaRequired = isMcaRequiredYes(sections, draftAnswers)
      if (editable && mcaRequired && !mentalCapacityChecklistComplete) {
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
      // §12.7 case-finding decides: screen unanswered, or a positive screen without the falls
      // assessment, is incomplete; a clear negative screen does not demand the worksheet.
      const finding = fallsCaseFindingFromAnswers(sections, draftAnswers).status
      const incomplete = finding === 'pending' || (finding === 'required' && !fallsScreeningComplete)
      status.set(tab.id, editable && incomplete ? 'incomplete' : 'ok')
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

    const questionStatus = questionStatusForTab(tab)
    // Photography consent is part of the Consent tab (retired tab 18).
    if (tab.kind === 'consent' && questionStatus === 'ok' && editable && !photographyConsentComplete) {
      status.set(tab.id, 'incomplete')
    } else {
      status.set(tab.id, questionStatus)
    }
  }

  return specialistStatus ? applySpecialistNavStatus(status, specialistStatus) : status
}

/**
 * Specialist tabs only nag when their Core screening makes them Required: Not needed and
 * Screening pending never show "incomplete", and Suggested is judgement (no incomplete dot).
 */
export function applySpecialistNavStatus(
  raw: ReadonlyMap<number, SectionNavStatus>,
  specialistStatus: ReadonlyMap<number, SpecialistStatus>,
): Map<number, SectionNavStatus> {
  const status = new Map(raw)
  for (const [tabId, relevance] of specialistStatus) {
    const current = status.get(tabId)
    if (!current || current === 'blocking') continue
    if (relevance === 'not_needed' || relevance === 'pending') status.set(tabId, 'ok')
    else if (relevance === 'suggested' && current === 'incomplete') status.set(tabId, 'ok')
  }
  return status
}
