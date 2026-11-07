import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CreateQuestionInput,
  CreateSurveyInput,
  PortalSurveyAnswers,
  PortalSurveyItem,
  PublicSurveyForm,
  SaveAsTemplateResult,
  SendSurveyInput,
  SendSurveyResult,
  SurveyDetail,
  SurveyListFilters,
  SurveyListItem,
  SurveyQuestion,
  RecordSurveyResponseInput,
  SurveyRecipientsPayload,
  SurveyRecordCandidate,
  SurveySendCandidate,
  SurveyResponseItem,
  SurveyResponsesPayload,
  SurveyResults,
  SurveyTargetKind,
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
    `/surveys${buildQuery({
      status: filters.status,
      targetKind: filters.targetKind,
      isTemplate: filters.isTemplate === undefined ? undefined : String(filters.isTemplate),
    })}`,
    { method: 'GET', ...init },
  )
  return res.data ?? []
}

export async function fetchSurvey(id: string, init?: RequestInit): Promise<SurveyDetail> {
  const res = await apiJson<ApiEnvelope<SurveyDetail>>(`/surveys/${id}`, { method: 'GET', ...init })
  return res.data as SurveyDetail
}

export async function fetchSurveyResults(id: string, init?: RequestInit, respondentGroup?: string): Promise<SurveyResults> {
  const q = respondentGroup ? `?respondentGroup=${encodeURIComponent(respondentGroup)}` : ''
  const res = await apiJson<ApiEnvelope<SurveyResults>>(`/surveys/${id}/results${q}`, {
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

/** The API's error code when a closed survey is not deleted because its CQC evidence could not be taken. */
export const SURVEY_EVIDENCE_CAPTURE_FAILED = 'SURVEY_EVIDENCE_CAPTURE_FAILED'
export const DELETE_WITHOUT_EVIDENCE_REASON_MIN = 5
export const DELETE_WITHOUT_EVIDENCE_REASON_MAX = 300

/** Delete a closed survey anyway when its CQC evidence could not be taken (company-wide admins; audited with the reason). */
export async function deleteSurveyWithoutEvidence(id: string, reason: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/surveys/${id}/delete-without-evidence`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

/** Overrides applied to a duplicated survey; anything omitted is copied from the source. */
export type DuplicateSurveyInput = {
  /** Who it's for (audience group code; OTHER with the group in words). */
  audienceGroup?: string | null
  audienceGroupOther?: string | null
  title?: string
  targetKind?: SurveyTargetKind
  isAnonymous?: boolean
  /** Named surveys: "Let people choose to answer without their name" (kept on when a ready-made survey promises it). */
  allowAnonymousResponses?: boolean
  /** Branches for the new survey (empty = all branches you can reach). */
  locationIds?: string[]
  roleIds?: string[]
  /** The new survey's own start and end (a source's dates are never copied). */
  opensAt?: string
  closesAt?: string
}

/** Save as template: an unused draft becomes the template, anything live gets a template copy. */
export async function saveSurveyAsTemplate(id: string): Promise<SaveAsTemplateResult> {
  const res = await apiJson<ApiEnvelope<SaveAsTemplateResult>>(`/surveys/${id}/save-as-template`, {
    method: 'POST',
    body: '{}',
  })
  return res.data as SaveAsTemplateResult
}

/**
 * Opening (or reopening) a survey: a survey whose end date has passed needs a new end date in the
 * future (`closesAt`), or `closesAt: null` to remove it. Leave it out to keep the current end date.
 */
export type ReopenSurveyInput = { closesAt?: string | null }

/** Open a staff / service-user survey for responses without sending (also reopens a closed one). */
export async function openSurvey(id: string, input: ReopenSurveyInput = {}): Promise<SurveyDetail> {
  const res = await apiJson<ApiEnvelope<SurveyDetail>>(`/surveys/${id}/open`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data as SurveyDetail
}

export async function closeSurvey(id: string): Promise<SurveyDetail> {
  const res = await apiJson<ApiEnvelope<SurveyDetail>>(`/surveys/${id}/close`, { method: 'POST', body: '{}' })
  return res.data as SurveyDetail
}

export async function cancelSurveySchedule(id: string): Promise<SurveyDetail> {
  const res = await apiJson<ApiEnvelope<SurveyDetail>>(`/surveys/${id}/schedule/cancel`, {
    method: 'POST',
    body: '{}',
  })
  return res.data as SurveyDetail
}

/** Duplicate a survey (and its questions) as a new draft, with optional edits. Returns the new survey. */
export async function duplicateSurvey(
  id: string,
  overrides: DuplicateSurveyInput = {},
): Promise<SurveyDetail> {
  const res = await apiJson<ApiEnvelope<SurveyDetail>>(`/surveys/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(overrides),
  })
  return res.data as SurveyDetail
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

/** Move a question one place up or down (its "Show only if" rules decide whether it can). */
export async function moveSurveyQuestion(surveyId: string, questionId: string, direction: 'up' | 'down'): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/surveys/${surveyId}/questions/${questionId}/move`, {
    method: 'POST',
    body: JSON.stringify({ direction }),
  })
}

/** Copy a question straight after it (a new key, so nothing depends on the copy). */
export async function copySurveyQuestion(surveyId: string, questionId: string): Promise<SurveyQuestion> {
  const res = await apiJson<ApiEnvelope<SurveyQuestion>>(`/surveys/${surveyId}/questions/${questionId}/copy`, {
    method: 'POST',
    body: '{}',
  })
  return res.data as SurveyQuestion
}

export async function removeSurveyQuestion(surveyId: string, questionId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/surveys/${surveyId}/questions/${questionId}`, {
    method: 'DELETE',
  })
}

