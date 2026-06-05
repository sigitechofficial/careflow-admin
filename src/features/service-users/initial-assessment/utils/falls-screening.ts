/** Falls screening worksheet — paper form (holistic tab 8). */

export type FallsScreeningNaAnswer = 'yes' | 'no' | 'na'

export type FallsScreeningQuestionId =
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'q5'
  | 'q6'

export type FallsScreeningMetadata = {
  fallOrConcern?: boolean | null
  firstScreenSinceLastFall?: FallsScreeningNaAnswer | null
  consentToSixQuestions?: boolean | null
  q1FallsNeedInvestigating?: boolean | null
  q2DizzyOrBlackouts?: boolean | null
  q3WalkingBalanceUnassessed?: boolean | null
  q4FourPlusMedsNoReview?: boolean | null
  q5TrippingMore?: boolean | null
  q6FearOfFalling?: boolean | null
  additionalComments?: string
}

export const FALLS_SCREENING_HEADER_QUESTIONS = [
  {
    id: 'fallOrConcern',
    label: 'Has the client had a fall or concern about falling?',
    kind: 'yesNo' as const,
  },
  {
    id: 'firstScreenSinceLastFall',
    label: 'Is this the first falls screen since the last fall?',
    kind: 'yesNoNa' as const,
  },
  {
    id: 'consentToSixQuestions',
    label: 'Does the client consent to the falls screen (six questions)?',
    kind: 'yesNo' as const,
  },
] as const

/** Paper form: 3 header questions + 6 table questions + additional comments. */
export const FALLS_SCREENING_TABLE_QUESTION_COUNT = 6

export const FALLS_SCREENING_TABLE_QUESTIONS: ReadonlyArray<{
  id: FallsScreeningQuestionId
  label: string
}> = [
  {
    id: 'q1',
    label: 'Have you had any falls in the last 12 months that need investigating?',
  },
  {
    id: 'q2',
    label: 'Do you feel dizzy or have blackouts when you stand up or when you walk?',
  },
  {
    id: 'q3',
    label:
      'Do you have any problems with your walking or balance which have not been assessed? For example, are you unsteady on your feet, do you have difficulty getting up from your chair, bed or toilet, do you need to hold onto furniture or walls when you walk?',
  },
  {
    id: 'q4',
    label:
      'Do you take 4 or more different medications a day and NO review in the last 6 months?',
  },
  {
    id: 'q5',
    label: 'Are you tripping or stumbling more?',
  },
  {
    id: 'q6',
    label: 'Do you have a fear of falling?',
  },
]

export const FALLS_SCREENING_ACTION_RULES = [
  {
    id: 'gp-review',
    condition: 'If yes to any of Q.1, 2, 3',
    actions: [
      'Advise client to book review appointment with GP',
      'Send copy of falls screen document to inform GP',
    ],
  },
  {
    id: 'medicines-review',
    condition: 'If yes to Q.4',
    actions: ['Organise review of clients medicines (Can be carried out by GP or pharmacist)'],
  },
  {
    id: 'falls-service',
    condition: 'If yes to Q.5 and/or Q.6, but NOT yes to any of Q.1, 2, 3',
    actions: ['Make new referral to falls service for assessment and advice'],
  },
] as const

const QUESTION_FIELD_MAP: Record<
  FallsScreeningQuestionId,
  keyof FallsScreeningMetadata
> = {
  q1: 'q1FallsNeedInvestigating',
  q2: 'q2DizzyOrBlackouts',
  q3: 'q3WalkingBalanceUnassessed',
  q4: 'q4FourPlusMedsNoReview',
  q5: 'q5TrippingMore',
  q6: 'q6FearOfFalling',
}

export function fallsScreeningQuestionValue(
  meta: FallsScreeningMetadata,
  id: FallsScreeningQuestionId,
): boolean | null | undefined {
  return meta[QUESTION_FIELD_MAP[id]] as boolean | null | undefined
}

export function boolAnswered(value: boolean | null | undefined): boolean {
  return value === true || value === false
}

export function isFallsScreeningComplete(meta: FallsScreeningMetadata | undefined): boolean {
  if (!meta) return false
  if (!boolAnswered(meta.fallOrConcern)) return false
  if (meta.firstScreenSinceLastFall == null) return false
  if (!boolAnswered(meta.consentToSixQuestions)) return false
  if (meta.consentToSixQuestions !== true) return true
  return FALLS_SCREENING_TABLE_QUESTIONS.every((q) =>
    boolAnswered(fallsScreeningQuestionValue(meta, q.id)),
  )
}

export function defaultFallsScreeningMetadata(): FallsScreeningMetadata {
  return {}
}

export function normalizeFallsScreeningMetadata(raw: unknown): FallsScreeningMetadata {
  if (!raw || typeof raw !== 'object') return defaultFallsScreeningMetadata()
  const row = raw as FallsScreeningMetadata
  return {
    fallOrConcern: row.fallOrConcern ?? undefined,
    firstScreenSinceLastFall: row.firstScreenSinceLastFall ?? undefined,
    consentToSixQuestions: row.consentToSixQuestions ?? undefined,
    q1FallsNeedInvestigating: row.q1FallsNeedInvestigating ?? undefined,
    q2DizzyOrBlackouts: row.q2DizzyOrBlackouts ?? undefined,
    q3WalkingBalanceUnassessed: row.q3WalkingBalanceUnassessed ?? undefined,
    q4FourPlusMedsNoReview: row.q4FourPlusMedsNoReview ?? undefined,
    q5TrippingMore: row.q5TrippingMore ?? undefined,
    q6FearOfFalling: row.q6FearOfFalling ?? undefined,
    additionalComments:
      typeof row.additionalComments === 'string' ? row.additionalComments : undefined,
  }
}

export function computeFallsScreeningActions(meta: FallsScreeningMetadata): string[] {
  if (meta.consentToSixQuestions !== true) return []

  const q1 = meta.q1FallsNeedInvestigating === true
  const q2 = meta.q2DizzyOrBlackouts === true
  const q3 = meta.q3WalkingBalanceUnassessed === true
  const q4 = meta.q4FourPlusMedsNoReview === true
  const q5 = meta.q5TrippingMore === true
  const q6 = meta.q6FearOfFalling === true

  const q123Yes = q1 || q2 || q3
  const actions: string[] = []

  if (q123Yes) {
    actions.push(...FALLS_SCREENING_ACTION_RULES[0].actions)
  }
  if (q4) {
    actions.push(...FALLS_SCREENING_ACTION_RULES[1].actions)
  }
  if ((q5 || q6) && !q123Yes) {
    actions.push(...FALLS_SCREENING_ACTION_RULES[2].actions)
  }

  return actions
}
