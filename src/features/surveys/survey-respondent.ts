import type { SurveyRespondentRelation } from '@/features/surveys/types'

/** "Answered by the service user" / "Answered by a family member (Jane Doe)". */
export function describeSurveyRespondent(
  relation: SurveyRespondentRelation | null | undefined,
  name?: string | null,
): string | null {
  if (!relation) return null
  if (relation === 'SELF') return 'Answered by the service user'
  const who =
    relation === 'FAMILY_MEMBER'
      ? 'a family member'
      : relation === 'STAFF'
        ? 'staff on their behalf'
        : 'a representative'
  return `Answered by ${who}${name?.trim() ? ` (${name.trim()})` : ''}`
}
