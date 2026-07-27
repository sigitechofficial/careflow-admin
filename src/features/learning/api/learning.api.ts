import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  BulkLearningAssignmentInput,
  BulkLearningAssignmentResult,
  EmployeeLearningEligibility,
  LearningAssessment,
  LearningAssessmentInput,
  LearningAssessmentQuestionInput,
  LearningAssignment,
  LearningAssignmentInput,
  LearningAssignmentListParams,
  LearningCategory,
  LearningCategoryInput,
  LearningCategoryListParams,
  LearningCertificate,
  LearningCertificateListParams,
  LearningComplianceListParams,
  LearningComplianceSnapshot,
  LearningContentItem,
  LearningContentItemInput,
  LearningCourse,
  LearningCourseInput,
  LearningCourseListParams,
  LearningCourseVersion,
  LearningDashboardSummary,
  LearningExternalTraining,
  LearningExternalTrainingInput,
  LearningExternalTrainingListParams,
  LearningListParams,
  LearningReportListParams,
  LearningSection,
  LearningSectionInput,
  LearningSettings,
  LearningTrainingEvent,
  LearningTrainingEventInput,
  PaginatedResult,
  PaginationMeta,
} from '@/features/learning/types/learning.types'

function buildQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams()
  if (!params) return ''
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    qs.set(key, String(value))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

async function fetchPaginated<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<PaginatedResult<T>> {
  const res = await apiJson<ApiEnvelope<T[]>>(`${path}${buildQuery(params)}`, { method: 'GET' })
  return { rows: res.data ?? [], meta: res.meta as PaginationMeta | undefined }
}

async function fetchData<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiJson<ApiEnvelope<T>>(path, init)
  return res.data
}

// ─── Dashboard ───────────────────────────────────────────────

export async function fetchLearningDashboardSummary(): Promise<LearningDashboardSummary> {
  return fetchData<LearningDashboardSummary>('/learning/dashboard/summary')
}

// ─── Settings ────────────────────────────────────────────────

export async function fetchLearningSettings(): Promise<LearningSettings> {
  return fetchData<LearningSettings>('/learning/settings')
}

