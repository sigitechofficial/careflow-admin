import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { surveyKeys } from '@/features/surveys/keys'
import {
  addSurveyQuestion,
  cancelSurveySchedule,
  closeSurvey,
  createSurvey,
  deleteSurvey,
  deleteSurveyWithoutEvidence,
  duplicateSurvey,
  type DuplicateSurveyInput,
  fetchPortalSurveyAnswers,
  fetchPortalSurveys,
  fetchPublicSurvey,
  fetchSurvey,
  fetchSurveyRecipients,
  fetchSurveyRecordCandidates,
  fetchSurveySendCandidates,
  fetchSurveyResponses,
  fetchSurveyResults,
  fetchSurveys,
  openSurvey,
  moveSurveyQuestion,
  copySurveyQuestion,
  publishSurvey,
  type ReopenSurveyInput,
  recordSurveyResponse,
  removeSurveyQuestion,
  saveSurveyAsTemplate,
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
  SendSurveyInput,
  SurveyListFilters,
  SubmitSurveyResponseInput,
  UpdateQuestionInput,
  UpdateRecordedSurveyResponseInput,
  UpdateSurveyInput,
} from '@/features/surveys/types'

/**
 * CareFlow closes an open survey a minute or so after its end date passes (the survey job runs every
 * minute). A page left open refetches then, so it shows the survey as closed without a reload.
 */
export const END_DATE_REFRESH_MARGIN_MS = 90_000
const MAX_TIMER_MS = 2_147_483_647

/** When to refetch: just after the earliest end date still ahead among open surveys; null for none. */
export function nextEndDateRefreshIn(
  surveys: ReadonlyArray<{ status: string; closesAt: string | null }> | undefined,
  now: number = Date.now(),
): number | null {
  const ends = (surveys ?? [])
    .filter(s => s.status === 'ACTIVE' && s.closesAt)
    .map(s => new Date(s.closesAt!).getTime() + END_DATE_REFRESH_MARGIN_MS)
    .filter(t => Number.isFinite(t) && t > now)
  return ends.length ? Math.min(Math.min(...ends) - now, MAX_TIMER_MS) : null
}

export function useRefreshAtEndDate(surveys: ReadonlyArray<{ status: string; closesAt: string | null }> | undefined) {
  const qc = useQueryClient()
  const delay = nextEndDateRefreshIn(surveys)
  React.useEffect(() => {
    if (delay === null) return
    const timer = setTimeout(() => void qc.invalidateQueries({ queryKey: surveyKeys.all() }), delay)
    return () => clearTimeout(timer)
  }, [delay, qc])
}

export function useSurveys(filters: SurveyListFilters = {}) {
  const query = useQuery({
    queryKey: surveyKeys.list(filters),
    queryFn: ({ signal }) => fetchSurveys(filters, { signal }),
  })
  useRefreshAtEndDate(query.data)
  return query
}

export function useSurvey(id: string | undefined) {
  const query = useQuery({
    queryKey: surveyKeys.detail(id ?? ''),
    queryFn: ({ signal }) => fetchSurvey(id as string, { signal }),
    enabled: Boolean(id),
  })
  useRefreshAtEndDate(query.data ? [query.data] : undefined)
  return query
}

export function useSurveyResults(id: string | undefined, enabled = true, respondentGroup?: string) {
  return useQuery({
    queryKey: respondentGroup ? [...surveyKeys.results(id ?? ''), respondentGroup] : surveyKeys.results(id ?? ''),
    queryFn: ({ signal }) => fetchSurveyResults(id as string, { signal }, respondentGroup),
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

export function useDeleteSurveyWithoutEvidence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; reason: string }) => deleteSurveyWithoutEvidence(args.id, args.reason),
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

/** Move a template back to regular surveys (as a draft). */
export function useMoveTemplateToSurveys() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => updateSurvey(id, { isTemplate: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: surveyKeys.all() }),
  })
}

/** Save as template — never moves a live survey; the server makes a template copy instead. */
export function useSaveSurveyAsTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => saveSurveyAsTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: surveyKeys.all() }),
  })
}

function invalidateSurvey(qc: ReturnType<typeof useQueryClient>, surveyId: string) {
  void qc.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) })
  void qc.invalidateQueries({ queryKey: surveyKeys.results(surveyId) })
  void qc.invalidateQueries({ queryKey: surveyKeys.responses(surveyId) })
  void qc.invalidateQueries({ queryKey: surveyKeys.recipients(surveyId) })
  void qc.invalidateQueries({ queryKey: surveyKeys.all() })
}

/** Open for responses without sending (also reopens a closed survey). */
export function useOpenSurvey(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ReopenSurveyInput | void) => openSurvey(surveyId, input ?? {}),
    onSuccess: () => invalidateSurvey(qc, surveyId),
  })
}

