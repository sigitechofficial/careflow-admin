import { apiBlob, apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type CqcRating = 'OUTSTANDING' | 'GOOD' | 'REQUIRES_IMPROVEMENT' | 'INADEQUATE'
export type MockInspectionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type MockActionStatus = 'OPEN' | 'DONE'

export type Ref = { id: string; name: string | null }

/** How check answers become a statement's 1–4 score (Mock CQC inspection → Settings). */
export type CheckScoring = {
  metPoints: number
  partlyMetPoints: number
  notMetPoints: number
  score4Percent: number
  score3Percent: number
  score2Percent: number
}

export type MockInspectionSettings = CheckScoring & { defaults: CheckScoring }

export type MockInspectionRow = {
  id: string
  title: string
  status: MockInspectionStatus
  location: Ref | null
  framework: { version: number; title: string }
  template: { code: string; title: string } | null
  leadReviewer: Ref | null
  startedAt: string
  completedAt: string | null
  statementCount: number
  scoredCount: number
  overall: CqcRating | null
  openActions: number
}

export type SnapshotEvidence = {
  evidenceId: string
  title: string
  sourceType: string
  sourceId: string | null
  sourceLabel: string | null
  categoryCode: string
  date: string
  reviewDueAt: string | null
  reviewOverdue: boolean
  attachmentCount: number
}

export type MockStatement = {
  id: string
  code: string
  title: string
  summary: string
  score: number | null
  strengths: string | null
  concerns: string | null
  notes: string | null
  reviewedBy: Ref | null
  reviewedAt: string | null
  snapshotAt: string | null
  gap: boolean
  evidence: SnapshotEvidence[]
  hiddenEvidenceCount: number
  /** From the ready-made template: what it asks you to focus on, and what to check. */
  focus: string | null
  guidance: TemplateGuidance | null
  /** Answers to the checks in `guidance`. */
  checks: StatementCheck[]
}

export type CheckPart = 'lookAt' | 'askPeople' | 'askStaff'
export type CheckAnswer = 'MET' | 'PARTIALLY_MET' | 'NOT_MET'
/** One answered check; a note is required when it is not met or partially met. */
export type StatementCheck = { part: CheckPart; text: string; answer: CheckAnswer; note: string | null }

export type KeyQuestionResult = {
  keyQuestionCode: string
  statementCount: number
  scoredCount: number
  total: number
  max: number
  percent: number | null
  bandRating: CqcRating | null
  rating: CqcRating | null
  limitedFrom: CqcRating | null
  complete: boolean
}

export type InspectionResult = {
  /** False for a focused inspection: its key questions are rated, but there is no overall rating. Missing on older results. */
  overallApplies?: boolean
  keyQuestions: KeyQuestionResult[]
  overall: CqcRating | null
  complete: boolean
  unscoredStatementIds: string[]
}

export type MockAction = {
  id: string
  statementId: string | null
  /** The check of the statement the action came from. */
  checkText: string | null
  title: string
  detail: string | null
  owner: Ref | null
  /** The staff member who should do it. */
  assignedEmployee: Ref | null
  dueAt: string | null
  status: MockActionStatus
  completedAt: string | null
  createdAt: string
}

export type MockInspectionDetail = {
  id: string
  title: string
  status: MockInspectionStatus
  notes: string | null
  location: Ref | null
  framework: { id: string; version: number; code: string; title: string }
  template: { code: string; title: string } | null
  scale: { score: number; label: string }[]
  /** The settings this inspection started with (older inspections: the defaults). */
  checkScoring: CheckScoring
  leadReviewer: Ref | null
  createdBy: Ref | null
  startedAt: string
  completedAt: string | null
  cancelledAt: string | null
  result: InspectionResult | null
  keyQuestions: { code: string; title: string; statements: MockStatement[] }[]
  actions: MockAction[]
}

export type KeyQuestionChange = {
  code: string
  title: string
  fromRating: CqcRating | null
  toRating: CqcRating | null
  fromPercent: number | null
  toPercent: number | null
  change: number | null
}

export type StatementChange = { code: string; title: string; from: number; to: number }

export type MockInspectionComparison = {
  previous: { id: string; title: string; completedAt: string | null; overall: CqcRating | null } | null
  comparison: {
    overall: { from: CqcRating | null; to: CqcRating | null }
    keyQuestions: KeyQuestionChange[]
    improved: StatementChange[]
    declined: StatementChange[]
    unchangedCount: number
  } | null
}

export type MockInspectionListParams = {
  status?: MockInspectionStatus
  locationId?: string
  page?: number
  limit?: number
}

export type CreateMockInspectionInput = { title: string; locationId?: string; notes?: string; templateCode?: string }

export type TemplateGuidance = { lookAt: string[]; askPeople: string[]; askStaff: string[]; inCareFlow: string[] }

export type MockInspectionTemplate = {
  code: string
  groupCode: string
  groupName: string
  title: string
  summary: string
  whenToUse: string
  estimatedMinutes: number
  statementCount: number
  keyQuestionCodes: string[]
  /** Only a template covering every key question gets an overall rating. */
  givesOverallRating: boolean
  /** False when the current CQC framework no longer has all of its statements. */
  matchesFramework: boolean
  statements: {
    code: string
    title: string
    keyQuestionCode: string
    keyQuestionTitle: string
    focus: string | null
    guidance: TemplateGuidance
  }[]
  sources: { id: string; source: string; url: string }[]
  researchedOn: string
}
export type ScoreStatementInput = {
  score?: number | null
  strengths?: string
  concerns?: string
  notes?: string
  /** Every answered check; replaces the saved answers. */
  checks?: StatementCheck[]
}
export type CreateMockActionInput = {
  title: string
  detail?: string
  statementId?: string
  checkText?: string
  /** Staff member (employee id) who should do it. */
  assignedEmployeeId?: string
  dueAt?: string
}
export type UpdateMockActionInput = { status?: MockActionStatus }

const BASE = '/cqc-mock-inspections'

export async function fetchMockInspections(
  params: MockInspectionListParams,
): Promise<{ rows: MockInspectionRow[]; total: number }> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  }
  const res = await apiJson<ApiEnvelope<MockInspectionRow[]> & { meta?: { total?: number } }>(
    `${BASE}${qs.size ? `?${qs}` : ''}`,
    { method: 'GET' },
  )
  return { rows: res.data, total: res.meta?.total ?? res.data.length }
}

