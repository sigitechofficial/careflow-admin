import { apiBlob, apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { ManualSourceType } from './constants'

const BASE = '/cqc-evidence'

export type CqcEvidenceStatus = 'CURRENT' | 'SUPERSEDED' | 'ARCHIVED'

/** One quality statement on the overview: how much current evidence it has. */
export type OverviewStatement = {
  id: string
  code: string
  title: string
  summary: string
  evidenceCount: number
  latestEvidenceAt: string | null
  reviewOverdue: number
  sourceTypes: string[]
  categoryCodes: string[]
  gap: boolean
}

export type OverviewKeyQuestion = {
  id: string
  code: string
  title: string
  summary: string
  statementCount: number
  coveredCount: number
  gapCount: number
  statements: OverviewStatement[]
}

export type EvidenceOverview = {
  framework: { id: string; version: number; code: string; title: string; checkedOn: string | null }
  categories: Array<{ code: string; title: string; description: string }>
  totals: {
    statements: number
    covered: number
    gaps: number
    currentEvidence: number
    reviewOverdue: number
    unverifiedTitles: number
  }
  keyQuestions: OverviewKeyQuestion[]
}

/** A piece of evidence as the list shows it. */
export type EvidenceRow = {
  id: string
  title: string
  summary: string | null
  sourceType: string
  sourceLabel: string | null
  source: { kind: 'survey'; surveyId: string; seriesId: string | null } | null
  categoryCode: string
  categoryTitle: string
  periodStart: string | null
  periodEnd: string | null
  locations: Array<{ id: string; name: string }>
  status: CqcEvidenceStatus
  reviewDueAt: string | null
  reviewOverdue: boolean
  reviewDueSoon: boolean
  statements: Array<{
    id: string
    code: string
    title: string
    keyQuestionCode: string
    keyQuestionTitle: string
    current: boolean
  }>
  attachmentCount: number
  automatic: boolean
  addedBy: { id: string; name: string } | null
  createdAt: string
}

export type EvidenceListParams = {
  page?: number
  limit?: number
  search?: string
  keyQuestion?: string
  statementId?: string
  sourceType?: string
  categoryCode?: string
  status?: CqcEvidenceStatus | 'ALL'
  locationId?: string
}

export type EvidenceListResult = {
  rows: EvidenceRow[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

/** Evidence by key question and quality statement, with the gaps (one branch, or every branch the user may see). */
export async function fetchEvidenceOverview(locationId?: string): Promise<EvidenceOverview> {
  const q = locationId ? `?${new URLSearchParams({ locationId })}` : ''
  const res = await apiJson<ApiEnvelope<EvidenceOverview>>(`${BASE}/overview${q}`, { method: 'GET' })
  return res.data
}

export async function fetchEvidenceList(params: EvidenceListParams): Promise<EvidenceListResult> {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
  const res = await apiJson<ApiEnvelope<EvidenceRow[]> & { meta: EvidenceListResult['meta'] }>(`${BASE}?${q}`, {
    method: 'GET',
  })
  return { rows: res.data, meta: res.meta }
}

/** One piece of evidence in full: its notes, "You said, we did" and files. */
export type EvidenceDetail = EvidenceRow & {
  notes: string | null
  actions: Array<{ youSaid: string; weDid: string }>
  locationIds: string[]
  attachments: Array<{
    id: string
    fileName: string
    mimeType: string
    sizeBytes: number
    createdAt: string
    uploadedByName: string | null
  }>
  updatedBy: { id: string; name: string } | null
  archivedAt: string | null
  updatedAt: string
}

export type EvidenceInput = {
  title: string
  summary?: string
  statementIds: string[]
  categoryCode: string
  sourceType?: ManualSourceType
  periodStart?: string
  periodEnd?: string
  locationIds?: string[]
  reviewDueAt?: string
  notes?: string
  actions?: Array<{ youSaid: string; weDid: string }>
}

/** Edits: the type cannot change; survey evidence keeps the survey's period. */
export type EvidenceUpdate = Partial<Omit<EvidenceInput, 'sourceType'>> & { status?: CqcEvidenceStatus }

export async function fetchEvidence(id: string): Promise<EvidenceDetail> {
  const res = await apiJson<ApiEnvelope<EvidenceDetail>>(`${BASE}/${id}`, { method: 'GET' })
  return res.data
}

export async function createEvidence(body: EvidenceInput): Promise<EvidenceDetail> {
  const res = await apiJson<ApiEnvelope<EvidenceDetail>>(BASE, { method: 'POST', body: JSON.stringify(body) })
  return res.data
}

export async function updateEvidence(id: string, body: EvidenceUpdate): Promise<EvidenceDetail> {
  const res = await apiJson<ApiEnvelope<EvidenceDetail>>(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  return res.data
}

export async function uploadEvidenceFile(id: string, file: File): Promise<unknown> {
  const form = new FormData()
  form.append('file', file)
  const res = await apiJson<ApiEnvelope<unknown>>(`${BASE}/${id}/attachments`, { method: 'POST', body: form })
  return res.data
}

export const downloadEvidenceFile = (id: string, attachmentId: string) =>
  apiBlob(`${BASE}/${id}/attachments/${attachmentId}`, { method: 'GET' })

export async function removeEvidenceFile(id: string, attachmentId: string): Promise<void> {
  await apiJson(`${BASE}/${id}/attachments/${attachmentId}`, { method: 'DELETE' })
}
