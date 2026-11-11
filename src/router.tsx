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
import { CarerHoursStopDialog } from '@/components/layout/CarerHoursStopDialog'
import { SentHoursRequestsDialog } from '@/components/layout/SentHoursRequestsDialog'
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
import { useUIStore, applyTextPreferences } from '@/store/ui.store'
import { useAuthStore } from '@/features/auth/store'
import { withOrganisationPayScope } from '@/features/auth/pay-scope'
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
import type { CarePlanIncidentContext } from '@/features/incidents/components/CarePlanMeasureEvidence'
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
import ModuleHomePage from '@/features/home/pages/ModuleHomePage'
import MedicationExceptionsPage from '@/features/emar/pages/MedicationExceptionsPage'
import MedicationStockPage from '@/features/emar/pages/MedicationStockPage'
import { MedicationAdministeredPage, MedicationLatePage } from '@/features/emar/pages/MedicationDoseLogPage'
import { moduleLabelForSlug } from '@/components/layout/nav-modules'
import InProgressPage from '@/features/home/pages/InProgressPage'
import ComponentShowcase from '@/features/home/pages/ComponentShowcase'
import SecurityAdminPage from '@/features/admin/pages/SecurityAdminPage'
import AzurePricingPage from '@/features/azure-pricing/pages/AzurePricingPage'
import { isAzurePricingTabId, type AzurePricingTabId } from '@/features/azure-pricing/types'
import SystemJobsPage from '@/features/system-jobs/pages/SystemJobsPage'
import MessageDeliveryPage from '@/features/message-delivery/MessageDeliveryPage'
import TestOfficeAlertsPage from '@/features/message-delivery/TestOfficeAlertsPage'
import { validateSystemJobsSearch } from '@/features/system-jobs/types'
import AuditLogPage from '@/features/admin/pages/AuditLogPage'
import ServiceUserPortalAdminPage from '@/features/service-user-portal/pages/ServiceUserPortalAdminPage'
import IncidentsListPage from '@/features/incidents/pages/IncidentsListPage'
import SurveysPage from '@/features/surveys/pages/SurveysPage'
import SurveyBuilderPage from '@/features/surveys/pages/SurveyBuilderPage'
import SurveyResponsesPage from '@/features/surveys/pages/SurveyResponsesPage'
import SurveyCallListPage from '@/features/surveys/reminders/SurveyCallListPage'
import SurveyPreviewPage from '@/features/surveys/pages/SurveyPreviewPage'
import TakeSurveyPage from '@/features/surveys/pages/TakeSurveyPage'
import KioskSurveyPage from '@/features/surveys/kiosk/KioskSurveyPage'
import SurveyUnsubscribePage from '@/features/surveys/pages/SurveyUnsubscribePage'
import SurveyPaperCopyPage from '@/features/surveys/sharing/SurveyPaperCopyPage'
import SurveyPosterPage from '@/features/surveys/sharing/SurveyPosterPage'
import ReadyMadeSurveysPage from '@/features/surveys/pages/ReadyMadeSurveysPage'
import OutsidePeoplePage from '@/features/surveys/outside/OutsidePeoplePage'
import SurveyFollowUpsPage from '@/features/surveys/pages/SurveyFollowUpsPage'
import SurveyInsightPage, { Survey360Page, SurveyPoolPage } from '@/features/surveys/insight/SurveyInsightPages'
import SurveyActionsPage from '@/features/surveys/actions/SurveyActionsPage'
import SurveyBenchmarksPage from '@/features/surveys/insight/SurveyBenchmarksPage'
import SurveysToCollectPage from '@/features/surveys/reminders/SurveysToCollectPage'
import { SurveyDuePromptHost } from '@/features/surveys/reminders/SurveyDuePrompt'
import { PrivacyReviewPromptHost } from '@/features/service-users/privacy/PrivacyReviewPrompt'
import { PublicUpdatePage, SurveyPackPage, SurveyUpdateLetterPage } from '@/features/surveys/actions/SurveyPrintPages'
import PathwayCasesListPage from '@/features/specialist-pathways/pages/PathwayCasesListPage'
import PathwayCaseDetailPage from '@/features/specialist-pathways/pages/PathwayCaseDetailPage'
import SafeguardingListPage from '@/features/safeguarding/pages/SafeguardingListPage'
import SafeguardingCaseDetailPage from '@/features/safeguarding/pages/SafeguardingCaseDetailPage'
import EnquiryBoardPage from '@/features/crm/pages/EnquiryBoardPage'
import EnquiryDetailPage from '@/features/crm/pages/EnquiryDetailPage'
import EnquiryNewPage from '@/features/crm/pages/EnquiryNewPage'
import ReferralInboxPage from '@/features/crm/pages/ReferralInboxPage'
import EnquiryEditPage from '@/features/crm/pages/EnquiryEditPage'
import QuotationEditorPage from '@/features/crm/pages/QuotationEditorPage'
import QuoteServiceUserPage from '@/features/crm/pages/QuoteServiceUserPage'
import HoursApprovalsPage from '@/features/hours-approvals/pages/HoursApprovalsPage'
import HoursHistoryPage from '@/features/hours-approvals/pages/HoursHistoryPage'
import OverCareReviewsPage from '@/features/over-care-reviews/pages/OverCareReviewsPage'
import RaiseIncidentPage from '@/features/incidents/pages/RaiseIncidentPage'
import IncidentDetailPage from '@/features/incidents/pages/IncidentDetailPage'
import SupervisionSessionPage from '@/features/supervision/pages/SupervisionSessionPage'
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
import PayCardEditorPage from '@/features/billing/pages/PayCardEditorPage'
import ChargeCardEditorPage from '@/features/billing/pages/ChargeCardEditorPage'
import EmployeePayCardChangePage from '@/features/billing/pages/EmployeePayCardChangePage'
import PayItemsPage from '@/features/billing/pages/PayItemsPage'
import WageRecoveriesPage from '@/features/billing/pages/WageRecoveriesPage'
import PayItemCreatePage from '@/features/billing/pages/PayItemCreatePage'
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
import PayrollEmployeeDetailPage from '@/features/payroll/pages/PayrollEmployeeDetailPage'
import OfficeSalariesPage from '@/features/office-salaries/pages/OfficeSalariesPage'
import SetupChecklistPage from '@/features/setup-checklist/pages/SetupChecklistPage'
import MyTasksPage from '@/features/role-tasks/pages/MyTasksPage'
import ScriptsPage from '@/features/scripts/pages/ScriptsPage'
import VisitCreationPage from '@/features/scripts/pages/VisitCreationPage'
import VisitCompletionPage from '@/features/scripts/pages/VisitCompletionPage'
import MySurveysPage, { MySurveyAnswerPage } from '@/features/surveys/my-surveys/MySurveysPage'
import CarerReportsPage from '@/features/employees/pages/CarerReportsPage'
import TimebankPage from '@/features/timebank/pages/TimebankPage'
import TimebankServiceUserPage from '@/features/timebank/pages/TimebankServiceUserPage'
import TimebankCarerPage from '@/features/timebank/pages/TimebankCarerPage'
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
import PolicyPrintPage from '@/features/policies/pages/PolicyPrintPage'
import ReadyMadePolicyPrintPage from '@/features/policies/pages/ReadyMadePolicyPrintPage'
import PolicyEditPage from '@/features/policies/pages/PolicyEditPage'
import PolicyCategoriesPage from '@/features/policies/pages/PolicyCategoriesPage'
import PolicyTagsPage from '@/features/policies/pages/PolicyTagsPage'
import ReadyMadePoliciesPage from '@/features/policies/pages/ReadyMadePoliciesPage'
import MyPoliciesPage from '@/features/policies/pages/MyPoliciesPage'
import ComplianceDashboardPage from '@/features/compliance/pages/ComplianceDashboardPage'
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
import { SurveyReviewsPage } from '@/features/surveys/reviewers/SurveyReviewers'
import EmployeeHoursPage from '@/features/employees/pages/EmployeeHoursPage'
import EmployeeAbsencesPage from '@/features/employees/pages/EmployeeAbsencesPage'
import EmployeeTimesheetsPage from '@/features/employees/pages/EmployeeTimesheetsPage'
import SpecialVisitsPage from '@/features/special-visits/pages/SpecialVisitsPage'
import OnCallRotaPage from '@/features/on-call/pages/OnCallRotaPage'
import OutOfHoursCallsPage from '@/features/on-call/pages/OutOfHoursCallsPage'
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
  '/surveys': 'Surveys',
  '/surveys/ready-made': 'Ready-made surveys',
  '/surveys/outside-people': 'Outside people',
  '/surveys/follow-ups': 'Survey follow-ups',
  '/surveys/insight': 'Survey insight',
  '/surveys/insight/pool': 'All copies together',
  '/surveys/insight/360': '360 report',
  '/surveys/insight/benchmarks': 'Compared with other agencies',
  '/surveys/to-collect': 'Surveys to collect',
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
  '/scheduling/schedule-jobs': 'Schedule Jobs',
  '/supervision/sessions/$sessionId': 'Supervision session',
  '/scheduling/visits/$jobId': 'Visit',
  '/scheduling/report': 'Scheduling Reports',
  '/scheduling/jobs': 'Scheduled Jobs Housekeeping',
  '/scheduling/build': 'Build Schedule',
  '/scheduling/list': 'List View of Schedule',
  '/scheduling/templates': 'Schedule Templates',
  '/scheduling/bulk-generate-rota': 'Bulk Generate Rota',
  '/employee': 'Employee',
  '/employee/staff-list': 'Staff list',
  '/employee/hours': 'Employee hours',
  '/employee/absences': 'Absence tracker',
  '/employee/timesheets': 'Timesheets',
  '/special-visits': 'Special visits',
  '/on-call/rota': 'On-call rota',
  '/on-call/calls': 'Out-of-hours calls',
  '/employee/compliance': 'Compliance board',
  '/employee/review-status': 'Employee',
  '/employee/skills': 'Employee',
  '/employee/non-core-activity': 'Employee',
  '/employee/allocations': 'Employee',
  '/employee/reports': 'Employee',
  '/employee/temp-inspector': 'Temporary Inspector Login',
  '/survey-reviews': 'Surveys to record',
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
  '/azure-pricing': 'Azure Pricing',
  '/system-jobs': 'System jobs',
  '/message-delivery': 'Message delivery',
  '/test-office-alerts': 'Test office alerts',
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
  '/billing/pay-cards/new': 'New pay card',
  '/billing/charge-cards/new': 'New charge card',
  '/billing/charge-cards/$chargeCardId/edit': 'Edit charge card',
  '/billing/pay-items': 'Pay items',
  '/billing/wage-recoveries': 'Wage recoveries',
  '/billing/pay-items/new': 'New pay item',
  '/employee/$employeeId/pay-card/change': 'Change pay card',
  '/billing/pay-cards/$payCardId/edit': 'Edit pay card',
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
  '/payroll/employees/$employeeId': 'Employee payroll',
  '/office-salaries': 'Office salaries',
  '/checklist': 'Checklist',
  '/my-tasks': 'My tasks',
  '/scripts': 'Scripts',
  '/scripts/visit-creation': 'Visit Creation',
  '/scripts/visit-completion': 'Visit Completion',
  '/my-surveys': 'My surveys',
  '/reports/carers': 'Carer reports',
  '/reports/timebank': 'Timebank',
  '/reports/timebank/$serviceUserId': 'Timebank',
  '/reports/timebank/carers/$employeeId': 'Timebank',
  '/role-tasks': 'Role tasks',
  '/payroll/runs': 'UK payroll runs',
  '/payroll/runs/$runId': 'UK payroll run',
  '/payroll/payslips': 'Payslips',
  '/specialist-pathways/$pathway': 'Specialist pathway',
  '/specialist-pathways/$pathway/$caseId': 'Pathway case',
  '/safeguarding': 'Safeguarding',
  '/safeguarding/$caseId': 'Safeguarding case',
  '/crm': 'Enquiries & Referrals',
  '/crm/$enquiryId': 'Enquiry',
  '/crm/new': 'New enquiry or referral',
  '/crm/referral-inbox': 'Referral inbox',
  '/crm/$enquiryId/edit': 'Edit enquiry',
  '/crm/$enquiryId/quotes/new': 'New quotation',
  '/crm/$enquiryId/quotes/$quotationId/$versionId': 'Quotation',
  '/crm/$enquiryId/quotes/$quotationId/$versionId/service-user': 'Create service user',
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
  '/policies/mine': 'My policies',
  '/compliance': 'Compliance dashboard',
  '/medication/exceptions': 'Missed & refused doses',
  '/medication/late': 'Late doses',
  '/medication/administered': 'Administration log',
  '/medication/stock': 'Stock movements',
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
  'funders',
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
  const textSize = useUIStore((s) => s.textSize)
  const textWeight = useUIStore((s) => s.textWeight)

  useEffect(() => {
    applyTextPreferences(textSize, textWeight)
  }, [textSize, textWeight])

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
    (pathname.startsWith('/apps/') ? moduleLabelForSlug(pathname.split('/')[2] ?? '') : undefined) ??
    (/^\/surveys\/[^/]+\/responses$/.test(pathname)
      ? 'Survey results'
      : /^\/surveys\/[^/]+\/actions$/.test(pathname)
        ? 'Acting on results'
      : /^\/surveys\/[^/]+\/preview$/.test(pathname)
        ? 'Survey preview'
      : /^\/surveys\/[^/]+$/.test(pathname)
        ? 'Survey'
      : /^\/employee\/[^/]+\/edit$/.test(pathname)
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
    ) || pathname === '/hours-approvals' || pathname === '/hours-history' || pathname === '/over-care-reviews'
  const serviceUserHoursWide = pathname === '/service-users/hours'
  const contentLayout =
    fullBleed ? 'full' : employeeManagementWide || serviceUserHoursWide ? 'wide' : 'default'

  return (
    <>
      <SessionRefresh />
      <CompanyBrandingBootstrap />
      <OrganisationDisplayFormatProvider>
        <AppToaster />
        <CarerHoursStopDialog />
        <SentHoursRequestsDialog />
        <UrgentOfficeAlertHost />
        <SurveyDuePromptHost />
        <PrivacyReviewPromptHost />
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

/** Kiosk: the shared link on a tablet, one person after another, kept while offline (no login). */
const publicKioskSurveyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/survey/$token/kiosk',
  component: KioskSurveyPage,
})

