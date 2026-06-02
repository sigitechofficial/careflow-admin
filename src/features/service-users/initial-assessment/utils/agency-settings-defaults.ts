import type { InitialAssessmentAgencySettings } from '@/features/service-users/initial-assessment/types'

export const DEFAULT_INITIAL_ASSESSMENT_AGENCY_SETTINGS: InitialAssessmentAgencySettings = {
  blockWithoutEmergencyContact: true,
  blockWithoutNoResponseProcedure: true,
  managerReviewWaterlowThreshold: 15,
  notifyManagersOnHighRiskSubmit: true,
  requireAssessorSignOff: true,
  requireNextReviewDate: true,
}
