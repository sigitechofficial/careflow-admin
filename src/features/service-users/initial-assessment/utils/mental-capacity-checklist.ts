import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import { findMcaQuestionByFieldKey } from '@/features/service-users/initial-assessment/utils/mca-screening'

/** Assessment of Mental Capacity Check List — paper form (holistic tab 17). */

export type MentalCapacityAssessmentType = 'preliminary' | 'review' | null

export type MentalCapacityQuestionId =
  | 'impairment'
  | 'unableKeyDecision'
  | 'understandDecision'
  | 'retainInformation'
  | 'useInformation'
  | 'communicateDecision'
  | 'eatDrink'
  | 'getUpBed'
  | 'washingBathing'
  | 'hairCare'
  | 'clothes'
  | 'oralCare'
  | 'grooming'
  | 'toilet'
  | 'medication'
  | 'financialAffairs'
  | 'dailyLivingAids'
  | 'walking'
  | 'seeDoctor'

export type MentalCapacityChecklistRow =
  | {
      kind: 'question'
      number: number
      id: MentalCapacityQuestionId
      label: string
      gate?: boolean
      detailed?: boolean
    }
  | { kind: 'instruction'; label: string }
  | { kind: 'legalNote'; label: string }

export type MentalCapacityChecklistMetadata = Partial<
  Record<`${MentalCapacityQuestionId}Answer`, boolean | null> &
    Record<`${MentalCapacityQuestionId}Comments`, string> & {
      assessmentType: MentalCapacityAssessmentType
      sectionComments: string
      assessorName: string
      assessorSignature: string
      assessorPosition: string
      assessorDate: string
      representativeName: string
      representativeSignature: string
      representativeRelationship: string
      representativeDate: string
    }
>

export const MENTAL_CAPACITY_GATE_QUESTION_IDS: MentalCapacityQuestionId[] = [
  'impairment',
  'unableKeyDecision',
]

export const MENTAL_CAPACITY_DETAILED_QUESTION_IDS: MentalCapacityQuestionId[] = [
  'understandDecision',
  'retainInformation',
  'useInformation',
  'communicateDecision',
  'eatDrink',
  'getUpBed',
  'washingBathing',
  'hairCare',
  'clothes',
  'oralCare',
  'grooming',
  'toilet',
  'medication',
  'financialAffairs',
  'dailyLivingAids',
  'walking',
  'seeDoctor',
]