/** Send now, schedule, or start a repeating survey. The audience given is saved on the survey. */
export async function sendSurvey(surveyId: string, input: SendSurveyInput = {}): Promise<SendSurveyResult> {
  const res = await apiJson<ApiEnvelope<SendSurveyResult>>(`/surveys/${surveyId}/send`, {
    method: 'POST',
    body: JSON.stringify(input),
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
  input: ReopenSurveyInput = {},
): Promise<{ id: string; status: string; publishedAt: string | null; shareToken: string }> {
  const res = await apiJson<
    ApiEnvelope<{ id: string; status: string; publishedAt: string | null; shareToken: string }>
  >(`/surveys/${surveyId}/publish`, { method: 'POST', body: JSON.stringify(input) })
  return res.data as { id: string; status: string; publishedAt: string | null; shareToken: string }
}

export async function fetchSurveyRecipients(
  surveyId: string,
  init?: RequestInit,
): Promise<SurveyRecipientsPayload> {
  const res = await apiJson<ApiEnvelope<SurveyRecipientsPayload>>(
    `/surveys/${surveyId}/recipients`,
    { method: 'GET', ...init },
  )
  return (
    res.data ?? {
      isAnonymous: false,
      byPeriod: false,
      counts: { total: 0, notStarted: 0, opened: 0, completed: 0 },
      recipients: [],
    }
  )
}

/**
 * People we support who can be chosen for a send (your branches), with portal status. With
 * `ids` it looks up those people (saved choices) instead of searching.
 */
export async function fetchSurveySendCandidates(
  surveyId: string,
  query: { search?: string; ids?: string[] },
  init?: RequestInit,
): Promise<SurveySendCandidate[]> {
  const res = await apiJson<ApiEnvelope<SurveySendCandidate[]>>(
    `/surveys/${surveyId}/send-candidates${buildQuery({
      search: query.search?.trim() || undefined,
      ids: query.ids ? query.ids.join(',') : undefined,
    })}`,
    { method: 'GET', ...init },
  )
  return res.data ?? []
}

/** People a response can be recorded for (survey target), with their recipient status. */
export async function fetchSurveyRecordCandidates(
  surveyId: string,
  search: string,
  init?: RequestInit,
  /** An independent reviewer: their sample only (/survey-reviews). */
  asReviewer = false,
): Promise<SurveyRecordCandidate[]> {
  const path = asReviewer ? `/survey-reviews/${surveyId}/people` : `/surveys/${surveyId}/record-candidates`
  const res = await apiJson<ApiEnvelope<SurveyRecordCandidate[]>>(
    `${path}${buildQuery({ search: search.trim() || undefined })}`,
    { method: 'GET', ...init },
  )
  return res.data ?? []
}

/** Office staff record a response collected by telephone, paper or in person. */
export async function recordSurveyResponse(
  surveyId: string,
  input: RecordSurveyResponseInput,
  /** An independent reviewer records through /survey-reviews (their sample, this survey only). */
  asReviewer = false,
): Promise<{ id: string; submittedAt: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string; submittedAt: string }>>(
    asReviewer ? `/survey-reviews/${surveyId}/responses` : `/surveys/${surveyId}/responses/record`,
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
): Promise<{ id: string; submittedAt: string; closingMessage?: string | null; closingMessages?: Record<string, string> }> {
  // The closing-screen message comes back with the submit only (never in the form before it).
  const res = await apiJson<ApiEnvelope<{ id: string; submittedAt: string; closingMessage?: string | null; closingMessages?: Record<string, string> }>>(
    `/surveys/public/${encodeURIComponent(token)}/responses`,
    { method: 'POST', body: JSON.stringify(input) },
  )
  return res.data as { id: string; submittedAt: string; closingMessage?: string | null; closingMessages?: Record<string, string> }
}

export function buildSurveyShareUrl(token: string): string {
  if (typeof window === 'undefined') return `/survey/${token}`
  return `${window.location.origin}/survey/${token}`
}
