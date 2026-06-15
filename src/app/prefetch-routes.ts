import type { QueryClient } from '@tanstack/react-query'
import { backendMe, backendMyLoginHistory } from '@/features/auth/api'
import { useAuthStore } from '@/features/auth/store'
import { carePathwayKeys } from '@/features/care-pathway/keys'
import { getCareForm } from '@/features/care-pathway/api/form-builder.api'
import {
  fetchFormSelections,
  listSelectableForms,
} from '@/features/care-pathway/api/form-selection.api'
import {
  fetchEmployee,
  fetchEmployeeChartSummary,
  fetchEmployeeDocumentsRegistry,
  fetchEmployeeLookups,
  fetchEmployeeSkillsOverview,
  fetchNonCoreActivitiesRegistry,
  listAllEmployees,
  listEmployees,
} from '@/features/employees/api'
import {
  fetchTemporaryInspectorServiceUserOptions,
  fetchTemporaryInspectors,
} from '@/features/employees/api/temporary-inspectors-api'
import { employeeKeys } from '@/features/employees/keys'
import {
  getEmployeesDayTimeline,
  getHousekeepingJobsNotStarted,
  getJobsDayRuns,
  getJobsDayTimeline,
  getScheduleReportTypes,
  getScheduleStatus,
  listScheduleAreas,
} from '@/features/scheduling/api/scheduling.api'
import { schedulingKeys } from '@/features/scheduling/keys'
import { todayIso } from '@/features/scheduling/utils/scheduling-format'
import {
  fetchComplianceTypesList,
  fetchLookupList,
  fetchServiceUserCareTypesList,
  fetchServiceUserFundingTypesList,
  type LookupResource,
} from '@/features/settings/api/lookups-admin-api'
import {
  fetchEmployeeLocations,
  fetchLocationActiveUsers,
  fetchLocationManagementTree,
  fetchServiceUserLocations,
} from '@/features/settings/api/location-management.api'
import type { LocationManagementSubTab } from '@/features/settings/location-management/location-management.types'
import {
  listMedicationRoundsAdmin,
  listMedicationStatusCodesAdmin,
} from '@/features/settings/api/medication-settings.api'
import { medicationStatusCodesAdminKey } from '@/features/settings/hooks/useMedicationStatusCodesAdmin'
import { medicationRoundsAdminKey } from '@/features/settings/hooks/useMedicationRoundsAdmin'
import type { SettingsTabId } from '@/features/settings/pages/SettingsPage'
import { settingsKeys } from '@/features/settings/keys'
import {
  fetchServiceUser,
  fetchServiceUserDomCare,
  fetchServiceUserDocuments,
  fetchServiceUserInitialAssessment,
  fetchServiceUserLookups,
  listServiceUserAllergies,
  listServiceUserMedications,
  listServiceUsers,
} from '@/features/service-users/api'
import { getCalendarEventTypes } from '@/features/service-users/api/service-user-calendar.api'
import {
  fetchObservationShareTargets,
  fetchObservationTypes,
  fetchWellbeingScale,
} from '@/features/service-users/api/observations-api'
import { serviceUserKeys } from '@/features/service-users/keys'
import {
  fetchDefaultInitialAssessmentTemplate,
  listInitialAssessmentSubmissions,
} from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import {
  fetchBodyMapSummary,
  fetchServiceUserBodyMap,
} from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'

export const ROUTE_STALE_MS = 30_000
const LOOKUP_STALE_MS = 10 * 60 * 1000

const observationLookupKeys = {
  types: () => ['observation-lookups', 'types'] as const,
  shareTargets: () => ['observation-lookups', 'share-targets'] as const,
  wellbeingScale: () => ['observation-lookups', 'wellbeing-scale'] as const,
}

const SETTINGS_TAB_LOOKUP: Partial<Record<SettingsTabId, LookupResource>> = {
  'job-titles': 'job-titles',
  skills: 'skill-types',
  'work-areas': 'work-areas',
  'contract-types': 'contract-types',
  grades: 'grades',
  locations: 'locations',
  certifications: 'certification-types',
  'non-core': 'non-core-activity-reasons',
  'leaving-reasons': 'leaving-reasons',
  'review-types': 'review-types',
  'travel-payment': 'travel-payment-types',
}

