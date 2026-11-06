import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { PublicSurveyForm, SubmitSurveyResponseInput } from '@/features/surveys/types'

/**
 * My surveys in the CareFlow web app (API: careflow-api src/surveys/surveys-my.controller.ts): surveys
 * sent to the signed-in member of staff, for staff who answer on a computer. Opened by survey, never
 * by a personal link or token.
 */
export type MySurveyItem = {
  surveyId: string
  title: string
  description: string | null
  isAnonymous: boolean
  sentAt: string | null
  opensAt: string | null
  closesAt: string | null
  state: 'OPEN' | 'UNAVAILABLE' | 'COMPLETED'
  unavailableReason: string | null
  completedAt: string | null
}

export type MySurveysPayload = {
  /** False when this login is not matched to a staff record (same email). */
  linked: boolean
  items: MySurveyItem[]
}

const keys = {
  list: ['surveys', 'mine'] as const,
  form: (surveyId: string) => ['surveys', 'mine', surveyId] as const,
}

export function useMySurveys() {
  return useQuery({
    queryKey: keys.list,
    queryFn: async () => (await apiJson<ApiEnvelope<MySurveysPayload>>('/my-surveys', { method: 'GET' })).data,
  })
}

export function useMySurveyForm(surveyId: string) {
  return useQuery({
    queryKey: keys.form(surveyId),
    queryFn: async () =>
      (await apiJson<ApiEnvelope<PublicSurveyForm>>(`/my-surveys/${encodeURIComponent(surveyId)}`, { method: 'GET' })).data,
    retry: false,
  })
}

export function useSubmitMySurvey(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SubmitSurveyResponseInput) =>
      (
        await apiJson<ApiEnvelope<{ id: string; submittedAt: string; closingMessage?: string | null }>>(
          `/my-surveys/${encodeURIComponent(surveyId)}/responses`,
          { method: 'POST', body: JSON.stringify(input) },
        )
      ).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.list })
    },
  })
}
