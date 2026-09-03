import { SERVICE_USER_ROW_ACTION_LINKS } from '@/features/service-users/components/ServiceUserRowActionStrip'
import { SERVICE_USER_EDIT_ROUTE, SERVICE_USER_PROFILE_ROUTE } from '@/features/service-users/service-user-profile-tabs'

describe('Service User Management row actions', () => {
  it('keeps existing destinations on the legacy Edit route or workspace modules', () => {
    expect(SERVICE_USER_ROW_ACTION_LINKS.overview.to).toBe('/service-users/$serviceUserId/view')
    expect(SERVICE_USER_ROW_ACTION_LINKS.carePlan.to).toBe('/service-users/$serviceUserId/care-plan')
    expect(SERVICE_USER_ROW_ACTION_LINKS.details).toEqual({
      to: SERVICE_USER_EDIT_ROUTE,
      search: { tab: 'personal' },
    })
    expect(SERVICE_USER_ROW_ACTION_LINKS.serviceManagement).toEqual({
      to: SERVICE_USER_EDIT_ROUTE,
      search: { tab: 'dom' },
    })
    expect(SERVICE_USER_ROW_ACTION_LINKS.calendar).toEqual({
      to: SERVICE_USER_EDIT_ROUTE,
      search: { tab: 'calendar' },
    })
    expect(SERVICE_USER_ROW_ACTION_LINKS.medication.to).toBe('/service-users/$serviceUserId/medication')
    expect(SERVICE_USER_ROW_ACTION_LINKS.absence).toEqual({
      to: SERVICE_USER_EDIT_ROUTE,
      search: { tab: 'absences' },
    })
  })

  it('does not send row actions to the new Profile route', () => {
    const dests = Object.values(SERVICE_USER_ROW_ACTION_LINKS).map(link => link.to)
    expect(dests).not.toContain(SERVICE_USER_PROFILE_ROUTE)
  })
})
