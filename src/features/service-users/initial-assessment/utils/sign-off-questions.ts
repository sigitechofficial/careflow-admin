import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

function fieldKeyOf(q: InitialAssessmentQuestion): string | undefined {
  const meta = q.metadata
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return undefined
  const key = (meta as Record<string, unknown>).fieldKey
  return typeof key === 'string' ? key : undefined
}

const SERVICE_USER_FIELD_KEYS = new Set([
  'representativeInvolved',
  'suSignatureObtained',
])

const ASSESSOR_FIELD_KEYS = new Set(['assessorName', 'assessorRole', 'assessorSignDate'])

function matchesServiceUserGroup(q: InitialAssessmentQuestion): boolean {
  const key = fieldKeyOf(q)
  if (key && SERVICE_USER_FIELD_KEYS.has(key)) return true
  const text = q.questionText.toLowerCase()
  return (
    text.includes('service user agrees') ||
    text.includes('representative name') ||
    text.includes('representative relationship')
  )
}

function matchesAssessorGroup(q: InitialAssessmentQuestion): boolean {
  const key = fieldKeyOf(q)
  if (key && ASSESSOR_FIELD_KEYS.has(key)) return true
  return q.questionText.toLowerCase().includes('assessor declaration')
}

export function serviceUserSignOffQuestions(questions: InitialAssessmentQuestion[]): InitialAssessmentQuestion[] {
  return questions.filter(matchesServiceUserGroup).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function assessorSignOffQuestions(questions: InitialAssessmentQuestion[]): InitialAssessmentQuestion[] {
  return questions.filter(matchesAssessorGroup).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function signOffQuestionIds(questions: InitialAssessmentQuestion[]): Set<string> {
  return new Set(
    [...serviceUserSignOffQuestions(questions), ...assessorSignOffQuestions(questions)].map((q) => q.id),
  )
}
