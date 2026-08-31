import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type VacancyStatus = 'OPEN' | 'PAUSED' | 'CLOSED'

export type RecruitmentEmploymentType =
  | 'PERMANENT'
  | 'FIXED_TERM'
  | 'BANK'
  | 'AGENCY'
  | 'APPRENTICE'
  | 'VOLUNTEER'

export type CandidateSource = 'WEBSITE' | 'REFERRAL' | 'AGENCY' | 'INTERNAL' | 'MANUAL'

export type CandidateStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'ASSESSMENT'
  | 'OFFER'
  | 'VETTING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'

export type CandidateDocumentType = 'CV' | 'CERTIFICATE' | 'ID_DOCUMENT' | 'OTHER'

export type RecruitmentListMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type VacancyRow = {
  id: string
  vacancyReference: string
  recordNo: number
  title: string
  jobTitleId: string | null
  jobTitle: string | null
  locationId: string | null
  location: string | null
  employmentType: RecruitmentEmploymentType
  description: string | null
  requirements: string | null
  salaryRange: string | null
  numberOfPositions: number
  status: VacancyStatus
  hiringManagerId: string | null
  hiringManagerName: string | null
  candidateCount: number
  stageCounts: Record<string, number>
  createdAt: string
  updatedAt: string
}

export type CandidateRow = {
  id: string
  candidateReference: string
  recordNo: number
  firstName: string
  lastName: string
  name: string
  email: string | null
  phone: string | null
  dateOfBirth: string | null
  address: string | null
  vacancyId: string
  vacancyTitle: string | null
  vacancyReference: string | null
  source: CandidateSource
  stage: CandidateStage
  coverLetter: string | null
  personalStatement: string | null
  cvFileUrl: string | null
  dataProcessingConsent: boolean
  consentDate: string | null
  convertedEmployeeId: string | null
  convertedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CandidateTimelineEntry = {
  id: string
  fromStage: CandidateStage | null
  toStage: CandidateStage
  notes: string | null
  createdAt: string
  changedBy: { id: string; name: string } | null
}

export type CandidateDetail = CandidateRow & {
  timeline: CandidateTimelineEntry[]
}

export type CandidateDocumentRow = {
  id: string
  candidateId: string
  documentType: CandidateDocumentType
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  reviewNotes: string | null
  status: string
  createdAt: string
}

export type RecruitmentSummary = {
  openVacancies: number
  activeCandidates: number
  pipelineSummary: { stage: CandidateStage; count: number }[]
  recentApplications: {
    id: string
    name: string
    stage: CandidateStage
    vacancyTitle: string
    createdAt: string
  }[]
}

export type PipelineColumn = {
  stage: CandidateStage
  candidates: CandidateRow[]
}

export type CreateVacancyPayload = {
  title: string
  jobTitleId?: string
  locationId?: string
  employmentType: RecruitmentEmploymentType
  description?: string
  requirements?: string
  salaryRange?: string
  numberOfPositions?: number
  hiringManagerId?: string
}

export type UpdateVacancyPayload = Partial<CreateVacancyPayload>

export type CreateCandidatePayload = {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  address?: string
  vacancyId: string
  source: CandidateSource
  coverLetter?: string
  personalStatement?: string
  cvFileUrl?: string
  dataProcessingConsent?: boolean
  consentDate?: string
}

function listMeta(res: ApiEnvelope<unknown>): RecruitmentListMeta {
  const meta = (res.meta ?? {}) as Partial<RecruitmentListMeta>
  return {
    page: meta.page ?? 1,
    limit: meta.limit ?? 20,
    total: meta.total ?? 0,
    totalPages: meta.totalPages ?? 1,
    hasNextPage: meta.hasNextPage ?? false,
    hasPrevPage: meta.hasPrevPage ?? false,
  }
}

export async function fetchRecruitmentSummary() {
  const res = await apiJson<ApiEnvelope<RecruitmentSummary>>('/hr/recruitment/summary')
  return res.data
}

export async function fetchVacancies(params: {
  page?: number
  limit?: number
  search?: string
  status?: VacancyStatus
} = {}) {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.status) qs.set('status', params.status)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<VacancyRow[]>>(`/hr/vacancies${suffix}`)
  return { data: res.data, meta: listMeta(res) }
}

export async function fetchVacancy(id: string) {
  const res = await apiJson<ApiEnvelope<VacancyRow>>(`/hr/vacancies/${id}`)
  return res.data
}

export async function createVacancy(payload: CreateVacancyPayload) {
  const res = await apiJson<ApiEnvelope<VacancyRow>>('/hr/vacancies', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function updateVacancy(id: string, payload: UpdateVacancyPayload) {
  const res = await apiJson<ApiEnvelope<VacancyRow>>(`/hr/vacancies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function updateVacancyStatus(id: string, status: VacancyStatus) {
  const res = await apiJson<ApiEnvelope<VacancyRow>>(`/hr/vacancies/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return res.data
}

export async function fetchCandidates(params: {
  page?: number
  limit?: number
  search?: string
  vacancyId?: string
  stage?: CandidateStage
} = {}) {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.vacancyId) qs.set('vacancyId', params.vacancyId)
  if (params.stage) qs.set('stage', params.stage)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<CandidateRow[]>>(`/hr/candidates${suffix}`)
  return { data: res.data, meta: listMeta(res) }
}

export async function fetchCandidatePipeline(vacancyId?: string) {
  const qs = vacancyId ? `?vacancyId=${encodeURIComponent(vacancyId)}` : ''
  const res = await apiJson<ApiEnvelope<{ columns: PipelineColumn[] }>>(
    `/hr/candidates/pipeline${qs}`,
  )
  return res.data.columns
}

export async function fetchCandidate(id: string) {
  const res = await apiJson<ApiEnvelope<CandidateDetail>>(`/hr/candidates/${id}`)
  return res.data
}

export async function createCandidate(payload: CreateCandidatePayload) {
  const res = await apiJson<ApiEnvelope<CandidateRow>>('/hr/candidates', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function updateCandidateStage(id: string, stage: CandidateStage, notes?: string) {
  const res = await apiJson<ApiEnvelope<CandidateRow>>(`/hr/candidates/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stage, notes }),
  })
  return res.data
}

export async function convertCandidate(id: string) {
  const res = await apiJson<
    ApiEnvelope<{ employeeId: string; candidate: { id: string; candidateReference: string } }>
  >(`/hr/candidates/${id}/convert`, { method: 'POST' })
  return res.data
}

export async function fetchCandidateDocuments(candidateId: string) {
  const res = await apiJson<ApiEnvelope<CandidateDocumentRow[]>>(
    `/hr/candidates/${candidateId}/documents`,
  )
  return res.data
}