export const MENTAL_CAPACITY_CHECKLIST_ROWS: MentalCapacityChecklistRow[] = [
  {
    kind: 'question',
    number: 1,
    id: 'impairment',
    gate: true,
    label:
      "Is there an impairment in the client's brain or mind function, whether permanent or temporary?",
  },
  {
    kind: 'question',
    number: 2,
    id: 'unableKeyDecision',
    gate: true,
    label:
      'If the answer to 1 above is "YES" does this render the client unable to make a key decision?',
  },
  {
    kind: 'instruction',
    label:
      "If the answers to 1 and 2 are 'NO' then the client has appropriate mental capacity and no further assessment is required. Sign and date this form in the spaces provided in section C of this Form. If the answer to either question is 'YES' proceed with the assessment below.",
  },
  {
    kind: 'legalNote',
    label:
      'Every person over the age of 18 is presumed to have mental capacity from a legal standpoint.',
  },
  {
    kind: 'question',
    number: 3,
    id: 'understandDecision',
    detailed: true,
    label:
      'Can the client understand the decision to be taken, and the consequences of making / not making it?',
  },
  {
    kind: 'question',
    number: 4,
    id: 'retainInformation',
    detailed: true,
    label: 'Is the client able to retain the information needed to make the decision?',
  },
  {
    kind: 'question',
    number: 5,
    id: 'useInformation',
    detailed: true,
    label: 'Is the client capable of using this information as part of the decision-making process?',
  },
  {
    kind: 'question',
    number: 6,
    id: 'communicateDecision',
    detailed: true,
    label:
      'Is the client able to communicate his / her decision (speech, sign language, other)?',
  },
  {
    kind: 'question',
    number: 7,
    id: 'eatDrink',
    detailed: true,
    label: 'Can the client make decisions about what to eat and drink, and when?',
  },
  {
    kind: 'question',
    number: 8,
    id: 'getUpBed',
    detailed: true,
    label: 'Can the client make decisions about when to get up and go to bed?',
  },
  {
    kind: 'question',
    number: 9,
    id: 'washingBathing',
    detailed: true,
    label: 'Can the client make decisions about washing / bathing / shaving (as appropriate)?',
  },
  {
    kind: 'question',
    number: 10,
    id: 'hairCare',
    detailed: true,
    label: 'Can the client make decisions about the care of his / her hair, and any styling?',
  },
  {
    kind: 'question',
    number: 11,
    id: 'clothes',
    detailed: true,
    label: 'Can the client make decisions about what clothes he/she would like to wear?',
  },
  {
    kind: 'question',
    number: 12,
    id: 'oralCare',
    detailed: true,
    label: 'Can the client make decisions about oral care (teeth, toothbrush etc)?',
  },
  {
    kind: 'question',
    number: 13,
    id: 'grooming',
    detailed: true,
    label: 'Can the client make decisions about grooming (hair care, shaving etc)?',
  },
  {
    kind: 'question',
    number: 14,
    id: 'toilet',
    detailed: true,
    label: 'Can the client make decisions about when to use the toilet?',
  },
  {
    kind: 'question',
    number: 15,
    id: 'medication',
    detailed: true,
    label: 'Can the client manage his / her medication?',
  },
  {
    kind: 'question',
    number: 16,
    id: 'financialAffairs',
    detailed: true,
    label: 'Can the client manage his / her financial affairs?',
  },
  {
    kind: 'question',
    number: 17,
    id: 'dailyLivingAids',
    detailed: true,
    label:
      'Can the client successfully handle hearing aids, spectacles and other aids to daily living?',
  },
  {
    kind: 'question',
    number: 18,
    id: 'walking',
    detailed: true,
    label: 'Can the client make decisions about walking',
  },
  {
    kind: 'question',
    number: 19,
    id: 'seeDoctor',
    detailed: true,
    label: 'Can the client make decisions about the need to see a doctor',
  },
]

export function mentalCapacityAnswerKey(
  id: MentalCapacityQuestionId,
): `${MentalCapacityQuestionId}Answer` {
  return `${id}Answer`
}

export function mentalCapacityCommentsKey(
  id: MentalCapacityQuestionId,
): `${MentalCapacityQuestionId}Comments` {
  return `${id}Comments`
}

export function boolAnswered(value: boolean | null | undefined): boolean {
  return value === true || value === false
}

export function mentalCapacityAnswerValue(
  meta: MentalCapacityChecklistMetadata,
  id: MentalCapacityQuestionId,
): boolean | null | undefined {
  return meta[mentalCapacityAnswerKey(id)] as boolean | null | undefined
}

export function mentalCapacityCommentsValue(
  meta: MentalCapacityChecklistMetadata,
  id: MentalCapacityQuestionId,
): string | undefined {
  return meta[mentalCapacityCommentsKey(id)]
}

export function mentalCapacityRequiresDetailedAssessment(
  meta: MentalCapacityChecklistMetadata,
): boolean {
  const q1 = mentalCapacityAnswerValue(meta, 'impairment')
  const q2 = mentalCapacityAnswerValue(meta, 'unableKeyDecision')
  return q1 === true || q2 === true
}

export function mentalCapacityShortCircuitComplete(
  meta: MentalCapacityChecklistMetadata,
): boolean {
  const q1 = mentalCapacityAnswerValue(meta, 'impairment')
  const q2 = mentalCapacityAnswerValue(meta, 'unableKeyDecision')
  return q1 === false && q2 === false
}

export function defaultMentalCapacityChecklistMetadata(): MentalCapacityChecklistMetadata {
  return {}
}

