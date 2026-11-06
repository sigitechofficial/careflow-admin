import type { SurveyRespondentRelation, SurveyTargetKind } from '@/features/surveys/types'

/**
 * "Answered by the service user" / "Answered by a family member (Jane Doe)". Staff surveys say
 * "the employee" (pass the survey's audience; service-user surveys are the default).
 */
export function describeSurveyRespondent(
  relation: SurveyRespondentRelation | null | undefined,
  name?: string | null,
  targetKind?: SurveyTargetKind | null,
): string | null {
  if (!relation) return null
  if (relation === 'SELF') {
    return targetKind === 'EMPLOYEE'
      ? 'Answered by the employee'
      : targetKind === 'PUBLIC'
        ? 'Answered by the respondent'
        : 'Answered by the service user'
  }
  const who =
    relation === 'FAMILY_MEMBER'
      ? 'a family member'
      : relation === 'STAFF'
        ? 'staff on their behalf'
        : 'a representative'
  return `Answered by ${who}${name?.trim() ? ` (${name.trim()})` : ''}`
}

/**
 * Named surveys: the share of responses given without a name (online, or recorded by staff without
 * one), e.g. "3 of 40 responses (8%) were given without a name". null when there is nothing to say
 * (anonymous survey, or none given that way on a survey that does not offer the choice).
 */
export function describeAnsweredWithoutName(results: {
  answeredWithoutName?: number | null
  answeredWithoutNamePercent?: number | null
  allowAnonymousResponses?: boolean
  responses?: number
  completed?: number
} | null | undefined): string | null {
  const n = results?.answeredWithoutName
  if (n === null || n === undefined) return null
  if (n === 0 && !results?.allowAnonymousResponses) return null
  const total = results?.responses ?? results?.completed ?? 0
  const percent = results?.answeredWithoutNamePercent ?? (total > 0 ? Math.round((n / total) * 100) : 0)
  return `${n} of ${total} response${total === 1 ? '' : 's'} (${percent}%) ${n === 1 ? 'was' : 'were'} given without a name.`
}

/** What "Let people choose to answer without their name" does (builder and New survey). */
export const WITHOUT_NAME_SETTING_HELP =
  'Each person can choose “Answer without my name”. Their answers are then not linked to them and the question about contacting them is not asked. Their answers are added to the results only once the survey has closed and at least 5 people have answered that way.'
