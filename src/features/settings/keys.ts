import type { LookupResource } from '@/features/settings/types'

export const settingsKeys = {
  all: () => ['settings'] as const,

  general: () => [...settingsKeys.all(), 'general'] as const,

  companyProfile: () => [...settingsKeys.all(), 'company', 'profile'] as const,

  companyBranding: () => [...settingsKeys.all(), 'company', 'branding'] as const,

  lookups: (resource: LookupResource) => [...settingsKeys.all(), 'lookups', resource] as const,

  complianceTypes: (params?: { search?: string; page?: number }) =>
    [...settingsKeys.all(), 'compliance-types', params ?? {}] as const,

  complianceRequirements: (params?: { limit?: number }) =>
    [...settingsKeys.all(), 'compliance-requirements', params ?? {}] as const,

  serviceUserCareTypes: () => [...settingsKeys.all(), 'service-user-care-types'] as const,

  serviceUserFundingTypes: () =>
    [...settingsKeys.all(), 'service-user-funding-types'] as const,

  serviceUserEthnicities: () =>
    [...settingsKeys.all(), 'service-user-ethnicities'] as const,

  serviceUserLanguages: () => [...settingsKeys.all(), 'service-user-languages'] as const,

  bodyMapRecordTypes: () => [...settingsKeys.all(), 'body-map-record-types'] as const,

  allergyCatalog: () => [...settingsKeys.all(), 'allergy-catalog'] as const,

  vitalAcceptedRanges: () => [...settingsKeys.all(), 'vital-accepted-ranges'] as const,

  locationTree: () => [...settingsKeys.all(), 'location-management', 'tree'] as const,

  locationActiveUsers: () => [...settingsKeys.all(), 'location-management', 'active-users'] as const,

  serviceUserLocations: () => [...settingsKeys.all(), 'location-management', 'service-users'] as const,

  employeeLocations: () => [...settingsKeys.all(), 'location-management', 'employees'] as const,
} as const
