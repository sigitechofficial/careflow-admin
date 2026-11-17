import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  LearningFileInfo,
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
  LearningCompetency,
  LearningCompetencyInput,
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
  LearningPublishCheck,
  LearningCourseStatusCounts,
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
  LearningEligibleAttendee,
  LearningAssignmentStatusCounts,
  RecordOutcomeInput,
  AssignAgainInput,
  LearningReviewOptions,
  LearningAssignmentRecord,
  ExtendAssignmentInput,
  RecordAssignmentReviewInput,
  LearningTrainingEventAttendee,
  LearningAttendanceStatus,
  LearningBookingStatus,
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

export async function fetchLearningDashboardSummary(
  locationId?: string,
): Promise<LearningDashboardSummary> {
  const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ''
  return fetchData<LearningDashboardSummary>(`/learning/dashboard/summary${qs}`)
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

export async function fetchLearningCourseStatusCounts(
  params?: LearningCourseListParams,
): Promise<LearningCourseStatusCounts> {
  return fetchData<LearningCourseStatusCounts>(`/learning/courses/status-counts${buildQuery(params)}`)
}

export async function unarchiveLearningCourse(id: string): Promise<LearningCourse> {
  return fetchData<LearningCourse>(`/learning/courses/${id}/unarchive`, { method: 'POST' })
}

export async function fetchLearningCourse(id: string): Promise<LearningCourse> {
  return fetchData<LearningCourse>(`/learning/courses/${id}`)
}

/** Next free code for a category, e.g. SAFEGUARDING-003. */
export async function suggestLearningCourseCode(categoryId: string): Promise<{ code: string }> {
  return fetchData<{ code: string }>(
    `/learning/courses/code-suggestion?categoryId=${encodeURIComponent(categoryId)}`,
  )
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
  body?: { changeSummary?: string; reactivate?: boolean },
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

/** No new assignments; carers already on the course continue. The published version stays locked. */
export async function withdrawLearningCourse(id: string, reason: string): Promise<LearningCourse> {
  return fetchData<LearningCourse>(`/learning/courses/${id}/withdraw`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function reactivateLearningCourse(id: string): Promise<LearningCourse> {
  return fetchData<LearningCourse>(`/learning/courses/${id}/reactivate`, { method: 'POST' })
}

export async function archiveLearningCourse(id: string): Promise<LearningCourse> {
  return fetchData<LearningCourse>(`/learning/courses/${id}/archive`, { method: 'POST' })
}

export async function fetchLearningPublishCheck(courseId: string): Promise<LearningPublishCheck> {
  return fetchData<LearningPublishCheck>(`/learning/courses/${courseId}/publish-check`)
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

/** Upload a lesson file (PDF, Word .docx, JPG or PNG). */
export async function uploadLearningFile(file: File): Promise<LearningFileInfo> {
  const form = new FormData()
  form.append('file', file)
  return fetchData<LearningFileInfo>('/learning/files', { method: 'POST', body: form })
}

/** Every lesson id of the section, in the new order. */
export async function reorderLearningContent(sectionId: string, contentIds: string[]): Promise<void> {
  await apiJson(`/learning/sections/${sectionId}/reorder-content`, {
    method: 'POST',
    body: JSON.stringify({ contentIds }),
  })
}

export async function moveLearningContent(contentId: string, sectionId: string): Promise<void> {
  await apiJson(`/learning/content/${contentId}/move`, {
    method: 'POST',
    body: JSON.stringify({ sectionId }),
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

export async function updateAssessmentQuestion(
  questionId: string,
  body: Partial<LearningAssessmentQuestionInput>,
): Promise<unknown> {
  return fetchData(`/learning/questions/${questionId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function reorderAssessmentQuestions(assessmentId: string, questionIds: string[]): Promise<unknown> {
  return fetchData(`/learning/assessments/${assessmentId}/reorder-questions`, {
    method: 'POST',
    body: JSON.stringify({ questionIds }),
  })
}

// ─── Competencies ────────────────────────────────────────────

export async function fetchLearningCompetencies(
  params?: LearningListParams,
): Promise<PaginatedResult<LearningCompetency>> {
  return fetchPaginated<LearningCompetency>('/learning/competencies', params)
}

export async function createLearningCompetency(body: LearningCompetencyInput): Promise<LearningCompetency> {
  return fetchData<LearningCompetency>('/learning/competencies', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateLearningCompetency(
  id: string,
  body: Partial<LearningCompetencyInput>,
): Promise<LearningCompetency> {
  return fetchData<LearningCompetency>(`/learning/competencies/${id}`, {
    method: 'PATCH',
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

export async function fetchLearningAssignmentStatusCounts(
  params?: LearningAssignmentListParams,
): Promise<LearningAssignmentStatusCounts> {
  const { statusGroup: _g, page: _p, limit: _l, ...rest } = params ?? {}
  return fetchData<LearningAssignmentStatusCounts>(`/learning/assignments/status-counts${buildQuery(rest)}`)
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

export async function fetchLearningEligibleAttendees(id: string): Promise<LearningEligibleAttendee[]> {
  return fetchData<LearningEligibleAttendee[]>(`/learning/training-events/${id}/eligible-attendees`)
}

export async function addLearningTrainingEventAttendee(
  id: string,
  body: { employeeId: string },
): Promise<LearningTrainingEventAttendee> {
  return fetchData<LearningTrainingEventAttendee>(`/learning/training-events/${id}/attendees`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateLearningTrainingEventAttendee(
  attendeeId: string,
  body: { attendanceStatus?: LearningAttendanceStatus; bookingStatus?: LearningBookingStatus },
): Promise<LearningTrainingEventAttendee> {
  return fetchData<LearningTrainingEventAttendee>(`/learning/training-events/attendees/${attendeeId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function removeLearningTrainingEventAttendee(attendeeId: string): Promise<void> {
  await apiJson(`/learning/training-events/attendees/${attendeeId}`, { method: 'DELETE' })
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

// ─── Overdue / late review (16 Nov 2026) ─────────────────────

export async function fetchLearningReviewOptions(): Promise<LearningReviewOptions> {
  return fetchData<LearningReviewOptions>('/learning/assignment-review-options')
}

export async function fetchLearningAssignmentRecord(id: string): Promise<LearningAssignmentRecord> {
  return fetchData<LearningAssignmentRecord>(`/learning/assignments/${id}/record`)
}

export async function extendLearningAssignment(id: string, body: ExtendAssignmentInput): Promise<LearningAssignmentRecord> {
  return fetchData<LearningAssignmentRecord>(`/learning/assignments/${id}/extend-with-reason`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function recordLearningAssignmentReview(
  id: string,
  body: RecordAssignmentReviewInput,
): Promise<LearningAssignmentRecord & { reassignedAssignmentId: string | null }> {
  return fetchData(`/learning/assignments/${id}/reviews`, { method: 'POST', body: JSON.stringify(body) })
}

export async function recordLearningOutcome(
  id: string,
  body: RecordOutcomeInput,
): Promise<LearningAssignmentRecord & { reassignedAssignmentId: string | null }> {
  return fetchData(`/learning/assignments/${id}/outcome`, { method: 'POST', body: JSON.stringify(body) })
}

/** Short-lived link to a certificate PDF (17 Nov 2026). */
export async function fetchLearningCertificatePdfLink(id: string): Promise<{ url: string }> {
  return fetchData(`/learning/certificates/${id}/pdf-link`)
}

/** Face to face: the office starts the course for the carer (16 Nov 2026). */
export async function startLearningAssignment(id: string): Promise<LearningAssignmentRecord> {
  return fetchData(`/learning/assignments/${id}/start`, { method: 'POST', body: JSON.stringify({}) })
}

/** Face to face: mark lessons done / not done. No lessonIds = all lessons. */
export async function markLearningLessons(
  id: string,
  body: { lessonIds?: string[]; done: boolean },
): Promise<LearningAssignmentRecord> {
  return fetchData(`/learning/assignments/${id}/lessons/mark`, { method: 'POST', body: JSON.stringify(body) })
}

export async function assignLearningAgain(
  id: string,
  body: AssignAgainInput,
): Promise<LearningAssignmentRecord & { reassignedAssignmentId: string | null }> {
  return fetchData(`/learning/assignments/${id}/assign-again`, { method: 'POST', body: JSON.stringify(body) })
}
