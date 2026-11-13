import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type VacancyStatus = 'OPEN' | 'PAUSED' | 'CLOSED'

export type SalaryPeriod = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'

export type RecruitmentEmploymentType =
  | 'PERMANENT'
  | 'FIXED_TERM'
  | 'BANK'
  | 'AGENCY'
  | 'APPRENTICE'
  | 'VOLUNTEER'

export type CandidateSource = 'WEBSITE' | 'REFERRAL' | 'AGENCY' | 'INTERNAL' | 'MANUAL' | 'EMAIL'

/** APPLIED → SCREENING → INTERVIEW → OFFER → VETTING (checks) → ACCEPTED (cleared to start). */
export type CandidateStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'VETTING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'

export type CandidateDocumentType =
  | 'CV'
  | 'CERTIFICATE'
  | 'ID_DOCUMENT'
  | 'OFFER_LETTER'
  | 'CHECK_EVIDENCE'
  | 'OTHER'

export type CandidateOfferStatus = 'SENT' | 'ACCEPTED' | 'DECLINED'
export type CandidateInterviewMode = 'IN_PERSON' | 'PHONE' | 'VIDEO'
export type CandidateInterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export type CandidateInterviewOutcome = 'HIRE' | 'MAYBE' | 'DO_NOT_HIRE'
export type CandidateCheckType =
  | 'PROOF_OF_ID'
  | 'RIGHT_TO_WORK'
  | 'DBS'
  | 'REFERENCE_1'
  | 'REFERENCE_2'
  | 'QUALIFICATIONS'
  | 'HEALTH_DECLARATION'
  | 'OVERSEAS_POLICE_CHECK'
  | 'DRIVING'
export type CandidateCheckStatus =
  | 'NOT_STARTED'
  | 'REQUESTED'
  | 'RECEIVED'
  | 'VERIFIED'
  | 'FAILED'
  | 'NOT_REQUIRED'

export type EmploymentHistoryEntry = {
  kind: 'JOB' | 'GAP'
  /** YYYY-MM */
  from: string
  /** YYYY-MM, or null while still going on. */
  to: string | null
  employer?: string | null
  jobTitle?: string | null
  reasonForLeaving?: string | null
  careRole?: boolean | null
  explanation?: string | null
}

export type CandidateInterview = {
  id: string
  scheduledAt: string
  mode: CandidateInterviewMode
  location: string | null
  interviewers: string | null
  status: CandidateInterviewStatus
  answers: { question: string; score: number | null; notes: string | null }[]
  recommendation: CandidateInterviewOutcome | null
  gapsDiscussed: boolean
  notes: string | null
  completedAt: string | null
  completedByName: string | null
  /** Last time the candidate was emailed about this interview. */
  candidateEmailedAt: string | null
}

export type ClearanceBlocker = {
  message: string
  target: 'STAGE' | 'CONSENT' | 'EMPLOYMENT_HISTORY' | 'CHECKS' | 'CHECK'
  checkType?: CandidateCheckType
}

export type CandidateCheck = {
  id: string
  type: CandidateCheckType
  label: string
  required: boolean
  status: CandidateCheckStatus
  referenceNumber: string | null
  provider: string | null
  issueDate: string | null
  expiryDate: string | null
  notes: string | null
  requestedAt: string | null
  receivedAt: string | null
  verifiedAt: string | null
  verifiedByName: string | null
  documents: { id: string; fileName: string; fileUrl: string; mimeType: string; createdAt: string }[]
}

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
  salaryPeriod: SalaryPeriod | null
  /** Last day to apply (YYYY-MM-DD), inclusive. */
  closingDate: string | null
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
  employmentHistory: EmploymentHistoryEntry[]
  hasRightToWork: boolean | null
  needsSponsorship: boolean | null
  drivesForWork: boolean | null
  livedOverseas: boolean | null
  screeningNotes: string | null
  offerStatus: CandidateOfferStatus | null
  offerStartDate: string | null
  offerHoursPerWeek: string | null
  offerPayRate: string | null
  offerNotes: string | null
  offerSentAt: string | null
  offerRespondedAt: string | null
  offerEmailedAt: string | null
  outcomeReason: string | null
  rejectionEmailedAt: string | null
  clearedAt: string | null
  clearanceNotes: string | null
  createdAt: string
  updatedAt: string
  /** Only in the rejected & withdrawn list: the step they were at, and when it was closed. */
  closedFromStage?: CandidateStage | null
  closedAt?: string
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
  clearedByName: string | null
  interviews: CandidateInterview[]
  checks: CandidateCheck[]
  /** Months no job or explained gap covers (must be explained before clearing). */
  unexplainedGaps: { from: string; to: string }[]
  /** What still stops "Clear to start" (only at the checks step), and where it is fixed. */
  clearanceBlockers: ClearanceBlocker[]
  /** Another employee's record already has this email (employee emails must be unique). */
  emailUsedByEmployee: { employeeId: string; name: string } | null
  /** For a rejected / withdrawn candidate: the step to reopen at. */
  stageBeforeClosing: CandidateStage | null
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
  salaryPeriod?: SalaryPeriod | null
  /** YYYY-MM-DD, or null to remove it. */
  closingDate?: string | null
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
  /** Only rejected and withdrawn candidates. */
  closed?: boolean
} = {}) {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.vacancyId) qs.set('vacancyId', params.vacancyId)
  if (params.stage) qs.set('stage', params.stage)
  if (params.closed) qs.set('closed', 'true')
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

