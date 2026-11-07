import {
  isServiceUserModuleTabActive,
  SERVICE_USER_MODULE_TABS,
} from '@/features/service-users/components/ServiceUserModuleTabs'
import { SERVICE_USER_EDIT_ROUTE } from '@/features/service-users/service-user-profile-tabs'

const su = '11111111-1111-1111-1111-111111111111'

describe('ServiceUserModuleTabs active state', () => {
  it('places Profile first, then Overview, Initial Assessment and Invoices', () => {
    expect(SERVICE_USER_MODULE_TABS.slice(0, 4).map(t => t.id)).toEqual(['profile', 'overview', 'initial-assessment', 'invoices'])
    expect(SERVICE_USER_MODULE_TABS[0]?.to).toBe('/service-users/$serviceUserId/profile')
    expect(SERVICE_USER_MODULE_TABS[2]?.to).toBe('/service-users/$serviceUserId/initial-assessment')
    expect(SERVICE_USER_MODULE_TABS[3]?.to).toBe('/service-users/$serviceUserId/invoices')
  })

  it('marks Profile active on the profile route only', () => {
    const profile = SERVICE_USER_MODULE_TABS.find(t => t.id === 'profile')!
    const overview = SERVICE_USER_MODULE_TABS.find(t => t.id === 'overview')!
    const invoices = SERVICE_USER_MODULE_TABS.find(t => t.id === 'invoices')!
    const carePlan = SERVICE_USER_MODULE_TABS.find(t => t.id === 'care-plan')!

    expect(isServiceUserModuleTabActive(profile, `/service-users/${su}/profile`)).toBe(true)
    expect(isServiceUserModuleTabActive(profile, `/service-users/${su}/view`)).toBe(false)
    expect(isServiceUserModuleTabActive(profile, `/service-users/${su}`)).toBe(false)
    expect(isServiceUserModuleTabActive(overview, `/service-users/${su}/profile`)).toBe(false)
    expect(isServiceUserModuleTabActive(overview, `/service-users/${su}/view`)).toBe(true)
    expect(isServiceUserModuleTabActive(invoices, `/service-users/${su}/invoices`)).toBe(true)
    expect(isServiceUserModuleTabActive(invoices, `/service-users/${su}/view`)).toBe(false)
    expect(isServiceUserModuleTabActive(carePlan, `/service-users/${su}/care-plan`)).toBe(true)

    const comms = SERVICE_USER_MODULE_TABS.find(t => t.id === 'comms')!
    expect(comms.to).toBe('/service-users/$serviceUserId/comms')
    expect(isServiceUserModuleTabActive(comms, `/service-users/${su}/comms`)).toBe(true)
    expect(isServiceUserModuleTabActive(comms, `/service-users/${su}/view`)).toBe(false)
  })

  it('does not treat the legacy Edit route as Profile', () => {
    const profile = SERVICE_USER_MODULE_TABS.find(t => t.id === 'profile')!
    expect(SERVICE_USER_EDIT_ROUTE).toBe('/service-users/$serviceUserId')
    expect(isServiceUserModuleTabActive(profile, `/service-users/${su}`)).toBe(false)
  })
})
