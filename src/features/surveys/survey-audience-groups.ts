/**
 * "Who it's for" on top of the audience type. Same codes as the API
 * (careflow-api prisma/seed-lib/survey-audience-groups.ts).
 */
import type { SurveyTargetKind } from '@/features/surveys/types'

export type AudienceGroupOption = { code: string; label: string }

export const SURVEY_AUDIENCE_GROUPS: Record<SurveyTargetKind, AudienceGroupOption[]> = {
  PUBLIC: [
    { code: 'PEOPLE_WE_SUPPORT', label: 'People we support' },
    { code: 'FAMILIES', label: 'Families and representatives' },
    { code: 'PROFESSIONALS', label: 'Health and social care professionals' },
    { code: 'COMMISSIONERS', label: 'Commissioners and local authority' },
    { code: 'ADVOCATES', label: 'Advocates and community organisations' },
    { code: 'JOB_APPLICANTS', label: 'Job applicants' },
    { code: 'VOLUNTEERS', label: 'Volunteers' },
    { code: 'GENERAL_PUBLIC', label: 'General public' },
    { code: 'OTHER', label: 'Other' },
    { code: 'SEVERAL', label: 'Several groups' },
  ],
  EMPLOYEE: [
    { code: 'ALL_STAFF', label: 'All staff' },
    { code: 'CARE_WORKERS', label: 'Care workers' },
    { code: 'OFFICE_STAFF', label: 'Office staff' },
    { code: 'NEW_STARTERS', label: 'New starters' },
    { code: 'LEAVERS', label: 'Leavers' },
    { code: 'MANAGERS', label: 'Managers' },
    { code: 'OTHER', label: 'Other' },
    { code: 'SEVERAL', label: 'Several groups' },
  ],
  SERVICE_USER: [
    { code: 'ALL_PEOPLE', label: 'All people we support' },
    { code: 'NEW_CLIENTS', label: 'People new to our care' },
    { code: 'REVIEW_DUE', label: 'People due a care review' },
    { code: 'HOME_FROM_HOSPITAL', label: 'People home from hospital' },
    { code: 'LEAVING_CARE', label: 'People leaving our care' },
    { code: 'MADE_A_COMPLAINT', label: 'People who made a complaint' },
    { code: 'OTHER', label: 'Other' },
    { code: 'SEVERAL', label: 'Several groups' },
  ],
}

/** Every group across audience types, for the list filter (code → label). */
export const ALL_AUDIENCE_GROUPS: AudienceGroupOption[] = [
  ...new Map(
    (Object.values(SURVEY_AUDIENCE_GROUPS) as AudienceGroupOption[][]).flat().map(g => [g.code, g] as const),
  ).values(),
]
