import {
  isServiceUserProfileTabId,
  resolveServiceUserProfileTab,
  SERVICE_USER_MANAGEMENT_NAME_TO,
  SERVICE_USER_PROFILE_ROUTE,
  SERVICE_USER_PROFILE_TAB_IDS,
  SERVICE_USER_PROFILE_TABS,
} from '@/features/service-users/service-user-profile-tabs'

describe('service-user-profile-tabs', () => {
  it('lists every Edit Service User section in the original order', () => {
    expect(SERVICE_USER_PROFILE_TAB_IDS).toEqual([
      'personal',
      'contacts',
      'about',
      'photos',
      'inventory',
      'allergies',
      'absences',
      'calendar',
      'privacy',
      'dom',
      'nfc',
      'assessment',
      'funding',
      'charge-card',
      'visits',
      'livein',
    ])
    expect(SERVICE_USER_PROFILE_TABS.map(t => t.id)).toEqual([...SERVICE_USER_PROFILE_TAB_IDS])
  })

  it('resolves Profile search tab, defaulting to personal', () => {
    expect(resolveServiceUserProfileTab(undefined)).toBe('personal')
    expect(resolveServiceUserProfileTab('contacts')).toBe('contacts')
    expect(resolveServiceUserProfileTab('dom')).toBe('dom')
    expect(resolveServiceUserProfileTab('not-a-tab')).toBe('personal')
    expect(isServiceUserProfileTabId('allergies')).toBe(true)
    expect(isServiceUserProfileTabId('assessment')).toBe(true)
    expect(isServiceUserProfileTabId('unknown')).toBe(false)
  })

  it('sends Service User Management name clicks to the Profile workspace route', () => {
    expect(SERVICE_USER_MANAGEMENT_NAME_TO).toBe('/service-users/$serviceUserId/profile')
    expect(SERVICE_USER_PROFILE_ROUTE).toBe('/service-users/$serviceUserId/profile')
  })
})
