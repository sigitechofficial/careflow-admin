import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { SendSurveyInput } from '@/features/surveys/types'

/** API: careflow-api src/surveys/survey-contact-rule.service.ts and survey-contact-rule.util.ts. */
export type ContactRuleSource = 'SURVEY' | 'LIBRARY' | 'DEFAULT'
/** DELAY: held people are sent it on their free day; SKIP: they are not sent it this time. */
export type WhenHeld = 'DELAY' | 'SKIP'
export type SurveyContactRule = {
  holdBack: boolean
  countsAsContact: boolean
  whenHeld: WhenHeld
  reason: string | null
  source: ContactRuleSource
}
export type HeldBackStatus = 'HELD' | 'SENT' | 'OVERRIDDEN' | 'LAPSED' | 'SKIPPED' | 'CANCELLED'

export type HeldBackPerson = {
  id: string
  personId: string
  name: string
  status: HeldBackStatus
  /** YYYY-MM-DD: the day they become free (4 weeks after their last survey). Only for people who can send. */
  freeFrom: string | null
  /** Only for someone who may see that other survey's results; otherwise null ("another survey"). */
  otherSurvey: { id: string; title: string; on: string } | null
  overrideReason: string | null
  resolvedOn: string | null
}

export type SurveyContactRulePayload = {
  inheritedFrom: { id: string; title: string } | null
  rule: SurveyContactRule
  /** The ready-made survey's own rule and why it differs from the default, when it has one. */
  library: { holdBack: boolean; countsAsContact: boolean; whenHeld: WhenHeld; reason: string | null } | null
  /** The rule when nothing else says otherwise; calendar: anonymous staff surveys follow the all-staff calendar. */
  defaultRule?: { holdBack: boolean; countsAsContact: boolean; whenHeld: WhenHeld; calendar: boolean }
  /** Ready-made parts sent together with this one as one contact. */
  sentWith?: string[]
  /** Why a weekly repeat asks people this often. */
  repeatReason?: string | null
  days: number
  sampling: { percent: number } | null
  samplingAvailable: boolean
  held: HeldBackPerson[]
}

export type SendCheck = {
  total: number
  sendNow: number
  heldBack: number
  /** The survey skips held people: not sent at all this time. */
  notSentHeld?: number
  notSampled: number
  holdBack: boolean
  whenHeld?: WhenHeld
  sampling: { percent: number } | null
  held: Array<{ id: string; name: string; freeFrom: string }>
}

export const contactRuleKey = (surveyId: string) => ['surveys', 'contact-rule', surveyId] as const

export function useSurveyContactRule(surveyId: string, enabled = true) {
  return useQuery({
    queryKey: contactRuleKey(surveyId),
    enabled,
    queryFn: async () =>
      (await apiJson<ApiEnvelope<SurveyContactRulePayload>>(`/surveys/${surveyId}/contact-rule`, { method: 'GET' })).data,
  })
}

export function useSaveSurveyContactRule(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      rule?: { holdBack: boolean; countsAsContact: boolean; whenHeld: WhenHeld; reason: string | null } | null
      sampling?: { percent: number } | null
    }) => apiJson(`/surveys/${surveyId}/contact-rule`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: contactRuleKey(surveyId) }),
  })
}

export function useSendHeldBack(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { heldIds?: string[]; reason: string }) =>
      apiJson<ApiEnvelope<{ sent: number }>>(`/surveys/${surveyId}/held-back/send`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: contactRuleKey(surveyId) })
      void qc.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
}

/** "Don't send": held people are not sent this survey at all, with a reason (audited as a count). */
export function useSkipHeldBack(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { heldIds?: string[]; reason: string }) =>
      apiJson<ApiEnvelope<{ notSent: number }>>(`/surveys/${surveyId}/held-back/skip`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: contactRuleKey(surveyId) }),
  })
}

/** Before Send now: who the 4-week rule holds back and who sampling leaves out (never which other survey). */
export function useSendCheck(surveyId: string, input: SendSurveyInput, enabled: boolean) {
  return useQuery({
    queryKey: ['surveys', 'send-check', surveyId, input],
    enabled,
    staleTime: 15_000,
    queryFn: async () =>
      (await apiJson<ApiEnvelope<SendCheck>>(`/surveys/${surveyId}/send/check`, { method: 'POST', body: JSON.stringify(input) })).data,
  })
}

/** "2 Dec 2026" from YYYY-MM-DD. */
export function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
