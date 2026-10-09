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

import { DevUiTraceChip } from '@/dev/DevUiTraceChip'
import { traceUi } from '@/dev/ui-trace'
import { AppToaster } from '@/components/layout/AppToaster'
import { AppLayout } from '@/components/layout/AppLayout'
import { ScrollToTopOnNavigate } from '@/components/layout/ScrollToTopOnNavigate'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { SessionRefresh } from '@/features/auth/components/SessionRefresh'
import { CompanyBrandingBootstrap } from '@/components/company/CompanyBrandingBootstrap'
import {
  OrganisationDisplayFormatProvider,
  useOrganisationDisplayFormat,
} from '@/shared/context/organisation-display-format.context'
import { useCompanyStore } from '@/store/company.store'
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket'
import { UrgentOfficeAlertHost } from '@/features/ecm/components/UrgentOfficeAlertHost'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/features/auth/store'
import { rootAuthBeforeLoad } from '@/features/auth/guard'
import type { Permission } from '@/features/auth/types'

// ΓöÇΓöÇ Service-user pages (canonical) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import ServiceUsersPage from '@/features/service-users/pages/ServiceUsersPage'
import InitialAssessmentChecklistPage from '@/features/service-users/pages/InitialAssessmentChecklistPage'
import ServiceUserInitialAssessmentEnterprisePage from '@/features/service-users/initial-assessment/pages/ServiceUserInitialAssessmentEnterprisePage'
import { validateInitialAssessmentEnterpriseSearch } from '@/features/service-users/initial-assessment/utils/initial-assessment-url-search'
import { validateServiceUserProfileSearch } from '@/features/service-users/service-user-profile-tabs'
import AddServiceUserPage from '@/features/service-users/pages/AddServiceUserPage'
import EditServiceUserPage from '@/features/service-users/pages/EditServiceUserPage'
import ViewServiceUserPage from '@/features/service-users/pages/ViewServiceUserPage'
import ServiceUserProfilePage from '@/features/service-users/pages/ServiceUserProfilePage'
import ServiceUserMedicationPage from '@/features/service-users/pages/ServiceUserMedicationPage'
import ServiceUserInitialAssessmentPage from '@/features/service-users/pages/ServiceUserInitialAssessmentPage'
import ServiceUserCarePlanPage from '@/features/service-users/pages/ServiceUserCarePlanPage'
import ServiceUserCarePlanFormPage from '@/features/service-users/pages/ServiceUserCarePlanFormPage'
import ServiceUserVisitPlanPage from '@/features/service-users/pages/ServiceUserVisitPlanPage'
import ServiceUserTasksPlannerPage from '@/features/service-users/pages/ServiceUserTasksPlannerPage'
import ServiceUserObservationsPage from '@/features/service-users/pages/ServiceUserObservationsPage'
import ServiceUserCommsPage from '@/features/service-users/pages/ServiceUserCommsPage'
import ServiceUserActivityPage from '@/features/service-users/pages/ServiceUserActivityPage'
import ServiceUserEcmPage from '@/features/service-users/pages/ServiceUserEcmPage'
import ServiceUserBodyMapPage from '@/features/service-users/body-map/pages/ServiceUserBodyMapPage'
import ServiceUserDocumentsModulePage from '@/features/service-users/pages/ServiceUserDocumentsModulePage'
import ServiceUserInvoicesModulePage from '@/features/service-users/pages/ServiceUserInvoicesModulePage'
import BodyMapReviewQueuePage from '@/features/service-users/body-map/pages/BodyMapReviewQueuePage'
import InitialAssessmentReviewQueuePage from '@/features/service-users/initial-assessment/pages/InitialAssessmentReviewQueuePage'
import AssessmentReviewQueuePage from '@/features/service-users/assessments/pages/AssessmentReviewQueuePage'
import CarePlanReviewsPage from '@/features/service-users/care-plans/pages/CarePlanReviewsPage'

// ΓöÇΓöÇ Employee pages (canonical) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import EmployeePage from '@/features/employees/pages/EmployeePage'
import GeneralEmployeeDocumentsPage from '@/features/employees/pages/GeneralEmployeeDocumentsPage'
import AddEmployeePage from '@/features/employees/pages/AddEmployeePage'
import EditEmployeePage from '@/features/employees/pages/EditEmployeePage'
import HrDashboardPage from '@/features/hr/pages/HrDashboardPage'
import HrEmployeeProfilePage from '@/features/hr/pages/HrEmployeeProfilePage'
import RecruitmentDashboardPage from '@/features/hr/recruitment/pages/RecruitmentDashboardPage'
import VacanciesPage from '@/features/hr/recruitment/pages/VacanciesPage'
import CandidatesPipelinePage from '@/features/hr/recruitment/pages/CandidatesPipelinePage'
import CandidateDetailPage from '@/features/hr/recruitment/pages/CandidateDetailPage'

// ΓöÇΓöÇ Scheduling pages (canonical) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import ViewSchedulePage from '@/features/scheduling/pages/ViewSchedulePage'
import ScheduleJobsPage from '@/features/scheduling/pages/ScheduleJobsPage'
import CarerVisitHubPage from '@/features/scheduling/pages/CarerVisitHubPage'
import SchedulingReportPage from '@/features/scheduling/pages/SchedulingReportPage'
import ManageScheduleJobsPage from '@/features/scheduling/pages/ManageScheduleJobsPage'
import BuildSchedulePage from '@/features/scheduling/pages/BuildSchedulePage'
import ScheduleListPage from '@/features/scheduling/pages/ScheduleListPage'
import ScheduleTemplatesPage from '@/features/scheduling/pages/ScheduleTemplatesPage'
import BulkGenerateRotaPage from '@/features/scheduling/pages/BulkGenerateRotaPage'
import { ScheduleJobsRouteError } from '@/features/scheduling/pages/ScheduleJobsRouteError'

// ΓöÇΓöÇ Auth pages ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import LoginPage from '@/features/auth/pages/LoginPage'
import PrivacyPolicyPage from '@/features/legal/pages/PrivacyPolicyPage'
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage'
import BlockedIpPage from '@/features/auth/pages/BlockedIpPage'