export type EmployeeRouteTabId =
  | 'staff-list'
  | 'compliance'
  | 'review-status'
  | 'skills'
  | 'non-core-activity'
  | 'reports'

export function prefetchLocationManagement(
  qc: QueryClient,
  sub: LocationManagementSubTab = 'zones',
) {
  if (sub === 'service-users') {
    void qc.prefetchQuery({
      queryKey: settingsKeys.serviceUserLocations(),
      queryFn: fetchServiceUserLocations,
      staleTime: ROUTE_STALE_MS,
    })
    return
  }
  if (sub === 'employees') {
    void qc.prefetchQuery({
      queryKey: settingsKeys.employeeLocations(),
      queryFn: fetchEmployeeLocations,
      staleTime: ROUTE_STALE_MS,
    })
    return
  }
  void qc.prefetchQuery({
    queryKey: settingsKeys.locationTree(),
    queryFn: fetchLocationManagementTree,
    staleTime: ROUTE_STALE_MS,
  })
  void qc.prefetchQuery({
    queryKey: settingsKeys.locationActiveUsers(),
    queryFn: fetchLocationActiveUsers,
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchServiceUserCalendar(qc: QueryClient) {
  void qc.prefetchQuery({
    queryKey: ['calendar-event-types'],
    queryFn: getCalendarEventTypes,
    staleTime: 60_000,
  })
  void qc.prefetchQuery({
    queryKey: ['service-users', 'calendar-picker'],
    queryFn: async () => {
      const { rows } = await listServiceUsers({
        limit: 100,
        sortBy: 'lastName',
        sortOrder: 'asc',
      })
      return rows.map(r => ({
        id: r.id,
        label:
          `${r.preferredName?.trim() || [r.firstName, r.lastName].filter(Boolean).join(' ')}${r.serviceUserNumber ? ` (${r.serviceUserNumber})` : ''}`.trim() ||
          r.id,
      }))
    },
    staleTime: 60_000,
  })
}

export function prefetchInitialAssessmentEnterprise(
  qc: QueryClient,
  serviceUserId?: string,
) {
  void qc.prefetchQuery({
    queryKey: initialAssessmentKeys.templateDefault(),
    queryFn: ({ signal }) => fetchDefaultInitialAssessmentTemplate({ signal }),
    staleTime: ROUTE_STALE_MS,
  })
  void qc.prefetchQuery({
    queryKey: serviceUserKeys.list({ limit: 100, sortBy: 'lastName', sortOrder: 'asc' }),
    queryFn: () =>
      listServiceUsers({ limit: 100, sortBy: 'lastName', sortOrder: 'asc' }),
    staleTime: ROUTE_STALE_MS,
  })
  if (serviceUserId) {
    void qc.prefetchQuery({
      queryKey: initialAssessmentKeys.submissions(serviceUserId),
      queryFn: ({ signal }) => listInitialAssessmentSubmissions(serviceUserId, { signal }),
      staleTime: ROUTE_STALE_MS,
    })
    prefetchServiceUserProfile(qc, serviceUserId)
    void qc.prefetchQuery({
      queryKey: serviceUserKeys.domCare(serviceUserId),
      queryFn: () => fetchServiceUserDomCare(serviceUserId),
      staleTime: ROUTE_STALE_MS,
    })
  }
}

export function prefetchInitialAssessmentChecklist(
  qc: QueryClient,
  serviceUserId?: string,
) {
  void qc.prefetchQuery({
    queryKey: serviceUserKeys.list({ limit: 100, sortBy: 'lastName', sortOrder: 'asc' }),
    queryFn: () =>
      listServiceUsers({ limit: 100, sortBy: 'lastName', sortOrder: 'asc' }),
    staleTime: ROUTE_STALE_MS,
  })
  if (serviceUserId) {
    void qc.prefetchQuery({
      queryKey: serviceUserKeys.initialAssessment(serviceUserId),
      queryFn: () => fetchServiceUserInitialAssessment(serviceUserId),
      staleTime: ROUTE_STALE_MS,
    })
  }
}

export function prefetchServiceUserProfile(qc: QueryClient, serviceUserId: string) {
  void qc.prefetchQuery({
    queryKey: serviceUserKeys.profile(serviceUserId),
    queryFn: () => fetchServiceUser(serviceUserId),
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchServiceUserMedicationRoute(qc: QueryClient, serviceUserId: string) {
  prefetchServiceUserProfile(qc, serviceUserId)
  void qc.prefetchQuery({
    queryKey: serviceUserKeys.medications(serviceUserId),
    queryFn: () => listServiceUserMedications(serviceUserId),
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchServiceUserCarePlanRoute(qc: QueryClient, serviceUserId: string) {
  prefetchServiceUserProfile(qc, serviceUserId)
  void qc.prefetchQuery({
    queryKey: carePathwayKeys.formSelections(),
    queryFn: fetchFormSelections,
    staleTime: ROUTE_STALE_MS,
  })
  void qc.prefetchQuery({
    queryKey: carePathwayKeys.selectableForms('care-plans'),
    queryFn: () => listSelectableForms('care-plans'),
    staleTime: ROUTE_STALE_MS,
  })
  void qc.prefetchQuery({
    queryKey: serviceUserKeys.documents(serviceUserId),
    queryFn: ({ signal }) => fetchServiceUserDocuments(serviceUserId, { signal }),
    staleTime: ROUTE_STALE_MS,
  })
  void qc.prefetchQuery({
    queryKey: serviceUserKeys.allergies(serviceUserId),
    queryFn: ({ signal }) => listServiceUserAllergies(serviceUserId, { signal }),
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchServiceUserCarePlanFormRoute(
  qc: QueryClient,
  serviceUserId: string,
  formId: string,
) {
  prefetchServiceUserProfile(qc, serviceUserId)
  void qc.prefetchQuery({
    queryKey: carePathwayKeys.formDetail(formId),
    queryFn: () => getCareForm(formId),
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchServiceUserVisitPlanRoute(qc: QueryClient, serviceUserId: string) {
  prefetchServiceUserProfile(qc, serviceUserId)
  void import('@/features/service-users/visit-plan/api').then(({ fetchServiceUserVisitPlans, fetchActiveServiceUserVisitPlan }) => {
    void qc.prefetchQuery({
      queryKey: serviceUserKeys.visitPlans(serviceUserId),
      queryFn: () => fetchServiceUserVisitPlans(serviceUserId),
      staleTime: ROUTE_STALE_MS,
    })
    void qc.prefetchQuery({
      queryKey: serviceUserKeys.visitPlanActive(serviceUserId),
      queryFn: () => fetchActiveServiceUserVisitPlan(serviceUserId),
      staleTime: ROUTE_STALE_MS,
    })
  })
}

export function prefetchServiceUserObservationsRoute(qc: QueryClient, serviceUserId: string) {
  prefetchServiceUserProfile(qc, serviceUserId)
  void qc.prefetchQuery({
    queryKey: observationLookupKeys.types(),
    queryFn: fetchObservationTypes,
    staleTime: LOOKUP_STALE_MS,
  })
  void qc.prefetchQuery({
    queryKey: observationLookupKeys.shareTargets(),
    queryFn: fetchObservationShareTargets,
    staleTime: LOOKUP_STALE_MS,
  })
  void qc.prefetchQuery({
    queryKey: observationLookupKeys.wellbeingScale(),
    queryFn: fetchWellbeingScale,
    staleTime: LOOKUP_STALE_MS,
  })
}

export function prefetchServiceUserBodyMapRoute(qc: QueryClient, serviceUserId: string) {
  prefetchServiceUserProfile(qc, serviceUserId)
  void qc.prefetchQuery({
    queryKey: bodyMapKeys.list(serviceUserId),
    queryFn: ({ signal }) => fetchServiceUserBodyMap(serviceUserId, { signal }),
    staleTime: ROUTE_STALE_MS,
  })
  void qc.prefetchQuery({
    queryKey: bodyMapKeys.summary(serviceUserId),
    queryFn: ({ signal }) => fetchBodyMapSummary(serviceUserId, signal),
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchTemporaryInspectors(qc: QueryClient) {
  void qc.prefetchQuery({
    queryKey: [...employeeKeys.all(), 'temporary-inspectors', 'list'] as const,
    queryFn: fetchTemporaryInspectors,
    staleTime: ROUTE_STALE_MS,
  })
  void qc.prefetchQuery({
    queryKey: [...employeeKeys.all(), 'temporary-inspectors', 'options'] as const,
    queryFn: fetchTemporaryInspectorServiceUserOptions,
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchAccount(qc: QueryClient) {
  const token = useAuthStore.getState().accessToken
  if (token) {
    void qc.prefetchQuery({
      queryKey: ['auth', 'me'] as const,
      queryFn: () => backendMe(token),
      staleTime: ROUTE_STALE_MS,
    })
  }
  void qc.prefetchQuery({
    queryKey: ['auth', 'login-history'] as const,
    queryFn: ({ signal }) => backendMyLoginHistory({ signal }),
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchSettingsTab(qc: QueryClient, tab: SettingsTabId = 'job-titles') {
  if (tab === 'compliance') {
    void qc.prefetchQuery({
      queryKey: settingsKeys.complianceTypes(),
      queryFn: () => fetchComplianceTypesList(),
      staleTime: ROUTE_STALE_MS,
    })
    return
  }
  if (tab === 'care-types') {
    void qc.prefetchQuery({
      queryKey: settingsKeys.serviceUserCareTypes(),
      queryFn: () => fetchServiceUserCareTypesList(),
      staleTime: ROUTE_STALE_MS,
    })
    return
  }
  if (tab === 'funding-types') {
    void qc.prefetchQuery({
      queryKey: settingsKeys.serviceUserFundingTypes(),
      queryFn: () => fetchServiceUserFundingTypesList(),
      staleTime: ROUTE_STALE_MS,
    })
    return
  }
  if (tab === 'medication') {
    void qc.prefetchQuery({
      queryKey: medicationStatusCodesAdminKey,
      queryFn: ({ signal }) => listMedicationStatusCodesAdmin({ signal }),
      staleTime: ROUTE_STALE_MS,
    })
    return
  }
  if (tab === 'time-slots') {
    void qc.prefetchQuery({
      queryKey: medicationRoundsAdminKey,
      queryFn: ({ signal }) => listMedicationRoundsAdmin({ signal }),
      staleTime: ROUTE_STALE_MS,
    })
    return
  }
  const resource = SETTINGS_TAB_LOOKUP[tab]
  if (resource) {
    void qc.prefetchQuery({
      queryKey: settingsKeys.lookups(resource),
      queryFn: () => fetchLookupList(resource),
      staleTime: ROUTE_STALE_MS,
    })
  }
}

export function prefetchSchedulingView(qc: QueryClient, date = todayIso()) {
  void qc.prefetchQuery({
    queryKey: schedulingKeys.dayRuns(date),
    queryFn: () => getJobsDayRuns(date, { limit: 300 }),
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchSchedulingScheduleJobs(qc: QueryClient, date = todayIso()) {
  void qc.prefetchQuery({
    queryKey: schedulingKeys.employeesDay(date),
    queryFn: () => getEmployeesDayTimeline(date, { limit: 200 }),
    staleTime: ROUTE_STALE_MS,
  })
  void qc.prefetchQuery({
    queryKey: schedulingKeys.dayRuns(date),
    queryFn: () => getJobsDayRuns(date, { limit: 300 }),
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchSchedulingReport(qc: QueryClient) {
  void qc.prefetchQuery({
    queryKey: schedulingKeys.reportTypes(),
    queryFn: ({ signal }) => getScheduleReportTypes({ signal }),
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchSchedulingJobs(qc: QueryClient) {
  void qc.prefetchQuery({
    queryKey: schedulingKeys.housekeepingNotStarted(1),
    queryFn: () => getHousekeepingJobsNotStarted({ page: 1, limit: 50 }),
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchSchedulingBuild(qc: QueryClient, date = todayIso()) {
  void qc.prefetchQuery({
    queryKey: schedulingKeys.areas(),
    queryFn: ({ signal }) => listScheduleAreas({ signal }),
    staleTime: ROUTE_STALE_MS,
  })
  void qc.prefetchQuery({
    queryKey: schedulingKeys.status(date),
    queryFn: ({ signal }) => getScheduleStatus(date, { signal }),
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchSchedulingList(qc: QueryClient, date = todayIso()) {
  void qc.prefetchQuery({
    queryKey: schedulingKeys.list(date),
    queryFn: ({ signal }) => getJobsDayTimeline(date, { limit: 200 }, { signal }),
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchEmployeeTab(qc: QueryClient, tab: EmployeeRouteTabId) {
  void qc.prefetchQuery({
    queryKey: employeeKeys.chartSummary(),
    queryFn: ({ signal }) => fetchEmployeeChartSummary({ signal }),
    staleTime: ROUTE_STALE_MS,
  })

  if (tab === 'staff-list') {
    void qc.prefetchQuery({
      queryKey: employeeKeys.lookups(),
      queryFn: () => fetchEmployeeLookups(),
      staleTime: LOOKUP_STALE_MS,
    })
    void qc.prefetchQuery({
      queryKey: employeeKeys.list({}),
      queryFn: () => listEmployees({}),
      staleTime: ROUTE_STALE_MS,
    })
    return
  }

  if (tab === 'skills') {
    void qc.prefetchQuery({
      queryKey: employeeKeys.lookups(),
      queryFn: () => fetchEmployeeLookups(),
      staleTime: LOOKUP_STALE_MS,
    })
    void qc.prefetchQuery({
      queryKey: employeeKeys.skillsOverview(),
      queryFn: () => fetchEmployeeSkillsOverview(),
      staleTime: ROUTE_STALE_MS,
    })
    void qc.prefetchQuery({
      queryKey: employeeKeys.allList({}),
      queryFn: () => listAllEmployees({}),
      staleTime: 60_000,
    })
    return
  }

  if (tab === 'non-core-activity') {
    void qc.prefetchQuery({
      queryKey: employeeKeys.lookups(),
      queryFn: () => fetchEmployeeLookups(),
      staleTime: LOOKUP_STALE_MS,
    })
    void qc.prefetchQuery({
      queryKey: employeeKeys.nonCoreRegistry(),
      queryFn: () => fetchNonCoreActivitiesRegistry(),
      staleTime: ROUTE_STALE_MS,
    })
    void qc.prefetchQuery({
      queryKey: employeeKeys.allList({}),
      queryFn: () => listAllEmployees({}),
      staleTime: 60_000,
    })
  }
}

export function prefetchEmployeeEditRoute(qc: QueryClient, employeeId: string) {
  void qc.prefetchQuery({
    queryKey: employeeKeys.profile(employeeId),
    queryFn: () => fetchEmployee(employeeId),
    staleTime: ROUTE_STALE_MS,
  })
  void qc.prefetchQuery({
    queryKey: employeeKeys.lookups(),
    queryFn: () => fetchEmployeeLookups(),
    staleTime: LOOKUP_STALE_MS,
  })
}

export function prefetchEmployeeDocumentsRoute(qc: QueryClient) {
  void qc.prefetchQuery({
    queryKey: employeeKeys.documentsRegistry(),
    queryFn: () => fetchEmployeeDocumentsRegistry(),
    staleTime: ROUTE_STALE_MS,
  })
}

export function prefetchServiceUserEditRoute(qc: QueryClient, serviceUserId: string) {
  prefetchServiceUserProfile(qc, serviceUserId)
  void qc.prefetchQuery({
    queryKey: serviceUserKeys.lookups(),
    queryFn: () => fetchServiceUserLookups(),
    staleTime: LOOKUP_STALE_MS,
  })
}
