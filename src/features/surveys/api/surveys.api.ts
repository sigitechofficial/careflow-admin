import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CreateQuestionInput,
  CreateSurveyInput,
  PortalSurveyAnswers,
  PortalSurveyItem,
  PublicSurveyForm,
  SendSurveyResult,
  SurveyDetail,
  SurveyListFilters,
  SurveyListItem,
  SurveyQuestion,
  RecordSurveyResponseInput,
  SurveyRecipientItem,
  SurveyRecordCandidate,
  SurveyResponseItem,
  SurveyResponsesPayload,
  SurveyResults,
  SubmitSurveyResponseInput,
  UpdateQuestionInput,
  UpdateRecordedSurveyResponseInput,
  UpdateSurveyInput,
} from '@/features/surveys/types'

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export async function fetchSurveys(
  filters: SurveyListFilters = {},
  init?: RequestInit,
): Promise<SurveyListItem[]> {
  const res = await apiJson<ApiEnvelope<SurveyListItem[]>>(
    `/surveys${buildQuery({ status: filters.status, targetKind: filters.targetKind })}`,
    { method: 'GET', ...init },
  )
  return res.data ?? []
}

export async function fetchSurvey(id: string, init?: RequestInit): Promise<SurveyDetail> {
  const res = await apiJson<ApiEnvelope<SurveyDetail>>(`/surveys/${id}`, { method: 'GET', ...init })
  return res.data as SurveyDetail
}

export async function fetchSurveyResults(id: string, init?: RequestInit): Promise<SurveyResults> {
  const res = await apiJson<ApiEnvelope<SurveyResults>>(`/surveys/${id}/results`, {
    method: 'GET',
    ...init,
  })
  return res.data as SurveyResults
}

export async function fetchSurveyResponses(
  id: string,
  init?: RequestInit,
): Promise<SurveyResponsesPayload> {
  const res = await apiJson<ApiEnvelope<SurveyResponsesPayload>>(`/surveys/${id}/responses`, {
    method: 'GET',
    ...init,
  })
  return (
    res.data ?? {
      isAnonymous: false,
      total: 0,
      responses: [] as SurveyResponseItem[],
    }
  )
}

