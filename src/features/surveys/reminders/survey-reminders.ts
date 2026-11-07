import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { SurveyTargetKind } from '@/features/surveys/types'

/** API: careflow-api src/surveys/survey-reminders.service.ts and survey-contact-plan.util.ts. */
export type SurveyContactChannel = 'EMAIL' | 'APP' | 'PORTAL' | 'TEXT'

export type SurveyCallStep = { afterDays: number; roleId: string | null; ownerKey: string | null; withinDays: number }

export type SurveyContactPlan = {
  reminders: Array<{ afterDays: number }>
  channels: SurveyContactChannel[]
  quietStart: string
  quietEnd: string
  weekdaysOnly: boolean
  call: SurveyCallStep | null
}

export type SurveyReminderRun = {
  id: string
  /** ISO time, or the day only (YYYY-MM-DD) on anonymous surveys. */
  at: string
  step: number | null
  manual: boolean
  /** Null when this viewer may not see the figures, or (anonymous) too few have answered to report. */
  counts: { people: number; email: number; app: number; portal: number; text: number; noContact: number; optedOut: number } | null
}

export type SurveyContactPlanPayload = {
  plan: SurveyContactPlan | null
  suggested: SurveyContactPlan | null
  inheritedFrom: { id: string; title: string } | null
  isAnonymous: boolean
  targetKind: SurveyTargetKind
  channels: Array<{ value: SurveyContactChannel; label: string }>
  textMessages: { enabled: boolean; provider: string | null; repliesSupported: boolean }
  callListAvailable: boolean
  limits: { maxReminders: number; minGapDays: number }
  quietNow: boolean
  runs: SurveyReminderRun[]
}

export const SURVEY_CALL_OUTCOME_LABELS: Record<string, string> = {
  NO_ANSWER: 'No answer',
  LEFT_MESSAGE: 'Left a message',
  CALL_BACK: 'Asked us to call back',
  DECLINED: 'Does not want to take part',
  WRONG_NUMBER: 'Wrong number',
}

/** Library roles the call list can go to (through the organisation's role for each; Survey settings → alert roles). */
export const SURVEY_CALL_ROLES: Array<{ key: string; label: string }> = [
  { key: 'CARE_COORDINATOR', label: 'Care Coordinator' },
  { key: 'FIELD_CARE_SUPERVISOR', label: 'Field Care Supervisor' },
  { key: 'DEPUTY_MANAGER', label: 'Deputy Manager' },
  { key: 'REGISTERED_MANAGER', label: 'Registered Manager' },
  { key: 'HR_MANAGER', label: 'HR manager' },
]

export type SurveyCallPerson = {
  recipientId: string
  employeeId: string | null
  serviceUserId: string | null
  name: string
  phones: Array<{ label: string; number: string }>
  died: boolean
  sentAt: string | null
  reminders: number
  lastReminderAt: string | null
  due: boolean
  optedOut: boolean
  /** Taken off the call list (e.g. does not want to take part). */
  declined?: boolean
  open: boolean
  calls: Array<{ id: string; outcome: string; notes: string | null; at: string; by: string | null }>
}

export type SurveyCallListPayload = {
  survey: { id: string; title: string; targetKind: SurveyTargetKind; status: string; closesAt: string | null }
  callStep: SurveyCallStep | null
  task: { id: string; status: string; dueDate: string; roleName: string } | null
  outcomes: string[]
  people: SurveyCallPerson[]
}

const planKey = (surveyId: string) => ['surveys', 'contact-plan', surveyId] as const
export const callListKey = (surveyId: string) => ['surveys', 'calls', surveyId] as const

export function useSurveyContactPlan(surveyId: string, enabled = true) {
  return useQuery({
    queryKey: planKey(surveyId),
    enabled,
    queryFn: async () =>
      (await apiJson<ApiEnvelope<SurveyContactPlanPayload>>(`/surveys/${surveyId}/contact-plan`, { method: 'GET' })).data as SurveyContactPlanPayload,
  })
}

export function useSaveSurveyContactPlan(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (plan: SurveyContactPlan | null) =>
      apiJson(`/surveys/${surveyId}/contact-plan`, { method: 'PUT', body: JSON.stringify({ plan }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKey(surveyId) }),
  })
}

export function useRemindNow(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => apiJson<ApiEnvelope<{ reminded: number | null }>>(`/surveys/${surveyId}/reminders`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: planKey(surveyId) })
      void qc.invalidateQueries({ queryKey: ['surveys', 'recipients', surveyId] })
    },
  })
}

/** Remind one person on a named survey (never offered on anonymous surveys; the API refuses too). */
export function useRemindOne(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recipientId: string) =>
      apiJson<ApiEnvelope<{ reminded: boolean; reason: 'OPTED_OUT' | 'NO_CONTACT' | null }>>(
        `/surveys/${surveyId}/recipients/${recipientId}/reminder`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: planKey(surveyId) })
      void qc.invalidateQueries({ queryKey: ['surveys', 'recipients', surveyId] })
    },
  })
}

