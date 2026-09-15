import type { OrganisationAppSettings } from '@/features/settings/types'

export const DEFAULT_APP_SETTINGS: OrganisationAppSettings = {
  pinCodeRequired: false,
  viewPoliciesCareApp: true,
  viewPoliciesRosterApp: true,
  bookHolidaysCareApp: true,
  fingerprintLoginCareApp: true,
  singleDeviceLoginCareApp: false,
}

export const DEVICE_PIN_DESCRIPTION =
  'It is strongly advised that you set up your devices to lock after inactivity requiring a 5 digit PIN code to unlock it. You can either:'

export const DEVICE_PIN_BULLETS = [
  'Set a pin code to be used across all devices, or',
  'Carers use their personal pin to unlock (recommended)',
] as const

export const DEVICE_PIN_SECURITY_NOTE =
  'This is a critical requirement to maintain the security and privacy of your data'

export const APP_SETTINGS_TOOLTIPS = {
  pinCodeRequired:
    'When enabled, mobile devices must be unlocked with a PIN after a period of inactivity.',
  viewPoliciesCareApp: 'Allow carers to view policies in the Care app.',
  viewPoliciesRosterApp: 'Allow staff to view policies in the Roster app.',
  bookHolidaysCareApp: 'Allow carers to book holidays from the Care app.',
  fingerprintLoginCareApp: 'Allow fingerprint or biometric login on the Care app.',
  singleDeviceLoginCareApp:
    'Yes allows the same carer to sign in on more than one phone. No limits the account to one signed-in session — a second login is blocked until they sign out, the office signs out the session, or the session goes stale.',
} as const

export function appSettingsToPayload(s: OrganisationAppSettings) {
  return {
    appSettingPinCodeRequired: s.pinCodeRequired,
    appSettingViewPoliciesCareApp: s.viewPoliciesCareApp,
    appSettingViewPoliciesRosterApp: s.viewPoliciesRosterApp,
    appSettingBookHolidaysCareApp: s.bookHolidaysCareApp,
    appSettingFingerprintLoginCareApp: s.fingerprintLoginCareApp,
    appSettingSingleDeviceLoginCareApp: s.singleDeviceLoginCareApp,
  }
}