/** "Unsubscribe from all surveys" from a survey message (no login). */
const publicSurveyUnsubscribeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/survey-unsubscribe/$token',
  component: SurveyUnsubscribePage,
})

/** "You said, we did" public page (no login): only while published with the public link. */
const publicSurveyUpdateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/you-said-we-did/$token',
  component: PublicUpdatePage,
})

// CQC and commissioner pack, and the "You said, we did" letter: print views without the app shell.
const surveyPackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/surveys/$surveyId/pack',
  beforeLoad: requirePermission('surveys.read'),
  component: SurveyPackPage,
})

const surveyUpdateLetterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/surveys/$surveyId/you-said-we-did/$updateId/letter',
  beforeLoad: requirePermission('surveys.read'),
  component: SurveyUpdateLetterPage,
})

// Print views (paper copy, poster): full page without the app shell, so they print cleanly.
const surveyPaperCopyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/surveys/$surveyId/paper-copy',
  beforeLoad: requirePermission('surveys.read'),
  component: SurveyPaperCopyPage,
})

const surveyPosterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/surveys/$surveyId/poster',
  validateSearch: (raw: Record<string, unknown>): { link?: string } =>
    typeof raw.link === 'string' && /^(main|[0-9a-f-]{36})$/.test(raw.link) ? { link: raw.link } : {},
  beforeLoad: requirePermission('surveys.manage'),
  component: SurveyPosterPage,
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
  // An independent survey reviewer's account has one page.
  beforeLoad: () => {
    if (useAuthStore.getState().user?.role === 'independent_reviewer') throw redirect({ to: '/survey-reviews' })
  },
  component: HomePage,
})