import PortalLoginPage from '@/features/service-user-portal/pages/PortalLoginPage'
import PortalDashboardPage from '@/features/service-user-portal/pages/PortalDashboardPage'
import PortalProfilePage from '@/features/service-user-portal/pages/PortalProfilePage'
import PortalAboutMePage from '@/features/service-user-portal/pages/PortalAboutMePage'
import PortalContactsPage from '@/features/service-user-portal/pages/PortalContactsPage'
import PortalAllergiesPage from '@/features/service-user-portal/pages/PortalAllergiesPage'
import PortalMedicationsPage from '@/features/service-user-portal/pages/PortalMedicationsPage'
import PortalCalendarPage from '@/features/service-user-portal/pages/PortalCalendarPage'
import PortalPhotosPage from '@/features/service-user-portal/pages/PortalPhotosPage'
import PortalVisitPlansPage from '@/features/service-user-portal/pages/PortalVisitPlansPage'
import PortalCompletedVisitsPage from '@/features/service-user-portal/pages/PortalCompletedVisitsPage'
import PortalSurveysPage from '@/features/service-user-portal/pages/PortalSurveysPage'
import { portalPageTitles } from '@/features/service-user-portal/portal-nav'
import AccountPage from '@/features/account/pages/AccountPage'
import HomePage from '@/features/home/pages/HomePage'
import InProgressPage from '@/features/home/pages/InProgressPage'
import ComponentShowcase from '@/features/home/pages/ComponentShowcase'
import SecurityAdminPage from '@/features/admin/pages/SecurityAdminPage'
import AuditLogPage from '@/features/admin/pages/AuditLogPage'
import ServiceUserPortalAdminPage from '@/features/service-user-portal/pages/ServiceUserPortalAdminPage'
import IncidentsListPage from '@/features/incidents/pages/IncidentsListPage'
import SurveysPage from '@/features/surveys/pages/SurveysPage'
import SurveyBuilderPage from '@/features/surveys/pages/SurveyBuilderPage'
import SurveyResponsesPage from '@/features/surveys/pages/SurveyResponsesPage'
import TakeSurveyPage from '@/features/surveys/pages/TakeSurveyPage'
import HoursApprovalsPage from '@/features/hours-approvals/pages/HoursApprovalsPage'
import RaiseIncidentPage from '@/features/incidents/pages/RaiseIncidentPage'
import IncidentDetailPage from '@/features/incidents/pages/IncidentDetailPage'
import IncidentsDashboardPage from '@/features/incidents/pages/IncidentsDashboardPage'
import MyActionsPage from '@/features/incidents/pages/MyActionsPage'
import IncidentAnalyticsPage from '@/features/incidents/pages/IncidentAnalyticsPage'
import ComplaintsComplimentsPage from '@/features/complaints/pages/ComplaintsComplimentsPage'
import FeedbackDetailPage from '@/features/complaints/pages/FeedbackDetailPage'
import ServiceUserAlertsPage from '@/features/alerts/pages/ServiceUserAlertsPage'
import BillingManagementPage from '@/features/billing/pages/BillingManagementPage'
import InvoiceRunDetailPage from '@/features/billing/pages/InvoiceRunDetailPage'
import VisitReconciliationPage from '@/features/billing/pages/VisitReconciliationPage'
import PayrollRunsPage from '@/features/billing/pages/PayrollRunsPage'
import SalaryOverviewPage from '@/features/billing/pages/SalaryOverviewPage'
import EmployeePayoutsPage from '@/features/billing/pages/EmployeePayoutsPage'
import InvoiceRunsPage from '@/features/billing/pages/InvoiceRunsPage'
import InvoiceAuditTrailPage from '@/features/billing/pages/InvoiceAuditTrailPage'
import ServiceUserInvoicesPage from '@/features/billing/pages/ServiceUserInvoicesPage'
import PaymentsPage from '@/features/billing/pages/PaymentsPage'
import AuditExportPage from '@/features/billing/pages/AuditExportPage'
import EcmLiveMonitoringPage from '@/features/ecm/pages/EcmLiveMonitoringPage'
import EcmGraphPage from '@/features/ecm/pages/EcmGraphPage'
import EcmReportsPage from '@/features/ecm/pages/EcmReportsPage'
import { validateEcmLiveSearch, validateEcmPeriodSearch } from '@/features/ecm/utils/ecm-period-url-state.util'
import PayrollOverviewPage from '@/features/payroll/pages/PayrollOverviewPage'
import PayrollTaxYearsPage from '@/features/payroll/pages/PayrollTaxYearsPage'
import PayrollTaxesPage from '@/features/payroll/pages/PayrollTaxesPage'
import PayrollEmployerSettingsPage from '@/features/payroll/pages/PayrollEmployerSettingsPage'
import PayrollSchedulesPage from '@/features/payroll/pages/PayrollSchedulesPage'
import PayrollEmployeesPage from '@/features/payroll/pages/PayrollEmployeesPage'
import OfficeSalariesPage from '@/features/office-salaries/pages/OfficeSalariesPage'
import SetupChecklistPage from '@/features/setup-checklist/pages/SetupChecklistPage'
import MyTasksPage from '@/features/role-tasks/pages/MyTasksPage'
import CarerReportsPage from '@/features/employees/pages/CarerReportsPage'
import RoleTasksManagePage from '@/features/role-tasks/pages/RoleTasksManagePage'
import UkPayrollRunsPage from '@/features/payroll/pages/UkPayrollRunsPage'
import UkPayrollRunDetailPage from '@/features/payroll/pages/UkPayrollRunDetailPage'
import UkPayrollPayslipsPage from '@/features/payroll/pages/UkPayrollPayslipsPage'
import LearningDashboardPage from '@/features/learning/pages/LearningDashboardPage'
import LearningCoursesPage from '@/features/learning/pages/LearningCoursesPage'
import LearningCourseDetailPage from '@/features/learning/pages/LearningCourseDetailPage'
import LearningCourseNewPage from '@/features/learning/pages/LearningCourseNewPage'
import LearningAssignmentsPage from '@/features/learning/pages/LearningAssignmentsPage'
import LearningCompliancePage from '@/features/learning/pages/LearningCompliancePage'
import LearningTrainingEventsPage from '@/features/learning/pages/LearningTrainingEventsPage'
import LearningCertificatesPage from '@/features/learning/pages/LearningCertificatesPage'
import LearningExternalTrainingPage from '@/features/learning/pages/LearningExternalTrainingPage'
import LearningReportsPage from '@/features/learning/pages/LearningReportsPage'
import LearningSettingsPage from '@/features/learning/pages/LearningSettingsPage'
import PoliciesLibraryPage from '@/features/policies/pages/PoliciesLibraryPage'
import PolicyNewPage from '@/features/policies/pages/PolicyNewPage'
import PolicyDetailPage from '@/features/policies/pages/PolicyDetailPage'
import PolicyEditPage from '@/features/policies/pages/PolicyEditPage'
import PolicyCategoriesPage from '@/features/policies/pages/PolicyCategoriesPage'
import PolicyTagsPage from '@/features/policies/pages/PolicyTagsPage'
import { validatePolicyLibrarySearch } from '@/features/policies/policy-routes'
import {
  BILLING_SECTION_PATHS,
  BILLING_SETUP_TAB_IDS,
  isBillingSectionTab,
} from '@/features/billing/billing-routes'
import type { BillingTabId } from '@/features/billing/types/billing.types'

// ΓöÇΓöÇ Settings pages ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import SettingsPage from '@/features/settings/pages/SettingsPage'
import GeneralSettingsPage from '@/features/settings/pages/GeneralSettingsPage'
import type { GeneralSettingsTabId } from '@/features/settings/pages/GeneralSettingsPage'
import CompanyDetailsPage from '@/features/settings/pages/CompanyDetailsPage'
import LocationManagementPage from '@/features/settings/pages/LocationManagementPage'
import RolesPermissionsPage from '@/features/settings/pages/RolesPermissionsPage'
import CarePathwayPage from '@/features/settings/pages/CarePathwayPage'
import type { SettingsTabId } from '@/features/settings/pages/SettingsPage'

// ΓöÇΓöÇ Calendar + employee misc ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
import CalendarPage from '@/features/service-users/calendar/pages/CalendarPage'
import ServiceUserHoursPage from '@/features/service-users/pages/ServiceUserHoursPage'
import TempInspectorPage from '@/features/employees/pages/TempInspectorPage'
import EmployeeHoursPage from '@/features/employees/pages/EmployeeHoursPage'
import EmployeeAbsencesPage from '@/features/employees/pages/EmployeeAbsencesPage'
import type { LocationManagementSubTab } from '@/features/settings/location-management/location-management.types'
import {
  ROLES_PERMISSIONS_SUB_IDS,
  type RolesPermissionsSubTab,
} from '@/features/settings/roles-permissions/roles-permissions.types'
import {
  CARE_PATHWAY_TAB_IDS,
  type CarePathwayTabId,
} from '@/features/settings/care-pathway/care-pathway.types'
import { serviceUserKeys } from '@/features/service-users/keys'
import { employeeKeys } from '@/features/employees/keys'
import { listServiceUsers, fetchServiceUserLookups } from '@/features/service-users/api'
import { buildServiceUsersListParams } from '@/features/service-users/utils/service-users-list-query'
import {
  enrichServiceUsersListUrlState,
  parseServiceUsersListSearch,
  validateServiceUsersListSearch,
} from '@/features/service-users/utils/service-users-list-url-state.util'
import { validateIncidentsListSearch } from '@/features/incidents/utils/incidents-list-url-state'
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
  prefetchInitialAssessmentEnterprise,
  prefetchInitialAssessmentChecklist,
  prefetchLocationManagement,
  prefetchSchedulingBuild,
  prefetchSchedulingJobs,
  prefetchSchedulingList,
  prefetchSchedulingReport,
  prefetchSchedulingScheduleJobs,
  prefetchSchedulingView,
  prefetchServiceUserCalendar,
  prefetchServiceUserCarePlanFormRoute,
  prefetchServiceUserCarePlanRoute,
  prefetchServiceUserVisitPlanRoute,
  prefetchServiceUserEditRoute,
  prefetchServiceUserMedicationRoute,
  prefetchServiceUserObservationsRoute,
  prefetchServiceUserBodyMapRoute,
  prefetchServiceUserDocumentsRoute,
  prefetchServiceUserProfile,
  prefetchSettingsTab,
  prefetchTemporaryInspectors,
} from '@/app/prefetch-routes'