export async function updateLearningSettings(body: Partial<LearningSettings>): Promise<LearningSettings> {
  return fetchData<LearningSettings>('/learning/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

// ─── Categories ──────────────────────────────────────────────

export async function fetchLearningCategories(
  params?: LearningCategoryListParams,
): Promise<PaginatedResult<LearningCategory>> {
  return fetchPaginated<LearningCategory>('/learning/categories', params)
}

export async function fetchLearningCategory(id: string): Promise<LearningCategory> {
  return fetchData<LearningCategory>(`/learning/categories/${id}`)
}

export async function createLearningCategory(body: LearningCategoryInput): Promise<LearningCategory> {
  return fetchData<LearningCategory>('/learning/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateLearningCategory(
  id: string,
  body: Partial<LearningCategoryInput>,
): Promise<LearningCategory> {
  return fetchData<LearningCategory>(`/learning/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteLearningCategory(id: string): Promise<void> {
  await apiJson(`/learning/categories/${id}`, { method: 'DELETE' })
}

// ─── Courses ─────────────────────────────────────────────────

export async function fetchLearningCourses(
  params?: LearningCourseListParams,
): Promise<PaginatedResult<LearningCourse>> {
  return fetchPaginated<LearningCourse>('/learning/courses', params)
}

export async function fetchLearningCourse(id: string): Promise<LearningCourse> {
  return fetchData<LearningCourse>(`/learning/courses/${id}`)
}

export async function createLearningCourse(body: LearningCourseInput): Promise<LearningCourse> {
  return fetchData<LearningCourse>('/learning/courses', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateLearningCourse(
  id: string,
  body: Partial<LearningCourseInput>,
): Promise<LearningCourse> {
  return fetchData<LearningCourse>(`/learning/courses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function publishLearningCourse(
  id: string,
  body?: { changeSummary?: string },
): Promise<{ course: LearningCourse; version: LearningCourseVersion }> {
  return fetchData(`/learning/courses/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  })
}

export async function createLearningCourseVersion(
  id: string,
  body?: { versionLabel?: string; changeSummary?: string },
): Promise<LearningCourseVersion> {
  return fetchData<LearningCourseVersion>(`/learning/courses/${id}/create-version`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  })
}

export async function unpublishLearningCourse(
  id: string,
): Promise<{ course: LearningCourse; version: LearningCourseVersion }> {
  return fetchData(`/learning/courses/${id}/unpublish`, { method: 'POST' })
}

export async function archiveLearningCourse(id: string): Promise<LearningCourse> {
  return fetchData<LearningCourse>(`/learning/courses/${id}/archive`, { method: 'POST' })
}

export async function fetchLearningCourseVersions(courseId: string): Promise<LearningCourseVersion[]> {
  return fetchData<LearningCourseVersion[]>(`/learning/courses/${courseId}/versions`)
}

export async function fetchLearningCourseVersion(
  courseId: string,
  versionId: string,
): Promise<LearningCourseVersion> {
  return fetchData<LearningCourseVersion>(`/learning/courses/${courseId}/versions/${versionId}`)
}

// ─── Content ─────────────────────────────────────────────────

export async function createLearningSection(
  versionId: string,
  body: LearningSectionInput,
): Promise<LearningSection> {
  return fetchData<LearningSection>(`/learning/course-versions/${versionId}/sections`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateLearningSection(
  sectionId: string,
  body: Partial<LearningSectionInput>,
): Promise<LearningSection> {
  return fetchData<LearningSection>(`/learning/sections/${sectionId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteLearningSection(sectionId: string): Promise<void> {
  await apiJson(`/learning/sections/${sectionId}`, { method: 'DELETE' })
}

export async function createLearningContentItem(
  sectionId: string,
  body: LearningContentItemInput,
): Promise<LearningContentItem> {
  return fetchData<LearningContentItem>(`/learning/sections/${sectionId}/content`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateLearningContentItem(
  contentId: string,
  body: Partial<LearningContentItemInput>,
): Promise<LearningContentItem> {
  return fetchData<LearningContentItem>(`/learning/content/${contentId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteLearningContentItem(contentId: string): Promise<void> {
  await apiJson(`/learning/content/${contentId}`, { method: 'DELETE' })
}

export async function reorderLearningSections(
  versionId: string,
  sectionIds: string[],
): Promise<void> {
  await apiJson(`/learning/course-versions/${versionId}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ sectionIds }),
  })
}

// ─── Assessments ─────────────────────────────────────────────

export async function createLearningAssessment(
  versionId: string,
  body: LearningAssessmentInput,
): Promise<LearningAssessment> {
  return fetchData<LearningAssessment>(`/learning/course-versions/${versionId}/assessments`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateLearningAssessment(
  id: string,
  body: Partial<LearningAssessmentInput>,
): Promise<LearningAssessment> {
  return fetchData<LearningAssessment>(`/learning/assessments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteLearningAssessment(id: string): Promise<void> {
  await apiJson(`/learning/assessments/${id}`, { method: 'DELETE' })
}

export async function createAssessmentQuestion(
  assessmentId: string,
  body: LearningAssessmentQuestionInput,
): Promise<unknown> {
  return fetchData(`/learning/assessments/${assessmentId}/questions`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteAssessmentQuestion(questionId: string): Promise<void> {
  await apiJson(`/learning/questions/${questionId}`, { method: 'DELETE' })
}

// ─── Assignments ─────────────────────────────────────────────

export async function fetchLearningAssignments(
  params?: LearningAssignmentListParams,
): Promise<PaginatedResult<LearningAssignment>> {
  return fetchPaginated<LearningAssignment>('/learning/assignments', params)
}

export async function fetchLearningAssignment(id: string): Promise<LearningAssignment> {
  return fetchData<LearningAssignment>(`/learning/assignments/${id}`)
}

export async function createLearningAssignment(body: LearningAssignmentInput): Promise<LearningAssignment> {
  return fetchData<LearningAssignment>('/learning/assignments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function bulkCreateLearningAssignments(
  body: BulkLearningAssignmentInput,
): Promise<BulkLearningAssignmentResult> {
  return fetchData<BulkLearningAssignmentResult>('/learning/assignments/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function cancelLearningAssignment(
  id: string,
  cancellationReason: string,
): Promise<LearningAssignment> {
  return fetchData<LearningAssignment>(`/learning/assignments/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancellationReason }),
  })
}

export async function exemptLearningAssignment(
  id: string,
  exemptionReason: string,
): Promise<LearningAssignment> {
  return fetchData<LearningAssignment>(`/learning/assignments/${id}/exempt`, {
    method: 'POST',
    body: JSON.stringify({ exemptionReason }),
  })
}

// ─── Compliance ──────────────────────────────────────────────

export async function fetchLearningComplianceMatrix(
  params?: LearningComplianceListParams,
): Promise<PaginatedResult<LearningComplianceSnapshot>> {
  return fetchPaginated<LearningComplianceSnapshot>('/learning/compliance/matrix', params)
}

export async function exportLearningComplianceCsv(
  params?: LearningComplianceListParams,
): Promise<{ csv: string; filename?: string }> {
  const res = await apiJson<ApiEnvelope<{ csv: string; filename?: string }>>(
    `/learning/compliance/export${buildQuery(params)}`,
    { method: 'GET' },
  )
  return res.data
}

// ─── Certificates ────────────────────────────────────────────

export async function fetchLearningCertificates(
  params?: LearningCertificateListParams,
): Promise<PaginatedResult<LearningCertificate>> {
  return fetchPaginated<LearningCertificate>('/learning/certificates', params)
}

export async function revokeLearningCertificate(
  id: string,
  revocationReason: string,
): Promise<LearningCertificate> {
  return fetchData<LearningCertificate>(`/learning/certificates/${id}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ revocationReason }),
  })
}

export async function issueManualLearningCertificate(body: {
  employeeId: string
  courseId: string
  expiresAt?: string
  issueNotes?: string
}): Promise<LearningCertificate> {
  return fetchData<LearningCertificate>('/learning/certificates/issue', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// ─── Training events ─────────────────────────────────────────

export async function fetchLearningTrainingEvents(
  params?: LearningListParams,
): Promise<PaginatedResult<LearningTrainingEvent>> {
  return fetchPaginated<LearningTrainingEvent>('/learning/training-events', params)
}

export async function fetchLearningTrainingEvent(id: string): Promise<LearningTrainingEvent> {
  return fetchData<LearningTrainingEvent>(`/learning/training-events/${id}`)
}

export async function createLearningTrainingEvent(
  body: LearningTrainingEventInput,
): Promise<LearningTrainingEvent> {
  return fetchData<LearningTrainingEvent>('/learning/training-events', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateLearningTrainingEvent(
  id: string,
  body: Partial<LearningTrainingEventInput>,
): Promise<LearningTrainingEvent> {
  return fetchData<LearningTrainingEvent>(`/learning/training-events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function cancelLearningTrainingEvent(id: string): Promise<LearningTrainingEvent> {
  return fetchData<LearningTrainingEvent>(`/learning/training-events/${id}/cancel`, { method: 'POST' })
}

export async function deleteLearningTrainingEvent(id: string): Promise<void> {
  await apiJson(`/learning/training-events/${id}`, { method: 'DELETE' })
}

// ─── External training ───────────────────────────────────────

export async function fetchLearningExternalTraining(
  params?: LearningExternalTrainingListParams,
): Promise<PaginatedResult<LearningExternalTraining>> {
  return fetchPaginated<LearningExternalTraining>('/learning/external-training', params)
}

export async function createLearningExternalTraining(
  body: LearningExternalTrainingInput,
): Promise<LearningExternalTraining> {
  return fetchData<LearningExternalTraining>('/learning/external-training', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function verifyLearningExternalTraining(
  id: string,
  verificationNotes?: string,
): Promise<LearningExternalTraining> {
  return fetchData<LearningExternalTraining>(`/learning/external-training/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify({ verificationNotes }),
  })
}

export async function rejectLearningExternalTraining(
  id: string,
  verificationNotes: string,
): Promise<LearningExternalTraining> {
  return fetchData<LearningExternalTraining>(`/learning/external-training/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ verificationNotes }),
  })
}

// ─── Reports ─────────────────────────────────────────────────

export async function fetchLearningReportAssignments(params?: LearningReportListParams) {
  return fetchPaginated<LearningAssignment>('/learning/reports/assignments', params)
}

export async function fetchLearningReportCompletions(params?: LearningReportListParams) {
  return fetchPaginated<Record<string, unknown>>('/learning/reports/completions', params)
}

export async function fetchLearningReportCompliance(params?: LearningReportListParams) {
  return fetchPaginated<LearningComplianceSnapshot>('/learning/reports/compliance', params)
}

// ─── Employee eligibility ────────────────────────────────────

export async function fetchEmployeeLearningEligibility(
  employeeId: string,
): Promise<EmployeeLearningEligibility> {
  return fetchData<EmployeeLearningEligibility>(`/learning/employees/${employeeId}/eligibility`)
}
