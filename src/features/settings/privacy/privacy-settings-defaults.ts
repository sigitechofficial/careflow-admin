import type { OrganisationPrivacySettings } from '@/features/settings/types'

export const PRIVACY_SENSITIVE_VIEWER_ROLE_OPTIONS = [
  { value: 'carer_domestic', label: 'Carer/Domestic' },
  { value: 'senior_carer_nurse', label: 'Senior Carer/Nurse' },
  { value: 'staff_allocation', label: 'Staff Allocation' },
] as const

export const DEFAULT_PRIVACY_SETTINGS: OrganisationPrivacySettings = {
  nonActiveServiceUserDays: 60,
  notifyInternalMessage: true,
  notifyEmail: false,
  sensitiveViewerRoles: ['carer_domestic'],
}

export const PRIVACY_TOOLTIPS = {
  nonActiveServiceUserDays:
    'Number of days after which inactive service users remain accessible before access is restricted.',
  notifyInternalMessage:
    'Send privacy officer notifications as internal system messages within Care Admin.',
  notifyEmail: 'Send privacy officer notifications by email.',
  sensitiveViewerRoles:
    'Select which roles can view information flagged as sensitive on service user records.',
} as const

export function privacySettingsToPayload(s: OrganisationPrivacySettings) {
  return {
    privacyNonActiveServiceUserDays: clampDays(s.nonActiveServiceUserDays),
    privacyNotifyInternalMessage: s.notifyInternalMessage,
    privacyNotifyEmail: s.notifyEmail,
    privacySensitiveViewerRoles: s.sensitiveViewerRoles,
  }
}

export function clampDays(days: number): number {
  return Math.min(3650, Math.max(1, Math.round(days) || 60))
}