/** Context type shared across all route loaders. */
type RouterContext = {
  queryClient: QueryClient
}

type EmployeeTabId = 'staff-list' | 'compliance' | 'review-status' | 'skills' | 'non-core-activity' | 'allocations' | 'reports'

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/service-users': 'Service Users',
  '/service-users/all': 'Service Users',
  '/service-users/hours': 'Service User hours',
  '/service-users/calendar': 'Calendar',
  '/service-users/initial-assessment': 'Initial Assessment',
  '/service-users/initial-assessment-checklist': 'Initial Assessment (Legacy)',
  '/service-users/add': 'Add Service User',
  '/service-users/$serviceUserId/profile': 'Profile',
  '/service-users/$serviceUserId/alerts': 'Medical & alerts',
  '/service-users/$serviceUserId/invoices': 'Invoices',
  '/service-users/$serviceUserId': 'Edit Service User',
  '/scheduling/view': 'View Schedule',
  '/scheduling/schedule-jobs': 'Schedule Jobs',
  '/scheduling/visits/$jobId': 'Visit',
  '/scheduling/report': 'Scheduling Reports',
  '/scheduling/jobs': 'Scheduled Jobs Housekeeping',
  '/scheduling/build': 'Build Schedule',
  '/scheduling/list': 'List View of Schedule',
  '/scheduling/templates': 'Schedule Templates',
  '/scheduling/bulk-generate-rota': 'Bulk Generate Rota',
  '/employee': 'Employee',
  '/employee/staff-list': 'Employee',
  '/employee/hours': 'Employee hours',
  '/employee/absences': 'Absence tracker',
  '/employee/compliance': 'Compliance board',
  '/employee/review-status': 'Employee',
  '/employee/skills': 'Employee',
  '/employee/non-core-activity': 'Employee',
  '/employee/allocations': 'Employee',
  '/employee/reports': 'Employee',
  '/employee/temp-inspector': 'Temporary Inspector Login',
  '/employee/documents': 'General Employee Documents',
  '/employee/add': 'Add Employee',
  '/hr': 'HR',
  '/hr/employees': 'HR Employees',
  '/hr/recruitment': 'Recruitment',
  '/hr/vacancies': 'Vacancies',
  '/hr/candidates': 'Candidates',
  '/hr/candidates/$candidateId': 'Candidate',
  '/accidents-incidents/view': 'View Accidents & Incidents',
  '/accidents-incidents/raise': 'Raise Accidents & Incidents',
  '/incidents/feedback': 'Complaints & Compliments',
  '/incidents/feedback/$feedbackId': 'Complaints & Compliments',
  '/account': 'My account',
  '/admin/security': 'Security administration',
  '/admin/audit': 'Audit log',
  '/in-progress': 'Page in progress',
  '/showcase': 'UI showcase',
  '/settings': 'Settings',
  '/settings/company': 'Company Details',
  '/settings/general': 'General Settings',
  '/settings/location-management': 'Location Management',
  '/settings/users-access': 'Users & access',
  '/settings/roles-permissions': 'Roles & permissions',
  '/settings/care-pathway': 'Care Pathway',
  '/billing': 'Billing Management',
  '/billing/visit-reconciliation': 'Visit reconciliation',
  '/billing/payroll-runs': 'Visit pay runs',
  '/billing/salary': 'Salary',
  '/billing/employee-payouts': 'Employee payouts',
  '/billing/service-user-invoices': 'Service user invoices',
  '/billing/invoice-runs': 'Invoice runs',
  '/billing/invoice-runs/$invoiceRunId': 'Invoice run',
  '/billing/invoice-audit-trail': 'Invoice audit trail',
  '/billing/payments': 'Payments',
  '/billing/audit-export': 'Audit & export',
  '/ecm/live': 'ECM live monitoring',
  '/ecm/graph': 'ECM graphs',
  '/ecm/reports': 'ECM reports',
  '/payroll': 'UK Payroll',
  '/payroll/tax-years': 'Tax years',
  '/payroll/taxes': 'Taxes',
  '/payroll/employer': 'Employer PAYE',
  '/payroll/schedules': 'Schedules & periods',
  '/payroll/employees': 'Employee payroll setup',
  '/office-salaries': 'Office salaries',
  '/checklist': 'Checklist',
  '/my-tasks': 'My tasks',
  '/reports/carers': 'Carer reports',
  '/role-tasks': 'Role tasks',
  '/payroll/runs': 'UK payroll runs',
  '/payroll/runs/$runId': 'UK payroll run',
  '/payroll/payslips': 'Payslips',
  '/learning/dashboard': 'Learning dashboard',
  '/learning/courses': 'Learning courses',
  '/learning/courses/new': 'New course',
  '/learning/courses/$courseId': 'Course detail',
  '/learning/assignments': 'Learning assignments',
  '/learning/compliance': 'Learning compliance',
  '/learning/training-events': 'Training events',
  '/learning/certificates': 'Learning certificates',
  '/learning/external-training': 'External training',
  '/learning/reports': 'Learning reports',
  '/learning/settings': 'Learning settings',
  '/policies': 'Policy Library',
  '/policies/new': 'Create policy',
  '/policies/$policyId': 'Policy',
  '/policies/$policyId/edit': 'Edit policy',
  '/policies/categories': 'Policy categories',
  '/policies/tags': 'Policy tags',
}

const SETTINGS_TAB_IDS: SettingsTabId[] = [
  'job-titles',
  'skills',
  'compliance',
  'work-areas',
  'contract-types',
  'grades',
  'certifications',
  'non-core',
  'leaving-reasons',
  'visit-status-reasons',
  'review-types',
  'travel-payment',
  'medication',
  'time-slots',
  'care-types',
  'funding-types',
  'record-types',
  'allergies',
  'tasks-planner',
  'vital-ranges',
  'welfare-outcomes',
  'clock-in-arrival-reasons',
  'manual-authorisation-reasons',
  'left-area-allow-reasons',
  'clock-out-end-reasons',
  'outcome-reasons',
  'ecm-thresholds',
  'emergency-protocols',
]

const LOCATION_MANAGEMENT_SUB_IDS: LocationManagementSubTab[] = [
  'zones',
  'service-users',
  'employees',
]

const BILLING_TAB_IDS: BillingTabId[] = [
  ...BILLING_SETUP_TAB_IDS,
  'visit-reconciliation',
  'payroll-runs',
  'invoice-runs',
  'invoice-audit-trail',
  'payments',
  'audit-export',
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

  return (
    <>
      <ScrollToTopOnNavigate />
      <Outlet />
    </>
  )
}

