export const initialAssessmentKeys = {
  all: () => ['initial-assessment'] as const,
  templateDefault: () => [...initialAssessmentKeys.all(), 'template-default'] as const,
  template: (templateId: string) =>
    [...initialAssessmentKeys.all(), 'template', templateId] as const,
  submissions: (serviceUserId: string) =>
    [...initialAssessmentKeys.all(), 'submissions', serviceUserId] as const,
  submission: (serviceUserId: string, submissionId: string) =>
    [...initialAssessmentKeys.submissions(serviceUserId), submissionId] as const,
  answers: (serviceUserId: string, submissionId: string) =>
    [...initialAssessmentKeys.submission(serviceUserId, submissionId), 'answers'] as const,
  riskSummary: (serviceUserId: string, submissionId: string) =>
    [...initialAssessmentKeys.submission(serviceUserId, submissionId), 'risk-summary'] as const,
  carePlanTriggers: (serviceUserId: string, submissionId: string) =>
    [...initialAssessmentKeys.submission(serviceUserId, submissionId), 'care-plan-triggers'] as const,
  validate: (serviceUserId: string, submissionId: string) =>
    [...initialAssessmentKeys.submission(serviceUserId, submissionId), 'validate'] as const,
  actions: (serviceUserId: string, submissionId: string) =>
    [...initialAssessmentKeys.submission(serviceUserId, submissionId), 'actions'] as const,
  attachments: (serviceUserId: string, submissionId: string) =>
    [...initialAssessmentKeys.submission(serviceUserId, submissionId), 'attachments'] as const,
  riskRecords: (serviceUserId: string, submissionId: string) =>
    [...initialAssessmentKeys.submission(serviceUserId, submissionId), 'risk-records'] as const,
  summary: (serviceUserId: string, submissionId: string) =>
    [...initialAssessmentKeys.submission(serviceUserId, submissionId), 'summary'] as const,
  clinical: (serviceUserId: string, submissionId: string) =>
    [...initialAssessmentKeys.submission(serviceUserId, submissionId), 'clinical'] as const,
  agencySettings: () => [...initialAssessmentKeys.all(), 'agency-settings'] as const,
  reviewQueue: (overdueActionsOnly?: boolean) =>
    [...initialAssessmentKeys.all(), 'review-queue', overdueActionsOnly ?? false] as const,
}
