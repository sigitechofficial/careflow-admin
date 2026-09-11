import { render, screen } from '@testing-library/react'
import { ServiceUserProfileSectionContent } from '@/features/service-users/components/ServiceUserProfileSectionContent'
import type { ServiceUserDetail, ServiceUserLookupsBundle } from '@/features/service-users/types'
import type { ServiceUserProfileTabId } from '@/features/service-users/service-user-profile-tabs'

vi.mock('@/features/service-users/components/ServiceUserPersonalDetailsForm', () => ({
  ServiceUserPersonalDetailsForm: () => <div>personal-form</div>,
}))
vi.mock('@/features/service-users/components/ServiceUserPortalAccessSection', () => ({
  ServiceUserPortalAccessSection: () => <div>portal-access</div>,
}))
vi.mock('@/features/service-users/components/ServiceUserContactsTab', () => ({
  ServiceUserContactsTab: () => <div>contacts-form</div>,
}))
vi.mock('@/features/service-users/components/ServiceUserAboutMeForm', () => ({
  ServiceUserAboutMeForm: () => <div>about-form</div>,
}))
vi.mock('@/features/service-users/components/ServiceUserPhotosTab', () => ({
  ServiceUserPhotosTab: () => <div>photos-form</div>,
}))
vi.mock('@/features/service-users/components/ServiceUserAllergiesTab', () => ({
  ServiceUserAllergiesTab: () => <div>allergies-form</div>,
}))
vi.mock('@/features/service-users/components/ServiceUserInventoryTab', () => ({
  ServiceUserInventoryTab: () => <div>inventory-form</div>,
}))
vi.mock('@/features/service-users/components/ServiceUserAbsencesTab', () => ({
  ServiceUserAbsencesTab: () => <div>absences-form</div>,
}))
vi.mock('@/features/service-users/calendar/components/ServiceUserCalendarTab', () => ({
  ServiceUserCalendarTab: () => <div>calendar-form</div>,
}))
vi.mock('@/features/service-users/components/ServiceUserDomCareTab', () => ({
  ServiceUserDomCareTab: () => <div>dom-form</div>,
}))
vi.mock('@/features/service-users/initial-assessment/components/ServiceUserInitialAssessmentEnterpriseTab', () => ({
  ServiceUserInitialAssessmentEnterpriseTab: () => <div>assessment-form</div>,
}))
vi.mock('@/features/service-users/components/ServiceUserFundingTab', () => ({
  ServiceUserFundingTab: () => <div>funding-form</div>,
}))
vi.mock('@/features/service-users/components/ServiceUserEditChargeCardPanel', () => ({
  ServiceUserEditChargeCardPanel: () => <div>charge-card-form</div>,
}))
vi.mock('@/features/service-users/components/ServiceUserEditVisitsPanel', () => ({
  ServiceUserEditVisitsPanel: () => <div>visits-form</div>,
}))
vi.mock('@/features/service-users/components/ServiceUserLiveInProfileTab', () => ({
  ServiceUserLiveInProfileTab: () => <div>livein-form</div>,
}))

const lookups: ServiceUserLookupsBundle = {
  statuses: [],
  titles: [],
  genders: [],
  maritalStatuses: [],
  careTypes: [],
  fundingTypes: [],
  ethnicities: [],
  languages: [],
  riskLevels: [],
  relationshipTypes: [],
  allergies: [],
  absenceReasons: [],
  visitPlanPauseReasons: [],
}

const detail = {
  id: 'su-1',
  firstName: 'Ada',
  lastName: 'Khan',
  email: 'ada@example.com',
  contacts: [],
  references: [],
} as unknown as ServiceUserDetail

function renderTab(tab: ServiceUserProfileTabId) {
  return render(
    <ServiceUserProfileSectionContent
      tab={tab}
      serviceUserId="su-1"
      detail={detail}
      lookups={lookups}
      locations={[]}
      onSaved={() => undefined}
    />,
  )
}

describe('ServiceUserProfileSectionContent', () => {
  it.each([
    ['personal', 'personal-form'],
    ['contacts', 'contacts-form'],
    ['about', 'about-form'],
    ['photos', 'photos-form'],
    ['inventory', 'inventory-form'],
    ['allergies', 'allergies-form'],
    ['absences', 'absences-form'],
    ['calendar', 'calendar-form'],
    ['privacy', 'Privacy'],
    ['dom', 'dom-form'],
    ['assessment', 'assessment-form'],
    ['funding', 'funding-form'],
    ['charge-card', 'charge-card-form'],
    ['visits', 'visits-form'],
    ['livein', 'livein-form'],
  ] as const)('renders the %s section from existing components', (tab, label) => {
    renderTab(tab)
    expect(screen.getByTestId(`service-user-profile-section-${tab}`)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(label))).toBeInTheDocument()
  })

  it('includes portal access on Personal Details', () => {
    renderTab('personal')
    expect(screen.getByText('portal-access')).toBeInTheDocument()
  })
})