function AppRootShell() {
  useNotificationSocket()
  const companyDisplayName = useCompanyStore(s => s.branding?.displayName)
  const pathname = useRouterState({ select: s => s.location.pathname })
  const search = useRouterState({ select: s => s.location.search })

  React.useEffect(() => {
    traceUi('NAV', 'route', { pathname, search })
  }, [pathname, search])

  const pageTitle =
    pageTitles[pathname] ??
    (/^\/employee\/[^/]+\/edit$/.test(pathname)
      ? 'Edit Employee'
      : /^\/service-users\/[^/]+\/profile$/.test(pathname)
        ? 'Profile'
      : /^\/service-users\/[^/]+\/view$/.test(pathname)
        ? 'Service User'
      : /^\/service-users\/[^/]+\/invoices$/.test(pathname)
        ? 'Invoices'
        : /^\/service-users\/[^/]+\/medication$/.test(pathname)
          ? 'Medication'
          : /^\/service-users\/[^/]+\/observations$/.test(pathname)
            ? 'Observations'
            : /^\/service-users\/[^/]+\/comms$/.test(pathname)
              ? 'Communication Notes'
            : /^\/service-users\/[^/]+\/initial-assessment$/.test(pathname)
              ? 'Initial Assessment'
            : /^\/service-users\/[^/]+\/ecm$/.test(pathname)
              ? 'ECM'
            : /^\/service-users\/[^/]+\/body-map$/.test(pathname)
                ? 'Body Map'
              : /^\/service-users\/[^/]+\/documents$/.test(pathname)
                ? 'Documents'
              : pathname === '/body-map/review-queue'
                ? 'Body Map Review Queue'
              : pathname === '/care-plans/reviews'
                ? 'Care Plan Reviews'
            : /^\/service-users\/[^/]+\/care-plan(\/forms\/[^/]+)?$/.test(pathname)
              ? 'Care Plan'
            : /^\/service-users\/[^/]+\/visit-plan$/.test(pathname)
              ? 'Visit Plan'
            : /^\/service-users\/[^/]+\/activity$/.test(pathname)
              ? 'Visit Activity'
            : /^\/service-users\/[^/]+\/tasks-planner$/.test(pathname)
              ? 'Tasks Planner'
            : /^\/service-users\/[^/]+$/.test(pathname)
            ? 'Edit Service User'
            : companyDisplayName?.trim() || 'CareAdmin')
  const serviceUserIdPath = pathname.match(/^\/service-users\/([^/]+)$/)
  const serviceUserStaticSegments = new Set([
    'all',
    'add',
    'hours',
    'calendar',
    'initial-assessment',
    'initial-assessment-checklist',
  ])
  const isServiceUserDetailRoot =
    Boolean(serviceUserIdPath?.[1]) && !serviceUserStaticSegments.has(serviceUserIdPath![1]!)

  const fullBleed =
    pathname === '/service-users/all' ||
    pathname === '/service-users/initial-assessment' ||
    pathname === '/scheduling/view' ||
    pathname === '/scheduling/schedule-jobs' ||
    /^\/service-users\/[^/]+\/profile$/.test(pathname) ||
    /^\/service-users\/[^/]+\/view$/.test(pathname) ||
    /^\/service-users\/[^/]+\/invoices$/.test(pathname) ||
    /^\/service-users\/[^/]+\/medication$/.test(pathname) ||
    /^\/service-users\/[^/]+\/observations$/.test(pathname) ||
    /^\/service-users\/[^/]+\/comms$/.test(pathname) ||
    /^\/service-users\/[^/]+\/initial-assessment$/.test(pathname) ||
    /^\/service-users\/[^/]+\/ecm$/.test(pathname) ||
    /^\/service-users\/[^/]+\/body-map$/.test(pathname) ||
    /^\/service-users\/[^/]+\/documents$/.test(pathname) ||
    /^\/service-users\/[^/]+\/care-plan(\/forms\/[^/]+)?$/.test(pathname) ||
    /^\/service-users\/[^/]+\/visit-plan$/.test(pathname) ||
    /^\/service-users\/[^/]+\/activity$/.test(pathname) ||
    /^\/service-users\/[^/]+\/tasks-planner$/.test(pathname) ||
    isServiceUserDetailRoot
  const employeeManagementWide =
    /^\/employee(?:\/(?:staff-list|hours|compliance|review-status|skills|non-core-activity|reports|add)|\/[^/]+\/edit)?$/.test(
      pathname,
    ) || pathname === '/hours-approvals'
  const serviceUserHoursWide = pathname === '/service-users/hours'
  const contentLayout =
    fullBleed ? 'full' : employeeManagementWide || serviceUserHoursWide ? 'wide' : 'default'

  return (
    <>
      <SessionRefresh />
      <CompanyBrandingBootstrap />
      <OrganisationDisplayFormatProvider>
        <AppToaster />
        <UrgentOfficeAlertHost />
        <DevUiTraceChip />
        <AppLayout pageTitle={pageTitle} contentLayout={contentLayout}>
          <Outlet />
        </AppLayout>
      </OrganisationDisplayFormatProvider>
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

const legalPrivacyPolicyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legal/privacy-policy',
  component: PrivacyPolicyPage,
})

const publicTakeSurveyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/survey/$token',
  component: TakeSurveyPage,
})

/** Portal pages format dates with plain helpers, so render them once org settings have loaded. */
function PortalOutlet() {
  const { timezoneReady } = useOrganisationDisplayFormat()
  if (!timezoneReady) return null
  return <Outlet />
}

function PortalRootShell() {
  const companyDisplayName = useCompanyStore(s => s.branding?.displayName)
  const pathname = useRouterState({ select: s => s.location.pathname })

  const pageTitle = portalPageTitles[pathname] ?? companyDisplayName?.trim() ?? 'My care portal'

  return (
    <>
      <SessionRefresh />
      <CompanyBrandingBootstrap />
      <OrganisationDisplayFormatProvider portal>
        <AppToaster />
        <AppLayout pageTitle={pageTitle} variant="portal">
          <PortalOutlet />
        </AppLayout>
      </OrganisationDisplayFormatProvider>
    </>
  )
}

const portalLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/portal/login',
  component: PortalLoginPage,
})

const portalShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'portal',
  component: PortalRootShell,
})

const portalIndexRoute = createRoute({
  getParentRoute: () => portalShellRoute,
  path: '/portal',
  component: PortalDashboardPage,
})

const portalProfileRoute = createRoute({
  getParentRoute: () => portalShellRoute,
  path: '/portal/profile',
  component: PortalProfilePage,
})

const portalAboutMeRoute = createRoute({
  getParentRoute: () => portalShellRoute,
  path: '/portal/about-me',
  component: PortalAboutMePage,
})

const portalContactsRoute = createRoute({
  getParentRoute: () => portalShellRoute,
  path: '/portal/contacts',
  component: PortalContactsPage,
})

const portalAllergiesRoute = createRoute({
  getParentRoute: () => portalShellRoute,
  path: '/portal/allergies',
  component: PortalAllergiesPage,
})

const portalMedicationsRoute = createRoute({
  getParentRoute: () => portalShellRoute,
  path: '/portal/medications',
  component: PortalMedicationsPage,
})

const portalCalendarRoute = createRoute({
  getParentRoute: () => portalShellRoute,
  path: '/portal/calendar',
  component: PortalCalendarPage,
})

const portalPhotosRoute = createRoute({
  getParentRoute: () => portalShellRoute,
  path: '/portal/photos',
  component: PortalPhotosPage,
})

const portalVisitPlansRoute = createRoute({
  getParentRoute: () => portalShellRoute,
  path: '/portal/visit-plans',
  component: PortalVisitPlansPage,
})

const portalCompletedVisitsRoute = createRoute({
  getParentRoute: () => portalShellRoute,
  path: '/portal/completed-visits',
  component: PortalCompletedVisitsPage,
})

