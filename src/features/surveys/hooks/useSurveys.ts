import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { surveyKeys } from '@/features/surveys/keys'
import {
  addSurveyQuestion,
  createSurvey,
  deleteSurvey,
  duplicateSurvey,
  type DuplicateSurveyInput,
  fetchPortalSurveyAnswers,
  fetchPortalSurveys,
  fetchPublicSurvey,
  fetchSurvey,
  fetchSurveyRecipients,
  fetchSurveyRecordCandidates,
  fetchSurveyResponses,
  fetchSurveyResults,
  fetchSurveys,
  publishSurvey,
  recordSurveyResponse,
  removeSurveyQuestion,
  sendSurvey,
  submitPublicSurveyResponse,
  updateRecordedSurveyResponse,
  updateSurvey,
  updateSurveyQuestion,
} from '@/features/surveys/api/surveys.api'
import type {
  CreateQuestionInput,
  CreateSurveyInput,
  RecordSurveyResponseInput,
  SurveyListFilters,
  SubmitSurveyResponseInput,
  UpdateQuestionInput,
  UpdateRecordedSurveyResponseInput,
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

export function useDuplicateSurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; overrides?: DuplicateSurveyInput }) =>
      duplicateSurvey(args.id, args.overrides),
    onSuccess: () => qc.invalidateQueries({ queryKey: surveyKeys.all() }),
  })
}

/** Mark a survey as a template, or move it back to regular surveys. */
export function useSetSurveyTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; isTemplate: boolean }) =>
      updateSurvey(args.id, { isTemplate: args.isTemplate }),
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

export function useSurveyRecordCandidates(surveyId: string | undefined, search: string, enabled = true) {
  return useQuery({
    queryKey: surveyKeys.recordCandidates(surveyId ?? '', search.trim()),
    queryFn: ({ signal }) => fetchSurveyRecordCandidates(surveyId as string, search, { signal }),
    enabled: Boolean(surveyId) && enabled,
    staleTime: 30_000,
  })
}

/** Refresh everything that shows responses, completion and results for this survey. */
function invalidateSurveyResponses(qc: ReturnType<typeof useQueryClient>, surveyId: string) {
  void qc.invalidateQueries({ queryKey: surveyKeys.responses(surveyId) })
  void qc.invalidateQueries({ queryKey: surveyKeys.recipients(surveyId) })
  void qc.invalidateQueries({ queryKey: surveyKeys.results(surveyId) })
  void qc.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) })
  void qc.invalidateQueries({ queryKey: [...surveyKeys.all(), 'record-candidates', surveyId] })
}

export function useRecordSurveyResponse(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RecordSurveyResponseInput) => recordSurveyResponse(surveyId, input),
    onSuccess: () => invalidateSurveyResponses(qc, surveyId),
  })
}

export function useUpdateRecordedSurveyResponse(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ responseId, input }: { responseId: string; input: UpdateRecordedSurveyResponseInput }) =>
      updateRecordedSurveyResponse(surveyId, responseId, input),
    onSuccess: () => invalidateSurveyResponses(qc, surveyId),
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

/** Portal: answers the signed-in service user submitted for one survey. */
export function usePortalSurveyAnswers(token: string | null) {
  return useQuery({
    queryKey: surveyKeys.portalAnswers(token ?? ''),
    queryFn: ({ signal }) => fetchPortalSurveyAnswers(token!, { signal }),
    enabled: Boolean(token),
  })
}
