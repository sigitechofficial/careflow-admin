import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { compareSpecRefs } from '@/features/service-users/initial-assessment/utils/compare-spec-ref'
import { SECTION_12_GROUP_ORDER } from '@/features/service-users/initial-assessment/utils/section-12-display-order'
import { sectionGroupOrderIndex } from '@/features/service-users/initial-assessment/utils/section-4-physical-assessment-display-order'
import { paperSection5GroupOrderIndex } from '@/features/service-users/initial-assessment/utils/section-10-paper-section-5-form'
import { sortPersonalDetailsQuestions } from '@/features/service-users/initial-assessment/utils/section-1-personal-details-order'

/** §1 assessor-friendly order: who they are → preferences → admission context last. */
const SECTION_1_GROUP_ORDER = [
  '1.1',
  '1.0',
  '1.2',
  '1.3',
  '1.4',
  '1.5',
  '1.6',
  '1.7',
  '1.8',
] as const

export type SpecRefGroup = {
  specRef: string
  label: string
  questions: InitialAssessmentQuestion[]
  actDivider?: { title: string; hint?: string }
}

const SECTION_1_ACT_DIVIDERS: Record<string, { title: string; hint?: string }> = {
  '1.1': {
    title: 'Personal Details',
    hint: 'Pre-filled from profile where available — confirm with the service user.',
  },
  '1.0': {
    title: 'Reason for referral & health history',
    hint: 'Section 1 — reason for referral. Section 2 — relevant health history and allergies.',
  },
  '1.2': {
    title: 'Section 3 — Social history',
    hint: 'Next of kin, informal carers, accommodation, property access, and lifestyle.',
  },
  '1.3': {
    title: 'Person-centred preferences',
    hint: 'What matters, goals, routines, and boundaries — complements the About Me profile above.',
  },
  '1.4': {
    title: 'Daily routine',
    hint: 'Morning, meals, personal care preferences, and known triggers.',
  },
  '1.5': {
    title: 'Likes and dislikes',
    hint: 'Food, activities, and care preferences.',
  },
  '1.6': {
    title: 'Dignity and privacy',
    hint: 'Personal care boundaries and how staff should address the person.',
  },
  '1.7': {
    title: 'Equality and cultural needs',
    hint: 'Religion, culture, dietary requirements, and reasonable adjustments.',
  },
  '1.8': {
    title: 'Accessible care needs',
    hint: 'Communication format, interpreter, and sensory support.',
  },
}

