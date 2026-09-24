export const medicalClinicalKeys = {
  all: () => ['medical-clinical'] as const,
  catalog: (search?: string) => [...medicalClinicalKeys.all(), 'catalog', search ?? ''] as const,
  conditions: (serviceUserId: string) =>
    [...medicalClinicalKeys.all(), 'conditions', serviceUserId] as const,
  carePlanRecommendations: (serviceUserId: string) =>
    [...medicalClinicalKeys.all(), 'care-plan-recommendations', serviceUserId] as const,
  adjustments: (serviceUserId: string) =>
    [...medicalClinicalKeys.all(), 'adjustments', serviceUserId] as const,
  history: (serviceUserId: string) =>
    [...medicalClinicalKeys.all(), 'history', serviceUserId] as const,
  monitoring: (serviceUserId: string) =>
    [...medicalClinicalKeys.all(), 'monitoring', serviceUserId] as const,
  usual: (serviceUserId: string) =>
    [...medicalClinicalKeys.all(), 'usual', serviceUserId] as const,
  medicalAlerts: (serviceUserId: string) =>
    [...medicalClinicalKeys.all(), 'medical-alerts', serviceUserId] as const,
  summary: (serviceUserId: string) =>
    [...medicalClinicalKeys.all(), 'summary', serviceUserId] as const,
}
