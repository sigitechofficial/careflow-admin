import type { OrganisationOptionalSettings } from '@/features/settings/types'

export const MEDICATION_AMEND_ROLE_OPTIONS = [
  { value: 'area_supervisor', label: 'Area Supervisor' },
  { value: 'allocator_coordinator', label: 'Allocator Coordinator' },
  { value: 'care_manager', label: 'Care Manager' },
] as const

export const DEFAULT_OPTIONAL_SETTINGS: OrganisationOptionalSettings = {
  emarIntegration: false,
  medicationListRequired: true,
  medicationAmendRoles: ['area_supervisor', 'allocator_coordinator', 'care_manager'],
  mhaDetentionRequired: false,
  restraintRecordingRequired: false,
  carePlanReadRequired: true,
  carePlanReadCycleMonths: 1,
  formBuilderRequired: true,
  removeCreateNewCarePlan: true,
  aboutMeFields: [
    { key: 'interests', label: 'Interests', enabled: true },
    { key: 'life_history', label: 'My Life History', enabled: true },
    { key: 'daily_routine', label: 'My Daily Routine', enabled: true },
    { key: 'support_needed', label: 'Support I Need', enabled: true },
    { key: 'favourite_things', label: 'My Favourite Things', enabled: true },
    { key: 'identification', label: 'Identification Characteristics', enabled: true },
  ],
  serviceManagementRequired: true,
  learningDevSessionsRequired: true,
  familyPortalEnabled: true,
  familySharingAuthRequired: false,
  familyShareAllActions: true,
  familyShareCarePlans: true,
  familyShareVisitInfo: {
    recordedNotes: true,
    checklists: true,
    photographs: true,
    medications: true,
  },
  allowInspectorLogin: true,
}

export const OPTIONAL_TOOLTIPS = {
  emarIntegration: 'Connect medication records to an external electronic medication administration (eMAR) system.',
  medicationListRequired: 'When enabled, a medication list must be maintained for each service user.',
  medicationAmendRoles: 'Select which roles are allowed to amend medication records.',
  restraintRecording:
    'Select Yes if the advanced physical interventions based on RRN standards recording is required. NOTE: this will require your carers to be fully trained on physical interventions and how to record them.',
  carePlanReadRequired:
    'If this is set, then all employees with appropriate roles will be prompted to read care plans every number of months set.',
  carePlanReadCycle: 'How often (in months) employees are prompted to re-read care plans.',
  familyPortalEnabled:
    'This will enable the sharing of resident information with the residents family. This must only be switched on if authorised by the support team.',
  familySharingAuth:
    'If switched on then authorisation on sharing is required.',
  familyShareAllActions:
    'When enabled, completed actions can be shared without pressing an additional share button each time.',
  familyShareCarePlans:
    'If you would like to share care plans — you will need to speak to your account manager as this is a premium service.',
  familyShareVisitInfo:
    'Choose which types of information from completed actions and visits are shared with the family portal.',
} as const

export function optionalSettingsToPayload(s: OrganisationOptionalSettings) {
  return {
    optionalEmarIntegration: s.emarIntegration,
    optionalMedicationListRequired: s.medicationListRequired,
    optionalMedicationAmendRoles: s.medicationAmendRoles,
    optionalMhaDetentionRequired: s.mhaDetentionRequired,
    optionalRestraintRecordingRequired: s.restraintRecordingRequired,
    optionalCarePlanReadRequired: s.carePlanReadRequired,
    optionalCarePlanReadCycleMonths: s.carePlanReadCycleMonths,
    optionalFormBuilderRequired: s.formBuilderRequired,
    optionalRemoveCreateNewCarePlan: s.removeCreateNewCarePlan,
    optionalAboutMeFields: s.aboutMeFields,
    optionalServiceManagementRequired: s.serviceManagementRequired,
    optionalLearningDevSessionsRequired: s.learningDevSessionsRequired,
    optionalFamilyPortalEnabled: s.familyPortalEnabled,
    optionalFamilySharingAuthRequired: s.familySharingAuthRequired,
    optionalFamilyShareAllActions: s.familyShareAllActions,
    optionalFamilyShareCarePlans: s.familyShareCarePlans,
    optionalFamilyShareVisitInfo: s.familyShareVisitInfo,
    optionalAllowInspectorLogin: s.allowInspectorLogin,
  }
}
