import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

/** API: careflow-api src/surveys/survey-event-triggers.{service,util}.ts and prisma/seed-lib/survey-event-triggers.ts. */
export type TriggerAudience = 'SERVICE_USER' | 'EMPLOYEE' | 'FAMILY'
export type TriggerOptions = {
  firstReviewOnly?: boolean
  minNights?: number
  complaintFrom?: 'SELF' | 'FAMILY'
  ignoreFirstDays?: number
  reviewType?: 'PROBATION_REVIEW' | 'INDUCTION_CHECKIN' | 'CARE_CERTIFICATE_SIGNOFF'
  minDays?: number
}
export type EventTrigger = {
  event: string
  label?: string
  delayDays: number
  windowDays: number
  exclusions: string[]
  options: TriggerOptions
  checkFirst: boolean
  since: string
  ownerKey: string
}
export type OccurrenceStatus = 'WAITING' | 'DUE' | 'BATCH' | 'SENT' | 'HELD' | 'SKIPPED' | 'CANCELLED' | 'EXPIRED' | 'OFFERED'
export type EventOccurrence = {
  id: string
  name: string
  personId: string | null
  event: string
  eventLabel: string
  eventOn: string
  dueOn: string
  lastDay: string
  status: OccurrenceStatus
  reason: string | null
  sentIn: { id: string; title: string | null } | null
  resolvedOn: string | null
}
export type EventTriggerPayload = {
  audience: TriggerAudience
  trigger: EventTrigger | null
  library: Omit<EventTrigger, 'since' | 'ownerKey' | 'label'> | null
  /** The ready-made survey's own words for when it is sent. */
  libraryWords: string | null
  /** Why it cannot be switched on (null when it can, or when it is on). */
  notAllowed: string | null
  events: Array<{ code: string; label: string; description: string; builtIn: string[]; beforeAllowed?: boolean; minDelayDays?: number; repeats: boolean }>
  exclusions: Array<{ code: string; label: string }>
  /** The list names people: only for people who manage surveys and may see its results. */
  canSeeList: boolean
  counts: Record<string, number>
  occurrences: EventOccurrence[]
}

export const eventTriggerKey = (surveyId: string) => ['surveys', 'event-trigger', surveyId] as const

export function useSurveyEventTrigger(surveyId: string) {
  return useQuery({
    queryKey: eventTriggerKey(surveyId),
    queryFn: async () => (await apiJson<ApiEnvelope<EventTriggerPayload>>(`/surveys/${surveyId}/event-trigger`, { method: 'GET' })).data,
  })
}

export type SaveTriggerInput = {
  event: string
  delayDays: number
  windowDays: number
  exclusions: string[]
  options: TriggerOptions
  checkFirst: boolean
  lookBackDays?: number
}

export function useSaveSurveyEventTrigger(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (trigger: SaveTriggerInput | null) =>
      apiJson(`/surveys/${surveyId}/event-trigger`, { method: 'PUT', body: JSON.stringify({ trigger }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: eventTriggerKey(surveyId) })
      void qc.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
}

export function useDecideEventSends(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { ids: string[]; action: 'SEND' | 'DONT_SEND' | 'OFFERED'; reason?: string }) =>
      apiJson<ApiEnvelope<{ people: number; sent: number }>>(`/surveys/${surveyId}/event-trigger/decide`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: eventTriggerKey(surveyId) })
      void qc.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
}

export const OCCURRENCE_STATUS_LABEL: Record<OccurrenceStatus, string> = {
  WAITING: 'Coming up',
  DUE: 'Waiting for a decision',
  BATCH: 'Waiting for 5 people (anonymous)',
  SENT: 'Sent',
  HELD: 'Held back by the 4-week rule',
  SKIPPED: 'Not sent',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Not sent in time',
  OFFERED: 'Offered',
}

/** "6 days after", "on the day", "7 days before". */
export function delayWords(days: number): string {
  if (days === 0) return 'on the day of'
  return days > 0 ? `${days} ${days === 1 ? 'day' : 'days'} after` : `${-days} ${days === -1 ? 'day' : 'days'} before`
}

/** Plain words for the setting. */
export function describeTrigger(t: Pick<EventTrigger, 'delayDays' | 'windowDays' | 'checkFirst'> & { label?: string }, audience: TriggerAudience): string {
  const what = (t.label ?? 'the event').toLowerCase()
  const how =
    audience === 'FAMILY'
      ? 'Staff are asked to offer it to the family'
      : t.checkFirst
        ? 'Staff check each one before it is sent'
        : 'Sent automatically'
  return `${how} ${delayWords(t.delayDays)} ${what}, up to ${t.windowDays} ${t.windowDays === 1 ? 'day' : 'days'} late.`
}

/** "2 Dec 2026" from YYYY-MM-DD. */
export function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