const portalSurveysRoute = createRoute({
  getParentRoute: () => portalShellRoute,
  path: '/portal/surveys',
  component: PortalSurveysPage,
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
  validateSearch: validateServiceUsersListSearch,
  loader: async ({ context: { queryClient: qc }, location }) => {
    const lookups = await qc.fetchQuery({
      queryKey: serviceUserKeys.lookups(),
      queryFn: () => fetchServiceUserLookups(),
      staleTime: 10 * 60 * 1000,
    })
    const urlState = enrichServiceUsersListUrlState(
      parseServiceUsersListSearch(location.search as Record<string, unknown>),
      lookups,
    )
    const listParams = buildServiceUsersListParams(lookups, {
      page: urlState.page,
      search: urlState.search,
      listFilter: urlState.listFilter,
      statusFilter: urlState.statusFilter,
      onHoldOnly: urlState.onHoldOnly,
      riskLevelCode: urlState.riskFilter,
      unassignedKeyWorker: urlState.unassignedOnly,
      advanced: urlState.advanced,
    })
    void qc.prefetchQuery({
      queryKey: serviceUserKeys.list(listParams),
      queryFn: () => listServiceUsers(listParams),
      staleTime: 30_000,
    })
  },
  component: ServiceUsersPage,
})

const serviceUsersHoursRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/hours',
  beforeLoad: requirePermission('service_users.read'),
  component: ServiceUserHoursPage,
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
  loader: async ({ context: { queryClient: qc }, location }) => {
    const serviceUserId =
      typeof location.search === 'object' &&
      location.search !== null &&
      'serviceUserId' in location.search &&
      typeof (location.search as { serviceUserId?: string }).serviceUserId === 'string'
        ? (location.search as { serviceUserId: string }).serviceUserId.trim()
        : undefined
    await prefetchInitialAssessmentEnterprise(qc, serviceUserId || undefined)
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
  } => {
    const focus = raw.focus
    const next: { focus?: string } = {}
    if (typeof focus === 'string' && focus.trim()) next.focus = focus.trim()
    return next
  },
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserProfile(qc, serviceUserId)
  },
  component: ViewServiceUserPage,
})

const serviceUsersProfileRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/profile',
  validateSearch: validateServiceUserProfileSearch,
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserEditRoute(qc, serviceUserId)
  },
  component: ServiceUserProfilePage,
})

const serviceUsersInvoicesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/invoices',
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserEditRoute(qc, serviceUserId)
  },
  component: ServiceUserInvoicesModulePage,
})

const serviceUsersMedicationRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/medication',
  beforeLoad: requirePermission('service_users.read'),
  validateSearch: (
    raw: Record<string, unknown>,
  ): {
    view?: 'calendar' | 'supply' | 'packs' | 'events' | 'reviews' | 'export' | 'support' | 'activity' | 'allergies'
    from?: string
    submissionId?: string
  } => {
    const v = raw.view
    const out: {
      view?: 'calendar' | 'supply' | 'packs' | 'events' | 'reviews' | 'export' | 'support' | 'activity' | 'allergies'
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
      v === 'activity' ||
      v === 'allergies'
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

const serviceUsersInitialAssessmentPerUserRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/initial-assessment',
  beforeLoad: requireAnyPermission(
    'service_users.initial_assessment.read',
    'service_users.read',
  ),
  component: ServiceUserInitialAssessmentPage,
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

const serviceUsersTasksPlannerRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/tasks-planner',
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserProfile(qc, serviceUserId)
  },
  component: ServiceUserTasksPlannerPage,
})

const serviceUsersVisitPlanRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/visit-plan',
  validateSearch: (raw: Record<string, unknown>): {
    planId?: string
    view?: 'details'
    detailsTab?: 'calendar' | 'history' | 'guide' | 'care-pathway' | 'dev-tools'
  } => {
    const planId = raw.planId
    const view = raw.view === 'details' ? 'details' : undefined
    const detailsTab =
      raw.detailsTab === 'calendar' ||
      raw.detailsTab === 'history' ||
      raw.detailsTab === 'guide' ||
      raw.detailsTab === 'care-pathway' ||
      raw.detailsTab === 'dev-tools'
        ? raw.detailsTab
        : undefined
    return {
      planId: typeof planId === 'string' && planId.trim() ? planId.trim() : undefined,
      view,
      detailsTab,
    }
  },
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserVisitPlanRoute(qc, serviceUserId)
  },
  component: ServiceUserVisitPlanPage,
})

const serviceUsersActivityRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/activity',
  beforeLoad: requireAnyPermission('service_users.read', 'scheduled_visits.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserProfile(qc, serviceUserId)
  },
  component: ServiceUserActivityPage,
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

const serviceUsersCommsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/comms',
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserProfile(qc, serviceUserId)
  },
  component: ServiceUserCommsPage,
})

const serviceUsersEcmRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/ecm',
  beforeLoad: requireAnyPermission('ecm.read', 'ecm.monitor'),
  component: ServiceUserEcmPage,
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
      recordId?: string
    } = {}
    if (typeof raw.linkMedicationId === 'string' && raw.linkMedicationId.trim()) {
      search.linkMedicationId = raw.linkMedicationId.trim()
    }
    if (typeof raw.recordId === 'string' && raw.recordId.trim()) {
      search.recordId = raw.recordId.trim()
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

const serviceUsersAlertsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/alerts',
  beforeLoad: requirePermission('service_users.read'),
  component: ServiceUserAlertsPage,
})

const serviceUsersDocumentsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/service-users/$serviceUserId/documents',
  beforeLoad: requirePermission('service_users.read'),
  loader: ({ context: { queryClient: qc }, params: { serviceUserId } }) => {
    prefetchServiceUserDocumentsRoute(qc, serviceUserId)
  },
  component: ServiceUserDocumentsModulePage,
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

const carePlanReviewsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/care-plans/reviews',
  beforeLoad: requirePermission('service_users.read'),
  component: CarePlanReviewsPage,
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

const schedulingScheduleJobsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/schedule-jobs',
  beforeLoad: requireScheduleAccess(),
  loader: ({ context: { queryClient: qc } }) => {
    prefetchSchedulingScheduleJobs(qc)
  },
  component: ScheduleJobsPage,
  errorComponent: ScheduleJobsRouteError,
})

const schedulingCarerVisitHubRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/visits/$jobId',
  beforeLoad: requireScheduleAccess(),
  component: CarerVisitHubPage,
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

const schedulingBulkGenerateRotaRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/bulk-generate-rota',
  beforeLoad: requireAnyPermission(
    'scheduling.generate_from_visit_plan',
    'schedules.build',
    'scheduled_visits.create',
  ),
  component: BulkGenerateRotaPage,
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
  validateSearch: (raw: Record<string, unknown>): {
    q?: string
    status?: string
    branch?: string
    role?: string
    jobTitle?: string
    grade?: string
    contract?: string
    immigration?: string
    inCountry?: 'in' | 'out'
    branchScope?: string
    compliance?: 'needs_attention' | 'up_to_date'
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } => {
    const out: {
      q?: string
      status?: string
      branch?: string
      role?: string
      jobTitle?: string
      grade?: string
      contract?: string
      immigration?: string
      inCountry?: 'in' | 'out'
      branchScope?: string
      compliance?: 'needs_attention' | 'up_to_date'
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    } = {}
    if (typeof raw.q === 'string' && raw.q.trim()) out.q = raw.q.trim()
    if (typeof raw.status === 'string' && raw.status.trim()) out.status = raw.status.trim()
    if (typeof raw.branch === 'string' && raw.branch.trim()) out.branch = raw.branch.trim()
    if (typeof raw.role === 'string' && raw.role.trim()) out.role = raw.role.trim()
    if (typeof raw.jobTitle === 'string' && raw.jobTitle.trim()) out.jobTitle = raw.jobTitle.trim()
    if (typeof raw.grade === 'string' && raw.grade.trim()) out.grade = raw.grade.trim()
    if (typeof raw.contract === 'string' && raw.contract.trim()) out.contract = raw.contract.trim()
    if (typeof raw.immigration === 'string' && raw.immigration.trim()) {
      out.immigration = raw.immigration.trim()
    }
    if (raw.inCountry === 'in' || raw.inCountry === 'out') out.inCountry = raw.inCountry
    if (typeof raw.branchScope === 'string' && raw.branchScope.trim()) {
      out.branchScope = raw.branchScope.trim()
    }
    if (raw.compliance === 'needs_attention' || raw.compliance === 'up_to_date') {
      out.compliance = raw.compliance
    }
    if (typeof raw.sortBy === 'string' && raw.sortBy.trim()) out.sortBy = raw.sortBy.trim()
    if (raw.sortOrder === 'asc' || raw.sortOrder === 'desc') out.sortOrder = raw.sortOrder
    return out
  },
  loader: ({ context: { queryClient: qc } }) => {
    prefetchEmployeeTab(qc, 'staff-list')
  },
  component: () => <EmployeeRouteWrapper tab="staff-list" />,
})

const employeeHoursRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/hours',
  beforeLoad: requireAnyPermission('employees.read', 'employees.reports.read'),
  component: EmployeeHoursPage,
})

const employeeAbsencesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/absences',
  beforeLoad: requireAnyPermission('employees.read', 'employees.reports.read'),
  component: EmployeeAbsencesPage,
})

const employeeComplianceRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/compliance',
  beforeLoad: requireAnyPermission(
    'employees.read',
    'employees.compliance.read',
    'employees.compliance.reports.read',
  ),
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

const employeeAllocationsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/allocations',
  beforeLoad: requirePermission('employees.read'),
  component: () => <EmployeeRouteWrapper tab="allocations" />,
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
  validateSearch: (raw: Record<string, unknown>): { tab?: string; complianceType?: string } => {
    const tab = typeof raw.tab === 'string' && raw.tab.trim() ? raw.tab.trim() : undefined
    const complianceType =
      typeof raw.complianceType === 'string' && raw.complianceType.trim()
        ? raw.complianceType.trim().toUpperCase()
        : undefined
    return {
      ...(tab ? { tab } : {}),
      ...(complianceType ? { complianceType } : {}),
    }
  },
  beforeLoad: requireAnyPermission('employees.update', 'employees.compliance.update'),
  loader: ({ context: { queryClient: qc }, params: { employeeId } }) => {
    prefetchEmployeeEditRoute(qc, employeeId)
  },
  component: EditEmployeePage,
})

const hrIndexRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/hr',
  beforeLoad: () => {
    throw redirect({ to: '/hr/employees' })
  },
})

const hrEmployeesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/hr/employees',
  beforeLoad: requirePermission('hr.read'),
  component: HrDashboardPage,
})

const hrEmployeeProfileRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/hr/employees/$employeeId',
  beforeLoad: requirePermission('hr.read'),
  component: HrEmployeeProfilePage,
})

const hrRecruitmentRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/hr/recruitment',
  beforeLoad: requireAnyPermission('hr.vacancies.read', 'hr.candidates.read'),
  component: RecruitmentDashboardPage,
})

const hrVacanciesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/hr/vacancies',
  beforeLoad: requirePermission('hr.vacancies.read'),
  component: VacanciesPage,
})

const hrCandidatesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/hr/candidates',
  validateSearch: (raw: Record<string, unknown>): { vacancyId?: string } => {
    const vacancyId =
      typeof raw.vacancyId === 'string' && raw.vacancyId.trim() ? raw.vacancyId.trim() : undefined
    return vacancyId ? { vacancyId } : {}
  },
  beforeLoad: requirePermission('hr.candidates.read'),
  component: CandidatesPipelinePage,
})

const hrCandidateDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/hr/candidates/$candidateId',
  beforeLoad: requirePermission('hr.candidates.read'),
  component: CandidateDetailPage,
})

// Legacy URLs kept for old bookmarks/links; the API-backed Incident module replaces these pages.
const accidentsIncidentsViewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/accidents-incidents/view',
  beforeLoad: () => {
    throw redirect({ to: '/incidents/view' })
  },
})

const accidentsIncidentsRaiseRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/accidents-incidents/raise',
  beforeLoad: () => {
    throw redirect({ to: '/incidents/raise' })
  },
})

// Incident Management module (real, API-backed).
const incidentsDashboardRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/incidents/dashboard',
  beforeLoad: requirePermission('incidents.read'),
  component: IncidentsDashboardPage,
})

const surveysRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys',
  beforeLoad: requirePermission('surveys.read'),
  component: SurveysPage,
})

const surveyBuilderRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys/$surveyId',
  beforeLoad: requirePermission('surveys.read'),
  component: SurveyBuilderPage,
})

const surveyResponsesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys/$surveyId/responses',
  beforeLoad: requirePermission('surveys.read'),
  component: SurveyResponsesPage,
})

const hoursApprovalsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/hours-approvals',
  beforeLoad: requirePermission('hours_approvals.read'),
  component: HoursApprovalsPage,
})

const incidentsListRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/incidents/view',
  beforeLoad: requirePermission('incidents.read'),
  validateSearch: validateIncidentsListSearch,
  component: IncidentsListPage,
})

const incidentsRaiseRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/incidents/raise',
  beforeLoad: requirePermission('incidents.create'),
  component: RaiseIncidentPage,
})

const incidentsMyActionsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/incidents/my-actions',
  beforeLoad: () => {
    const { can, user } = useAuthStore.getState()
    if (user?.role === 'super_admin' || !can('incidents.read')) {
      throw redirect({ to: '/' })
    }
  },
  component: MyActionsPage,
})

const incidentsAnalyticsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/incidents/analytics',
  beforeLoad: requirePermission('incidents.view_analytics'),
  component: IncidentAnalyticsPage,
})

const complaintsComplimentsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/incidents/feedback',
  validateSearch: (raw: Record<string, unknown>): { tab?: 'complaints' | 'compliments' } =>
    raw.tab === 'compliments' || raw.tab === 'complaints' ? { tab: raw.tab } : {},
  beforeLoad: requirePermission('complaints.read'),
  component: ComplaintsComplimentsPage,
})

const feedbackDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/incidents/feedback/$feedbackId',
  beforeLoad: requirePermission('complaints.read'),
  component: FeedbackDetailPage,
})

const incidentDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/incidents/$incidentId',
  beforeLoad: requirePermission('incidents.read'),
  component: IncidentDetailPage,
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
  validateSearch: (raw: Record<string, unknown>): { search?: string; module?: string } => ({
    search: typeof raw.search === 'string' ? raw.search : undefined,
    module: typeof raw.module === 'string' ? raw.module : undefined,
  }),
  // Audit buffer hydrated at app boot via loadAuditFromStorage()
  component: AuditLogPage,
})

const adminServiceUserPortalRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/service-user-portal',
  beforeLoad: requirePermission('service_users.portal.read'),
  component: ServiceUserPortalAdminPage,
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

function locationManagementSearchFromLegacySettings(searchStr: string): {
  sub?: LocationManagementSubTab
} {
  const params = new URLSearchParams(searchStr.startsWith('?') ? searchStr.slice(1) : searchStr)
  const sub = params.get('sub')
  if (sub && LOCATION_MANAGEMENT_SUB_IDS.includes(sub as LocationManagementSubTab)) {
    return { sub: sub as LocationManagementSubTab }
  }
  return { sub: 'zones' }
}