export function normalizeMentalCapacityChecklistMetadata(
  raw: unknown,
): MentalCapacityChecklistMetadata {
  if (!raw || typeof raw !== 'object') return defaultMentalCapacityChecklistMetadata()
  const row = raw as Record<string, unknown>
  const out: MentalCapacityChecklistMetadata = {}

  if (row.assessmentType === 'preliminary' || row.assessmentType === 'review') {
    out.assessmentType = row.assessmentType
  }

  const allIds = [...MENTAL_CAPACITY_GATE_QUESTION_IDS, ...MENTAL_CAPACITY_DETAILED_QUESTION_IDS]
  for (const id of allIds) {
    const answerKey = mentalCapacityAnswerKey(id)
    const commentsKey = mentalCapacityCommentsKey(id)
    if (row[answerKey] === true || row[answerKey] === false) {
      out[answerKey] = row[answerKey] as boolean
    }
    if (typeof row[commentsKey] === 'string') {
      out[commentsKey] = row[commentsKey]
    }
  }

  const textFields = [
    'sectionComments',
    'assessorName',
    'assessorSignature',
    'assessorPosition',
    'assessorDate',
    'representativeName',
    'representativeSignature',
    'representativeRelationship',
    'representativeDate',
  ] as const

  for (const key of textFields) {
    if (typeof row[key] === 'string') {
      out[key] = row[key]
    }
  }

  return out
}

export function isMentalCapacityChecklistComplete(
  meta: MentalCapacityChecklistMetadata | undefined,
): boolean {
  if (!meta?.assessmentType) return false

  const gateComplete = MENTAL_CAPACITY_GATE_QUESTION_IDS.every((id) =>
    boolAnswered(mentalCapacityAnswerValue(meta, id)),
  )
  if (!gateComplete) return false

  if (mentalCapacityShortCircuitComplete(meta)) return true

  return MENTAL_CAPACITY_DETAILED_QUESTION_IDS.every((id) =>
    boolAnswered(mentalCapacityAnswerValue(meta, id)),
  )
}

/**
 * Rows 1–6 repeat the Tab 3 MCA screening (two-stage test + four functional questions) with the
 * same Yes/No meaning. They are answered once there and mirrored here (read-only on this tab).
 */
export const MENTAL_CAPACITY_SCREENING_FIELD_KEYS: Readonly<Partial<Record<MentalCapacityQuestionId, string>>> = {
  impairment: 'mcaStage1Impairment',
  unableKeyDecision: 'mcaStage2UnableToDecide',
  understandDecision: 'mcaFunctionalUnderstand',
  retainInformation: 'mcaFunctionalRetain',
  useInformation: 'mcaFunctionalWeigh',
  communicateDecision: 'mcaFunctionalCommunicate',
}

export const MENTAL_CAPACITY_SCREENING_SYNCED_IDS: ReadonlySet<MentalCapacityQuestionId> = new Set(
  Object.keys(MENTAL_CAPACITY_SCREENING_FIELD_KEYS) as MentalCapacityQuestionId[],
)

function screeningYesNo(answer: InitialAssessmentAnswerInput | undefined): boolean | undefined {
  if (answer?.booleanValue === true || answer?.checked === true) return true
  if (answer?.booleanValue === false || answer?.checked === false) return false
  return undefined
}

/**
 * Copies answered Tab 3 screening Yes/No values onto checklist rows 1–6. Unanswered screening
 * questions leave the checklist value untouched. Returns `meta` itself when nothing changes.
 */
export function syncMentalCapacityChecklistFromScreening(
  meta: MentalCapacityChecklistMetadata,
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
): MentalCapacityChecklistMetadata {
  let next = meta
  for (const [id, fieldKey] of Object.entries(MENTAL_CAPACITY_SCREENING_FIELD_KEYS) as Array<
    [MentalCapacityQuestionId, string]
  >) {
    const question = findMcaQuestionByFieldKey(sections, fieldKey)
    if (!question) continue
    const value = screeningYesNo(answers[question.id])
    if (value === undefined) continue
    const key = mentalCapacityAnswerKey(id)
    if (next[key] === value) continue
    next = { ...next, [key]: value }
  }
  return next
}
