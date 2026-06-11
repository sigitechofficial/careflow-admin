import { fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

export type ConcernFollowUpGroup = {
  id: string
  optionValues: string[]
  title: string
  matches: (q: InitialAssessmentQuestion) => boolean
}

export const BREATHING_CONCERN_FOLLOW_UP_GROUPS: ConcernFollowUpGroup[] = [
  {
    id: 'breathing-history',
    optionValues: [
      'mild_exertion',
      'moderate_exertion',
      'severe_exertion',
      'mild_rest',
      'moderate_rest',
      'severe_rest',
    ],
    title: 'Breathing history',
    matches: (q) =>
      fieldKeyOf(q) === 'breathingDetails' ||
      q.questionText === 'Asthma present?' ||
      q.questionText === 'Emphysema / COPD present?',
  },
  {
    id: 'oxygen-care',
    optionValues: ['oxygen_dependent'],
    title: 'Oxygen care',
    matches: (q) =>
      fieldKeyOf(q) === 'oxygenDependent' ||
      q.questionText.toLowerCase().includes('oxygen care notes'),
  },
  {
    id: 'gp-review',
    optionValues: ['gp_specialist_review'],
    title: 'GP / specialist review',
    matches: (q) => q.questionText.toLowerCase().includes('gp or specialist nurse review'),
  },
]

export const SWALLOWING_CONCERN_FOLLOW_UP_GROUPS: ConcernFollowUpGroup[] = [
  {
    id: 'coughing-history',
    optionValues: ['cough_liquids', 'cough_solids'],
    title: 'Coughing / swallowing episode history',
    matches: (q) => q.questionText.toLowerCase().includes('swallowing action plan'),
  },
  {
    id: 'choking-history',
    optionValues: ['choking', 'choking_all', 'choking_intermittent'],
    title: 'Choking history',
    matches: (q) => q.questionText.toLowerCase().includes('choking history details'),
  },
  {
    id: 'salt-referral',
    optionValues: ['salt_required'],
    title: 'SALT referral required',
    matches: (q) => q.questionText === 'SALT referral required?',
  },
  {
    id: 'salt-made',
    optionValues: ['salt_made'],
    title: 'SALT referral made',
    matches: (q) =>
      q.questionText === 'SALT referral made?' || q.questionText === 'SALT referral date',
  },
]

const SWALLOWING_SHARED_FOLLOW_UP_MATCHES = (q: InitialAssessmentQuestion) =>
  fieldKeyOf(q) === 'foodTexture' || fieldKeyOf(q) === 'fluidThickness'

export function concernOptionsFieldKey(q: InitialAssessmentQuestion): string | undefined {
  const key = fieldKeyOf(q)
  if (key === 'breathingConcerns' || key === 'swallowingConcerns') return key
  return undefined
}

export function isSection5ConcernOptionsQuestion(q: InitialAssessmentQuestion): boolean {
  return concernOptionsFieldKey(q) != null
}

export function followUpGroupsForConcernField(fieldKey: string): ConcernFollowUpGroup[] {
  if (fieldKey === 'breathingConcerns') return BREATHING_CONCERN_FOLLOW_UP_GROUPS
  if (fieldKey === 'swallowingConcerns') return SWALLOWING_CONCERN_FOLLOW_UP_GROUPS
  return []
}

export function questionsForConcernFollowUpGroup(
  group: ConcernFollowUpGroup,
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return questions.filter(group.matches)
}

export function inlineConcernFollowUpQuestionIds(
  fieldKey: string,
  questions: InitialAssessmentQuestion[],
): Set<string> {
  const groups = followUpGroupsForConcernField(fieldKey)
  const ids = new Set<string>()
  for (const group of groups) {
    for (const q of questionsForConcernFollowUpGroup(group, questions)) {
      ids.add(q.id)
    }
  }
  if (fieldKey === 'swallowingConcerns') {
    for (const q of questions) {
      if (SWALLOWING_SHARED_FOLLOW_UP_MATCHES(q)) ids.add(q.id)
    }
  }
  return ids
}

export function swallowingSharedFollowUpQuestions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return questions.filter(SWALLOWING_SHARED_FOLLOW_UP_MATCHES)
}

export function activeConcernFollowUpGroups(
  groups: ConcernFollowUpGroup[],
  selectedOptionValues: string[],
): ConcernFollowUpGroup[] {
  const selected = new Set(selectedOptionValues)
  return groups.filter((group) => group.optionValues.some((value) => selected.has(value)))
}
