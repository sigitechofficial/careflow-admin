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
import { AuthLayout } from '@/components/auth/AuthLayout'
import { SessionRefresh } from '@/components/auth/SessionRefresh'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { rootAuthBeforeLoad } from '@/auth/guard'
import type { Permission } from '@/auth/types'

import HomePage from '@/components/pages/HomePage'
import ServiceUsersPage from '@/components/pages/ServiceUsersPage'
import CalendarPage from '@/components/pages/CalendarPage'
import AddServiceUserPage from '@/components/pages/AddServiceUserPage'
import EmployeePage from '@/components/pages/EmployeePage'
import TempInspectorPage from '@/components/pages/TempInspectorPage'
import GeneralEmployeeDocumentsPage from '@/components/pages/GeneralEmployeeDocumentsPage'
import AddEmployeePage from '@/components/pages/AddEmployeePage'
import EditEmployeePage from '@/components/pages/EditEmployeePage'
import ViewSchedulePage from '@/components/pages/ViewSchedulePage'
import SchedulingReportPage from '@/components/pages/SchedulingReportPage'
import ManageScheduleJobsPage from '@/components/pages/ManageScheduleJobsPage'
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

type EmployeeTabId = 'staff-list' | 'compliance' | 'review-status' | 'skills' | 'non-core-activity' | 'reports'

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/service-users': 'Service Users',
  '/service-users/all': 'Service Users',
  '/service-users/calendar': 'Calendar',
  '/service-users/add': 'Add Service User',
  '/scheduling/view': 'View Schedule',
  '/scheduling/report': 'Scheduling Reports',
  '/scheduling/jobs': 'Scheduled Jobs Housekeeping',
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
}

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
  const pathname = useRouterState({ select: s => s.location.pathname })
  const pageTitle =
    pageTitles[pathname] ??
    (/^\/employee\/[^/]+\/edit$/.test(pathname) ? 'Edit Employee' : 'CareAdmin')
  const fullBleed = pathname === '/service-users/all' || pathname === '/scheduling/view'

  return (
    <>
      <SessionRefresh />
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
  component: ServiceUsersPage,
})

const serviceUsersCalendarRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/calendar',
  component: CalendarPage,
})

const serviceUsersAddRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/add',
  beforeLoad: requirePermission('employees.read'),
  component: AddServiceUserPage,
})

const schedulingViewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/view',
  beforeLoad: requirePermission('schedule.read'),
  component: ViewSchedulePage,
})

const schedulingReportRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/report',
  beforeLoad: requirePermission('schedule.read'),
  component: SchedulingReportPage,
})

const schedulingJobsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/jobs',
  beforeLoad: requirePermission('schedule.read'),
  component: ManageScheduleJobsPage,
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

const showcaseRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/showcase',
  component: ComponentShowcase,
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
    serviceUsersAddRoute,
    schedulingViewRoute,
    schedulingReportRoute,
    schedulingJobsRoute,
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
    showcaseRoute,
  ]),
])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />
}
