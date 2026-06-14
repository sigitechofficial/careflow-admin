import * as React from 'react'
import {
  Outlet,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { queryClient } from '@/app/query-client'

import { AppLayout } from '@/components/layout/AppLayout'
import { AppToaster } from '@/components/layout/AppToaster'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { SessionRefresh } from '@/features/auth/components/SessionRefresh'
import { CompanyBrandingBootstrap } from '@/components/company/CompanyBrandingBootstrap'
import { useCompanyStore } from '@/store/company.store'
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/features/auth/store'
import { rootAuthBeforeLoad } from '@/features/auth/guard'
import type { Permission } from '@/features/auth/types'

// ΓöÇΓöÇ Service-user pages (canonical) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import ServiceUsersPage from '@/features/service-users/pages/ServiceUsersPage'
import InitialAssessmentChecklistPage from '@/features/service-users/pages/InitialAssessmentChecklistPage'
import ServiceUserInitialAssessmentEnterprisePage from '@/features/service-users/initial-assessment/pages/ServiceUserInitialAssessmentEnterprisePage'
import { validateInitialAssessmentEnterpriseSearch } from '@/features/service-users/initial-assessment/utils/initial-assessment-url-search'
import AddServiceUserPage from '@/features/service-users/pages/AddServiceUserPage'
import EditServiceUserPage from '@/features/service-users/pages/EditServiceUserPage'
import ViewServiceUserPage from '@/features/service-users/pages/ViewServiceUserPage'
import ServiceUserMedicationPage from '@/features/service-users/pages/ServiceUserMedicationPage'
import ServiceUserCarePlanPage from '@/features/service-users/pages/ServiceUserCarePlanPage'
import ServiceUserCarePlanFormPage from '@/features/service-users/pages/ServiceUserCarePlanFormPage'
import ServiceUserVisitPlanPage from '@/features/service-users/pages/ServiceUserVisitPlanPage'
import ServiceUserObservationsPage from '@/features/service-users/pages/ServiceUserObservationsPage'
import ServiceUserBodyMapPage from '@/features/service-users/body-map/pages/ServiceUserBodyMapPage'
import BodyMapReviewQueuePage from '@/features/service-users/body-map/pages/BodyMapReviewQueuePage'
import InitialAssessmentReviewQueuePage from '@/features/service-users/initial-assessment/pages/InitialAssessmentReviewQueuePage'
import AssessmentReviewQueuePage from '@/features/service-users/assessments/pages/AssessmentReviewQueuePage'

// ΓöÇΓöÇ Employee pages (canonical) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import EmployeePage from '@/features/employees/pages/EmployeePage'
import GeneralEmployeeDocumentsPage from '@/features/employees/pages/GeneralEmployeeDocumentsPage'
import AddEmployeePage from '@/features/employees/pages/AddEmployeePage'
import EditEmployeePage from '@/features/employees/pages/EditEmployeePage'

// ΓöÇΓöÇ Scheduling pages (canonical) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import ViewSchedulePage from '@/features/scheduling/pages/ViewSchedulePage'
import SchedulingReportPage from '@/features/scheduling/pages/SchedulingReportPage'
import ManageScheduleJobsPage from '@/features/scheduling/pages/ManageScheduleJobsPage'
import BuildSchedulePage from '@/features/scheduling/pages/BuildSchedulePage'
import ScheduleListPage from '@/features/scheduling/pages/ScheduleListPage'
import ScheduleTemplatesPage from '@/features/scheduling/pages/ScheduleTemplatesPage'

// ΓöÇΓöÇ Auth pages ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import LoginPage from '@/features/auth/pages/LoginPage'
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage'
import BlockedIpPage from '@/features/auth/pages/BlockedIpPage'

// ΓöÇΓöÇ Account, home, admin, accidents ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import AccountPage from '@/features/account/pages/AccountPage'
import HomePage from '@/features/home/pages/HomePage'
import InProgressPage from '@/features/home/pages/InProgressPage'
import ComponentShowcase from '@/features/home/pages/ComponentShowcase'
import SecurityAdminPage from '@/features/admin/pages/SecurityAdminPage'
import AuditLogPage from '@/features/admin/pages/AuditLogPage'
import ViewAccidentsIncidentsPage from '@/features/accidents/pages/ViewAccidentsIncidentsPage'
import RaiseAccidentsIncidentsPage from '@/features/accidents/pages/RaiseAccidentsIncidentsPage'

// ΓöÇΓöÇ Settings pages ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import SettingsPage from '@/features/settings/pages/SettingsPage'
import GeneralSettingsPage from '@/features/settings/pages/GeneralSettingsPage'
import type { GeneralSettingsTabId } from '@/features/settings/pages/GeneralSettingsPage'
import CompanyDetailsPage from '@/features/settings/pages/CompanyDetailsPage'
import LocationManagementPage from '@/features/settings/pages/LocationManagementPage'
import CarePathwayPage from '@/features/settings/pages/CarePathwayPage'
import type { SettingsTabId } from '@/features/settings/pages/SettingsPage'

// ΓöÇΓöÇ Calendar + employee misc ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import CalendarPage from '@/features/service-users/calendar/pages/CalendarPage'
import TempInspectorPage from '@/features/employees/pages/TempInspectorPage'
import type { LocationManagementSubTab } from '@/features/settings/location-management/location-management.types'
import {
  CARE_PATHWAY_TAB_IDS,
  type CarePathwayTabId,
} from '@/features/settings/care-pathway/care-pathway.types'
import { serviceUserKeys } from '@/features/service-users/keys'
import { employeeKeys } from '@/features/employees/keys'
import { listServiceUsers, fetchServiceUserLookups } from '@/features/service-users/api'
import { defaultServiceUsersListParams } from '@/features/service-users/utils/service-users-list-query'
import { fetchEmployeeLookups } from '@/features/employees/api'
import { fetchGeneralSettings } from '@/features/settings/api/general-settings-api'
import { fetchCompanyProfile } from '@/features/settings/api/company-settings-api'
import { settingsKeys } from '@/features/settings/keys'
import { prefetchCarePathwayTab } from '@/features/care-pathway/prefetch-care-pathway-tab'
import {
  prefetchAccount,
  prefetchEmployeeDocumentsRoute,
  prefetchEmployeeEditRoute,
  prefetchEmployeeTab,
  prefetchInitialAssessmentChecklist,
  prefetchInitialAssessmentEnterprise,
  prefetchLocationManagement,
  prefetchSchedulingBuild,
  prefetchSchedulingJobs,
  prefetchSchedulingList,
  prefetchSchedulingReport,
  prefetchSchedulingView,
  prefetchServiceUserCalendar,
  prefetchServiceUserCarePlanFormRoute,
  prefetchServiceUserCarePlanRoute,
  prefetchServiceUserVisitPlanRoute,
  prefetchServiceUserEditRoute,
  prefetchServiceUserMedicationRoute,
  prefetchServiceUserObservationsRoute,
  prefetchServiceUserBodyMapRoute,
  prefetchServiceUserProfile,
  prefetchSettingsTab,
  prefetchTemporaryInspectors,
} from '@/app/prefetch-routes'

/** Context type shared across all route loaders. */
type RouterContext = {
  queryClient: QueryClient
}

type EmployeeTabId = 'staff-list' | 'compliance' | 'review-status' | 'skills' | 'non-core-activity' | 'reports'

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/service-users': 'Service Users',
  '/service-users/all': 'Service Users',
  '/service-users/calendar': 'Calendar',
  '/service-users/initial-assessment': 'Initial Assessment',
  '/service-users/initial-assessment-checklist': 'Initial Assessment (Legacy)',
  '/service-users/add': 'Add Service User',
  '/service-users/$serviceUserId': 'Edit Service User',
  '/scheduling/view': 'View Schedule',
  '/scheduling/report': 'Scheduling Reports',
  '/scheduling/jobs': 'Scheduled Jobs Housekeeping',
  '/scheduling/build': 'Build Schedule',
  '/scheduling/list': 'List View of Schedule',
  '/scheduling/templates': 'Schedule Templates',
  '/employee': 'Employee',
  '/employee/staff-list': 'Employee',
  '/employee/compliance': 'Employee',
  '/employee/review-status': 'Employee',
  '/employee/skills': 'Employee',
  '/employee/non-core-activity': 'Employee',
  '/employee/reports': 'Employee',
  '/employee/temp-inspector': 'Temporary Inspector Login',
  '/employee/documents': 'General Employee Documents',
  '/employee/add': 'Add Employee',
  '/accidents-incidents/view': 'View Accidents & Incidents',
  '/accidents-incidents/raise': 'Raise Accidents & Incidents',
  '/account': 'My account',
  '/admin/security': 'Security administration',
  '/admin/audit': 'Audit log',
  '/in-progress': 'Page in progress',
  '/showcase': 'UI showcase',
  '/settings': 'Settings',
  '/settings/company': 'Company Details',
  '/settings/general': 'General Settings',
  '/settings/location-management': 'Location Management',
  '/settings/care-pathway': 'Care Pathway',
}

