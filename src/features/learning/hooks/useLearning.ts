import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  archiveLearningCourse,
  bulkCreateLearningAssignments,
  cancelLearningAssignment,
  cancelLearningTrainingEvent,
  createAssessmentQuestion,
  createLearningAssessment,
  createLearningAssignment,
  createLearningCategory,
  createLearningContentItem,
  createLearningCourse,
  createLearningCourseVersion,
  createLearningExternalTraining,
  createLearningSection,
  createLearningTrainingEvent,
  deleteAssessmentQuestion,
  deleteLearningAssessment,
  deleteLearningCategory,
  deleteLearningContentItem,
  deleteLearningSection,
  deleteLearningTrainingEvent,
  exemptLearningAssignment,
  exportLearningComplianceCsv,
  fetchEmployeeLearningEligibility,
  fetchLearningAssignment,
  fetchLearningAssignments,
  fetchLearningCategories,
  fetchLearningCertificates,
  fetchLearningComplianceMatrix,
  fetchLearningCourse,
  fetchLearningCourseVersion,
  fetchLearningCourseVersions,
  fetchLearningCourses,
  fetchLearningDashboardSummary,
  fetchLearningExternalTraining,
  fetchLearningReportAssignments,
  fetchLearningReportCompliance,
  fetchLearningReportCompletions,
  fetchLearningSettings,
  fetchLearningTrainingEvent,
  fetchLearningTrainingEvents,
  publishLearningCourse,
  rejectLearningExternalTraining,
  revokeLearningCertificate,
  unpublishLearningCourse,
  updateLearningAssessment,
  updateLearningCategory,
  updateLearningContentItem,
  updateLearningCourse,
  updateLearningSection,
  updateLearningSettings,
  updateLearningTrainingEvent,
  verifyLearningExternalTraining,
} from '@/features/learning/api/learning.api'
import { learningKeys } from '@/features/learning/keys'
import type {
  BulkLearningAssignmentInput,
  LearningAssessmentInput,
  LearningAssessmentQuestionInput,
  LearningAssignmentInput,
  LearningAssignmentListParams,
  LearningCategoryInput,
  LearningCategoryListParams,
  LearningCertificateListParams,
  LearningComplianceListParams,
  LearningContentItemInput,
  LearningCourseInput,
  LearningCourseListParams,
  LearningExternalTrainingInput,
  LearningExternalTrainingListParams,
  LearningListParams,
  LearningReportListParams,
  LearningSectionInput,
  LearningSettings,
  LearningTrainingEventInput,
} from '@/features/learning/types/learning.types'

function invalidateLearning(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: learningKeys.all })
}

export function useLearningDashboard() {
  return useQuery({
    queryKey: learningKeys.dashboard(),
    queryFn: fetchLearningDashboardSummary,
  })
}

export function useLearningSettings() {
  return useQuery({
    queryKey: learningKeys.settings(),
    queryFn: fetchLearningSettings,
  })
}

export function useUpdateLearningSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<LearningSettings>) => updateLearningSettings(body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useLearningCategories(params?: LearningCategoryListParams) {
  return useQuery({
    queryKey: learningKeys.categories(params),
    queryFn: () => fetchLearningCategories(params),
  })
}

export function useCreateLearningCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LearningCategoryInput) => createLearningCategory(body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useUpdateLearningCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<LearningCategoryInput> }) =>
      updateLearningCategory(id, body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useDeleteLearningCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLearningCategory(id),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useLearningCourses(params?: LearningCourseListParams) {
  return useQuery({
    queryKey: learningKeys.courses(params),
    queryFn: () => fetchLearningCourses(params),
  })
}

export function useLearningCourse(id: string | null, enabled = true) {
  return useQuery({
    queryKey: learningKeys.course(id ?? ''),
    queryFn: () => fetchLearningCourse(id!),
    enabled: enabled && !!id,
  })
}

export function useCreateLearningCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LearningCourseInput) => createLearningCourse(body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useUpdateLearningCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<LearningCourseInput> }) =>
      updateLearningCourse(id, body),
    onSuccess: (_d, vars) => {
      invalidateLearning(qc)
      void qc.invalidateQueries({ queryKey: learningKeys.course(vars.id) })
    },
  })
}

export function usePublishLearningCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changeSummary }: { id: string; changeSummary?: string }) =>
      publishLearningCourse(id, { changeSummary }),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useUnpublishLearningCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => unpublishLearningCourse(id),
    onSuccess: (_d, id) => {
      invalidateLearning(qc)
      void qc.invalidateQueries({ queryKey: learningKeys.course(id) })
      void qc.invalidateQueries({ queryKey: learningKeys.courseVersions(id) })
    },
  })
}

export function useCreateLearningCourseVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: { versionLabel?: string; changeSummary?: string } }) =>
      createLearningCourseVersion(id, body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useArchiveLearningCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveLearningCourse(id),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useLearningCourseVersions(courseId: string | null, enabled = true) {
  return useQuery({
    queryKey: learningKeys.courseVersions(courseId ?? ''),
    queryFn: () => fetchLearningCourseVersions(courseId!),
    enabled: enabled && !!courseId,
  })
}

export function useLearningCourseVersion(
  courseId: string | null,
  versionId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: learningKeys.courseVersion(courseId ?? '', versionId ?? ''),
    queryFn: () => fetchLearningCourseVersion(courseId!, versionId!),
    enabled: enabled && !!courseId && !!versionId,
  })
}