const SUBSECTION_LABELS: Record<string, string> = {
  '1.0': 'Section 1–2 — Reason for referral & health history',
  '1.1': 'Personal Details',
  '1.2': 'Section 3 — Social history',
  '1.3': '1.3 What matters to the Service User',
  '1.3a': 'About Me',
  '1.3b': 'Interests',
  '1.3c': 'My Life History',
  '1.3d': 'My Daily Routine',
  '1.3e': 'Support I Need',
  '1.3f': 'My Favourite Things',
  '1.3g': 'Identification Characteristics',
  '1.4': '1.4 Daily routine',
  '1.5': '1.5 Likes and dislikes',
  '1.6': '1.6 Dignity and privacy',
  '1.7': '1.7 Equality and cultural needs',
  '1.8': '1.8 Accessible care needs',
  '2.1': '2.1 Consent to assessment',
  '2.2': '2.2 Consent to receive care',
  '2.3': '2.3 Understanding and communication',
  '2.4': '2.4 Mental capacity',
  '2.5': '2.5 MCA requirement',
  '2.6': '2.6 Best interest decision',
  '2.7': '2.7 Representative involvement',
  '2.8': '2.8 Information sharing',
  '2.9': '2.9 DoLS / LPS status',
  '3.3': '3.3 Home environment safety',
  '3.4': '3.4 Safety measures required',
  '3.5': '3.5 Property access',
  '3.6': '3.6 Key safe details',
  '3.7': '3.7 Home hazards',
  '3.8': '3.8 Pets and smoking',
  '3.9': '3.9 Staff safety',
  '3.10': '3.10 Property environment checklist',
  '3.11': '3.11 Flooring in the home',
  '3.12': '3.12 Car parking arrangements',
  '4.1': '4.1 Competency and clinical observations',
  '4.2': 'Base line vital signs',
  '4.4': 'Diabetic / blood glucose',
  '4.5': 'Does client require ongoing monitoring of vital signs?',
  '4.6': 'a. General physical wellbeing — feels well/unwell',
  '4.7': 'Physical assessment additional comments',
  '4.10': 'Height / build / weight',
  '5.0': '5.0 No concerns gate',
  '5.1': 'b. Breathing difficulties',
  '5.2': 'Breathing action plan',
  '5.3': 'c. Distress/Pain caused by a physical state',
  '5.4': 'd. Swallowing',
  '6.0': '6.0 No concerns gate',
  '6.1': 'e. Requires aids/special equipment for eating or drinking',
  '6.2': 'f. Appetite',
  '6.3': 'g. Hydration — drinking enough/adequately hydrated',
  '6.4': 'h. Nutrition',
  '6.8': '6.8 BMI',
  '6.9': '6.9 MUST assessment',
  '6.10': '6.10 Dietitian referral',
  '7.0': '7.0 No concerns gate',
  '7.1': 'i. Oral health',
  '7.2': '7.2 Dentures and dental care',
  '7.3': 'j. Continent bladder',
  '7.4': '7.4 Continence products and catheter',
  '7.5': 'k. Continent-bowel',
  '7.6': '7.6 Stoma care',
  '8.0': '8.0 No concerns gate',
  '8.1': 'l. Speech impairment',
  '8.2': '8.2 SALT communication',
  '8.3': 'm. Hearing impairment',
  '8.4': 'n. Sight impairment',
  '8.5': 'o. Impairment/Communication aids in use',
  '8.6': 'o. Impairment/Communication aids in use',
  '9.1': 'p. Medication',
  '9.2': '9.2 Medication support',
  '9.3': '9.3 Insulin, covert medication and controlled drugs',
  '9.4': '9.4 Medication list',
  '9.5': '9.5 Dispensing, MAR and safety notes',
  '10.0': '10.0 No concerns gate',
  '10.1': 'Emotional wellbeing',
  '10.2': 'a. Emotional well being — client states:',
  '10.4': 'Sleeping — Client states:',
  '10.5': '10.5 GP referral',
  '10.10': '10.10 Sleep medication',
  '10.6': 'b. Cognitive/Memory Impairment',
  '10.6a': '10.6a Cognition and behaviour checklist',
  '10.7': '10.7 Abbreviated mental test (AMT)',
  '10.8': '10.8 Mental capacity assessment',
  '11.1': 'Section 6 — Skin Integrity',
  '12.1': '12.1 ADL scoring guide',
  '12.2': '12.2 Self care',
  '12.3': '12.3 Everyday tasks',
  '12.4': '12.4 Mobility inside the home',
  '12.5': '12.5 Mobility outside the home',
  '12.5a': '12.5a Moving and handling flags',
  '12.5b': '12.5b Amputation and limb loss',
  '12.5c': '12.5c Transfer requirements',
  '12.5d': '12.5d Where personal care is completed',
  '12.6': '12.6 ADL total score',
  '12.7': '12.7 Falls trigger assessment',
  '12.8': '12.8 Mobility aids & equipment in the home',
  '12.9': '12.9 Daily living aids',
  '12.10': '12.10 Further equipment required',
  '12.11': '12.11 Practical care tasks',
  '12.12': '12.12 Finance support',
  '12.13': '12.13 Finance risk controls',
  '13.1': '13.1 Safeguarding concern',
  '13.2': '13.2 Concern types',
  '13.3': '13.3 Emergency contacts',
  '13.5': '13.5 No-response procedure',
  '13.6': '13.6 DNACPR / ReSPECT',
  '13.7': '13.7 Immediate action & referrals',
  '13.9': '13.9 GP, pharmacy and hospital',
  '13.15': '13.15 Additional risk guidelines',
  '14.1': '14.1 Assessment administration',
  '14.3': '14.3 Care plan recommendations',
  '14.4': '14.4 Generated actions',
  '14.5': '14.5 Assessor declaration',
  '14.6': '14.6 Service user agreement',
  '14.7': '14.7 Manager review & care start',
  '15.1': '15.1 Infection precautions',
  '15.2': '15.2 PPE and staff instructions',
  '15.3': '15.3 Escalation',
  '18.1': '18.1 Fire hazards',
  '18.2': '18.2 London Fire Brigade',
  '18.3': '18.3 Smoke and fire alarms',
  '18.4': '18.4 Smoking-related fire risk',
  '18.5': '18.5 Cooking-related fire risk',
  '18.6': '18.6 Escape route and emergency arrangements',
  '14.8': '14.8 Assessor sign-off details',
}

