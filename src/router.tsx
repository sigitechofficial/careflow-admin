import * as React from 'react'
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect } from 'react'

import { AppLayout } from '@/components/layout/AppLayout'
import { AppToaster } from '@/components/layout/AppToaster'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { SessionRefresh } from '@/components/auth/SessionRefresh'
import { CompanyBrandingBootstrap } from '@/components/company/CompanyBrandingBootstrap'
import { useCompanyStore } from '@/store/company.store'
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { rootAuthBeforeLoad } from '@/auth/guard'
import type { Permission } from '@/auth/types'

import HomePage from '@/components/pages/HomePage'
import ServiceUsersPage from '@/components/pages/ServiceUsersPage'
import CalendarPage from '@/components/pages/CalendarPage'
import InitialAssessmentChecklistPage from '@/components/pages/InitialAssessmentChecklistPage'
import AddServiceUserPage from '@/components/pages/AddServiceUserPage'
import EditServiceUserPage from '@/components/pages/EditServiceUserPage'
import ViewServiceUserPage from '@/components/pages/ViewServiceUserPage'
import ServiceUserMedicationPage from '@/components/pages/ServiceUserMedicationPage'
import ServiceUserCarePlanPage from '@/components/pages/ServiceUserCarePlanPage'
import ServiceUserCarePlanFormPage from '@/components/pages/ServiceUserCarePlanFormPage'
import ServiceUserObservationsPage from '@/components/pages/ServiceUserObservationsPage'
import EmployeePage from '@/components/pages/EmployeePage'
import TempInspectorPage from '@/components/pages/TempInspectorPage'
import GeneralEmployeeDocumentsPage from '@/components/pages/GeneralEmployeeDocumentsPage'
import AddEmployeePage from '@/components/pages/AddEmployeePage'
import EditEmployeePage from '@/components/pages/EditEmployeePage'
import ViewSchedulePage from '@/components/pages/ViewSchedulePage'
import SchedulingReportPage from '@/components/pages/SchedulingReportPage'
import ManageScheduleJobsPage from '@/components/pages/ManageScheduleJobsPage'
import BuildSchedulePage from '@/components/pages/BuildSchedulePage'
import ScheduleListPage from '@/components/pages/ScheduleListPage'
import ScheduleTemplatesPage from '@/components/pages/ScheduleTemplatesPage'
import ViewAccidentsIncidentsPage from '@/components/pages/ViewAccidentsIncidentsPage'
import RaiseAccidentsIncidentsPage from '@/components/pages/RaiseAccidentsIncidentsPage'
import AccountPage from '@/components/pages/account/AccountPage'
import SecurityAdminPage from '@/components/pages/admin/SecurityAdminPage'
import AuditLogPage from '@/components/pages/admin/AuditLogPage'
import LoginPage from '@/components/pages/auth/LoginPage'
import ForgotPasswordPage from '@/components/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/components/pages/auth/ResetPasswordPage'
import BlockedIpPage from '@/components/pages/auth/BlockedIpPage'
import ComponentShowcase from '@/components/pages/ComponentShowcase'
import InProgressPage from '@/components/pages/InProgressPage'
import SettingsPage from '@/components/pages/SettingsPage'
import GeneralSettingsPage from '@/components/pages/GeneralSettingsPage'
import type { GeneralSettingsTabId } from '@/components/pages/GeneralSettingsPage'
import CompanyDetailsPage from '@/components/pages/CompanyDetailsPage'
import LocationManagementPage from '@/components/pages/LocationManagementPage'
import CarePathwayPage from '@/components/pages/CarePathwayPage'
import type { SettingsTabId } from '@/components/pages/SettingsPage'
import type { LocationManagementSubTab } from '@/features/settings/location-management/location-management.types'
import {
  CARE_PATHWAY_TAB_IDS,
  type CarePathwayTabId,
} from '@/features/settings/care-pathway/care-pathway.types'

type EmployeeTabId = 'staff-list' | 'compliance' | 'review-status' | 'skills' | 'non-core-activity' | 'reports'

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/service-users': 'Service Users',
  '/service-users/all': 'Service Users',
  '/service-users/calendar': 'Calendar',
  '/service-users/initial-assessment-checklist': 'Initial Assessment Checklist',
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
            : /^\/service-users\/[^/]+\/care-plan(\/forms\/[^/]+)?$/.test(pathname)
              ? 'Care Plan'
            : /^\/service-users\/[^/]+$/.test(pathname)
            ? 'Edit Service User'
            : companyDisplayName?.trim() || 'CareAdmin')
  const fullBleed =
    pathname === '/service-users/all' ||
    pathname === '/scheduling/view' ||
    /^\/service-users\/[^/]+\/view$/.test(pathname) ||
    /^\/service-users\/[^/]+\/medication$/.test(pathname) ||
    /^\/service-users\/[^/]+\/observations$/.test(pathname) ||
    /^\/service-users\/[^/]+\/care-plan(\/forms\/[^/]+)?$/.test(pathname) ||
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

const rootRoute = createRootRoute({
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
  component: ServiceUsersPage,
})

const serviceUsersCalendarRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/calendar',
  beforeLoad: requirePermission('service_users.calendar.read'),
  component: CalendarPage,
})

const serviceUsersInitialAssessmentRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/initial-assessment-checklist',
  validateSearch: (raw: Record<string, unknown>): { serviceUserId?: string } => {
    const id = raw.serviceUserId
    return { serviceUserId: typeof id === 'string' && id.trim() ? id.trim() : undefined }
  },
  beforeLoad: requireAnyPermission('service_users.initial_assessment.read', 'service_users.read'),
  component: InitialAssessmentChecklistPage,
})

const serviceUsersAddRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/add',
  beforeLoad: requirePermission('service_users.create'),
  component: AddServiceUserPage,
})

const serviceUsersViewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/view',
  validateSearch: (raw: Record<string, unknown>): { focus?: string } => {
    const focus = raw.focus
    return typeof focus === 'string' && focus.trim() ? { focus: focus.trim() } : {}
  },
  beforeLoad: requirePermission('service_users.read'),
  component: ViewServiceUserPage,
})

const serviceUsersMedicationRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/medication',
  beforeLoad: requirePermission('service_users.read'),
  component: ServiceUserMedicationPage,
})

const serviceUsersCarePlanRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/care-plan',
  beforeLoad: requirePermission('service_users.read'),
  component: ServiceUserCarePlanPage,
})

const serviceUsersCarePlanFormRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/care-plan/forms/$formId',
  beforeLoad: requirePermission('service_users.read'),
  component: ServiceUserCarePlanFormPage,
})

const serviceUsersObservationsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/observations',
  validateSearch: (raw: Record<string, unknown>): { type?: string } => {
    const t = raw.type
    return { type: typeof t === 'string' && t.trim() ? t.trim() : undefined }
  },
  beforeLoad: requirePermission('service_users.read'),
  component: ServiceUserObservationsPage,
})

const serviceUsersEditRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId',
  validateSearch: (raw: Record<string, unknown>): { tab?: string } => {
    const tab = raw.tab
    return { tab: typeof tab === 'string' && tab.trim() ? tab.trim() : undefined }
  },
  beforeLoad: requirePermission('service_users.read'),
  component: EditServiceUserPage,
})

const schedulingViewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/view',
  beforeLoad: requireScheduleAccess(),
  component: ViewSchedulePage,
})

const schedulingReportRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/report',
  beforeLoad: requireScheduleAccess(),
  component: SchedulingReportPage,
})

const schedulingJobsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/jobs',
  beforeLoad: requireScheduleAccess(),
  component: ManageScheduleJobsPage,
})

const schedulingBuildRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/build',
  beforeLoad: requireScheduleAccess(),
  component: BuildSchedulePage,
})

const schedulingListRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/list',
  beforeLoad: requireScheduleAccess(),
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
  component: () => <EmployeeRouteWrapper tab="staff-list" />,
})

const employeeComplianceRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/compliance',
  beforeLoad: requirePermission('employees.read'),
  component: () => <EmployeeRouteWrapper tab="compliance" />,
})

const employeeReviewStatusRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/review-status',
  beforeLoad: requirePermission('employees.read'),
  component: () => <EmployeeRouteWrapper tab="review-status" />,
})

const employeeSkillsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/skills',
  beforeLoad: requirePermission('employees.read'),
  component: () => <EmployeeRouteWrapper tab="skills" />,
})

const employeeNonCoreActivityRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/non-core-activity',
  beforeLoad: requirePermission('employees.read'),
  component: () => <EmployeeRouteWrapper tab="non-core-activity" />,
})

const employeeReportsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/reports',
  beforeLoad: requirePermission('employees.read'),
  component: () => <EmployeeRouteWrapper tab="reports" />,
})

const employeeTempInspectorRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/temp-inspector',
  beforeLoad: requirePermission('employees.read'),
  component: TempInspectorPage,
})

const employeeGeneralDocumentsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/documents',
  beforeLoad: requirePermission('employees.documents.read'),
  component: GeneralEmployeeDocumentsPage,
})

const employeeAddRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/add',
  beforeLoad: requirePermission('employees.create'),
  component: AddEmployeePage,
})

const employeeEditRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/$employeeId/edit',
  beforeLoad: requirePermission('employees.update'),
  component: EditEmployeePage,
})

const accidentsIncidentsViewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/accidents-incidents/view',
  beforeLoad: requirePermission('incidents.read'),
  component: ViewAccidentsIncidentsPage,
})

const accidentsIncidentsRaiseRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/accidents-incidents/raise',
  beforeLoad: requirePermission('incidents.read'),
  component: RaiseAccidentsIncidentsPage,
})

const accountRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/account',
  component: AccountPage,
})

const adminSecurityRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/security',
  beforeLoad: requirePermission('security.admin'),
  component: SecurityAdminPage,
})

const adminAuditRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/audit',
  beforeLoad: requireAnyPermission('audit.read', 'audit_logs.read'),
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
  component: SettingsPage,
})

const companyDetailsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/settings/company',
  beforeLoad: requireAnyPermission('settings.company.read', 'lookups.read'),
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
    serviceUsersInitialAssessmentRoute,
    serviceUsersAddRoute,
    serviceUsersViewRoute,
    serviceUsersMedicationRoute,
    serviceUsersCarePlanRoute,
    serviceUsersCarePlanFormRoute,
    serviceUsersObservationsRoute,
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
