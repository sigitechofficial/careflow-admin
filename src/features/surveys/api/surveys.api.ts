import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CreateQuestionInput,
  CreateSurveyInput,
  SendSurveyResult,
  SurveyDetail,
  SurveyListFilters,
  SurveyListItem,
  SurveyQuestion,
  SurveyResults,
  UpdateQuestionInput,
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
): Promise<SendSurveyResult> {
  const res = await apiJson<ApiEnvelope<SendSurveyResult>>(`/surveys/${surveyId}/send`, {
    method: 'POST',
    body: JSON.stringify(employeeIds?.length ? { employeeIds } : {}),
  })
  return res.data as SendSurveyResult
}