export async function updateCandidateStage(
  id: string,
  stage: CandidateStage,
  notes?: string,
  notifyCandidate?: boolean,
) {
  const res = await apiJson<ApiEnvelope<CandidateRow>>(`/hr/candidates/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stage, notes, notifyCandidate }),
  })
  return res.data
}

export async function convertCandidate(id: string, startDate?: string, email?: string) {
  const res = await apiJson<
    ApiEnvelope<{
      employeeId: string
      checksCopied: string[]
      checksNotCopied: string[]
      documentsCopied: number
      candidate: { id: string; candidateReference: string }
    }>
  >(`/hr/candidates/${id}/convert`, {
    method: 'POST',
    body: JSON.stringify({ ...(startDate ? { startDate } : {}), ...(email ? { email } : {}) }),
  })
  return res.data
}

export type UpdateCandidatePayload = Partial<
  Pick<
    CreateCandidatePayload,
    'firstName' | 'lastName' | 'email' | 'phone' | 'dateOfBirth' | 'address' | 'coverLetter' | 'dataProcessingConsent'
  >
>
export type ScreeningPayload = Partial<
  Pick<CandidateRow, 'hasRightToWork' | 'needsSponsorship' | 'drivesForWork' | 'livedOverseas'>
> & { screeningNotes?: string }
export type InterviewPayload = {
  scheduledAt?: string
  mode?: CandidateInterviewMode
  location?: string
  interviewers?: string
  status?: CandidateInterviewStatus
  answers?: { question: string; score: number | null; notes?: string }[]
  recommendation?: CandidateInterviewOutcome | null
  gapsDiscussed?: boolean
  notes?: string
  /** Email the candidate: the invitation when arranging, the new details or the cancellation on changes. */
  notifyCandidate?: boolean
}
export type OfferPayload = {
  startDate: string
  hoursPerWeek?: string
  payRate?: string
  notes?: string
  notifyCandidate?: boolean
}
export type CheckPayload = {
  status?: CandidateCheckStatus
  referenceNumber?: string
  provider?: string
  issueDate?: string | null
  expiryDate?: string | null
  notes?: string
}

async function candidateCall(id: string, path: string, method: string, body?: unknown) {
  const res = await apiJson<ApiEnvelope<CandidateDetail>>(`/hr/candidates/${id}${path}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return res.data
}

export const candidateFlowApi = {
  updateProfile: (id: string, payload: UpdateCandidatePayload) => candidateCall(id, '', 'PATCH', payload),
  updateScreening: (id: string, payload: ScreeningPayload) => candidateCall(id, '/screening', 'PATCH', payload),
  saveEmploymentHistory: (id: string, entries: EmploymentHistoryEntry[]) =>
    candidateCall(id, '/employment-history', 'PUT', { entries }),
  createInterview: (id: string, payload: InterviewPayload) => candidateCall(id, '/interviews', 'POST', payload),
  updateInterview: (id: string, interviewId: string, payload: InterviewPayload) =>
    candidateCall(id, `/interviews/${interviewId}`, 'PATCH', payload),
  emailInterview: (id: string, interviewId: string) =>
    candidateCall(id, `/interviews/${interviewId}/email`, 'POST'),
  saveOffer: (id: string, payload: OfferPayload) => candidateCall(id, '/offer', 'PUT', payload),
  emailOffer: (id: string) => candidateCall(id, '/offer/email', 'POST'),
  respondToOffer: (id: string, accepted: boolean, notes?: string) =>
    candidateCall(id, '/offer/response', 'POST', { accepted, notes }),
  updateCheck: (id: string, checkId: string, payload: CheckPayload) =>
    candidateCall(id, `/checks/${checkId}`, 'PATCH', payload),
  clear: (id: string, notes?: string) => candidateCall(id, '/clear', 'POST', { notes }),
}

export async function fetchCandidateDocuments(candidateId: string) {
  const res = await apiJson<ApiEnvelope<CandidateDocumentRow[]>>(
    `/hr/candidates/${candidateId}/documents`,
  )
  return res.data
}