/** A ready-made survey that gathers evidence for a quality statement. */
export type StatementSurvey = {
  id: string
  reference: string | null
  title: string
  respondents: string
  audience: string
  groupName: string
  /** The organisation's own template made from it, when adopted. */
  adoptedTemplateId: string | null
  /** How many quality statements the survey covers: fewer means it is more about this one. */
  statementCount: number
}

/** A ready-made policy a quality statement relies on. */
export type StatementPolicy = {
  /** The ready-made (library) policy. */
  id: string
  reference: string
  title: string
  documentType: string
  categoryName: string | null
  /** The organisation's own copy, when adopted. */
  adoptedPolicyId: string | null
  /** The adopted copy's status (ARCHIVED when no longer in use). */
  adoptedStatus: string | null
  /** The adopted copy is a never-published draft, so adopting can be undone (the draft is deleted). */
  canUndoAdopt: boolean
}

/** Statement code → ready-made policies behind it. */
export async function fetchStatementPolicies(): Promise<Record<string, StatementPolicy[]>> {
  const res = await apiJson<ApiEnvelope<Record<string, StatementPolicy[]>>>(`${BASE}/statement-policies`, { method: 'GET' })
  return res.data
}

/** Statement code → ready-made surveys for it, most specific first. */
export async function fetchStatementSurveys(): Promise<Record<string, StatementSurvey[]>> {
  const res = await apiJson<ApiEnvelope<Record<string, StatementSurvey[]>>>(`${BASE}/statement-surveys`, { method: 'GET' })
  return res.data
}

export async function fetchMockInspectionTemplates(): Promise<MockInspectionTemplate[]> {
  const res = await apiJson<ApiEnvelope<MockInspectionTemplate[]>>(`${BASE}/templates`, { method: 'GET' })
  return res.data
}

export async function fetchMockInspection(id: string): Promise<MockInspectionDetail> {
  const res = await apiJson<ApiEnvelope<MockInspectionDetail>>(`${BASE}/${id}`, { method: 'GET' })
  return res.data
}

export async function fetchMockInspectionSettings(): Promise<MockInspectionSettings> {
  const res = await apiJson<ApiEnvelope<MockInspectionSettings>>(`${BASE}/settings`, { method: 'GET' })
  return res.data
}