/** Module landing page opened from the sidebar rail (tiles for every page in the module). */
const moduleHomeRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/apps/$module',
  component: ModuleHomePage,
})

/* Medication (eMAR) module: organisation-wide views; each service user's MAR stays on their profile. */
const medicationIndexRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/medication',
  beforeLoad: () => {
    throw redirect({ to: '/apps/$module', params: { module: 'medication' } })
  },
})

const medicationExceptionsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/medication/exceptions',
  beforeLoad: requirePermission('service_users.read'),
  component: MedicationExceptionsPage,
})

const medicationLateRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/medication/late',
  beforeLoad: requirePermission('service_users.read'),
  component: MedicationLatePage,
})

const medicationAdministeredRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/medication/administered',
  beforeLoad: requirePermission('service_users.read'),
  component: MedicationAdministeredPage,
})

const medicationStockRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/medication/stock',
  beforeLoad: requirePermission('service_users.read'),
  component: MedicationStockPage,
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
  validateSearch: (
    search: Record<string, unknown>,
  ): { firstName?: string; lastName?: string; dob?: string; enquiryId?: string } => ({
    firstName: typeof search.firstName === 'string' ? search.firstName : undefined,
    lastName: typeof search.lastName === 'string' ? search.lastName : undefined,
    dob: typeof search.dob === 'string' ? search.dob : undefined,
    enquiryId: typeof search.enquiryId === 'string' ? search.enquiryId : undefined,
  }),
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
  // Opened from an incident "Care plan update" measure: publish links the new version to it.
  validateSearch: (raw: Record<string, unknown>): Partial<CarePlanIncidentContext> => {
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
    const incidentId = str(raw.incidentId)
    const incidentActionId = str(raw.incidentActionId)
    if (!incidentId || !incidentActionId) return {}
    return {
      incidentId,
      incidentActionId,
      incidentRef: str(raw.incidentRef) ?? '',
      measure: str(raw.measure) ?? '',
    }
  },
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
  validateSearch: (
    raw: Record<string, unknown>,
  ): { tab?: 'upcoming' | 'cancelled' | 'rejected' | 'completed' } => ({
    tab:
      raw.tab === 'upcoming' || raw.tab === 'cancelled' || raw.tab === 'rejected' || raw.tab === 'completed'
        ? raw.tab
        : undefined,
  }),
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