/**
 * Merge groups that share a specRef, then sort by canonical spec order (not visibility order).
 */
/** Human-readable subsection label for a spec reference (e.g. `2.1` → `2.1 Consent to assessment`). */
export function specRefLabel(specRef: string): string {
  return SUBSECTION_LABELS[specRef] ?? specRef
}

export function mergeSpecRefGroups(groups: SpecRefGroup[]): SpecRefGroup[] {
  const byRef = new Map<string, SpecRefGroup>()
  for (const g of groups) {
    const existing = byRef.get(g.specRef)
    if (existing) {
      existing.questions.push(...g.questions)
      continue
    }
    byRef.set(g.specRef, { ...g, questions: [...g.questions] })
  }
  const merged = [...byRef.values()]
  for (const g of merged) {
    g.questions =
      g.specRef === '1.1'
        ? sortPersonalDetailsQuestions(g.questions)
        : [...g.questions].sort((a, b) => a.sortOrder - b.sortOrder)
  }
  return merged
}

/** Sort subsection groups by enterprise spec order (not visibility / first-seen order). */
export function sortSpecRefGroups(groups: SpecRefGroup[], sectionNumber: number): SpecRefGroup[] {
  if (sectionNumber === 1) {
    const index = (ref: string) => {
      const i = (SECTION_1_GROUP_ORDER as readonly string[]).indexOf(ref)
      return i === -1 ? 999 : i
    }
    return [...groups].sort((a, b) => {
      const da = index(a.specRef)
      const db = index(b.specRef)
      if (da !== db) return da - db
      return compareSpecRefs(a.specRef, b.specRef)
    })
  }
  if (sectionNumber === 12) {
    const index = (ref: string) => {
      const i = (SECTION_12_GROUP_ORDER as readonly string[]).indexOf(ref)
      return i === -1 ? 999 : i
    }
    return [...groups].sort((a, b) => {
      const da = index(a.specRef)
      const db = index(b.specRef)
      if (da !== db) return da - db
      return compareSpecRefs(a.specRef, b.specRef)
    })
  }
  if (sectionNumber >= 4 && sectionNumber <= 9) {
    return [...groups].sort((a, b) => {
      const da = sectionGroupOrderIndex(sectionNumber, a.specRef)
      const db = sectionGroupOrderIndex(sectionNumber, b.specRef)
      if (da !== db) return da - db
      return compareSpecRefs(a.specRef, b.specRef)
    })
  }
  if (sectionNumber === 10) {
    return [...groups].sort((a, b) => {
      const da = paperSection5GroupOrderIndex(a.specRef)
      const db = paperSection5GroupOrderIndex(b.specRef)
      if (da !== db) return da - db
      return compareSpecRefs(a.specRef, b.specRef)
    })
  }
  return [...groups].sort((a, b) => compareSpecRefs(a.specRef, b.specRef))
}

function specRefOf(q: InitialAssessmentQuestion): string {
  const ref = q.metadata?.specRef
  if (typeof ref === 'string' && ref.trim()) return ref.trim()
  return '_other'
}