export async function createSurvey(input: CreateSurveyInput): Promise<SurveyDetail> {
  const res = await apiJson<ApiEnvelope<SurveyDetail>>('/surveys', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data as SurveyDetail
}

export async function updateSurvey(id: string, input: UpdateSurveyInput): Promise<SurveyDetail> {
  const res = await apiJson<ApiEnvelope<SurveyDetail>>(`/surveys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return res.data as SurveyDetail
}

export async function deleteSurvey(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/surveys/${id}`, { method: 'DELETE' })
}

export async function addSurveyQuestion(
  surveyId: string,
  input: CreateQuestionInput,
): Promise<SurveyQuestion> {
  const res = await apiJson<ApiEnvelope<SurveyQuestion>>(`/surveys/${surveyId}/questions`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data as SurveyQuestion
}

export async function updateSurveyQuestion(
  surveyId: string,
  questionId: string,
  input: UpdateQuestionInput,
): Promise<SurveyQuestion> {
  const res = await apiJson<ApiEnvelope<SurveyQuestion>>(
    `/surveys/${surveyId}/questions/${questionId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  )
  return res.data as SurveyQuestion
}

export async function removeSurveyQuestion(surveyId: string, questionId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/surveys/${surveyId}/questions/${questionId}`, {
    method: 'DELETE',
  })
}

export async function sendSurvey(
  surveyId: string,
  employeeIds?: string[],
  distributeAt?: string,
  recurrence?: string | null,
  locationIds?: string[],
): Promise<SendSurveyResult> {
  const res = await apiJson<ApiEnvelope<SendSurveyResult>>(`/surveys/${surveyId}/send`, {
    method: 'POST',
    body: JSON.stringify({
      ...(employeeIds?.length ? { employeeIds } : {}),
      ...(locationIds?.length ? { locationIds } : {}),
      ...(distributeAt ? { distributeAt } : {}),
      ...(recurrence !== undefined ? { recurrence } : {}),
    }),
  })
  return res.data as SendSurveyResult
}

/** Portal: surveys sent to the signed-in service user. */
export async function fetchPortalSurveys(init?: RequestInit): Promise<PortalSurveyItem[]> {
  const res = await apiJson<ApiEnvelope<PortalSurveyItem[]>>('/portal/surveys', {
    method: 'GET',
    ...init,
  })
  return res.data ?? []
}

/** Portal: answers the signed-in service user submitted for one survey. */
export async function fetchPortalSurveyAnswers(
  token: string,
  init?: RequestInit,
): Promise<PortalSurveyAnswers> {
  const res = await apiJson<ApiEnvelope<PortalSurveyAnswers>>(
    `/portal/surveys/${encodeURIComponent(token)}/answers`,
    { method: 'GET', ...init },
  )
  return res.data as PortalSurveyAnswers
}

export async function publishSurvey(
  surveyId: string,
): Promise<{ id: string; status: string; publishedAt: string | null; shareToken: string }> {
  const res = await apiJson<
    ApiEnvelope<{ id: string; status: string; publishedAt: string | null; shareToken: string }>
  >(`/surveys/${surveyId}/publish`, { method: 'POST', body: '{}' })
  return res.data as { id: string; status: string; publishedAt: string | null; shareToken: string }
}

export async function fetchSurveyRecipients(
  surveyId: string,
  init?: RequestInit,
): Promise<SurveyRecipientItem[]> {
  const res = await apiJson<ApiEnvelope<SurveyRecipientItem[]>>(
    `/surveys/${surveyId}/recipients`,
    { method: 'GET', ...init },
  )
  return res.data ?? []
}

/** People a response can be recorded for (survey target), with their recipient status. */
export async function fetchSurveyRecordCandidates(
  surveyId: string,
  search: string,
  init?: RequestInit,
): Promise<SurveyRecordCandidate[]> {
  const res = await apiJson<ApiEnvelope<SurveyRecordCandidate[]>>(
    `/surveys/${surveyId}/record-candidates${buildQuery({ search: search.trim() || undefined })}`,
    { method: 'GET', ...init },
  )
  return res.data ?? []
}

/** Office staff record a response collected by telephone, paper or in person. */
export async function recordSurveyResponse(
  surveyId: string,
  input: RecordSurveyResponseInput,
): Promise<{ id: string; submittedAt: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string; submittedAt: string }>>(
    `/surveys/${surveyId}/responses/record`,
    { method: 'POST', body: JSON.stringify(input) },
  )
  return res.data
}

/** Correct a staff-recorded response (reason required). */
export async function updateRecordedSurveyResponse(
  surveyId: string,
  responseId: string,
  input: UpdateRecordedSurveyResponseInput,
): Promise<{ id: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string }>>(
    `/surveys/${surveyId}/responses/${responseId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  )
  return res.data
}

export async function fetchPublicSurvey(
  token: string,
  init?: RequestInit,
): Promise<PublicSurveyForm> {
  const res = await apiJson<ApiEnvelope<PublicSurveyForm>>(`/surveys/public/${encodeURIComponent(token)}`, {
    method: 'GET',
    ...init,
  })
  return res.data as PublicSurveyForm
}

export async function submitPublicSurveyResponse(
  token: string,
  input: SubmitSurveyResponseInput,
): Promise<{ id: string; submittedAt: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string; submittedAt: string }>>(
    `/surveys/public/${encodeURIComponent(token)}/responses`,
    { method: 'POST', body: JSON.stringify(input) },
  )
  return res.data as { id: string; submittedAt: string }
}

export function buildSurveyShareUrl(token: string): string {
  if (typeof window === 'undefined') return `/survey/${token}`
  return `${window.location.origin}/survey/${token}`
}
