import type { OrganisationCriticalInformationSettings } from '@/features/settings/types'

export const DEFAULT_CRITICAL_INFORMATION_SETTINGS: OrganisationCriticalInformationSettings =
  {
    generateActions: true,
    memorableAnswerRequired: false,
    lockdownWebAccess: false,
    lockdownCareAppAccess: false,
  }

export const CRITICAL_INFORMATION_TOOLTIPS = {
  generateActions:
    'When enabled, the system automatically generates scheduled actions from care plans and configured templates.',
  memorableAnswerRequired:
    'When enabled, users must set and verify a memorable answer for additional account security.',
  lockdownWebAccess:
    'Restricts web admin access to IP addresses on your organisation whitelist.',
  lockdownCareAppAccess:
    'Restricts Care App mobile access to IP addresses on your organisation whitelist.',
} as const

export const IP_LOCKDOWN_DESCRIPTION =
  'System access will be restricted to whitelisted IP addresses. For remote access, we recommend setting up a VPN connection to your organisation network before enabling lockdown.';

export function criticalInformationSettingsToPayload(
  s: OrganisationCriticalInformationSettings,
) {
  return {
    criticalGenerateActions: s.generateActions,
    criticalMemorableAnswerRequired: s.memorableAnswerRequired,
    criticalLockdownWebAccess: s.lockdownWebAccess,
    criticalLockdownCareAppAccess: s.lockdownCareAppAccess,
  }
}