export const updateMockInspectionSettings = (body: CheckScoring) =>
  send<MockInspectionSettings>(`${BASE}/settings`, 'PUT', body)

async function send<T>(path: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown): Promise<T> {
  const res = await apiJson<ApiEnvelope<T>>(path, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  return res.data
}

export const createMockInspection = (body: CreateMockInspectionInput) =>
  send<MockInspectionDetail>(BASE, 'POST', body)

export const scoreMockStatement = (id: string, statementId: string, body: ScoreStatementInput) =>
  send<MockInspectionDetail>(`${BASE}/${id}/statements/${statementId}`, 'PATCH', body)

export const refreshMockEvidence = (id: string) =>
  send<MockInspectionDetail>(`${BASE}/${id}/refresh-evidence`, 'POST')

export const completeMockInspection = (id: string) => send<MockInspectionDetail>(`${BASE}/${id}/complete`, 'POST')

export const cancelMockInspection = (id: string) => send<MockInspectionDetail>(`${BASE}/${id}/cancel`, 'POST')

export const createMockAction = (id: string, body: CreateMockActionInput) =>
  send<MockInspectionDetail>(`${BASE}/${id}/actions`, 'POST', body)

export async function fetchMockInspectionComparison(id: string): Promise<MockInspectionComparison> {
  const res = await apiJson<ApiEnvelope<MockInspectionComparison>>(`${BASE}/${id}/comparison`, { method: 'GET' })
  return res.data
}

/** What adopting ready-made policies or surveys created, and what was skipped (for example already adopted). */
export type AdoptLibraryResult = {
  created: Array<{ libraryId: string; reference: string; title: string }>
  skipped: Array<{ libraryId: string; reference: string; title: string; reason: string }>
}

/** Adopt ready-made policies as the organisation's own draft policies. */
export const adoptLibraryPolicies = (policyIds: string[]) =>
  send<AdoptLibraryResult>('/policy-library/adopt', 'POST', { policyIds })

/** Adopt ready-made surveys as the organisation's own survey templates. */
export const adoptLibrarySurveys = (surveyIds: string[]) =>
  send<AdoptLibraryResult>('/survey-library/adopt', 'POST', { surveyIds })

/** Undo adopting a policy: deletes the organisation's draft copy (only a never-published draft). */
export const undoAdoptPolicy = (policyId: string) => send<unknown>(`/policies/${policyId}`, 'DELETE')

/** Undo adopting a survey: removes the organisation's survey template. */
export const undoAdoptSurvey = (surveyId: string) => send<unknown>(`/surveys/${surveyId}`, 'DELETE')

/** The inspection report as a PDF. */
export const fetchMockInspectionPdf = (id: string) => apiBlob(`${BASE}/${id}/export`, { method: 'GET' })

/** The active CQC framework's key questions and statements (for choosing what an evidence pack covers). */
export type CqcFrameworkOutline = {
  keyQuestions: Array<{ code: string; title: string; statements: Array<{ id: string; code: string; title: string }> }>
}

export async function fetchCqcFramework(): Promise<CqcFrameworkOutline> {
  const res = await apiJson<ApiEnvelope<CqcFrameworkOutline>>('/cqc-evidence/framework', { method: 'GET' })
  return res.data
}

/** What a CQC evidence pack covers and holds. */
export type EvidencePackInput = {
  format: 'pdf' | 'zip'
  /** One key question; omit (with statementId) for every statement. */
  keyQuestionCode?: string
  statementId?: string
  locationId?: string
  includeFiles: boolean
  includePolicies: boolean
}

/** The evidence pack file (PDF, or a ZIP with the files, policies and a CSV). */
export function fetchEvidencePack(input: EvidencePackInput) {
  const q = new URLSearchParams({ format: input.format })
  if (input.statementId) q.set('statementId', input.statementId)
  else if (input.keyQuestionCode) q.set('keyQuestionCode', input.keyQuestionCode)
  if (input.locationId) q.set('locationId', input.locationId)
  if (input.format === 'zip') q.set('includeFiles', String(input.includeFiles))
  q.set('includePolicies', String(input.includePolicies))
  return apiBlob(`/cqc-evidence-pack?${q.toString()}`, { method: 'GET' })
}

export const updateMockAction = (id: string, actionId: string, body: UpdateMockActionInput) =>
  send<MockInspectionDetail>(`${BASE}/${id}/actions/${actionId}`, 'PATCH', body)