const SETTINGS_TAB_IDS: SettingsTabId[] = [
  'job-titles',
  'skills',
  'compliance',
  'work-areas',
  'contract-types',
  'grades',
  'locations',
  'certifications',
  'non-core',
  'leaving-reasons',
  'review-types',
  'travel-payment',
  'medication',
  'time-slots',
  'care-types',
  'funding-types',
  'record-types',
  'allergies',
]

const LOCATION_MANAGEMENT_SUB_IDS: LocationManagementSubTab[] = [
  'zones',
  'service-users',
  'employees',
]

function RootDocument() {
  const { theme } = useUIStore()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    }
  }, [theme])

  return <Outlet />
}

function AppRootShell() {
  useNotificationSocket()
  const companyDisplayName = useCompanyStore(s => s.branding?.displayName)
  const pathname = useRouterState({ select: s => s.location.pathname })
  const pageTitle =
    pageTitles[pathname] ??
    (/^\/employee\/[^/]+\/edit$/.test(pathname)
      ? 'Edit Employee'
      : /^\/service-users\/[^/]+\/view$/.test(pathname)
        ? 'Service User'
        : /^\/service-users\/[^/]+\/medication$/.test(pathname)
          ? 'Medication'
          : /^\/service-users\/[^/]+\/observations$/.test(pathname)
            ? 'Observations'
            : /^\/service-users\/[^/]+\/body-map$/.test(pathname)
              ? 'Body Map'
              : pathname === '/body-map/review-queue'
                ? 'Body Map Review Queue'
            : /^\/service-users\/[^/]+\/care-plan(\/forms\/[^/]+)?$/.test(pathname)
              ? 'Care Plan'
            : /^\/service-users\/[^/]+\/visit-plan$/.test(pathname)
              ? 'Visit Plan'
            : /^\/service-users\/[^/]+$/.test(pathname)
            ? 'Edit Service User'
            : companyDisplayName?.trim() || 'CareAdmin')
  const fullBleed =
    pathname === '/service-users/all' ||
    pathname === '/service-users/initial-assessment' ||
    pathname === '/scheduling/view' ||
    /^\/service-users\/[^/]+\/view$/.test(pathname) ||
    /^\/service-users\/[^/]+\/medication$/.test(pathname) ||
    /^\/service-users\/[^/]+\/observations$/.test(pathname) ||
    /^\/service-users\/[^/]+\/body-map$/.test(pathname) ||
    /^\/service-users\/[^/]+\/care-plan(\/forms\/[^/]+)?$/.test(pathname) ||
    /^\/service-users\/[^/]+\/visit-plan$/.test(pathname) ||
    /^\/service-users\/[^/]+$/.test(pathname)

  return (
    <>
      <SessionRefresh />
      <CompanyBrandingBootstrap />
      <AppToaster />
      <AppLayout pageTitle={pageTitle} fullBleed={fullBleed}>
        <Outlet />
      </AppLayout>
    </>
  )
}