/** Old day view, replaced by Schedule Jobs; kept so bookmarks and `?date=` links still land on the rota. */
const schedulingViewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scheduling/view',
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/scheduling/schedule-jobs', search, replace: true })
  },
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

const employeeTimesheetsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/timesheets',
  // Visit rows come from the ECM visits table.
  beforeLoad: requireAnyPermission('ecm.read', 'ecm.monitor'),
  component: EmployeeTimesheetsPage,
})

const parentalLeaveRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/parental-leave',
  // Retired: parental leave is now recorded in the employee Absence tracker.
  beforeLoad: () => {
    throw redirect({ to: '/employee/absences' })
  },
})

const specialVisitsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/special-visits',
  beforeLoad: requireAnyPermission('employees.read', 'employees.reports.read'),
  component: SpecialVisitsPage,
})

const onCallRotaRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/on-call/rota',
  beforeLoad: requireAnyPermission('on_call.read'),
  component: OnCallRotaPage,
})

const outOfHoursCallsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/on-call/calls',
  beforeLoad: requireAnyPermission('on_call.read'),
  component: OutOfHoursCallsPage,
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

/**
 * An independent reviewer's account: the surveys they may record answers on (SUR-CQC-001/002). Open
 * to the reviewer account even with no live grant (it then says there is nothing to record).
 */
const surveyReviewsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/survey-reviews',
  beforeLoad: () => {
    const { user, can } = useAuthStore.getState()
    if (user?.role !== 'independent_reviewer' && !can('surveys.review.record')) throw redirect({ to: '/' })
  },
  component: SurveyReviewsPage,
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
  // `?view=templates` opens the Templates tab (e.g. after adopting ready-made surveys).
  validateSearch: (raw: Record<string, unknown>): { view?: 'templates' } =>
    raw.view === 'templates' ? { view: 'templates' } : {},
  beforeLoad: requirePermission('surveys.read'),
  component: SurveysPage,
})

// Families, professionals and commissioners that public surveys are sent to (surveys.manage).
const surveyOutsidePeopleRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys/outside-people',
  beforeLoad: requirePermission('surveys.manage'),
  component: OutsidePeoplePage,
})

// Survey insight (Phase 2 part 5): role dashboards, pooled copies, the 360 report. Figures need results access.
const surveyInsightRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys/insight',
  beforeLoad: requirePermission('surveys.read'),
  component: SurveyInsightPage,
})

// Anonymised sector benchmarks (Phase 3): sharing needs surveys.manage (and company settings, in the API).
const surveyBenchmarksRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys/insight/benchmarks',
  beforeLoad: requirePermission('surveys.read'),
  component: SurveyBenchmarksPage,
})

// Surveys still to collect across every open named survey: the coordinators' working list.
const surveysToCollectRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys/to-collect',
  beforeLoad: requirePermission('surveys.responses.record'),
  component: SurveysToCollectPage,
})

const surveyPoolRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys/insight/pool',
  validateSearch: (raw: Record<string, unknown>): { templateId?: string; libraryReference?: string } => ({
    ...(typeof raw.templateId === 'string' ? { templateId: raw.templateId } : {}),
    ...(typeof raw.libraryReference === 'string' ? { libraryReference: raw.libraryReference } : {}),
  }),
  beforeLoad: requirePermission('surveys.read'),
  component: SurveyPoolPage,
})

// Acting on results (Phase 2 part 6): actions, team discussions, "You said, we did". Results access in the API.
const surveyActionsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys/$surveyId/actions',
  validateSearch: (raw: Record<string, unknown>): { action?: string } => (typeof raw.action === 'string' ? { action: raw.action } : {}),
  beforeLoad: requirePermission('surveys.read'),
  component: SurveyActionsPage,
})

const survey360Route = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys/insight/360',
  beforeLoad: requirePermission('surveys.read'),
  component: Survey360Page,
})

const surveyReadyMadeRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys/ready-made',
  beforeLoad: requirePermission('surveys.read'),
  component: ReadyMadeSurveysPage,
})

// Survey alerts and contact-me requests. Open to every office user: the API shows survey readers
// all of them in their branches and anyone else only those given to their roles (task links).
const surveyFollowUpsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys/follow-ups',
  validateSearch: (
    raw: Record<string, unknown>,
  ): { alert?: string; view?: 'open' | 'overdue' | 'contact' | 'done' | 'all'; surveyId?: string } => ({
    ...(typeof raw.alert === 'string' ? { alert: raw.alert } : {}),
    ...(typeof raw.view === 'string' && ['open', 'overdue', 'contact', 'done', 'all'].includes(raw.view)
      ? { view: raw.view as 'open' | 'overdue' | 'contact' | 'done' | 'all' }
      : {}),
    ...(typeof raw.surveyId === 'string' ? { surveyId: raw.surveyId } : {}),
  }),
  component: SurveyFollowUpsPage,
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

// Survey call list (named surveys): opened from the call list task. The API allows people who may see
// the survey's individual responses, or who hold the role making the calls.
const surveyCallListRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys/$surveyId/calls',
  beforeLoad: requirePermission('surveys.responses.record'),
  component: SurveyCallListPage,
})

const surveyPreviewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/surveys/$surveyId/preview',
  beforeLoad: requirePermission('surveys.read'),
  component: SurveyPreviewPage,
})

const hoursApprovalsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/hours-approvals',
  validateSearch: (raw: Record<string, unknown>): { tab?: string } =>
    typeof raw.tab === 'string' && /^(pending|approved|rejected|cancelled|expired)$/.test(raw.tab)
      ? { tab: raw.tab }
      : {},
  beforeLoad: requirePermission('hours_approvals.read'),
  component: HoursApprovalsPage,
})

const overCareReviewsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/over-care-reviews',
  validateSearch: (raw: Record<string, unknown>): { tab?: string } =>
    typeof raw.tab === 'string' && /^(pending|action-taken|no-action-needed)$/.test(raw.tab)
      ? { tab: raw.tab }
      : {},
  beforeLoad: requireAnyPermission('hours_approvals.read', 'hours_approvals.manage'),
  component: OverCareReviewsPage,
})

const hoursHistoryRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/hours-history',
  beforeLoad: requireAnyPermission('hours_approvals.read', 'hours_approvals.manage'),
  component: HoursHistoryPage,
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

const supervisionSessionRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/supervision/sessions/$sessionId',
  beforeLoad: requirePermission('supervision.read'),
  component: SupervisionSessionPage,
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

const azurePricingRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/azure-pricing',
  validateSearch: (raw: Record<string, unknown>): { tab?: AzurePricingTabId } => ({
    tab: isAzurePricingTabId(raw.tab) ? raw.tab : undefined,
  }),
  beforeLoad: requirePermission('platform_costs.read'),
  component: AzurePricingPage,
})

const systemJobsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/system-jobs',
  validateSearch: validateSystemJobsSearch,
  beforeLoad: requirePermission('system_jobs.read'),
  component: SystemJobsPage,
})

const messageDeliveryRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/message-delivery',
  beforeLoad: requireAnyPermission('message_delivery.read', 'message_delivery.manage'),
  component: MessageDeliveryPage,
})

// Super Admin only (message_delivery.manage is granted to Super Admin alone; the API checks the role).
const testOfficeAlertsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/test-office-alerts',
  beforeLoad: requirePermission('message_delivery.manage'),
  component: TestOfficeAlertsPage,
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
  'supervision',
  'optional',
  'pre-assessment',
  'alerts',
  'critical-information',
  'app-setting',
  'carer-notifications',
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

const billingPayCardNewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/pay-cards/new',
  beforeLoad: requirePermission('billing.pay_cards.manage'),
  component: PayCardEditorPage,
})

const billingPayCardEditRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/pay-cards/$payCardId/edit',
  beforeLoad: requirePermission('billing.pay_cards.manage'),
  component: PayCardEditorPage,
})

const billingChargeCardNewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/charge-cards/new',
  beforeLoad: requirePermission('billing.charge_cards.manage'),
  component: ChargeCardEditorPage,
})

const billingChargeCardEditRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/charge-cards/$chargeCardId/edit',
  beforeLoad: requirePermission('billing.charge_cards.manage'),
  component: ChargeCardEditorPage,
})

const billingPayItemsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/pay-items',
  beforeLoad: requirePermission('billing.payroll_runs.read'),
  component: withOrganisationPayScope(PayItemsPage),
})

const billingWageRecoveriesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/wage-recoveries',
  beforeLoad: requirePermission('billing.payroll_runs.read'),
  component: withOrganisationPayScope(WageRecoveriesPage),
})

const billingPayItemNewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing/pay-items/new',
  beforeLoad: requirePermission('billing.payroll_runs.manage'),
  component: withOrganisationPayScope(PayItemCreatePage),
})

const employeePayCardChangeRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/employee/$employeeId/pay-card/change',
  beforeLoad: requirePermission('billing.pay_cards.manage'),
  component: EmployeePayCardChangePage,
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
  component: withOrganisationPayScope(PayrollRunsPage),
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
  component: withOrganisationPayScope(EmployeePayoutsPage),
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
  component: withOrganisationPayScope(PayrollTaxYearsPage),
})

const payrollTaxesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/taxes',
  beforeLoad: requirePermission('payroll.settings.read'),
  component: withOrganisationPayScope(PayrollTaxesPage),
})

const payrollEmployerRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/employer',
  beforeLoad: requirePermission('payroll.settings.read'),
  component: withOrganisationPayScope(PayrollEmployerSettingsPage),
})

const payrollSchedulesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/schedules',
  beforeLoad: requireAnyPermission('payroll.settings.read', 'payroll.periods.read'),
  component: withOrganisationPayScope(PayrollSchedulesPage),
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

const timebankSearch = (raw: Record<string, unknown>): { week?: string; tab?: 'carers' } => ({
  ...(typeof raw.week === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.week) ? { week: raw.week } : {}),
  ...(raw.tab === 'carers' ? { tab: 'carers' as const } : {}),
})

const timebankRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/reports/timebank',
  validateSearch: timebankSearch,
  beforeLoad: requirePermission('service_users.read'),
  component: TimebankPage,
})

const timebankServiceUserRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/reports/timebank/$serviceUserId',
  validateSearch: timebankSearch,
  beforeLoad: requirePermission('service_users.read'),
  component: TimebankServiceUserPage,
})

const timebankCarerRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/reports/timebank/carers/$employeeId',
  beforeLoad: requireAnyPermission('employees.read', 'employees.reports.read'),
  component: TimebankCarerPage,
})

// Any office user: tasks given to their roles.
const myTasksRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/my-tasks',
  component: MyTasksPage,
})

