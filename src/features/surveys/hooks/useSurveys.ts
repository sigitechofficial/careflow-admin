import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { surveyKeys } from '@/features/surveys/keys'
import {
  addSurveyQuestion,
  createSurvey,
  deleteSurvey,
  fetchPortalSurveys,
  fetchPublicSurvey,
  fetchSurvey,
  fetchSurveyRecipients,
  fetchSurveyResponses,
  fetchSurveyResults,
  fetchSurveys,
  publishSurvey,
  removeSurveyQuestion,
  sendSurvey,
  submitPublicSurveyResponse,
  updateSurvey,
  updateSurveyQuestion,
} from '@/features/surveys/api/surveys.api'
import type {
  CreateQuestionInput,
  CreateSurveyInput,
  SurveyListFilters,
  SubmitSurveyResponseInput,
  UpdateQuestionInput,
  UpdateSurveyInput,
} from '@/features/surveys/types'

export function useSurveys(filters: SurveyListFilters = {}) {
  return useQuery({
    queryKey: surveyKeys.list(filters),
    queryFn: ({ signal }) => fetchSurveys(filters, { signal }),
  })
}

export function useSurvey(id: string | undefined) {
  return useQuery({
    queryKey: surveyKeys.detail(id ?? ''),
    queryFn: ({ signal }) => fetchSurvey(id as string, { signal }),
    enabled: Boolean(id),
  })
}

export function useSurveyResults(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: surveyKeys.results(id ?? ''),
    queryFn: ({ signal }) => fetchSurveyResults(id as string, { signal }),
    enabled: Boolean(id) && enabled,
  })
}

export function useSurveyResponses(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: surveyKeys.responses(id ?? ''),
    queryFn: ({ signal }) => fetchSurveyResponses(id as string, { signal }),
    enabled: Boolean(id) && enabled,
  })
}

export function useCreateSurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSurveyInput) => createSurvey(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: surveyKeys.all() }),
  })
}

export function useUpdateSurvey(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateSurveyInput) => updateSurvey(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: surveyKeys.detail(id) })
      void qc.invalidateQueries({ queryKey: surveyKeys.all() })
    },
  })
}

export function useDeleteSurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSurvey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: surveyKeys.all() }),
  })
}

export function useAddQuestion(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateQuestionInput) => addSurveyQuestion(surveyId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) }),
  })
}

export function useUpdateQuestion(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { questionId: string; input: UpdateQuestionInput }) =>
      updateSurveyQuestion(surveyId, args.questionId, args.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) }),
  })
}

export function useRemoveQuestion(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (questionId: string) => removeSurveyQuestion(surveyId, questionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) }),
  })
}

export function useSendSurvey(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args?: {
      employeeIds?: string[]
      locationIds?: string[]
      distributeAt?: string
      recurrence?: string | null
    }) =>
      sendSurvey(surveyId, args?.employeeIds, args?.distributeAt, args?.recurrence, args?.locationIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) })
      void qc.invalidateQueries({ queryKey: surveyKeys.results(surveyId) })
      void qc.invalidateQueries({ queryKey: surveyKeys.responses(surveyId) })
      void qc.invalidateQueries({ queryKey: surveyKeys.recipients(surveyId) })
      void qc.invalidateQueries({ queryKey: surveyKeys.all() })
    },
  })
}

export function usePublishSurvey(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => publishSurvey(surveyId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) })
      void qc.invalidateQueries({ queryKey: surveyKeys.responses(surveyId) })
      void qc.invalidateQueries({ queryKey: surveyKeys.all() })
    },
  })
}

export function useSurveyRecipients(surveyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: surveyKeys.recipients(surveyId ?? ''),
    queryFn: ({ signal }) => fetchSurveyRecipients(surveyId as string, { signal }),
    enabled: Boolean(surveyId) && enabled,
  })
}

export function usePublicSurvey(token: string | undefined) {
  return useQuery({
    queryKey: surveyKeys.publicForm(token ?? ''),
    queryFn: ({ signal }) => fetchPublicSurvey(token as string, { signal }),
    enabled: Boolean(token),
    retry: false,
  })
}

export function useSubmitPublicSurvey(token: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SubmitSurveyResponseInput) => submitPublicSurveyResponse(token, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: surveyKeys.publicForm(token) })
      void qc.invalidateQueries({ queryKey: surveyKeys.portal() })
    },
  })
}

/** Portal: surveys sent to the signed-in service user. */
export function usePortalSurveys() {
  return useQuery({
    queryKey: surveyKeys.portal(),
    queryFn: ({ signal }) => fetchPortalSurveys({ signal }),
  })
}