function requirePermission(permission: Permission) {
  return () => {
    if (!useAuthStore.getState().can(permission)) {
      throw redirect({ to: '/' })
    }
  }
}

function requireAnyPermission(...permissions: Permission[]) {
  return () => {
    const { can } = useAuthStore.getState()
    if (!permissions.some(p => can(p))) {
      throw redirect({ to: '/' })
    }
  }
}

/** Backend schedule modules use keys like `schedule_timelines.read`, not legacy `schedule.read`. */
function requireScheduleAccess() {
  return () => {
    const perms = useAuthStore.getState().user?.permissions ?? []
    const allowed = perms.some(
      p =>
        p === 'schedule.read' ||
        p.startsWith('schedule_') ||
        p.startsWith('schedules.') ||
        p.startsWith('scheduled_'),
    )
    if (!allowed) throw redirect({ to: '/' })
  }
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  beforeLoad: rootAuthBeforeLoad,
  component: RootDocument,
})

const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'auth',
  component: AuthLayout,
})

const authLoginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: 'login',
  component: LoginPage,
})

const authForgotRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: 'forgot-password',
  component: ForgotPasswordPage,
})

const authResetRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: 'reset-password',
  component: ResetPasswordPage,
})

const authBlockedRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: 'blocked-ip',
  component: BlockedIpPage,
})

const appShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AppRootShell,
})

const indexRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/',
  component: HomePage,
})

const serviceUsersRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users',
  beforeLoad: () => {
    throw redirect({ to: '/service-users/all' })
  },
})

const serviceUsersAllRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/all',
  beforeLoad: requirePermission('service_users.read'),
  loader: async ({ context: { queryClient: qc } }) => {
    const lookups = await qc.fetchQuery({
      queryKey: serviceUserKeys.lookups(),
      queryFn: () => fetchServiceUserLookups(),
      staleTime: 10 * 60 * 1000,
    })
    const listParams = defaultServiceUsersListParams(lookups)
    void qc.prefetchQuery({
      queryKey: serviceUserKeys.list(listParams),
      queryFn: () => listServiceUsers(listParams),
      staleTime: 30_000,
    })
  },
  component: ServiceUsersPage,
})

const serviceUsersCalendarRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/calendar',
  beforeLoad: requirePermission('service_users.calendar.read'),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchServiceUserCalendar(qc)
  },
  component: CalendarPage,
})

const serviceUsersInitialAssessmentEnterpriseRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/initial-assessment',
  validateSearch: validateInitialAssessmentEnterpriseSearch,
  beforeLoad: requireAnyPermission('service_users.initial_assessment.read', 'service_users.read'),
  loader: ({ context: { queryClient: qc }, location }) => {
    const serviceUserId =
      typeof location.search === 'object' &&
      location.search !== null &&
      'serviceUserId' in location.search &&
      typeof (location.search as { serviceUserId?: string }).serviceUserId === 'string'
        ? (location.search as { serviceUserId: string }).serviceUserId.trim()
        : undefined
    prefetchInitialAssessmentEnterprise(qc, serviceUserId || undefined)
  },
  component: ServiceUserInitialAssessmentEnterprisePage,
})

const serviceUsersInitialAssessmentRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/initial-assessment-checklist',
  validateSearch: (raw: Record<string, unknown>): { serviceUserId?: string } => {
    const id = raw.serviceUserId
    return { serviceUserId: typeof id === 'string' && id.trim() ? id.trim() : undefined }
  },
  beforeLoad: requireAnyPermission('service_users.initial_assessment.read', 'service_users.read'),
  loader: ({ context: { queryClient: qc }, location }) => {
    const serviceUserId =
      typeof location.search === 'object' &&
      location.search !== null &&
      'serviceUserId' in location.search &&
      typeof (location.search as { serviceUserId?: string }).serviceUserId === 'string'
        ? (location.search as { serviceUserId: string }).serviceUserId.trim()
        : undefined
    prefetchInitialAssessmentChecklist(qc, serviceUserId || undefined)
  },
  component: InitialAssessmentChecklistPage,
})

const serviceUsersAddRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/add',
  beforeLoad: requirePermission('service_users.create'),
  loader: ({ context: { queryClient: qc } }) => {
    void qc.prefetchQuery({
      queryKey: serviceUserKeys.lookups(),
      queryFn: () => fetchServiceUserLookups(),
      staleTime: 10 * 60 * 1000,
    })
    void qc.prefetchQuery({
      queryKey: employeeKeys.lookups(),
      queryFn: () => fetchEmployeeLookups(),
      staleTime: 10 * 60 * 1000,
    })
  },
  component: AddServiceUserPage,
})

const serviceUsersViewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/view',
  validateSearch: (raw: Record<string, unknown>): {
    focus?: string
    layout?: 'wed' | 'thu' | 'simple' | 'classic'
  } => {
    const focus = raw.focus
    const layout = raw.layout
    const next: { focus?: string; layout?: 'wed' | 'thu' | 'simple' | 'classic' } = {}
    if (typeof focus === 'string' && focus.trim()) next.focus = focus.trim()
    if (layout === 'wed' || layout === 'thu' || layout === 'simple' || layout === 'classic') {
      next.layout = layout
    }
    return next
  },
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserProfile(qc, serviceUserId)
  },
  component: ViewServiceUserPage,
})

const serviceUsersMedicationRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/medication',
  beforeLoad: requirePermission('service_users.read'),
  validateSearch: (
    raw: Record<string, unknown>,
  ): {
    view?: 'calendar' | 'supply' | 'packs' | 'events' | 'reviews' | 'export' | 'support' | 'activity'
    from?: string
    submissionId?: string
  } => {
    const v = raw.view
    const out: {
      view?: 'calendar' | 'supply' | 'packs' | 'events' | 'reviews' | 'export' | 'support' | 'activity'
      from?: string
      submissionId?: string
    } = {}
    if (
      v === 'calendar' ||
      v === 'supply' ||
      v === 'packs' ||
      v === 'events' ||
      v === 'reviews' ||
      v === 'export' ||
      v === 'support' ||
      v === 'activity'
    ) {
      out.view = v
    }
    if (typeof raw.from === 'string' && raw.from.trim()) out.from = raw.from.trim()
    if (typeof raw.submissionId === 'string' && raw.submissionId.trim()) {
      out.submissionId = raw.submissionId.trim()
    }
    return out
  },
  loader: ({ context: { queryClient: qc }, params: { serviceUserId }, location }) => {
    prefetchServiceUserMedicationRoute(qc, serviceUserId)
    const view = new URLSearchParams(location.searchStr).get('view')
    if (view === 'calendar') {
      void import('@/features/service-users/hooks/useMedicationMarChart').then(
        ({ currentMedicationChartMonth, medicationChartMonthKey }) =>
          import('@/features/service-users/api/medication-mar.api').then(({ fetchMedicationRegularChart }) => {
            const monthKey = currentMedicationChartMonth()
            return qc.prefetchQuery({
              queryKey: medicationChartMonthKey(serviceUserId, monthKey),
              queryFn: () => fetchMedicationRegularChart(serviceUserId, { month: monthKey }),
            })
          }),
      )
    }
  },
  component: ServiceUserMedicationPage,
})

const serviceUsersCarePlanRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/care-plan',
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserCarePlanRoute(qc, serviceUserId)
  },
  component: ServiceUserCarePlanPage,
})

const serviceUsersCarePlanFormRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/care-plan/forms/$formId',
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId, formId } }) => {
    prefetchServiceUserCarePlanFormRoute(qc, serviceUserId, formId)
  },
  component: ServiceUserCarePlanFormPage,
})

const serviceUsersVisitPlanRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/visit-plan',
  validateSearch: (raw: Record<string, unknown>): { planId?: string; view?: 'details' } => {
    const planId = raw.planId
    const view = raw.view === 'details' ? 'details' : undefined
    return {
      planId: typeof planId === 'string' && planId.trim() ? planId.trim() : undefined,
      view,
    }
  },
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserVisitPlanRoute(qc, serviceUserId)
  },
  component: ServiceUserVisitPlanPage,
})

const serviceUsersObservationsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/observations',
  validateSearch: (raw: Record<string, unknown>): { type?: string } => {
    const t = raw.type
    return { type: typeof t === 'string' && t.trim() ? t.trim() : undefined }
  },
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserObservationsRoute(qc, serviceUserId)
  },
  component: ServiceUserObservationsPage,
})

const serviceUsersBodyMapRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/body-map',
  validateSearch: (raw: Record<string, unknown>) => {
    const search: {
      linkMedicationId?: string
      from?: string
      submissionId?: string
      view?: 'export'
    } = {}
    if (typeof raw.linkMedicationId === 'string' && raw.linkMedicationId.trim()) {
      search.linkMedicationId = raw.linkMedicationId.trim()
    }
    if (typeof raw.from === 'string' && raw.from.trim()) {
      search.from = raw.from.trim()
    }
    if (typeof raw.submissionId === 'string' && raw.submissionId.trim()) {
      search.submissionId = raw.submissionId.trim()
    }
    if (raw.view === 'export') {
      search.view = 'export'
    }
    return search
  },
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserBodyMapRoute(qc, serviceUserId)
  },
  component: ServiceUserBodyMapPage,
})

const bodyMapReviewQueueRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/body-map/review-queue',
  beforeLoad: requirePermission('service_users.read'),
  component: BodyMapReviewQueuePage,
})

const initialAssessmentReviewQueueRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/initial-assessments/review-queue',
  beforeLoad: requirePermission('service_users.initial_assessment.review'),
  component: InitialAssessmentReviewQueuePage,
})

const assessmentReviewQueueRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/assessments/review-queue',
  beforeLoad: requirePermission('service_users.assessments.read'),
  component: AssessmentReviewQueuePage,
})

const serviceUsersEditRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId',
  validateSearch: (raw: Record<string, unknown>): { tab?: string } => {
    const tab = raw.tab
    return { tab: typeof tab === 'string' && tab.trim() ? tab.trim() : undefined }
  },
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserEditRoute(qc, serviceUserId)
  },
  component: EditServiceUserPage,
})

const schedulingViewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/view',
  beforeLoad: requireScheduleAccess(),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchSchedulingView(qc)
  },
  component: ViewSchedulePage,
})

const schedulingReportRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/report',
  beforeLoad: requireScheduleAccess(),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchSchedulingReport(qc)
  },
  component: SchedulingReportPage,
})

const schedulingJobsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/jobs',
  beforeLoad: requireScheduleAccess(),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchSchedulingJobs(qc)
  },
  component: ManageScheduleJobsPage,
})

const schedulingBuildRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/build',
  beforeLoad: requireScheduleAccess(),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchSchedulingBuild(qc)
  },
  component: BuildSchedulePage,
})

const schedulingListRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/list',
  beforeLoad: requireScheduleAccess(),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchSchedulingList(qc)
  },
  component: ScheduleListPage,
})

const schedulingTemplatesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/templates',
  beforeLoad: requireScheduleAccess(),
  component: ScheduleTemplatesPage,
})

const employeeRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee',
  beforeLoad: () => {
    if (!useAuthStore.getState().can('employees.read')) {
      throw redirect({ to: '/' })
    }
    throw redirect({ to: '/employee/staff-list' })
  },
})

function EmployeeRouteWrapper({ tab }: { tab: EmployeeTabId }) {
  const navigate = useNavigate()
  return <EmployeePage activeTab={tab} onTabChange={(t) => navigate({ to: `/employee/${t}` })} />
}

const employeeStaffListRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/staff-list',
  beforeLoad: requirePermission('employees.read'),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchEmployeeTab(qc, 'staff-list')
  },
  component: () => <EmployeeRouteWrapper tab="staff-list" />,
})

const employeeComplianceRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/compliance',
  beforeLoad: requirePermission('employees.read'),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchEmployeeTab(qc, 'compliance')
  },
  component: () => <EmployeeRouteWrapper tab="compliance" />,
})

const employeeReviewStatusRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/review-status',
  beforeLoad: requirePermission('employees.read'),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchEmployeeTab(qc, 'review-status')
  },
  component: () => <EmployeeRouteWrapper tab="review-status" />,
})

const employeeSkillsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/skills',
  beforeLoad: requirePermission('employees.read'),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchEmployeeTab(qc, 'skills')
  },
  component: () => <EmployeeRouteWrapper tab="skills" />,
})

const employeeNonCoreActivityRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/non-core-activity',
  beforeLoad: requirePermission('employees.read'),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchEmployeeTab(qc, 'non-core-activity')
  },
  component: () => <EmployeeRouteWrapper tab="non-core-activity" />,
})

const employeeReportsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/reports',
  beforeLoad: requirePermission('employees.read'),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchEmployeeTab(qc, 'reports')
  },
  component: () => <EmployeeRouteWrapper tab="reports" />,
})

const employeeTempInspectorRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/temp-inspector',
  beforeLoad: requirePermission('employees.read'),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchTemporaryInspectors(qc)
  },
  component: TempInspectorPage,
})

const employeeGeneralDocumentsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/documents',
  beforeLoad: requirePermission('employees.documents.read'),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchEmployeeDocumentsRoute(qc)
  },
  component: GeneralEmployeeDocumentsPage,
})

const employeeAddRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/add',
  beforeLoad: requirePermission('employees.create'),
  loader: ({ context: { queryClient: qc } }) => {
    void qc.prefetchQuery({
      queryKey: employeeKeys.lookups(),
      queryFn: () => fetchEmployeeLookups(),
      staleTime: 10 * 60 * 1000,
    })
  },
  component: AddEmployeePage,
})

const employeeEditRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/$employeeId/edit',
  beforeLoad: requirePermission('employees.update'),
  loader: ({ context: { queryClient: qc }, params: { employeeId } }) => {
    prefetchEmployeeEditRoute(qc, employeeId)
  },
  component: EditEmployeePage,
})

const accidentsIncidentsViewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/accidents-incidents/view',
  beforeLoad: requirePermission('incidents.read'),
  // UI-only register page ΓÇö no list API to prefetch yet
  component: ViewAccidentsIncidentsPage,
})

const accidentsIncidentsRaiseRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/accidents-incidents/raise',
  beforeLoad: requirePermission('incidents.read'),
  // UI-only form page ΓÇö no lookup API to prefetch yet
  component: RaiseAccidentsIncidentsPage,
})

const accountRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/account',
  loader: ({ context: { queryClient: qc } }) => {
    prefetchAccount(qc)
  },
  component: AccountPage,
})

const adminSecurityRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/security',
  beforeLoad: requirePermission('security.admin'),
  // Client-side auth store demo ΓÇö no server security config API
  component: SecurityAdminPage,
})

const adminAuditRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/audit',
  beforeLoad: requireAnyPermission('audit.read', 'audit_logs.read'),
  // Audit buffer hydrated at app boot via loadAuditFromStorage()
  component: AuditLogPage,
})

const inProgressRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/in-progress',
  validateSearch: (raw: Record<string, unknown>): { title?: string } => {
    const t = raw.title
    return { title: typeof t === 'string' ? t : undefined }
  },
  component: InProgressPage,
})

const showcaseRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/showcase',
  component: ComponentShowcase,
})

const settingsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/settings',
  validateSearch: (raw: Record<string, unknown>): { tab?: SettingsTabId } => {
    const t = raw.tab
    if (typeof t === 'string' && SETTINGS_TAB_IDS.includes(t as SettingsTabId)) {
      return { tab: t as SettingsTabId }
    }
    return {}
  },
  beforeLoad: requirePermission('lookups.read'),
  loader: ({ context: { queryClient: qc }, location }) => {
    const tab =
      typeof location.search === 'object' &&
      location.search !== null &&
      'tab' in location.search &&
      typeof (location.search as { tab?: string }).tab === 'string' &&
      SETTINGS_TAB_IDS.includes((location.search as { tab: SettingsTabId }).tab)
        ? (location.search as { tab: SettingsTabId }).tab
        : 'job-titles'
    prefetchSettingsTab(qc, tab)
  },
  component: SettingsPage,
})

const companyDetailsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/settings/company',
  beforeLoad: requireAnyPermission('settings.company.read', 'lookups.read'),
  loader: ({ context: { queryClient: qc } }) => {
    void qc.prefetchQuery({
      queryKey: settingsKeys.companyProfile(),
      queryFn: () => fetchCompanyProfile(),
      staleTime: 60_000,
    })
  },
  component: CompanyDetailsPage,
})

const GENERAL_SETTINGS_TAB_IDS: GeneralSettingsTabId[] = [
  'general',
  'employee',
  'service-management',
  'dom-care',
  'dom-care-shifts',
  'dom-rules',
  'incident-management',
  'optional',
  'pre-assessment',
  'alerts',
  'critical-information',
  'app-setting',
  'privacy',
]

const generalSettingsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/settings/general',
  validateSearch: (raw: Record<string, unknown>): { tab?: GeneralSettingsTabId } => {
    const t = raw.tab
    if (typeof t === 'string' && GENERAL_SETTINGS_TAB_IDS.includes(t as GeneralSettingsTabId)) {
      return { tab: t as GeneralSettingsTabId }
    }
    return {}
  },
  beforeLoad: requirePermission('lookups.read'),
  loader: ({ context: { queryClient: qc } }) => {
    void qc.prefetchQuery({
      queryKey: settingsKeys.general(),
      queryFn: () => fetchGeneralSettings(),
      staleTime: 60_000,
    })
  },
  component: GeneralSettingsPage,
})

const locationManagementRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/settings/location-management',
  validateSearch: (raw: Record<string, unknown>): { sub?: LocationManagementSubTab } => {
    const sub = raw.sub
    if (
      typeof sub === 'string' &&
      LOCATION_MANAGEMENT_SUB_IDS.includes(sub as LocationManagementSubTab)
    ) {
      return { sub: sub as LocationManagementSubTab }
    }
    return { sub: 'zones' }
  },
  beforeLoad: requirePermission('lookups.read'),
  loader: ({ context: { queryClient: qc }, location }) => {
    const sub =
      typeof location.search === 'object' &&
      location.search !== null &&
      'sub' in location.search &&
      typeof (location.search as { sub?: string }).sub === 'string'
        ? ((location.search as { sub: LocationManagementSubTab }).sub)
        : 'zones'
    prefetchLocationManagement(qc, sub)
  },
  component: LocationManagementPage,
})

const carePathwayRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/settings/care-pathway',
  validateSearch: (raw: Record<string, unknown>): { tab?: CarePathwayTabId } => {
    const t = raw.tab
    if (typeof t === 'string' && CARE_PATHWAY_TAB_IDS.includes(t as CarePathwayTabId)) {
      return { tab: t as CarePathwayTabId }
    }
    return { tab: 'wizard' }
  },
  beforeLoad: requirePermission('care_pathway.read'),
  loader: ({ context: { queryClient: qc }, location }) => {
    const rawTab =
      typeof location.search === 'object' &&
      location.search !== null &&
      'tab' in location.search
        ? (location.search as { tab?: string }).tab
        : undefined
    const tab =
      typeof rawTab === 'string' && CARE_PATHWAY_TAB_IDS.includes(rawTab as CarePathwayTabId)
        ? (rawTab as CarePathwayTabId)
        : 'wizard'
    prefetchCarePathwayTab(qc, tab)
  },
  component: CarePathwayPage,
})

const routeTree = rootRoute.addChildren([
  authLayoutRoute.addChildren([
    authLoginRoute,
    authForgotRoute,
    authResetRoute,
    authBlockedRoute,
  ]),
  appShellRoute.addChildren([
    indexRoute,
    serviceUsersRoute,
    serviceUsersAllRoute,
    serviceUsersCalendarRoute,
    serviceUsersInitialAssessmentEnterpriseRoute,
    serviceUsersInitialAssessmentRoute,
    serviceUsersAddRoute,
    serviceUsersViewRoute,
    serviceUsersMedicationRoute,
    serviceUsersCarePlanRoute,
    serviceUsersCarePlanFormRoute,
    serviceUsersVisitPlanRoute,
    serviceUsersObservationsRoute,
    serviceUsersBodyMapRoute,
    bodyMapReviewQueueRoute,
    initialAssessmentReviewQueueRoute,
    assessmentReviewQueueRoute,
    serviceUsersEditRoute,
    schedulingViewRoute,
    schedulingReportRoute,
    schedulingJobsRoute,
    schedulingBuildRoute,
    schedulingListRoute,
    schedulingTemplatesRoute,
    employeeRoute,
    employeeStaffListRoute,
    employeeComplianceRoute,
    employeeReviewStatusRoute,
    employeeSkillsRoute,
    employeeNonCoreActivityRoute,
    employeeReportsRoute,
    employeeTempInspectorRoute,
    employeeGeneralDocumentsRoute,
    employeeAddRoute,
    employeeEditRoute,
    accidentsIncidentsViewRoute,
    accidentsIncidentsRaiseRoute,
    accountRoute,
    adminSecurityRoute,
    adminAuditRoute,
    inProgressRoute,
    showcaseRoute,
    settingsRoute,
    companyDetailsRoute,
    generalSettingsRoute,
    locationManagementRoute,
    carePathwayRoute,
  ]),
])

const router = createRouter({
  routeTree,
  context: { queryClient },
  /** Replace library default "Not Found" with the same in-progress experience as deliberate placeholders. */
  defaultNotFoundComponent: InProgressPage,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />
}