// Every signed-in user for now: automation scripts (run as the user, the API checks each step).
const scriptsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scripts',
  component: ScriptsPage,
})

const visitCreationRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scripts/visit-creation',
  component: VisitCreationPage,
})

const visitCompletionRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/scripts/visit-completion',
  component: VisitCompletionPage,
})

// Any office user who is also a member of staff: surveys sent to them (answered here or in the carer app).
const mySurveysRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/my-surveys',
  component: MySurveysPage,
})

const mySurveyAnswerRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/my-surveys/$surveyId',
  component: MySurveyAnswerPage,
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

const payrollEmployeeDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/employees/$employeeId',
  beforeLoad: requirePermission('payroll.employees.read'),
  component: PayrollEmployeeDetailPage,
})

const payrollRunsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/runs',
  beforeLoad: requirePermission('payroll.runs.read'),
  component: withOrganisationPayScope(UkPayrollRunsPage),
})

const payrollRunDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/payroll/runs/$runId',
  beforeLoad: requirePermission('payroll.runs.read'),
  component: withOrganisationPayScope(UkPayrollRunDetailPage),
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

const specialistPathwaysIndexRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/specialist-pathways',
  beforeLoad: () => {
    throw redirect({ to: '/specialist-pathways/$pathway', params: { pathway: 'learning-disability' } })
  },
})

const specialistPathwaysListRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/specialist-pathways/$pathway',
  beforeLoad: requirePermission('specialist_pathways.read'),
  component: PathwayCasesListPage,
})

const specialistPathwaysCaseRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/specialist-pathways/$pathway/$caseId',
  beforeLoad: requirePermission('specialist_pathways.read'),
  component: PathwayCaseDetailPage,
})

const safeguardingListRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/safeguarding',
  beforeLoad: requirePermission('safeguarding.read'),
  component: SafeguardingListPage,
})

const safeguardingCaseRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/safeguarding/$caseId',
  beforeLoad: requirePermission('safeguarding.read'),
  component: SafeguardingCaseDetailPage,
})

const crmBoardRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/crm',
  beforeLoad: requirePermission('crm.read'),
  component: EnquiryBoardPage,
})

const crmReferralInboxRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/crm/referral-inbox',
  beforeLoad: requirePermission('crm.read'),
  // ?gmail=connected|cancelled|… after Google sign-in.
  validateSearch: (raw: Record<string, unknown>): { gmail?: string } =>
    typeof raw.gmail === 'string' ? { gmail: raw.gmail } : {},
  component: ReferralInboxPage,
})

const crmEnquiryRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/crm/$enquiryId',
  beforeLoad: requirePermission('crm.read'),
  component: EnquiryDetailPage,
})

const crmNewEnquiryRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/crm/new',
  beforeLoad: requirePermission('crm.manage'),
  // ?kind=REFERRAL starts the form as a referral ("New referral").
  validateSearch: (raw: Record<string, unknown>): { kind?: 'REFERRAL' } =>
    raw.kind === 'REFERRAL' ? { kind: 'REFERRAL' } : {},
  component: EnquiryNewPage,
})

const crmEditEnquiryRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/crm/$enquiryId/edit',
  // `focus`: a field label to open the form on; `returnTo`: a CRM page to go back to after saving.
  validateSearch: (raw: Record<string, unknown>): { focus?: string; returnTo?: string } => {
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
    const returnTo = text(raw.returnTo)
    return { focus: text(raw.focus), returnTo: returnTo?.startsWith('/crm/') ? returnTo : undefined }
  },
  beforeLoad: requirePermission('crm.manage'),
  component: EnquiryEditPage,
})

const crmNewQuotationRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/crm/$enquiryId/quotes/new',
  beforeLoad: requirePermission('crm.manage'),
  component: QuotationEditorPage,
})

const crmQuotationRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/crm/$enquiryId/quotes/$quotationId/$versionId',
  validateSearch: (search: Record<string, unknown>): { section?: string } => ({
    section: typeof search.section === 'string' ? search.section : undefined,
  }),
  beforeLoad: requirePermission('crm.read'),
  component: QuotationEditorPage,
})

const crmQuoteServiceUserRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/crm/$enquiryId/quotes/$quotationId/$versionId/service-user',
  beforeLoad: requirePermission('crm.manage'),
  component: QuoteServiceUserPage,
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

const policyReadyMadeRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/policies/ready-made',
  beforeLoad: requirePermission('policies.read'),
  component: ReadyMadePoliciesPage,
})

const myPoliciesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/policies/mine',
  beforeLoad: requirePermission('policies.acknowledgements.me'),
  component: MyPoliciesPage,
})

/** Unified compliance view; each area card is gated by its own read permission. */
const COMPLIANCE_DASHBOARD_PERMISSIONS: Permission[] = [
  'employees.compliance.reports.read',
  'learning.dashboard.read',
  'policies.read',
  'safeguarding.read',
  'safeguarding.manage',
  'incidents.read',
  'complaints.read',
  'specialist_pathways.read',
]

const complianceDashboardRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/compliance',
  beforeLoad: requireAnyPermission(...COMPLIANCE_DASHBOARD_PERMISSIONS),
  component: ComplianceDashboardPage,
})

const policyDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/policies/$policyId',
  beforeLoad: requirePermission('policies.read'),
  component: PolicyDetailPage,
})

// Printed copy of a policy: the document alone, without the app around it (signed in, policies.read).
const policyPrintRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/policies/$policyId/print',
  validateSearch: (raw: Record<string, unknown>): { version?: string; print?: string } => ({
    version: typeof raw.version === 'string' && raw.version ? raw.version : undefined,
    // ?print=0 arrives as the number 0 (search values are parsed), so compare as text.
    print: raw.print === undefined || raw.print === null || raw.print === '' ? undefined : String(raw.print),
  }),
  beforeLoad: requirePermission('policies.read'),
  component: PolicyPrintPage,
})

// Printed copy of a ready-made policy from the library (signed in, policies.read).
const readyMadePolicyPrintRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/policies/ready-made/$libraryId/print',
  validateSearch: (raw: Record<string, unknown>): { print?: string } => ({
    print: raw.print === undefined || raw.print === null || raw.print === '' ? undefined : String(raw.print),
  }),
  beforeLoad: requirePermission('policies.read'),
  component: ReadyMadePolicyPrintPage,
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
  policyPrintRoute,
  readyMadePolicyPrintRoute,
  publicTakeSurveyRoute,
  publicKioskSurveyRoute,
  publicSurveyUnsubscribeRoute,
  publicSurveyUpdateRoute,
  surveyPackRoute,
  surveyUpdateLetterRoute,
  surveyPaperCopyRoute,
  surveyPosterRoute,
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
    moduleHomeRoute,
    medicationIndexRoute,
    medicationExceptionsRoute,
    medicationLateRoute,
    medicationAdministeredRoute,
    medicationStockRoute,
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
    employeeTimesheetsRoute,
    parentalLeaveRoute,
    specialVisitsRoute,
    onCallRotaRoute,
    outOfHoursCallsRoute,
    employeeComplianceRoute,
    employeeReviewStatusRoute,
    employeeSkillsRoute,
    employeeNonCoreActivityRoute,
    employeeAllocationsRoute,
    employeeReportsRoute,
    employeeTempInspectorRoute,
    surveyReviewsRoute,
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
    surveyReadyMadeRoute,
    surveyOutsidePeopleRoute,
    surveyFollowUpsRoute,
    surveyInsightRoute,
    surveyPoolRoute,
    survey360Route,
    surveyBenchmarksRoute,
    surveysToCollectRoute,
    surveyActionsRoute,
    surveyBuilderRoute,
    surveyResponsesRoute,
    surveyCallListRoute,
    surveyPreviewRoute,
    hoursApprovalsRoute,
    hoursHistoryRoute,
    overCareReviewsRoute,
    incidentsDashboardRoute,
    incidentsListRoute,
    incidentsRaiseRoute,
    incidentsMyActionsRoute,
    incidentsAnalyticsRoute,
    complaintsComplimentsRoute,
    feedbackDetailRoute,
    incidentDetailRoute,
    supervisionSessionRoute,
    accountRoute,
    adminSecurityRoute,
    adminAuditRoute,
    azurePricingRoute,
    systemJobsRoute,
    messageDeliveryRoute,
    testOfficeAlertsRoute,
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
    billingPayCardNewRoute,
    billingPayCardEditRoute,
    billingChargeCardNewRoute,
    billingChargeCardEditRoute,
    employeePayCardChangeRoute,
    billingPayItemsRoute,
    billingWageRecoveriesRoute,
    billingPayItemNewRoute,
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
    payrollEmployeeDetailRoute,
    officeSalariesRoute,
    setupChecklistRoute,
    myTasksRoute,
    scriptsRoute,
    visitCreationRoute,
    visitCompletionRoute,
    mySurveysRoute,
    mySurveyAnswerRoute,
    carerReportsRoute,
    timebankRoute,
    timebankServiceUserRoute,
    timebankCarerRoute,
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
    specialistPathwaysIndexRoute,
    specialistPathwaysListRoute,
    specialistPathwaysCaseRoute,
    safeguardingListRoute,
    safeguardingCaseRoute,
    crmBoardRoute,
    crmNewEnquiryRoute,
    crmReferralInboxRoute,
    crmEnquiryRoute,
    crmEditEnquiryRoute,
    crmNewQuotationRoute,
    crmQuotationRoute,
    crmQuoteServiceUserRoute,
    policiesLibraryRoute,
    policyNewRoute,
    policyCategoriesRoute,
    policyTagsRoute,
    policyReadyMadeRoute,
    myPoliciesRoute,
    complianceDashboardRoute,
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