export function useSurveyCallList(surveyId: string) {
  return useQuery({
    queryKey: callListKey(surveyId),
    queryFn: async () =>
      (await apiJson<ApiEnvelope<SurveyCallListPayload>>(`/surveys/${surveyId}/calls`, { method: 'GET' })).data as SurveyCallListPayload,
  })
}

export function useRecordSurveyCall(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { recipientId: string; outcome: string; notes?: string }) =>
      apiJson(`/surveys/${surveyId}/calls/${input.recipientId}`, {
        method: 'POST',
        body: JSON.stringify({ outcome: input.outcome, notes: input.notes || null }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: callListKey(surveyId) }),
  })
}

const CHANNEL_WORDS: Record<SurveyContactChannel, string> = {
  APP: 'carer app',
  EMAIL: 'email',
  PORTAL: 'portal',
  TEXT: 'text message',
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? ''
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/** "2 reminders, 3 and 7 days after sending, by carer app and email. Nothing sent 20:00 to 09:00." */
export function describeContactPlan(plan: SurveyContactPlan | null): string {
  if (!plan || (!plan.reminders.length && !plan.call)) return 'No automatic reminders.'
  const parts: string[] = []
  if (plan.reminders.length) {
    const days = joinWords(plan.reminders.map((r) => String(r.afterDays)))
    parts.push(
      `${plan.reminders.length === 1 ? '1 reminder' : `${plan.reminders.length} reminders`}, ${days} ${plan.reminders.length === 1 && plan.reminders[0]?.afterDays === 1 ? 'day' : 'days'} after sending, by ${joinWords(plan.channels.map((c) => CHANNEL_WORDS[c]))}.`,
    )
    parts.push(
      `Nothing is sent from ${plan.quietStart} to ${plan.quietEnd}${plan.weekdaysOnly ? ' or at weekends' : ''}.`,
    )
  }
  if (plan.call) {
    const role = SURVEY_CALL_ROLES.find((r) => r.key === plan.call?.ownerKey)?.label ?? 'the chosen role'
    parts.push(
      `${plan.call.afterDays === 0 ? 'Straight away' : `After ${plan.call.afterDays} ${plan.call.afterDays === 1 ? 'day' : 'days'}`}, the ${role} gets a list of people to phone, to do within ${plan.call.withinDays} ${plan.call.withinDays === 1 ? 'day' : 'days'}.`,
    )
  }
  return parts.join(' ')
}

/** An open named survey with the people still to collect (GET /surveys-to-collect). */
export type SurveyToCollect = {
  survey: { id: string; title: string; targetKind: SurveyTargetKind; closesAt: string | null; libraryReference: string | null }
  people: SurveyCallPerson[]
}

export const toCollectKey = (filter: { serviceUserId?: string; employeeId?: string } = {}) =>
  ['surveys', 'to-collect', filter.serviceUserId ?? '', filter.employeeId ?? ''] as const

/** Surveys still to collect: everyone the user may record for, or one person (`serviceUserId` / `employeeId`). */
export function useSurveysToCollect(filter: { serviceUserId?: string; employeeId?: string } = {}, enabled = true) {
  return useQuery({
    queryKey: toCollectKey(filter),
    enabled,
    retry: false,
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (filter.serviceUserId) qs.set('serviceUserId', filter.serviceUserId)
      if (filter.employeeId) qs.set('employeeId', filter.employeeId)
      const suffix = qs.toString() ? `?${qs}` : ''
      return ((await apiJson<ApiEnvelope<SurveyToCollect[]>>(`/surveys-to-collect${suffix}`, { method: 'GET' })).data ?? []) as SurveyToCollect[]
    },
  })
}

/** One person's surveys on their record (GET /surveys-person-history). */
export type PersonSurveyHistory = {
  comingUp: Array<{ id: string; surveyId: string; title: string; event: string; eventLabel: string; eventOn: string; dueOn: string; status: string }>
  notAnswered: Array<{
    recipientId: string
    surveyId: string
    title: string
    sentAt: string | null
    closesAt: string | null
    surveyStatus: string
    recipientStatus: string
    open: boolean
    reminders: number
    lastReminderAt: string | null
    person: SurveyCallPerson | null
    canRecord: boolean
  }>
  answered: Array<{
    recipientId: string
    surveyId: string
    title: string
    sentAt: string | null
    answeredAt: string | null
    channel: string | null
    respondentRelation: string | null
    respondentName: string | null
    recordedBy: string | null
    canViewAnswers: boolean
  }>
  anonymous: Array<{ recipientId: string; surveyId: string; title: string; sentAt: string }>
}

export function usePersonSurveyHistory(filter: { serviceUserId?: string; employeeId?: string }, enabled = true) {
  return useQuery({
    queryKey: ['surveys', 'person-history', filter.serviceUserId ?? '', filter.employeeId ?? ''],
    enabled,
    retry: false,
    queryFn: async () => {
      const qs = filter.serviceUserId ? `serviceUserId=${filter.serviceUserId}` : `employeeId=${filter.employeeId}`
      return (await apiJson<ApiEnvelope<PersonSurveyHistory>>(`/surveys-person-history?${qs}`, { method: 'GET' })).data as PersonSurveyHistory
    },
  })
}
