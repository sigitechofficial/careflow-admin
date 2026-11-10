export const serviceUserAssessmentKeys = {
  all: () => ['service-user-assessments'] as const,
  lists: () => [...serviceUserAssessmentKeys.all(), 'lists'] as const,
  list: (serviceUserId: string) => [...serviceUserAssessmentKeys.lists(), serviceUserId] as const,
  completions: (serviceUserId: string, assessmentKey: string) =>
    [...serviceUserAssessmentKeys.list(serviceUserId), 'completions', assessmentKey] as const,
  completion: (serviceUserId: string, completionId: string) =>
    [...serviceUserAssessmentKeys.list(serviceUserId), 'completion', completionId] as const,
  catalogue: (serviceUserId: string) =>
    [...serviceUserAssessmentKeys.list(serviceUserId), 'catalogue'] as const,
  carePlanLinks: (serviceUserId: string, carePlanFormId: string) =>
    [...serviceUserAssessmentKeys.list(serviceUserId), 'care-plan-links', carePlanFormId] as const,
  reviewSchedules: () => [...serviceUserAssessmentKeys.all(), 'review-schedules'] as const,
  reviewQueue: (overdueOnly?: boolean, serviceUserId?: string, locationId?: string) =>
    [
      ...serviceUserAssessmentKeys.all(),
      'review-queue',
      overdueOnly ?? false,
      serviceUserId ?? '',
      locationId ?? '',
    ] as const,
}