export function groupQuestionsBySpecRef(
  questions: InitialAssessmentQuestion[],
  sectionNumber: number,
): SpecRefGroup[] {
  const sorted = [...questions].sort((a, b) => a.sortOrder - b.sortOrder)
  const groups: SpecRefGroup[] = []
  let currentRef = ''
  let currentQuestions: InitialAssessmentQuestion[] = []

  const flush = () => {
    if (currentQuestions.length === 0) return
    const actDivider =
      sectionNumber === 1 && SECTION_1_ACT_DIVIDERS[currentRef]
        ? SECTION_1_ACT_DIVIDERS[currentRef]
        : undefined
    groups.push({
      specRef: currentRef,
      label: SUBSECTION_LABELS[currentRef] ?? currentRef,
      questions: currentQuestions,
      actDivider,
    })
    currentQuestions = []
  }

  for (const q of sorted) {
    const ref = specRefOf(q)
    if (ref !== currentRef) {
      flush()
      currentRef = ref
    }
    currentQuestions.push(q)
  }
  flush()
  const merged = mergeSpecRefGroups(groups)
  return sortSpecRefGroups(merged, sectionNumber)
}

export function sectionOneIntroCopy(): string {
  return 'Start with the person. Subsections are in assessor-friendly order: 1.1 → 1.8 (who they are and what matters), then 1.0 (why care is starting). Spec reference numbers are unchanged for audit.'
}

export function sectionThreeIntroCopy(): string {
  return 'Record fire safety, property access, and home environment risks before care starts. Confirm key safe, hazards, and staff safety with the service user or representative on site.'
}

export function sectionFourIntroCopy(): string {
  return 'Physical assessment and baseline observations. Confirm assessor competency before entering vital signs; locked fields require a competent colleague.'
}

export function sectionFiveIntroCopy(): string {
  return 'Breathing, pain, swallowing and related clinical concerns. Use the no-concerns gate when none apply — detail fields appear when concerns are identified.'
}

export function sectionSixIntroCopy(): string {
  return 'Nutrition, hydration, appetite and MUST screening. Record food preferences and allergies; escalate poor appetite or weight loss per agency policy.'
}

export function sectionSevenIntroCopy(): string {
  return 'Oral health and continence. Start with the no-concerns gate if everything is satisfactory; option grids highlight what applies.'
}

export function sectionEightIntroCopy(): string {
  return 'Speech, hearing, sight and communication support. Interpreter and aid details sync to the service user profile where configured.'
}

export function sectionNineIntroCopy(): string {
  return 'Medication support level, insulin and controlled drugs, and MAR setup. Verify the eMAR list against GP records before sign-off.'
}

export function sectionTenIntroCopy(): string {
  return 'Emotional wellbeing, sleep, and cognition. Use the no-concerns gate when none apply; GP referral and AMT fields follow when concerns are identified.'
}

export function sectionElevenIntroCopy(): string {
  return 'Skin condition, wounds, pressure risk, and equipment. Complete Waterlow scoring on its dedicated tab when required.'
}

export function sectionTwelveIntroCopy(): string {
  return 'ADL scores, transfers, mobility equipment, and practical care. Finance support appears when required in the practical care block.'
}

export function sectionThirteenIntroCopy(): string {
  return 'Safeguarding, emergency contacts, and clinical escalation paths. Flag concerns immediately — manager review is required on submit when safeguarding is Yes.'
}

export function sectionFourteenIntroCopy(): string {
  return 'Close the assessment: administration, care-plan/action confirmation, agreement, and assessor sign-off. Use the Schedule tab to activate care after review.'
}

export function sectionIntroCopy(sectionNumber: number): string | null {
  switch (sectionNumber) {
    case 1:
      return sectionOneIntroCopy()
    case 3:
      return sectionThreeIntroCopy()
    case 4:
      return sectionFourIntroCopy()
    case 5:
      return sectionFiveIntroCopy()
    case 6:
      return sectionSixIntroCopy()
    case 7:
      return sectionSevenIntroCopy()
    case 8:
      return sectionEightIntroCopy()
    case 9:
      return sectionNineIntroCopy()
    case 10:
      return sectionTenIntroCopy()
    case 11:
      return sectionElevenIntroCopy()
    case 12:
      return sectionTwelveIntroCopy()
    case 13:
      return sectionThirteenIntroCopy()
    case 14:
      return sectionFourteenIntroCopy()
    default:
      return null
  }
}
