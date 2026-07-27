import type {
  LearningAssignmentListParams,
  LearningCategoryListParams,
  LearningCertificateListParams,
  LearningComplianceListParams,
  LearningCourseListParams,
  LearningExternalTrainingListParams,
  LearningListParams,
  LearningReportListParams,
} from '@/features/learning/types/learning.types'

export const learningKeys = {
  all: ['learning'] as const,
  dashboard: () => [...learningKeys.all, 'dashboard'] as const,
  settings: () => [...learningKeys.all, 'settings'] as const,
  categories: (params?: LearningCategoryListParams) =>
    [...learningKeys.all, 'categories', params ?? {}] as const,
  category: (id: string) => [...learningKeys.all, 'category', id] as const,
  courses: (params?: LearningCourseListParams) =>
    [...learningKeys.all, 'courses', params ?? {}] as const,
  course: (id: string) => [...learningKeys.all, 'course', id] as const,
  courseVersions: (courseId: string) => [...learningKeys.all, 'course-versions', courseId] as const,
  courseVersion: (courseId: string, versionId: string) =>
    [...learningKeys.all, 'course-version', courseId, versionId] as const,
  assignments: (params?: LearningAssignmentListParams) =>
    [...learningKeys.all, 'assignments', params ?? {}] as const,
  assignment: (id: string) => [...learningKeys.all, 'assignment', id] as const,
  complianceMatrix: (params?: LearningComplianceListParams) =>
    [...learningKeys.all, 'compliance-matrix', params ?? {}] as const,
  trainingEvents: (params?: LearningListParams) =>
    [...learningKeys.all, 'training-events', params ?? {}] as const,
  trainingEvent: (id: string) => [...learningKeys.all, 'training-event', id] as const,
  certificates: (params?: LearningCertificateListParams) =>
    [...learningKeys.all, 'certificates', params ?? {}] as const,
  certificate: (id: string) => [...learningKeys.all, 'certificate', id] as const,
  externalTraining: (params?: LearningExternalTrainingListParams) =>
    [...learningKeys.all, 'external-training', params ?? {}] as const,
  reportsAssignments: (params?: LearningReportListParams) =>
    [...learningKeys.all, 'reports-assignments', params ?? {}] as const,
  reportsCompletions: (params?: LearningReportListParams) =>
    [...learningKeys.all, 'reports-completions', params ?? {}] as const,
  reportsCompliance: (params?: LearningReportListParams) =>
    [...learningKeys.all, 'reports-compliance', params ?? {}] as const,
  employeeEligibility: (employeeId: string) =>
    [...learningKeys.all, 'employee-eligibility', employeeId] as const,
  employeeAssignments: (employeeId: string) =>
    [...learningKeys.all, 'employee-assignments', employeeId] as const,
  employeeCertificates: (employeeId: string) =>
    [...learningKeys.all, 'employee-certificates', employeeId] as const,
}
