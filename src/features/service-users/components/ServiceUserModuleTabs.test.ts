import {
  isServiceUserModuleTabActive,
  SERVICE_USER_MODULE_TABS,
} from '@/features/service-users/components/ServiceUserModuleTabs'
import { SERVICE_USER_EDIT_ROUTE } from '@/features/service-users/service-user-profile-tabs'

const su = '11111111-1111-1111-1111-111111111111'

describe('ServiceUserModuleTabs active state', () => {
  it('places Profile first, before Overview', () => {
    expect(SERVICE_USER_MODULE_TABS[0]?.id).toBe('profile')
    expect(SERVICE_USER_MODULE_TABS[1]?.id).toBe('overview')
    expect(SERVICE_USER_MODULE_TABS[0]?.to).toBe('/service-users/$serviceUserId/profile')
  })

  it('marks Profile active on the profile route only', () => {
    const profile = SERVICE_USER_MODULE_TABS.find(t => t.id === 'profile')!
    const overview = SERVICE_USER_MODULE_TABS.find(t => t.id === 'overview')!
    const carePlan = SERVICE_USER_MODULE_TABS.find(t => t.id === 'care-plan')!

    expect(isServiceUserModuleTabActive(profile, `/service-users/${su}/profile`)).toBe(true)
    expect(isServiceUserModuleTabActive(profile, `/service-users/${su}/view`)).toBe(false)
    expect(isServiceUserModuleTabActive(profile, `/service-users/${su}`)).toBe(false)
    expect(isServiceUserModuleTabActive(overview, `/service-users/${su}/profile`)).toBe(false)
    expect(isServiceUserModuleTabActive(overview, `/service-users/${su}/view`)).toBe(true)
    expect(isServiceUserModuleTabActive(carePlan, `/service-users/${su}/care-plan`)).toBe(true)
  })

  it('does not treat the legacy Edit route as Profile', () => {
    const profile = SERVICE_USER_MODULE_TABS.find(t => t.id === 'profile')!
    expect(SERVICE_USER_EDIT_ROUTE).toBe('/service-users/$serviceUserId')
    expect(isServiceUserModuleTabActive(profile, `/service-users/${su}`)).toBe(false)
  })
})