export function useCreateLearningSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ versionId, body }: { versionId: string; body: LearningSectionInput }) =>
      createLearningSection(versionId, body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useUpdateLearningSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sectionId, body }: { sectionId: string; body: Partial<LearningSectionInput> }) =>
      updateLearningSection(sectionId, body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useDeleteLearningSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sectionId: string) => deleteLearningSection(sectionId),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useCreateLearningContentItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sectionId, body }: { sectionId: string; body: LearningContentItemInput }) =>
      createLearningContentItem(sectionId, body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useUpdateLearningContentItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ contentId, body }: { contentId: string; body: Partial<LearningContentItemInput> }) =>
      updateLearningContentItem(contentId, body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useDeleteLearningContentItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contentId: string) => deleteLearningContentItem(contentId),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useCreateLearningAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ versionId, body }: { versionId: string; body: LearningAssessmentInput }) =>
      createLearningAssessment(versionId, body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useUpdateLearningAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<LearningAssessmentInput> }) =>
      updateLearningAssessment(id, body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useDeleteLearningAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLearningAssessment(id),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useCreateAssessmentQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      assessmentId,
      body,
    }: {
      assessmentId: string
      body: LearningAssessmentQuestionInput
    }) => createAssessmentQuestion(assessmentId, body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useDeleteAssessmentQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (questionId: string) => deleteAssessmentQuestion(questionId),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useLearningAssignments(params?: LearningAssignmentListParams) {
  return useQuery({
    queryKey: learningKeys.assignments(params),
    queryFn: () => fetchLearningAssignments(params),
  })
}

export function useLearningAssignment(id: string | null, enabled = true) {
  return useQuery({
    queryKey: learningKeys.assignment(id ?? ''),
    queryFn: () => fetchLearningAssignment(id!),
    enabled: enabled && !!id,
  })
}

export function useCreateLearningAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LearningAssignmentInput) => createLearningAssignment(body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useBulkCreateLearningAssignments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: BulkLearningAssignmentInput) => bulkCreateLearningAssignments(body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useCancelLearningAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelLearningAssignment(id, reason),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useExemptLearningAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => exemptLearningAssignment(id, reason),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useLearningComplianceMatrix(params?: LearningComplianceListParams) {
  return useQuery({
    queryKey: learningKeys.complianceMatrix(params),
    queryFn: () => fetchLearningComplianceMatrix(params),
  })
}

export function useExportLearningCompliance() {
  return useMutation({
    mutationFn: (params?: LearningComplianceListParams) => exportLearningComplianceCsv(params),
  })
}

export function useLearningCertificates(params?: LearningCertificateListParams) {
  return useQuery({
    queryKey: learningKeys.certificates(params),
    queryFn: () => fetchLearningCertificates(params),
  })
}

export function useRevokeLearningCertificate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => revokeLearningCertificate(id, reason),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useLearningTrainingEvents(params?: LearningListParams) {
  return useQuery({
    queryKey: learningKeys.trainingEvents(params),
    queryFn: () => fetchLearningTrainingEvents(params),
  })
}

export function useLearningTrainingEvent(id: string | null, enabled = true) {
  return useQuery({
    queryKey: learningKeys.trainingEvent(id ?? ''),
    queryFn: () => fetchLearningTrainingEvent(id!),
    enabled: enabled && !!id,
  })
}

export function useCreateLearningTrainingEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LearningTrainingEventInput) => createLearningTrainingEvent(body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useUpdateLearningTrainingEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<LearningTrainingEventInput> }) =>
      updateLearningTrainingEvent(id, body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useCancelLearningTrainingEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelLearningTrainingEvent(id),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useDeleteLearningTrainingEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLearningTrainingEvent(id),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useLearningExternalTraining(params?: LearningExternalTrainingListParams) {
  return useQuery({
    queryKey: learningKeys.externalTraining(params),
    queryFn: () => fetchLearningExternalTraining(params),
  })
}

export function useCreateLearningExternalTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LearningExternalTrainingInput) => createLearningExternalTraining(body),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useVerifyLearningExternalTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => verifyLearningExternalTraining(id, notes),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useRejectLearningExternalTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => rejectLearningExternalTraining(id, notes),
    onSuccess: () => invalidateLearning(qc),
  })
}

export function useLearningReportAssignments(params?: LearningReportListParams) {
  return useQuery({
    queryKey: learningKeys.reportsAssignments(params),
    queryFn: () => fetchLearningReportAssignments(params),
  })
}

export function useLearningReportCompletions(params?: LearningReportListParams) {
  return useQuery({
    queryKey: learningKeys.reportsCompletions(params),
    queryFn: () => fetchLearningReportCompletions(params),
  })
}

export function useLearningReportCompliance(params?: LearningReportListParams) {
  return useQuery({
    queryKey: learningKeys.reportsCompliance(params),
    queryFn: () => fetchLearningReportCompliance(params),
  })
}

export function useEmployeeLearningEligibility(employeeId: string | null, enabled = true) {
  return useQuery({
    queryKey: learningKeys.employeeEligibility(employeeId ?? ''),
    queryFn: () => fetchEmployeeLearningEligibility(employeeId!),
    enabled: enabled && !!employeeId,
  })
}

export function useEmployeeLearningAssignments(employeeId: string | null, enabled = true) {
  return useQuery({
    queryKey: learningKeys.employeeAssignments(employeeId ?? ''),
    queryFn: () => fetchLearningReportAssignments({ employeeId: employeeId!, limit: 50 }),
    enabled: enabled && !!employeeId,
  })
}

export function useEmployeeLearningCertificates(employeeId: string | null, enabled = true) {
  return useQuery({
    queryKey: learningKeys.employeeCertificates(employeeId ?? ''),
    queryFn: () => fetchLearningCertificates({ employeeId: employeeId!, limit: 50 }),
    enabled: enabled && !!employeeId,
  })
}
