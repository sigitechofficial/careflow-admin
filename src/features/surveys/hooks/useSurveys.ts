import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { surveyKeys } from '@/features/surveys/keys'
import {
  addSurveyQuestion,
  createSurvey,
  deleteSurvey,
  fetchSurvey,
  fetchSurveyResults,
  fetchSurveys,
  removeSurveyQuestion,
  sendSurvey,
  updateSurvey,
  updateSurveyQuestion,
} from '@/features/surveys/api/surveys.api'
import type {
  CreateQuestionInput,
  CreateSurveyInput,
  SurveyListFilters,
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
    mutationFn: (employeeIds?: string[]) => sendSurvey(surveyId, employeeIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) })
      void qc.invalidateQueries({ queryKey: surveyKeys.results(surveyId) })
      void qc.invalidateQueries({ queryKey: surveyKeys.all() })
    },
  })
}