function isLegacyLocationsSettingsTab(location: { search: unknown; searchStr?: string }): boolean {
  if (typeof location.search === 'object' && location.search !== null && 'tab' in location.search) {
    if ((location.search as { tab?: unknown }).tab === 'locations') return true
  }
  const raw = location.searchStr ?? ''
  const params = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw)
  return params.get('tab') === 'locations'
}

const settingsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/settings',
  validateSearch: (raw: Record<string, unknown>): { tab?: SettingsTabId | 'locations' } => {
    const t = raw.tab
    if (t === 'locations') return { tab: 'locations' }
    if (typeof t === 'string' && SETTINGS_TAB_IDS.includes(t as SettingsTabId)) {
      return { tab: t as SettingsTabId }
    }
    return {}
  },
  beforeLoad: ({ search, location }) => {
    if (search.tab === 'locations' || isLegacyLocationsSettingsTab(location)) {
      throw redirect({
        to: '/settings/location-management',
        search: locationManagementSearchFromLegacySettings(location.searchStr ?? ''),
      })
    }
    requirePermission('lookups.read')()
  },
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

const usersAccessRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/settings/users-access',
  beforeLoad: () => {
    throw redirect({
      to: '/settings/roles-permissions',
      search: { sub: 'office-users' },
    })
  },
})

const rolesPermissionsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/settings/roles-permissions',
  validateSearch: (raw: Record<string, unknown>): { sub?: RolesPermissionsSubTab } => {
    const sub = raw.sub
    if (
      typeof sub === 'string' &&
      ROLES_PERMISSIONS_SUB_IDS.includes(sub as RolesPermissionsSubTab)
    ) {
      return { sub: sub as RolesPermissionsSubTab }
    }
    return { sub: 'office-users' }
  },
  beforeLoad: requireAnyPermission('users.read', 'roles.manage', 'permissions.manage'),
  component: RolesPermissionsPage,
})

const billingRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing',
  validateSearch: (raw: Record<string, unknown>): { tab?: BillingTabId } => {
    const t = raw.tab
    if (typeof t === 'string' && BILLING_TAB_IDS.includes(t as BillingTabId)) {
      return { tab: t as BillingTabId }
    }
    return { tab: 'dashboard' }
  },
  beforeLoad: ({ search }) => {
    const tab = search.tab
    if (typeof tab === 'string' && isBillingSectionTab(tab)) {
      throw redirect({ to: BILLING_SECTION_PATHS[tab] })
    }
  },
  component: BillingManagementPage,
})

const billingVisitReconciliationRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/visit-reconciliation',
  validateSearch: (raw: Record<string, unknown>): { employeeId?: string; serviceUserId?: string } => {
    const employeeId = typeof raw.employeeId === 'string' && raw.employeeId.trim() ? raw.employeeId.trim() : undefined
    const serviceUserId =
      typeof raw.serviceUserId === 'string' && raw.serviceUserId.trim()
        ? raw.serviceUserId.trim()
        : undefined
    return {
      ...(employeeId ? { employeeId } : {}),
      ...(serviceUserId ? { serviceUserId } : {}),
    }
  },
  beforeLoad: requirePermission('billing.visit_reconciliations.read'),
  component: VisitReconciliationPage,
})

const billingPayrollRunsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/payroll-runs',
  beforeLoad: requirePermission('billing.payroll_runs.read'),
  component: PayrollRunsPage,
})

const billingSalaryRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/salary',
  beforeLoad: requireAnyPermission(
    'billing.payroll_runs.read',
    'employees.read',
    'employees.update',
  ),
  component: SalaryOverviewPage,
})

const billingEmployeePayoutsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/employee-payouts',
  beforeLoad: requirePermission('billing.employee_payouts.read'),
  component: EmployeePayoutsPage,
})

const billingServiceUserInvoicesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/service-user-invoices',
  beforeLoad: requirePermission('billing.invoice_runs.read'),
  validateSearch: (raw: Record<string, unknown>): { serviceUserId?: string } => {
    const id = typeof raw.serviceUserId === 'string' ? raw.serviceUserId.trim() : ''
    return id ? { serviceUserId: id } : {}
  },
  component: ServiceUserInvoicesPage,
})

const billingInvoiceRunsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/invoice-runs',
  beforeLoad: requirePermission('billing.invoice_runs.read'),
  component: InvoiceRunsPage,
})

const billingInvoiceRunDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/invoice-runs/$invoiceRunId',
  beforeLoad: requirePermission('billing.invoice_runs.read'),
  component: InvoiceRunDetailPage,
})

const billingInvoiceAuditTrailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/invoice-audit-trail',
  beforeLoad: requirePermission('billing.invoice_runs.read'),
  validateSearch: (raw: Record<string, unknown>): { invoiceRunId?: string } => {
    const id = typeof raw.invoiceRunId === 'string' ? raw.invoiceRunId.trim() : ''
    return id ? { invoiceRunId: id } : {}
  },
  component: InvoiceAuditTrailPage,
})

const billingPaymentsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/payments',
  beforeLoad: requirePermission('billing.payments.read'),
  component: PaymentsPage,
})

const billingAuditExportRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/audit-export',
  component: AuditExportPage,
})

const ecmLiveRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/ecm/live',
  validateSearch: validateEcmLiveSearch,
  beforeLoad: requireAnyPermission('ecm.read', 'ecm.monitor'),
  component: EcmLiveMonitoringPage,
})

const ecmGraphRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/ecm/graph',
  validateSearch: validateEcmPeriodSearch,
  beforeLoad: requireAnyPermission('ecm.read', 'ecm.monitor'),
  component: EcmGraphPage,
})

const ecmReportsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/ecm/reports',
  validateSearch: validateEcmPeriodSearch,
  beforeLoad: requireAnyPermission('ecm.read', 'ecm.reports.export'),
  component: EcmReportsPage,
})

const payrollOverviewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll',
  beforeLoad: requireAnyPermission(
    'payroll.settings.read',
    'payroll.runs.read',
    'payroll.employees.read',
  ),
  component: PayrollOverviewPage,
})

const payrollTaxYearsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/tax-years',
  beforeLoad: requirePermission('payroll.settings.read'),
  component: PayrollTaxYearsPage,
})

const payrollTaxesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/taxes',
  beforeLoad: requirePermission('payroll.settings.read'),
  component: PayrollTaxesPage,
})

const payrollEmployerRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/employer',
  beforeLoad: requirePermission('payroll.settings.read'),
  component: PayrollEmployerSettingsPage,
})

const payrollSchedulesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/schedules',
  beforeLoad: requireAnyPermission('payroll.settings.read', 'payroll.periods.read'),
  component: PayrollSchedulesPage,
})

const setupChecklistRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/checklist',
  beforeLoad: requirePermission('setup_checklist.read'),
  component: SetupChecklistPage,
})

const carerReportsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/reports/carers',
  beforeLoad: requirePermission('employees.reports.read'),
  component: CarerReportsPage,
})

// Any office user: tasks given to their roles.
const myTasksRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/my-tasks',
  component: MyTasksPage,
})

const roleTasksRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/role-tasks',
  beforeLoad: requirePermission('role_tasks.manage'),
  component: RoleTasksManagePage,
})

const officeSalariesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/office-salaries',
  beforeLoad: requirePermission('office_salaries.manage'),
  component: OfficeSalariesPage,
})

const payrollEmployeesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/employees',
  beforeLoad: requirePermission('payroll.employees.read'),
  component: PayrollEmployeesPage,
})

const payrollRunsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/runs',
  beforeLoad: requirePermission('payroll.runs.read'),
  component: UkPayrollRunsPage,
})

const payrollRunDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/runs/$runId',
  beforeLoad: requirePermission('payroll.runs.read'),
  component: UkPayrollRunDetailPage,
})

const payrollPayslipsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/payslips',
  beforeLoad: requirePermission('payroll.runs.read'),
  component: UkPayrollPayslipsPage,
})

const learningIndexRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/learning',
  beforeLoad: () => {
    throw redirect({ to: '/learning/dashboard' })
  },
})

const learningDashboardRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/learning/dashboard',
  beforeLoad: requirePermission('learning.dashboard.read'),
  component: LearningDashboardPage,
})

const learningCoursesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/learning/courses',
  beforeLoad: requirePermission('learning.courses.read'),
  component: LearningCoursesPage,
})

const learningCourseNewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/learning/courses/new',
  beforeLoad: requirePermission('learning.courses.manage'),
  component: LearningCourseNewPage,
})

const learningCourseDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/learning/courses/$courseId',
  beforeLoad: requirePermission('learning.courses.read'),
  component: LearningCourseDetailPage,
})

const learningAssignmentsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/learning/assignments',
  beforeLoad: requirePermission('learning.assignments.read'),
  component: LearningAssignmentsPage,
})

const learningComplianceRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/learning/compliance',
  beforeLoad: requirePermission('learning.compliance.read'),
  component: LearningCompliancePage,
})

const learningTrainingEventsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/learning/training-events',
  beforeLoad: requirePermission('learning.training_events.read'),
  component: LearningTrainingEventsPage,
})

const learningCertificatesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/learning/certificates',
  beforeLoad: requirePermission('learning.certificates.read'),
  component: LearningCertificatesPage,
})

const learningExternalTrainingRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/learning/external-training',
  beforeLoad: requirePermission('learning.external_training.read'),
  component: LearningExternalTrainingPage,
})

const learningReportsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/learning/reports',
  beforeLoad: requirePermission('learning.reports.read'),
  component: LearningReportsPage,
})

const learningSettingsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/learning/settings',
  beforeLoad: requirePermission('learning.settings.manage'),
  component: LearningSettingsPage,
})

const policiesLibraryRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/policies',
  validateSearch: validatePolicyLibrarySearch,
  beforeLoad: requirePermission('policies.read'),
  component: PoliciesLibraryPage,
})

const policyNewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/policies/new',
  beforeLoad: requirePermission('policies.create'),
  component: PolicyNewPage,
})

const policyCategoriesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/policies/categories',
  beforeLoad: requirePermission('policies.read'),
  component: PolicyCategoriesPage,
})

const policyTagsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/policies/tags',
  beforeLoad: requirePermission('policies.read'),
  component: PolicyTagsPage,
})

const policyDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/policies/$policyId',
  beforeLoad: requirePermission('policies.read'),
  component: PolicyDetailPage,
})

const policyEditRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/policies/$policyId/edit',
  beforeLoad: requirePermission('policies.update'),
  component: PolicyEditPage,
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
  legalPrivacyPolicyRoute,
  publicTakeSurveyRoute,
  portalLoginRoute,
  portalShellRoute.addChildren([
    portalIndexRoute,
    portalProfileRoute,
    portalContactsRoute,
    portalAboutMeRoute,
    portalAllergiesRoute,
    portalMedicationsRoute,
    portalCalendarRoute,
    portalVisitPlansRoute,
    portalCompletedVisitsRoute,
    portalSurveysRoute,
    portalPhotosRoute,
  ]),
  appShellRoute.addChildren([
    indexRoute,
    serviceUsersRoute,
    serviceUsersAllRoute,
    serviceUsersHoursRoute,
    serviceUsersCalendarRoute,
    serviceUsersInitialAssessmentEnterpriseRoute,
    serviceUsersInitialAssessmentRoute,
    serviceUsersAddRoute,
    serviceUsersViewRoute,
    serviceUsersProfileRoute,
    serviceUsersInvoicesRoute,
    serviceUsersMedicationRoute,
    serviceUsersInitialAssessmentPerUserRoute,
    serviceUsersCarePlanRoute,
    serviceUsersCarePlanFormRoute,
    serviceUsersTasksPlannerRoute,
    serviceUsersVisitPlanRoute,
    serviceUsersActivityRoute,
    serviceUsersObservationsRoute,
    serviceUsersCommsRoute,
    serviceUsersEcmRoute,
    serviceUsersBodyMapRoute,
    serviceUsersAlertsRoute,
    serviceUsersDocumentsRoute,
    bodyMapReviewQueueRoute,
    initialAssessmentReviewQueueRoute,
    assessmentReviewQueueRoute,
    carePlanReviewsRoute,
    serviceUsersEditRoute,
    schedulingViewRoute,
    schedulingScheduleJobsRoute,
    schedulingCarerVisitHubRoute,
    schedulingReportRoute,
    schedulingJobsRoute,
    schedulingBuildRoute,
    schedulingListRoute,
    schedulingBulkGenerateRotaRoute,
    schedulingTemplatesRoute,
    employeeRoute,
    employeeStaffListRoute,
    employeeHoursRoute,
    employeeAbsencesRoute,
    employeeComplianceRoute,
    employeeReviewStatusRoute,
    employeeSkillsRoute,
    employeeNonCoreActivityRoute,
    employeeAllocationsRoute,
    employeeReportsRoute,
    employeeTempInspectorRoute,
    employeeGeneralDocumentsRoute,
    employeeAddRoute,
    employeeEditRoute,
    hrIndexRoute,
    hrEmployeesRoute,
    hrEmployeeProfileRoute,
    hrRecruitmentRoute,
    hrVacanciesRoute,
    hrCandidatesRoute,
    hrCandidateDetailRoute,
    accidentsIncidentsViewRoute,
    accidentsIncidentsRaiseRoute,
    surveysRoute,
    surveyBuilderRoute,
    surveyResponsesRoute,
    hoursApprovalsRoute,
    incidentsDashboardRoute,
    incidentsListRoute,
    incidentsRaiseRoute,
    incidentsMyActionsRoute,
    incidentsAnalyticsRoute,
    complaintsComplimentsRoute,
    feedbackDetailRoute,
    incidentDetailRoute,
    accountRoute,
    adminSecurityRoute,
    adminAuditRoute,
    adminServiceUserPortalRoute,
    inProgressRoute,
    showcaseRoute,
    settingsRoute,
    companyDetailsRoute,
    generalSettingsRoute,
    locationManagementRoute,
    usersAccessRoute,
    rolesPermissionsRoute,
    carePathwayRoute,
    billingRoute,
    billingVisitReconciliationRoute,
    billingPayrollRunsRoute,
    billingSalaryRoute,
    billingEmployeePayoutsRoute,
    billingServiceUserInvoicesRoute,
    billingInvoiceRunsRoute,
    billingInvoiceRunDetailRoute,
    billingInvoiceAuditTrailRoute,
    billingPaymentsRoute,
    billingAuditExportRoute,
    ecmLiveRoute,
    ecmGraphRoute,
    ecmReportsRoute,
    payrollOverviewRoute,
    payrollTaxYearsRoute,
    payrollTaxesRoute,
    payrollEmployerRoute,
    payrollSchedulesRoute,
    payrollEmployeesRoute,
    officeSalariesRoute,
    setupChecklistRoute,
    myTasksRoute,
    carerReportsRoute,
    roleTasksRoute,
    payrollRunsRoute,
    payrollRunDetailRoute,
    payrollPayslipsRoute,
    learningIndexRoute,
    learningDashboardRoute,
    learningCoursesRoute,
    learningCourseNewRoute,
    learningCourseDetailRoute,
    learningAssignmentsRoute,
    learningComplianceRoute,
    learningTrainingEventsRoute,
    learningCertificatesRoute,
    learningExternalTrainingRoute,
    learningReportsRoute,
    learningSettingsRoute,
    policiesLibraryRoute,
    policyNewRoute,
    policyCategoriesRoute,
    policyTagsRoute,
    policyDetailRoute,
    policyEditRoute,
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