export function useCloseSurvey(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => closeSurvey(surveyId),
    onSuccess: () => invalidateSurvey(qc, surveyId),
  })
}

export function useCancelSurveySchedule(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => cancelSurveySchedule(surveyId),
    onSuccess: () => invalidateSurvey(qc, surveyId),
  })
}

/**
 * After a question is added, changed or removed: the survey (its questions), its Survey summary
 * (results list every question) and the survey lists (question counts).
 */
export function invalidateSurveyQuestions(qc: ReturnType<typeof useQueryClient>, surveyId: string) {
  void qc.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) })
  void qc.invalidateQueries({ queryKey: surveyKeys.results(surveyId) })
  void qc.invalidateQueries({ queryKey: [...surveyKeys.all(), 'list'] })
}

export function useAddQuestion(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateQuestionInput) => addSurveyQuestion(surveyId, input),
    onSuccess: () => invalidateSurveyQuestions(qc, surveyId),
  })
}

export function useUpdateQuestion(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { questionId: string; input: UpdateQuestionInput }) =>
      updateSurveyQuestion(surveyId, args.questionId, args.input),
    onSuccess: () => invalidateSurveyQuestions(qc, surveyId),
  })
}

export function useMoveQuestion(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { questionId: string; direction: 'up' | 'down' }) =>
      moveSurveyQuestion(surveyId, args.questionId, args.direction),
    onSuccess: () => invalidateSurveyQuestions(qc, surveyId),
  })
}

export function useCopyQuestion(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (questionId: string) => copySurveyQuestion(surveyId, questionId),
    onSuccess: () => invalidateSurveyQuestions(qc, surveyId),
  })
}

export function useRemoveQuestion(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (questionId: string) => removeSurveyQuestion(surveyId, questionId),
    onSuccess: () => invalidateSurveyQuestions(qc, surveyId),
  })
}

export function useSendSurvey(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SendSurveyInput = {}) => sendSurvey(surveyId, input),
    onSuccess: () => {
      invalidateSurvey(qc, surveyId)
      // "Already has it" and the recording list change with every send.
      void qc.invalidateQueries({ queryKey: [...surveyKeys.all(), 'send-candidates', surveyId] })
      void qc.invalidateQueries({ queryKey: [...surveyKeys.all(), 'record-candidates', surveyId] })
    },
  })
}

export function usePublishSurvey(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ReopenSurveyInput | void) => publishSurvey(surveyId, input ?? {}),
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

/** People we support to choose from when sending (search), or the saved choices (ids). */
export function useSurveySendCandidates(
  surveyId: string,
  query: { search?: string; ids?: string[] },
  enabled = true,
) {
  const search = query.search?.trim() ?? ''
  const ids = query.ids ? [...query.ids].sort().join(',') : ''
  return useQuery({
    queryKey: surveyKeys.sendCandidates(surveyId, search, query.ids ? `ids:${ids}` : ''),
    queryFn: ({ signal }) => fetchSurveySendCandidates(surveyId, query, { signal }),
    enabled: enabled && (!query.ids || query.ids.length > 0),
    staleTime: 30_000,
  })
}

export function useSurveyRecordCandidates(surveyId: string | undefined, search: string, enabled = true, asReviewer = false) {
  return useQuery({
    queryKey: [...surveyKeys.recordCandidates(surveyId ?? '', search.trim()), asReviewer ? 'reviewer' : 'office'],
    queryFn: ({ signal }) => fetchSurveyRecordCandidates(surveyId as string, search, { signal }, asReviewer),
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
  void qc.invalidateQueries({ queryKey: ['surveys', 'to-collect'] })
  void qc.invalidateQueries({ queryKey: ['surveys', 'person-history'] })
  void qc.invalidateQueries({ queryKey: ['surveys', 'calls', surveyId] })
}

export function useRecordSurveyResponse(surveyId: string, asReviewer = false) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RecordSurveyResponseInput) => recordSurveyResponse(surveyId, input, asReviewer),
    onSuccess: () => invalidateSurveyResponses(qc, surveyId),
  })
}

/**
 * `surveyId` is the survey the response belongs to (a period's own id for a repeating survey's
 * period). `listedOnSurveyId`: the survey whose list it was edited from (the repeating survey's
 * "All periods"), refreshed too.
 */
export function useUpdateRecordedSurveyResponse(surveyId: string, listedOnSurveyId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ responseId, input }: { responseId: string; input: UpdateRecordedSurveyResponseInput }) =>
      updateRecordedSurveyResponse(surveyId, responseId, input),
    onSuccess: () => {
      invalidateSurveyResponses(qc, surveyId)
      if (listedOnSurveyId && listedOnSurveyId !== surveyId) invalidateSurveyResponses(qc, listedOnSurveyId)
    },
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
