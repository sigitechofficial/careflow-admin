import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  History,
  Home,
  Users,
  Calendar,
  Settings,
  Settings2,
  UserCheck,
  // UserPlus, // TODO(later): restore with HR sidebar tab

  BarChart3,
  BookOpen,
  ChevronLeft,
  Pin,
  PinOff,
  ChevronRight,
  LogOut,
  Bell,
  X,
  ClipboardList,
  UserRoundPlus,
  LayoutGrid,
  FileSpreadsheet,
  FileText,
  FileSearch,
  List,
  CalendarDays,
  PlusCircle,
  Eye,
  ShieldCheck,
  Award,
  Activity,
  TrendingUp,
  Building2,
  MapPin,
  Route,
  CalendarClock,
  Clock,
  Search,
  Globe,
  PoundSterling,
  Receipt,
  Wallet,
  Banknote,
  CircleDollarSign,
  Cloud,
  FileBarChart2,
  GraduationCap,
  CalendarOff,
  ListChecks,
  ClipboardCheck,
  MessagesSquare,
  Timer,
  MessageSquareWarning,
  // Briefcase, // TODO(later): restore with HR sidebar tab

  Inbox,
  Calculator,
  HeartHandshake,
  DoorOpen,
  Wand2,
  Mic,
  Pill,
  Package,
  Briefcase,
  Library,
  MessageCircle,
  ShieldAlert,
  PenLine,
  Scale,
  AlertOctagon,
  Send,
  CreditCard,
  FileOutput,
  Zap,
  LayoutDashboard,
  Target,
  Workflow,
  Stethoscope,
  Radio,
  Bot,
  Smartphone,
  Megaphone,
  Map as MapIcon,
  Landmark,
  AlertTriangle,
  Shield,
  Sparkles,
  PhoneCall,
  PhoneIncoming,
  Hourglass,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useUIStore } from '@/store/ui.store'
// import { UserAvatar } from '@/shared/ui/avatar' // TODO(later): restore with sidebar Super Admin / account card
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/shared/ui/misc'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import type { Permission, RoleId } from '@/features/auth/types'
import { useAuthStore } from '@/features/auth/store'
import { hasOrganisationPayScope } from '@/features/auth/pay-scope'
import { CompanyBrandMark } from '@/components/company/CompanyBrandMark'
import { portalNavItems } from '@/features/service-user-portal/portal-nav'
import { NAV_MODULES, moduleLabelForSlug, moduleLandingPath } from '@/components/layout/nav-modules'
import { ModuleIllustration, PageIllustration } from '@/components/layout/NavIllustration'
import type { LayoutVariant, NavItem, SubNavItem } from '@/components/layout/sidebar-types'

export type { LayoutVariant, NavItem, SubNavItem } from '@/components/layout/sidebar-types'

function getTitleFromSearch(search: unknown): string | undefined {
  if (search && typeof search === 'object' && 'title' in search) {
    const t = (search as { title?: unknown }).title
    return typeof t === 'string' ? t : undefined
  }
  return undefined
}

function navLinkProps(
  label: string,
  href: string,
  ready?: boolean,
  search?: Record<string, string>,
): { to: string; search?: Record<string, string> } {
  if (ready === false) {
    return { to: '/in-progress', search: { title: label } }
  }
  if (search && Object.keys(search).length > 0) {
    return { to: href, search }
  }
  return { to: href }
}

function searchTab(search: unknown): string | undefined {
  if (search && typeof search === 'object' && 'tab' in search) {
    const t = (search as { tab?: unknown }).tab
    return typeof t === 'string' ? t : undefined
  }
  return undefined
}

function matchNavTarget(
  label: string,
  href: string,
  ready: boolean | undefined,
  pathname: string,
  search: unknown,
  linkSearch?: Record<string, string>,
): boolean {
  if (ready === false) {
    return pathname === '/in-progress' && getTitleFromSearch(search) === label
  }
  const isExact = pathname === href
  const isNested =
    !isExact &&
    pathname.startsWith(`${href}/`) &&
    href.split('/').filter(Boolean).length >= 2
  if (!isExact && !isNested) return false
  // Billing management hub: active for any setup tab on `/billing`.
  if (href === '/billing' && isExact) return true
  if (linkSearch?.tab) {
    return isExact && searchTab(search) === linkSearch.tab
  }
  if (href === '/settings' && searchTab(search)) {
    return false
  }
  return true
}

const inspectorOnlyNavItems: NavItem[] = [
  { label: 'Home', icon: <Home className="h-5 w-5" />, href: '/' },
  {
    label: 'Service Users',
    icon: <Users className="h-5 w-5" />,
    href: '/service-users',
    children: [
      {
        label: 'All Service Users',
        icon: <Users className="h-4 w-4" />,
        href: '/service-users/all',
        permission: 'service_users.read',
        navTestId: 'nav-service-users-all',
      },
      {
        label: 'Calendar',
        icon: <CalendarDays className="h-4 w-4" />,
        href: '/service-users/calendar',
        permission: 'service_users.calendar.read',
        navTestId: 'nav-service-users-calendar',
      },
    ],
  },
]

/* ─── Nav data ─────────────────────────────────────────────── */
/** A page we plan to add (an Access Group feature not built yet): shown with a "Soon" badge, opens /in-progress. */
function planned(section: string | undefined, label: string, icon: React.ReactNode, description: string): SubNavItem {
  return { section, label, icon, href: '/in-progress', ready: false, planned: true, description }
}

const navItems: NavItem[] = [
  { label: 'Home', icon: <Home className="h-5 w-5" />, href: '/' },
  // Tasks given to the user's roles — every office user (managers open Role tasks from the page).
  { label: 'My tasks', icon: <ClipboardCheck className="h-5 w-5" />, href: '/my-tasks' },
  {
    label: 'Service Users',
    icon: <Users className="h-5 w-5" />,
    href: '/service-users',
    badge: 12,
    children: [
      { section: 'People', label: 'All Service Users', icon: <Users className="h-4 w-4" />, href: '/service-users/all', permission: 'service_users.read', navTestId: 'nav-service-users-all' },
      { section: 'People', label: 'Add Service User', icon: <UserRoundPlus className="h-4 w-4" />, href: '/service-users/add', permission: 'service_users.create', navTestId: 'nav-service-users-add' },
      {
        section: 'People',
        label: 'Service User hours',
        icon: <Clock className="h-4 w-4" />,
        href: '/service-users/hours',
        permission: 'service_users.read',
        navTestId: 'nav-service-user-hours',
      },
      { section: 'People', label: 'Calendar', icon: <CalendarDays className="h-4 w-4" />, href: '/service-users/calendar', permission: 'service_users.calendar.read', navTestId: 'nav-service-users-calendar' },
      {
        section: 'People',
        label: 'Portal access',
        icon: <Globe className="h-4 w-4" />,
        href: '/admin/service-user-portal',
        permission: 'service_users.portal.read',
        navTestId: 'nav-service-user-portal-admin',
      },
      planned("People", "Referrals & enquiries", <Inbox className="h-4 w-4" />, "Every referral and enquiry across all service users, from triage to admission. Today referrals are recorded on each service user's profile (Referrals tab)."),
      planned("People", "Private quotations", <Calculator className="h-4 w-4" />, "All private care quotations in one list. Today quotations are created from a referral on each service user's profile."),
      planned("People", "Family & funder access", <HeartHandshake className="h-4 w-4" />, "Let next of kin and funders sign in to see the parts of the care record they are allowed to see."),
      {
        section: 'Assessment & care plans',
        label: 'Initial Assessment',
        icon: <ClipboardList className="h-4 w-4" />,
        href: '/service-users/initial-assessment',
        permission: 'service_users.initial_assessment.read',
        navTestId: 'nav-service-users-initial-assessment',
      },
      {
        section: 'Assessment & care plans',
        label: 'Initial Assessment (Legacy)',
        icon: <ClipboardList className="h-4 w-4" />,
        href: '/service-users/initial-assessment-checklist',
        permission: 'service_users.initial_assessment.read',
        navTestId: 'nav-service-users-initial-assessment-legacy',
      },
      {
        section: 'Assessment & care plans',
        label: 'IA review queue',
        icon: <ShieldCheck className="h-4 w-4" />,
        href: '/initial-assessments/review-queue',
        permission: 'service_users.initial_assessment.review',
        navTestId: 'nav-initial-assessments-review-queue',
      },
      {
        section: 'Assessment & care plans',
        label: 'Assessment review queue',
        icon: <ClipboardList className="h-4 w-4" />,
        href: '/assessments/review-queue',
        permission: 'service_users.assessments.read',
        navTestId: 'nav-assessments-review-queue',
      },
      {
        section: 'Assessment & care plans',
        label: 'Care plan reviews',
        icon: <ClipboardList className="h-4 w-4" />,
        href: '/care-plans/reviews',
        permission: 'service_users.read',
        navTestId: 'nav-care-plan-reviews',
      },
      planned("Lifecycle", "Discharge & closure", <DoorOpen className="h-4 w-4" />, "Close a service cleanly: end visits, send final invoices and archive records."),
    ],
  },
  {
    // Rota + live visits (was Scheduling, ECM live/graph and Billing › Visit reconciliation).
    label: 'Care Operations',
    icon: <Calendar className="h-5 w-5" />,
    href: '/scheduling/schedule-jobs',
    children: [
      {
        section: 'Rota',
        label: 'Schedule Jobs',
        icon: <Calendar className="h-4 w-4" />,
        href: '/scheduling/schedule-jobs',
        anyPermission: [
          'schedule.read',
          'schedules.read',
          'schedules.build',
          'scheduled_jobs.read',
          'scheduled_visits.read',
          'job_allocations.read',
          'job_allocations.confirm',
          'scheduled_jobs_housekeeping.read',
          'schedule_timelines.read',
        ],
      },
      {
        section: 'Rota',
        label: 'Bulk generate rota',
        icon: <CalendarClock className="h-4 w-4" />,
        href: '/scheduling/bulk-generate-rota',
        anyPermission: [
          'scheduling.generate_from_visit_plan',
          'schedules.build',
          'scheduled_visits.create',
        ],
      },
      {
        section: 'Rota',
        label: 'Manage Schedule Jobs',
        icon: <Settings2 className="h-4 w-4" />,
        href: '/scheduling/jobs',
        anyPermission: [
          'schedule.read',
          'schedules.read',
          'schedules.build',
          'scheduled_jobs.read',
          'scheduled_visits.read',
          'job_allocations.read',
          'job_allocations.confirm',
          'scheduled_jobs_housekeeping.read',
          'schedule_timelines.read',
        ],
      },
      {
        section: 'Rota',
        label: 'List View of Schedule',
        icon: <List className="h-4 w-4" />,
        href: '/scheduling/list',
        anyPermission: [
          'schedule.read',
          'schedules.read',
          'schedules.build',
          'scheduled_jobs.read',
          'scheduled_visits.read',
          'job_allocations.read',
          'job_allocations.confirm',
          'scheduled_jobs_housekeeping.read',
          'schedule_timelines.read',
        ],
      },
      planned("Rota", "Rota suggestions & sickness cover", <Wand2 className="h-4 w-4" />, "Suggest the best carer for open visits and cover sickness using travel time, continuity and contracted hours."),
      planned("Rota", "Route planning", <Route className="h-4 w-4" />, "Plan each carer's run to cut travel time and mileage."),
      {
        section: 'Rota',
        label: 'Special visits',
        icon: <CalendarClock className="h-4 w-4" />,
        href: '/special-visits',
        anyPermission: ['employees.read', 'employees.reports.read'],
        navTestId: 'nav-special-visits',
      },
      {
        section: 'Visits',
        label: 'Live monitoring',
        icon: <Activity className="h-4 w-4" />,
        href: '/ecm/live',
        anyPermission: ['ecm.read', 'ecm.monitor'],
        navTestId: 'nav-ecm-live',
      },
      {
        section: 'Visits',
        label: 'Graph',
        icon: <BarChart3 className="h-4 w-4" />,
        href: '/ecm/graph',
        anyPermission: ['ecm.read', 'ecm.monitor'],
        navTestId: 'nav-ecm-graph',
      },
      {
        section: 'Visits',
        label: 'Visit reconciliation',
        icon: <ClipboardList className="h-4 w-4" />,
        href: '/billing/visit-reconciliation',
        permission: 'billing.visit_reconciliations.read',
        navTestId: 'nav-billing-reconciliation',
      },
      planned("Visits", "Live staff map", <MapIcon className="h-4 w-4" />, "See where carers are now against their scheduled visits."),
      planned("Visits", "Voice notes to text", <Mic className="h-4 w-4" />, "Turn carers' voice notes into written visit notes."),
      { section: 'Visits', label: 'Employee Operation Dashboard', icon: <LayoutGrid className="h-4 w-4" />, href: '/in-progress', ready: false },
      { section: 'Visits', label: 'Service Overview', icon: <Eye className="h-4 w-4" />, href: '/in-progress', ready: false },
      {
        section: 'On-call',
        label: 'On-call rota',
        icon: <PhoneCall className="h-4 w-4" />,
        href: '/on-call/rota',
        permission: 'on_call.read',
        navTestId: 'nav-on-call-rota',
      },
      {
        section: 'On-call',
        label: 'Out-of-hours calls',
        icon: <PhoneIncoming className="h-4 w-4" />,
        href: '/on-call/calls',
        permission: 'on_call.read',
        navTestId: 'nav-on-call-calls',
      },
    ],
  },
  {
    // eMAR: the manager's view across all service users. Each person's MAR and medicines stay on their profile.
    label: 'Medication',
    icon: <Pill className="h-5 w-5" />,
    href: '/medication',
    children: [
      { section: 'Administration', label: 'Missed & refused doses', icon: <AlertOctagon className="h-4 w-4" />, href: '/medication/exceptions', permission: 'service_users.read', navTestId: 'nav-medication-exceptions' },
      { section: 'Administration', label: 'Late doses', icon: <Clock className="h-4 w-4" />, href: '/medication/late', permission: 'service_users.read', navTestId: 'nav-medication-late' },
      { section: 'Administration', label: 'Administration log', icon: <ClipboardList className="h-4 w-4" />, href: '/medication/administered', permission: 'service_users.read', navTestId: 'nav-medication-administered' },
      planned("Administration", "MAR charts (all service users)", <CalendarDays className="h-4 w-4" />, "Every service user's MAR chart in one place, filtered by branch, round or carer, with gaps highlighted."),
      planned("Administration", "PRN protocols & use", <Activity className="h-4 w-4" />, "PRN protocols with maximum doses and minimum gaps, plus how often each PRN medicine is used and whether it worked."),
      planned("Prescriptions", "Medicines across service users", <List className="h-4 w-4" />, "Search every current medicine across all service users, for example everyone on a recalled medicine."),
      planned("Prescriptions", "Medication reviews", <FileSearch className="h-4 w-4" />, "Every service user's medication review date in one list, with overdue reviews first."),
      planned("Prescriptions", "Support levels & self-administration", <HeartHandshake className="h-4 w-4" />, "Prompt, assist or administer for each service user, with self-administration risk assessments due for review."),
      planned("Safety & governance", "Controlled drugs register", <ShieldAlert className="h-4 w-4" />, "A running balance for each controlled drug, with witnessed administrations and stock checks."),
      planned("Safety & governance", "Monthly medication audits", <ListChecks className="h-4 w-4" />, "A monthly MAR and stock audit per service user, with scores and an action plan for anything that fails."),
      planned("Safety & governance", "Medication errors", <MessageSquareWarning className="h-4 w-4" />, "Medication incidents with severity, the dose and carer involved, and lessons learned."),
      planned("Safety & governance", "Covert medicines & homely remedies", <ShieldCheck className="h-4 w-4" />, "Covert administration agreements (with best-interest decisions) and approved homely remedies per service user."),
      { section: 'Supply', label: 'Stock movements', icon: <Package className="h-4 w-4" />, href: '/medication/stock', permission: 'service_users.read', navTestId: 'nav-medication-stock' },
      planned("Supply", "Packs & deliveries", <Inbox className="h-4 w-4" />, "All blister packs and pharmacy deliveries waiting for a prescription check or countersignature."),
      planned("Supply", "Pharmacy orders", <Send className="h-4 w-4" />, "Send repeat orders and medication changes to the pharmacy and track what has arrived."),
      planned("Staff", "Medication competency", <Award className="h-4 w-4" />, "Observed competency checks for every carer who gives medication, with renewal dates (linked to Learning)."),
      { section: 'Setup', label: 'MAR status codes', icon: <Settings2 className="h-4 w-4" />, href: '/settings', search: { tab: 'medication' }, permission: 'lookups.read', navTestId: 'nav-medication-status-codes' },
      { section: 'Setup', label: 'Medication time slots', icon: <Clock className="h-4 w-4" />, href: '/settings', search: { tab: 'time-slots' }, permission: 'lookups.read', navTestId: 'nav-medication-time-slots' },
    ],
  },
  {
    // Staff records, time and absence (Learning is its own module).
    label: 'Workforce',
    icon: <UserCheck className="h-5 w-5" />,
    href: '/employee',
    children: [
      { section: 'Staff', label: 'All Employee', icon: <Users className="h-4 w-4" />, href: '/employee/staff-list', permission: 'employees.read', navTestId: 'nav-employee-staff-list' },
      { section: 'Staff', label: 'Add Employee', icon: <UserRoundPlus className="h-4 w-4" />, href: '/employee/add', permission: 'employees.create', navTestId: 'nav-employee-add' },
      {
        section: 'Staff',
        label: 'Compliance board',
        icon: <ShieldCheck className="h-4 w-4" />,
        href: '/employee/compliance',
        anyPermission: [
          'employees.read',
          'employees.compliance.read',
          'employees.compliance.reports.read',
        ],
        navTestId: 'nav-employee-compliance-board',
      },
      { section: 'Staff', label: 'General Employee Documents', icon: <FileText className="h-4 w-4" />, href: '/employee/documents', permission: 'employees.documents.read', navTestId: 'nav-employee-documents' },
      { section: 'Staff', label: 'Temporary Inspector Login', icon: <UserRoundPlus className="h-4 w-4" />, href: '/employee/temp-inspector', permission: 'employees.read' },
      { section: 'Staff', label: 'Send Message', icon: <PlusCircle className="h-4 w-4" />, href: '/in-progress', ready: false },
      {
        section: 'Time & absence',
        label: 'Employee hours',
        icon: <Clock className="h-4 w-4" />,
        href: '/employee/hours',
        anyPermission: ['employees.read', 'employees.reports.read'],
        navTestId: 'nav-employee-hours',
      },
      {
        section: 'Time & absence',
        label: 'Hours approvals',
        icon: <Clock className="h-4 w-4" />,
        href: '/hours-approvals',
        anyPermission: ['hours_approvals.read', 'hours_approvals.manage'],
        navTestId: 'nav-hours-approvals',
      },
      {
        section: 'Time & absence',
        label: 'Over care reviews',
        icon: <Scale className="h-4 w-4" />,
        href: '/over-care-reviews',
        anyPermission: ['hours_approvals.read', 'hours_approvals.manage'],
        navTestId: 'nav-over-care-reviews',
      },
      {
        section: 'Time & absence',
        label: 'Hours & visits history',
        icon: <History className="h-4 w-4" />,
        href: '/hours-history',
        anyPermission: ['hours_approvals.read', 'hours_approvals.manage'],
        navTestId: 'nav-hours-history',
      },
      {
        section: 'Time & absence',
        label: 'Absence tracker',
        icon: <CalendarOff className="h-4 w-4" />,
        href: '/employee/absences',
        anyPermission: ['employees.read', 'employees.reports.read'],
        navTestId: 'nav-employee-absences',
      },
      {
        section: 'Time & absence',
        label: 'Timesheets',
        icon: <FileSpreadsheet className="h-4 w-4" />,
        href: '/employee/timesheets',
        anyPermission: ['ecm.read', 'ecm.monitor'],
        navTestId: 'nav-employee-timesheets',
      },
      planned("Recruitment", "Recruitment", <Briefcase className="h-4 w-4" />, "Vacancies, candidates, interviews and offers."),
      planned("Development", "Supervision & appraisals", <MessagesSquare className="h-4 w-4" />, "One-to-one and group supervision records, appraisals and follow-up actions."),
      // Parental leave is recorded via the employee Absence tracker (Maternity / Paternity types).
      // TODO(later): restore the HR Recruitment pages here (HR dashboard, vacancies, candidates) when HR is ready:
      //   { section: 'Recruitment', label: 'HR Dashboard', href: '/hr/employees', permission: 'hr.read', navTestId: 'nav-hr-employees' },
      //   { section: 'Recruitment', label: 'Recruitment', href: '/hr/recruitment', anyPermission: ['hr.vacancies.read', 'hr.candidates.read'], navTestId: 'nav-hr-recruitment' },
      //   { section: 'Recruitment', label: 'Vacancies', href: '/hr/vacancies', permission: 'hr.vacancies.read', navTestId: 'nav-hr-vacancies' },
      //   { section: 'Recruitment', label: 'Candidates', href: '/hr/candidates', permission: 'hr.candidates.read', navTestId: 'nav-hr-candidates' },
    ],
  },
  // Specialist Pathways is hidden from the sidebar for now; the pages and routes still work.
  // Uncomment this item to show it again.
  //   {
  //     label: 'Specialist Pathways',
  //     icon: <HeartHandshake className="h-5 w-5" />,
  //     href: '/apps/specialist-pathways',
  //     children: [
  //       {
  //         section: 'Pathways',
  //         label: 'Learning Disability',
  //         icon: <ClipboardList className="h-4 w-4" />,
  //         href: '/specialist-pathways/learning-disability',
  //         permission: 'specialist_pathways.read',
  //         navTestId: 'nav-specialist-pathways-ld',
  //       },
  //       {
  //         section: 'Pathways',
  //         label: 'Dementia',
  //         icon: <ClipboardList className="h-4 w-4" />,
  //         href: '/specialist-pathways/dementia',
  //         permission: 'specialist_pathways.read',
  //         navTestId: 'nav-specialist-pathways-dementia',
  //       },
  //       {
  //         section: 'Pathways',
  //         label: 'End of Life',
  //         icon: <ClipboardList className="h-4 w-4" />,
  //         href: '/specialist-pathways/end-of-life',
  //         permission: 'specialist_pathways.read',
  //         navTestId: 'nav-specialist-pathways-eol',
  //       },
  //       {
  //         section: 'Pathways',
  //         label: 'Children & Young People',
  //         icon: <ClipboardList className="h-4 w-4" />,
  //         href: '/specialist-pathways/children',
  //         permission: 'specialist_pathways.read',
  //         navTestId: 'nav-specialist-pathways-children',
  //       },
  //       {
  //         section: 'Pathways',
  //         label: 'Supported Living',
  //         icon: <ClipboardList className="h-4 w-4" />,
  //         href: '/specialist-pathways/supported-living',
  //         permission: 'specialist_pathways.read',
  //         navTestId: 'nav-specialist-pathways-sl',
  //       },
  //     ],
  //   },
  {
    label: 'CRM',
    icon: <Inbox className="h-5 w-5" />,
    href: '/crm',
    children: [
      {
        section: 'CRM',
        label: 'Enquiry',
        icon: <Inbox className="h-4 w-4" />,
        href: '/crm',
        permission: 'crm.read',
        navTestId: 'nav-crm-enquiries',
      },
    ],
  },
  {
    label: 'Learning',
    icon: <GraduationCap className="h-5 w-5" />,
    href: '/learning/dashboard',
    children: [
      {
        section: 'Overview',
        label: 'Dashboard',
        icon: <GraduationCap className="h-4 w-4" />,
        href: '/learning/dashboard',
        permission: 'learning.dashboard.read',
        navTestId: 'nav-learning-dashboard',
      },
      {
        section: 'Training',
        label: 'Courses',
        icon: <BookOpen className="h-4 w-4" />,
        href: '/learning/courses',
        permission: 'learning.courses.read',
        navTestId: 'nav-learning-courses',
      },
      {
        section: 'Training',
        label: 'Assignments',
        icon: <ClipboardList className="h-4 w-4" />,
        href: '/learning/assignments',
        permission: 'learning.assignments.read',
        navTestId: 'nav-learning-assignments',
      },
      {
        section: 'Training',
        label: 'Training events',
        icon: <CalendarDays className="h-4 w-4" />,
        href: '/learning/training-events',
        permission: 'learning.training_events.read',
        navTestId: 'nav-learning-training-events',
      },
      planned('Training', 'Course library', <Library className="h-4 w-4" />, 'Ready-made courses such as the Care Certificate and mandatory training.'),
      planned('Training', 'Virtual competency checks', <ClipboardCheck className="h-4 w-4" />, "Test carers' skills with realistic care scenarios."),
      {
        section: 'Records',
        label: 'Compliance',
        icon: <ShieldCheck className="h-4 w-4" />,
        href: '/learning/compliance',
        permission: 'learning.compliance.read',
        navTestId: 'nav-learning-compliance',
      },
      {
        section: 'Records',
        label: 'Certificates',
        icon: <Award className="h-4 w-4" />,
        href: '/learning/certificates',
        permission: 'learning.certificates.read',
        navTestId: 'nav-learning-certificates',
      },
      {
        section: 'Records',
        label: 'External training',
        icon: <FileText className="h-4 w-4" />,
        href: '/learning/external-training',
        permission: 'learning.external_training.read',
        navTestId: 'nav-learning-external-training',
      },
      {
        section: 'Settings',
        label: 'Settings',
        icon: <Settings2 className="h-4 w-4" />,
        href: '/learning/settings',
        permission: 'learning.settings.manage',
        navTestId: 'nav-learning-settings',
      },
    ],
  },
  {
    // Incidents, policies, surveys (was Accident & Incident, Policies, Surveys).
    label: 'Quality & Compliance',
    icon: <ShieldCheck className="h-5 w-5" />,
    href: '/incidents/dashboard',
    children: [
      {
        section: 'Compliance',
        label: 'Compliance dashboard',
        icon: <ShieldCheck className="h-4 w-4" />,
        href: '/compliance',
        anyPermission: [
          'employees.compliance.reports.read',
          'learning.dashboard.read',
          'policies.read',
          'safeguarding.read',
          'safeguarding.manage',
          'incidents.read',
          'complaints.read',
          'specialist_pathways.read',
        ],
        navTestId: 'nav-compliance-dashboard',
      },
      { section: 'Incidents', label: 'Dashboard', icon: <LayoutGrid className="h-4 w-4" />, href: '/incidents/dashboard', permission: 'incidents.read' },
      { section: 'Incidents', label: 'All Incidents', icon: <Eye className="h-4 w-4" />, href: '/incidents/view', permission: 'incidents.read' },
      { section: 'Incidents', label: 'Raise Incident', icon: <PlusCircle className="h-4 w-4" />, href: '/incidents/raise', permission: 'incidents.create' },
      { section: 'Incidents', label: 'Complaints & Compliments', icon: <MessageSquareWarning className="h-4 w-4" />, href: '/incidents/feedback', permission: 'complaints.read', navTestId: 'nav-complaints-compliments' },
      { section: 'Incidents', label: 'My Actions', icon: <ClipboardList className="h-4 w-4" />, href: '/incidents/my-actions', permission: 'incidents.read', hideForRoles: ['super_admin'] },
      {
        section: 'Safeguarding',
        label: 'Safeguarding cases',
        icon: <ShieldAlert className="h-4 w-4" />,
        href: '/safeguarding',
        permission: 'safeguarding.read',
        navTestId: 'nav-safeguarding-cases',
      },
      {
        section: 'Policies & procedures',
        label: 'Policy Library',
        icon: <FileText className="h-4 w-4" />,
        href: '/policies',
        permission: 'policies.read',
        navTestId: 'nav-policies-library',
      },
      planned("Policies & procedures", "Signature requests", <PenLine className="h-4 w-4" />, "Send documents to staff to read and sign, and track who has signed."),
      planned("Governance", "Audits", <ClipboardList className="h-4 w-4" />, "An audit library, custom audits and due dates for each location."),
      planned("Governance", "Mock CQC inspection", <Scale className="h-4 w-4" />, "Work through the five key questions and quality statements and get a mock rating for each service."),
      planned("Governance", "Action plans & evidence", <ListChecks className="h-4 w-4" />, "One action plan for audits, incidents and complaints, with linked evidence."),
      planned("Governance", "Risk & assurance register", <AlertOctagon className="h-4 w-4" />, "Organisational risks, controls, owners and review dates."),
      planned("Governance", "CQC notifications", <Send className="h-4 w-4" />, "Prepare and track statutory notifications to the CQC."),
      {
        section: 'Policies & procedures',
        label: 'Categories',
        icon: <List className="h-4 w-4" />,
        href: '/policies/categories',
        permission: 'policies.read',
        navTestId: 'nav-policies-categories',
      },
      {
        section: 'Policies & procedures',
        label: 'Tags',
        icon: <ClipboardList className="h-4 w-4" />,
        href: '/policies/tags',
        permission: 'policies.read',
        navTestId: 'nav-policies-tags',
      },
      {
        section: 'Feedback',
        label: 'All surveys',
        icon: <List className="h-4 w-4" />,
        href: '/surveys',
        permission: 'surveys.read',
        navTestId: 'nav-surveys-all',
      },
    ],
  },
  {
    // Billing, carer pay, UK payroll, office salaries (was Billing, UK Payroll, Office salaries).
    label: 'Finance',
    icon: <PoundSterling className="h-5 w-5" />,
    href: '/billing',
    children: [
      {
        section: 'Billing',
        label: 'Billing management',
        icon: <Receipt className="h-4 w-4" />,
        href: '/billing',
        search: { tab: 'dashboard' },
        anyPermission: [
          'billing.visit_reconciliations.read',
          'billing.payroll_runs.read',
          'billing.invoice_runs.read',
          'billing.employee_payouts.read',
          'billing.payments.read',
        ],
        navTestId: 'nav-billing-management',
      },
      {
        section: 'Billing',
        label: 'Invoice runs',
        icon: <FileText className="h-4 w-4" />,
        href: '/billing/invoice-runs',
        permission: 'billing.invoice_runs.read',
        navTestId: 'nav-billing-invoices',
      },
      {
        section: 'Billing',
        label: 'Invoice audit trail',
        icon: <FileSearch className="h-4 w-4" />,
        href: '/billing/invoice-audit-trail',
        permission: 'billing.invoice_runs.read',
        navTestId: 'nav-billing-invoice-audit-trail',
      },
      planned("Billing", "Client payments & Direct Debit", <CreditCard className="h-4 w-4" />, "Collect payments from private clients by Direct Debit or card."),
      planned("Billing", "Accounting export", <FileOutput className="h-4 w-4" />, "Send invoices and payments to Xero, Sage or QuickBooks."),
      {
        section: 'Billing',
        label: 'Pay items',
        icon: <Wallet className="h-4 w-4" />,
        href: '/billing/pay-items',
        permission: 'billing.payroll_runs.read',
        organisationPayScope: true,
        navTestId: 'nav-billing-pay-items',
      },
      planned("Carer pay", "On-demand pay", <Zap className="h-4 w-4" />, "Let carers draw pay they have already earned before payday."),
      {
        section: 'Billing',
        label: 'Wage recoveries',
        icon: <Wallet className="h-4 w-4" />,
        href: '/billing/wage-recoveries',
        permission: 'billing.payroll_runs.read',
        organisationPayScope: true,
        navTestId: 'nav-billing-wage-recoveries',
      },
      {
        section: 'Billing',
        label: 'Salary',
        icon: <CircleDollarSign className="h-4 w-4" />,
        href: '/billing/salary',
        anyPermission: ['billing.payroll_runs.read', 'employees.read', 'employees.update'],
        navTestId: 'nav-billing-salary',
      },
      {
        section: 'Billing',
        label: 'Employee payouts',
        icon: <Banknote className="h-4 w-4" />,
        href: '/billing/employee-payouts',
        permission: 'billing.employee_payouts.read',
        organisationPayScope: true,
        navTestId: 'nav-billing-employee-payouts',
      },
      {
        section: 'Billing',
        label: 'Overview',
        icon: <LayoutGrid className="h-4 w-4" />,
        href: '/payroll',
        anyPermission: [
          'payroll.settings.read',
          'payroll.runs.read',
          'payroll.employees.read',
        ],
        navTestId: 'nav-payroll-overview',
      },
      {
        section: 'Billing',
        label: 'UK payroll runs',
        icon: <Wallet className="h-4 w-4" />,
        href: '/payroll/runs',
        permission: 'payroll.runs.read',
        organisationPayScope: true,
        navTestId: 'nav-payroll-runs',
      },
      {
        section: 'Billing',
        label: 'Payslips',
        icon: <FileText className="h-4 w-4" />,
        href: '/payroll/payslips',
        permission: 'payroll.runs.read',
        navTestId: 'nav-payroll-payslips',
      },
      {
        section: 'Billing',
        label: 'Taxes',
        icon: <Receipt className="h-4 w-4" />,
        href: '/payroll/taxes',
        permission: 'payroll.settings.read',
        organisationPayScope: true,
        navTestId: 'nav-payroll-taxes',
      },
      {
        section: 'Billing',
        label: 'Employer PAYE',
        icon: <Building2 className="h-4 w-4" />,
        href: '/payroll/employer',
        permission: 'payroll.settings.read',
        organisationPayScope: true,
        navTestId: 'nav-payroll-employer',
      },
      {
        section: 'Billing',
        label: 'Employee setup',
        icon: <Users className="h-4 w-4" />,
        href: '/payroll/employees',
        permission: 'payroll.employees.read',
        navTestId: 'nav-payroll-employees',
      },
      {
        section: 'Billing',
        label: 'Schedules & periods',
        icon: <CalendarClock className="h-4 w-4" />,
        href: '/payroll/schedules',
        anyPermission: ['payroll.settings.read', 'payroll.periods.read'],
        organisationPayScope: true,
        navTestId: 'nav-payroll-schedules',
      },
      {
        section: 'Billing',
        label: 'Tax years',
        icon: <CalendarDays className="h-4 w-4" />,
        href: '/payroll/tax-years',
        permission: 'payroll.settings.read',
        organisationPayScope: true,
        navTestId: 'nav-payroll-tax-years',
      },
      {
        section: 'Billing',
        label: 'Office salaries',
        icon: <Wallet className="h-4 w-4" />,
        href: '/office-salaries',
        permission: 'office_salaries.manage',
        navTestId: 'nav-office-salaries',
      },
    ],
  },
  {
    // Staff messaging (Access Messenger equivalent). Planned: every page opens the work-in-progress page.
    label: 'Messages',
    icon: <MessagesSquare className="h-5 w-5" />,
    href: '/in-progress',
    children: [
      planned(undefined, 'Staff messaging', <MessageCircle className="h-4 w-4" />, 'Secure two-way messages between the office and carers, with read receipts.'),
      planned(undefined, 'SMS to staff & clients', <Smartphone className="h-4 w-4" />, 'Send automatic or one-off text messages to staff, clients and suppliers.'),
      planned(undefined, 'Announcements', <Megaphone className="h-4 w-4" />, 'Post notices to every carer or to one team.'),
    ],
  },
  {
    // Reporting — every report page in one place (each link keeps its module permission).
    label: 'Reports',
    icon: <BarChart3 className="h-5 w-5" />,
    href: '/scheduling/report',
    children: [
      {
        label: 'Scheduling reports',
        icon: <FileText className="h-4 w-4" />,
        href: '/scheduling/report',
        anyPermission: [
          'schedule.read',
          'schedules.read',
          'schedules.build',
          'scheduled_jobs.read',
          'scheduled_visits.read',
          'job_allocations.read',
          'job_allocations.confirm',
          'scheduled_jobs_housekeeping.read',
          'schedule_timelines.read',
        ],
        navTestId: 'nav-reports-scheduling',
      },
      {
        label: 'Carer reports',
        icon: <Users className="h-4 w-4" />,
        href: '/reports/carers',
        permission: 'employees.reports.read',
        navTestId: 'nav-reports-carers',
      },
      {
        label: 'Timebank',
        icon: <Hourglass className="h-4 w-4" />,
        href: '/reports/timebank',
        permission: 'service_users.read',
        navTestId: 'nav-reports-timebank',
      },
      {
        label: 'ECM reports',
        icon: <FileBarChart2 className="h-4 w-4" />,
        href: '/ecm/reports',
        anyPermission: ['ecm.read', 'ecm.reports.export'],
        navTestId: 'nav-ecm-reports',
      },
      {
        label: 'Incident analytics',
        icon: <TrendingUp className="h-4 w-4" />,
        href: '/incidents/analytics',
        permission: 'incidents.view_analytics',
        navTestId: 'nav-reports-incidents',
      },
      {
        label: 'Learning reports',
        icon: <FileBarChart2 className="h-4 w-4" />,
        href: '/learning/reports',
        permission: 'learning.reports.read',
        navTestId: 'nav-learning-reports',
      },
      planned(undefined, "Dashboards & KPIs", <LayoutDashboard className="h-4 w-4" />, "Build dashboards for each role with the measures that matter to them."),
      planned(undefined, "Budgets & targets", <Target className="h-4 w-4" />, "Set budgets and targets and track performance against them."),
    ],
  },
  { label: 'UI Showcase',       icon: <Sparkles className="h-5 w-5" />,      href: '/showcase', ready: false },
  {
    // Organisation setup, configuration, security (was Checklist, Settings, Administration).
    label: 'Administration',
    icon: <Settings className="h-5 w-5" />,
    href: '/settings',
    children: [
      {
        section: 'Organisation',
        label: 'Setup checklist',
        icon: <ListChecks className="h-4 w-4" />,
        href: '/checklist',
        permission: 'setup_checklist.read',
        navTestId: 'nav-setup-checklist',
      },
      {
        section: 'Organisation',
        label: 'Company Details',
        icon: <Building2 className="h-4 w-4" />,
        href: '/settings/company',
        permission: 'lookups.read',
        navTestId: 'nav-settings-company',
      },
      {
        section: 'Organisation',
        label: 'Location Management',
        icon: <MapPin className="h-4 w-4" />,
        href: '/settings/location-management',
        search: { sub: 'zones' },
        permission: 'lookups.read',
        navTestId: 'nav-settings-location-management',
      },
      {
        section: 'Organisation',
        label: 'Roles & permissions',
        icon: <ShieldCheck className="h-4 w-4" />,
        href: '/settings/roles-permissions',
        search: { sub: 'office-users' },
        anyPermission: ['users.read', 'roles.manage', 'permissions.manage', 'lookups.read'],
        navTestId: 'nav-settings-roles-permissions',
      },
      {
        section: 'Configuration',
        label: 'General Settings',
        icon: <Settings2 className="h-4 w-4" />,
        href: '/settings/general',
        permission: 'lookups.read',
        navTestId: 'nav-settings-general',
      },
      { section: 'Configuration', label: 'Lookup data', icon: <Settings2 className="h-4 w-4" />, href: '/settings', permission: 'lookups.read', navTestId: 'nav-settings' },
      {
        section: 'Configuration',
        label: 'Tasks planner',
        icon: <ClipboardList className="h-4 w-4" />,
        href: '/settings',
        search: { tab: 'tasks-planner' },
        permission: 'lookups.read',
        navTestId: 'nav-settings-tasks-planner',
      },
      planned("Configuration", "Automation rules", <Workflow className="h-4 w-4" />, "Set up your own rules: when this happens, do that."),
      {
        section: 'Configuration',
        label: 'Care Pathway',
        icon: <Route className="h-4 w-4" />,
        href: '/settings/care-pathway',
        search: { tab: 'wizard' },
        permission: 'care_pathway.read',
        navTestId: 'nav-settings-care-pathway',
      },
      {
        section: 'Security & audit',
        label: 'Audit log',
        icon: <FileText className="h-4 w-4" />,
        href: '/admin/audit',
        anyPermission: ['audit.read', 'audit_logs.read'],
        navTestId: 'nav-admin-audit',
      },
      { section: 'Security & audit', label: 'Security', icon: <ShieldCheck className="h-4 w-4" />, href: '/admin/security', permission: 'security.admin' },
      planned("Integrations", "GP Connect", <Stethoscope className="h-4 w-4" />, "Bring NHS GP records, medications and allergies into the care record."),
      planned("Integrations", "Pharmacy integration", <Pill className="h-4 w-4" />, "Receive medication changes from the pharmacy and send orders."),
      planned("Integrations", "Telecare", <Radio className="h-4 w-4" />, "Use alerts from home sensors and alarms in care planning."),
      planned("Integrations", "AI assistant", <Bot className="h-4 w-4" />, "Answer questions about a service user, turn referral documents into draft care plans and draft action plans."),
      {
        section: 'Platform',
        label: 'System jobs',
        icon: <Timer className="h-4 w-4" />,
        href: '/system-jobs',
        permission: 'system_jobs.read',
        navTestId: 'nav-admin-system-jobs',
      },
      {
        section: 'Platform',
        label: 'Azure Pricing',
        icon: <Cloud className="h-4 w-4" />,
        href: '/azure-pricing',
        permission: 'platform_costs.read',
        navTestId: 'nav-azure-pricing',
      },
    ],
  },
]

export function navChildAllowed(
  child: SubNavItem,
  can: (p: Permission) => boolean,
  role?: RoleId,
  organisationPayScope = true,
): boolean {
  if (child.planned) return true
  if (child.ready === false) return false
  if (role && child.hideForRoles?.includes(role)) return false
  if (child.organisationPayScope && !organisationPayScope) return false
  if (child.anyPermission?.length) return child.anyPermission.some((p) => can(p))
  if (child.permission) return can(child.permission)
  // No permission key → hide (prevents tabs for modules the user cannot access).
  return false
}

function filterNavByPermission(
  items: NavItem[],
  can: (p: Permission) => boolean,
  role?: RoleId,
  organisationPayScope = true,
): NavItem[] {
  return items
    .map((item) => {
      if (item.ready === false) return null
      if (!item.children?.length) {
        // Top-level leaves (Home): keep unless gated by a permission the user lacks.
        if (item.permission && !can(item.permission)) return null
        return item
      }
      const children = item.children.filter((ch) => navChildAllowed(ch, can, role, organisationPayScope))
      // Planned pages never unlock a module on their own: the user needs at least one real page,
      // unless the whole module is planned (e.g. Messages), which everyone can preview.
      const allPlanned = item.children.every((ch) => ch.planned)
      if (!allPlanned && !children.some((ch) => !ch.planned)) return null
      if (!children.length) return null
      return { ...item, children }
    })
    .filter((item): item is NavItem => item != null)
}

function labelMatchesQuery(label: string, query: string): boolean {
  return label.toLowerCase().includes(query)
}

/** Client-side menu filter. Empty query returns items unchanged. */
function filterNavByQuery(items: NavItem[], rawQuery: string): NavItem[] {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return items

  return items
    .map((item) => {
      const parentMatch = labelMatchesQuery(item.label, query)
      if (!item.children?.length) {
        return parentMatch ? item : null
      }
      const children = parentMatch
        ? item.children
        : item.children.filter((ch) => labelMatchesQuery(ch.label, query))
      if (!parentMatch && !children.length) return null
      return { ...item, children }
    })
    .filter((item): item is NavItem => item != null)
}

export {
  navItems as adminNavItems,
  inspectorOnlyNavItems,
  filterNavByPermission,
}

const COLLAPSED_FLYOUT_CLOSE_MS = 120

interface NavChildLinkProps {
  child: SubNavItem
  pathname: string
  search: unknown
  onNavigate: () => void
  /** `panel` = module page menu next to the rail (illustration tiles, pill highlight). */
  variant?: 'classic' | 'panel'
}

function PanelNavLink({ child, active, onNavigate }: { child: SubNavItem; active: boolean; onNavigate: () => void }) {
  const planned = !!child.planned
  return (
    <Link
      {...navLinkProps(child.label, child.href, child.ready, child.search)}
      onClick={onNavigate}
      data-testid={child.navTestId}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-xl py-1.5 pl-2 pr-2.5 text-[13.5px] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        active
          ? 'bg-primary/10 font-semibold text-primary before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-primary'
          : planned
            ? 'text-sidebar-foreground/55 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/80'
            : 'text-sidebar-foreground/90 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform',
          active ? 'bg-background shadow-sm ring-1 ring-primary/25' : 'bg-background/80 ring-1 ring-sidebar-border/70 group-hover:scale-105',
          planned && !active && 'opacity-60 grayscale-[40%]',
        )}
      >
        <PageIllustration label={child.label} fallback={child.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-left">{child.label}</span>
      {planned ? (
        <span
          className="shrink-0 rounded-full bg-amber-100/80 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          title="Coming soon"
        >
          Soon
        </span>
      ) : null}
    </Link>
  )
}

function NavChildLink({ child, pathname, search, onNavigate, variant = 'classic' }: NavChildLinkProps) {
  const childActive = matchNavTarget(
    child.label,
    child.href,
    child.ready,
    pathname,
    search,
    child.search,
  )
  if (variant === 'panel') return <PanelNavLink child={child} active={childActive} onNavigate={onNavigate} />
  return (
    <Link
      {...navLinkProps(child.label, child.href, child.ready, child.search)}
      onClick={onNavigate}
      data-testid={child.navTestId}
      className={cn(
        'w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        childActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
          : 'text-sidebar-foreground/90 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
      )}
    >
      <span className={cn('flex shrink-0 items-center', childActive && 'text-sidebar-primary', child.planned && !childActive && 'opacity-55 grayscale-[35%]')}>
        <PageIllustration label={child.label} fallback={child.icon} className="h-[18px] w-[18px]" />
      </span>
      <span className={cn('flex-1 text-left truncate', child.planned && !childActive && 'text-sidebar-foreground/65')}>
        {child.label}
      </span>
      {child.planned ? (
        <span
          className="shrink-0 rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950"
          title="Coming soon"
        >
          Soon
        </span>
      ) : null}
    </Link>
  )
}

/**
 * Renders a group's children as list items, inserting a small sub-heading wherever
 * `section` changes. Works on the permission/search-filtered list, so a heading only
 * appears when at least one of its links is visible.
 */
function NavChildList({
  items,
  pathname,
  search,
  onNavigate,
  variant = 'classic',
}: {
  items: SubNavItem[]
  pathname: string
  search: unknown
  onNavigate: () => void
  variant?: 'classic' | 'panel'
}) {
  const showHeadings = items.some((c) => c.section)
  return (
    <>
      {items.map((child, i) => {
        const heading =
          showHeadings && child.section && child.section !== items[i - 1]?.section
            ? child.section
            : null
        return (
          <React.Fragment key={child.label}>
            {heading ? (
              variant === 'panel' ? (
                <li
                  role="presentation"
                  data-testid="sidebar-section-heading"
                  className={cn(
                    'flex items-center gap-2 px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/45',
                    i === 0 ? 'pt-1' : 'pt-4',
                  )}
                >
                  <span className="shrink-0">{heading}</span>
                  <span className="h-px flex-1 bg-sidebar-border/80" aria-hidden />
                </li>
              ) : (
                <li
                  role="presentation"
                  data-testid="sidebar-section-heading"
                  className={cn(
                    'px-2.5 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/60',
                    i === 0 ? 'pt-1' : 'pt-2.5',
                  )}
                >
                  {heading}
                </li>
              )
            ) : null}
            <li>
              <NavChildLink child={child} pathname={pathname} search={search} onNavigate={onNavigate} variant={variant} />
            </li>
          </React.Fragment>
        )
      })}
    </>
  )
}

interface CollapsedSidebarItemProps {
  item: NavItem
  isActive: boolean
  pathname: string
  search: unknown
  onNavigate: () => void
}

function CollapsedSidebarItem({ item, isActive, pathname, search, onNavigate }: CollapsedSidebarItemProps) {
  const hasChildren = !!item.children?.length
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [open, setOpen] = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0 })

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = undefined
    }
  }, [])

  const updatePosition = React.useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setCoords({ top: rect.top, left: rect.right + 6 })
  }, [])

  const handleOpen = React.useCallback(() => {
    clearCloseTimer()
    updatePosition()
    setOpen(true)
  }, [clearCloseTimer, updatePosition])

  const scheduleClose = React.useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => setOpen(false), COLLAPSED_FLYOUT_CLOSE_MS)
  }, [clearCloseTimer])

  React.useEffect(() => () => clearCloseTimer(), [clearCloseTimer])

  React.useEffect(() => {
    if (!open) return
    const onUpdate = () => updatePosition()
    window.addEventListener('scroll', onUpdate, true)
    window.addEventListener('resize', onUpdate)
    return () => {
      window.removeEventListener('scroll', onUpdate, true)
      window.removeEventListener('resize', onUpdate)
    }
  }, [open, updatePosition])

  if (!hasChildren) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link {...navLinkProps(item.label, item.href, item.ready)} onClick={onNavigate} className="block">
            <NavButton item={item} isActive={isActive} collapsed />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.label}
          {item.badge && (
            <Badge variant={item.badgeVariant ?? 'default'} size="sm">{item.badge}</Badge>
          )}
        </TooltipContent>
      </Tooltip>
    )
  }

  const flyout =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed z-[60]"
            style={{ top: coords.top, left: coords.left }}
            onMouseEnter={handleOpen}
            onMouseLeave={scheduleClose}
            data-testid={`sidebar-flyout-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {/* Invisible bridge so pointer can move from icon to menu */}
            <div className="-ml-2 pl-2">
              <div className="min-w-[13.5rem] rounded-lg border border-sidebar-border bg-sidebar py-1.5 shadow-lg">
                <p className="mb-1 border-b border-sidebar-border px-3 pb-1.5 text-xs font-semibold text-sidebar-foreground">
                  {item.label}
                </p>
                <ul className="max-h-[calc(100vh-2rem)] space-y-0.5 overflow-y-auto px-1">
                  <NavChildList
                    items={item.children!}
                    pathname={pathname}
                    search={search}
                    onNavigate={() => {
                      onNavigate()
                      setOpen(false)
                    }}
                  />
                </ul>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div
        ref={triggerRef}
        className="relative"
        onMouseEnter={handleOpen}
        onMouseLeave={scheduleClose}
      >
        <NavButton item={item} isActive={isActive} collapsed hasChildren />
      </div>
      {flyout}
    </>
  )
}

/* ─── Sidebar ──────────────────────────────────────────────── */
/**
 * Office users get the module rail + page panel. The service user portal and temporary
 * inspectors keep the single-column sidebar (their menus are short).
 */
export function Sidebar({ variant = 'admin' }: { variant?: LayoutVariant }) {
  const role = useAuthStore((s) => s.user?.role)
  if (variant === 'portal' || role === 'temporary_inspector') return <ClassicSidebar variant={variant} />
  return <ModuleSidebar />
}

/** Which module a URL belongs to: exact menu match first, then the module whose pages share the first path segment. */
function moduleForLocation(items: NavItem[], pathname: string, search: unknown): string | undefined {
  const landing = /^\/apps\/([^/]+)/.exec(pathname)
  if (landing) return moduleLabelForSlug(landing[1]!)
  for (const it of items) {
    if (it.children?.some((c) => matchNavTarget(c.label, c.href, c.ready, pathname, search, c.search))) return it.label
    if (!it.children?.length && matchNavTarget(it.label, it.href, it.ready, pathname, search)) return it.label
  }
  const seg = pathname.split('/').filter(Boolean)[0]
  if (!seg) return undefined
  let best: { label: string; hits: number } | undefined
  for (const it of items) {
    const hits = it.children?.filter((c) => !c.planned && c.href.split('/').filter(Boolean)[0] === seg).length ?? 0
    if (hits > 0 && (!best || hits > best.hits)) best = { label: it.label, hits }
  }
  return best?.label
}

/** Header of the module page menu (hover card and pinned panel). */
function ModulePanelHeader({
  module,
  onNavigate,
  trailing,
}: {
  module: NavItem
  onNavigate: () => void
  trailing?: React.ReactNode
}) {
  const meta = NAV_MODULES[module.label]
  const pages = module.children ?? []
  const soon = pages.filter((p) => p.planned).length
  const live = pages.length - soon
  return (
    <div className="shrink-0 border-b border-sidebar-border/70 bg-gradient-to-b from-sidebar-accent/80 to-transparent px-3.5 pb-3 pt-3.5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-sidebar-border/70">
          <ModuleIllustration
            label={module.label}
            fallback={meta ? <meta.Icon className="h-5 w-5 text-sidebar-foreground/80" /> : null}
            className="h-7 w-7"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-semibold leading-tight text-sidebar-foreground" data-testid="sidebar-panel-title">
            {module.label}
          </p>
          {meta ? <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-sidebar-foreground/60">{meta.description}</p> : null}
        </div>
        {trailing}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-sidebar-foreground/50">
          {live} {live === 1 ? 'page' : 'pages'}
          {soon ? ` · ${soon} coming soon` : ''}
        </span>
        {moduleLandingPath(module.label) ? (
          <Link
            to={moduleLandingPath(module.label)!}
            onClick={onNavigate}
            className="inline-flex items-center gap-0.5 rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm ring-1 ring-sidebar-border/70 transition-colors hover:bg-primary/10"
          >
            Overview <ChevronRight className="h-3 w-3" />
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function ModuleSidebar() {
  const { sidebarMobileOpen, setSidebarMobileOpen, pagePanelPinned, togglePagePanelPinned } =
    useUIStore()
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const { pathname, search } = location
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const can = useAuthStore((s) => s.can)

  const items = React.useMemo(
    () => filterNavByPermission(navItems, can, user?.role, hasOrganisationPayScope(user)),
    [can, user],
  )
  // Cheap (a few dozen string compares), so computed each render rather than memoised.
  const routeModule = moduleForLocation(items, pathname, search)

  // The module whose pages the panel lists. Follows the route; a rail click can pick another.
  const [openModule, setOpenModule] = React.useState<string | undefined>(routeModule)
  React.useEffect(() => setOpenModule(routeModule), [routeModule])

  const [menuQuery, setMenuQuery] = React.useState('')
  const searching = menuQuery.trim().length > 0
  const searchResults = React.useMemo(() => filterNavByQuery(items, menuQuery), [items, menuQuery])
  // Search opened from the rail button: forces the panel open (even unpinned) in search mode.
  const [searchOpen, setSearchOpen] = React.useState(false)
  const closeSearch = React.useCallback(() => {
    setSearchOpen(false)
    setMenuQuery('')
  }, [])

  const panelModule = items.find((i) => i.label === openModule && i.children?.length)
  // Desktop: pages show on hover (fly-out) unless the user pins the panel open. Mobile drawer always shows it.
  // The rail search button also forces the panel open in search mode.
  const panelVisible =
    searchOpen || ((!!panelModule || searching) && (pagePanelPinned || sidebarMobileOpen))

  const closeMobile = () => setSidebarMobileOpen(false)

  // Hover / focus fly-out: preview any module's pages without leaving the current one.
  const [hoverModule, setHoverModule] = React.useState<string | undefined>(undefined)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = undefined
  }, [])
  const openFlyout = React.useCallback(
    (label: string) => {
      cancelClose()
      setHoverModule(label)
    },
    [cancelClose],
  )
  const scheduleClose = React.useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => setHoverModule(undefined), 180)
  }, [cancelClose])
  React.useEffect(() => () => cancelClose(), [cancelClose])
  React.useEffect(() => setHoverModule(undefined), [pathname])
  // Close the search panel whenever the route changes (a result was opened).
  React.useEffect(() => closeSearch(), [pathname, closeSearch])
  // Focus the search field as soon as it opens.
  React.useEffect(() => {
    if (!searchOpen) return
    const el = document.querySelector<HTMLInputElement>('[data-testid="sidebar-search"]')
    el?.focus()
  }, [searchOpen])

  const flyoutModule = items.find((i) => i.label === hoverModule && i.children?.length)
  // No fly-out on the mobile drawer, or when it would just repeat the docked panel.
  const showFlyout =
    !!flyoutModule &&
    !sidebarMobileOpen &&
    !searchOpen &&
    !(panelVisible && !searching && flyoutModule.label === panelModule?.label)
  const flyoutMeta = flyoutModule ? NAV_MODULES[flyoutModule.label] : undefined

  return (
    <TooltipProvider delayDuration={200}>
      {sidebarMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={closeMobile} />
      )}

      <aside
        data-testid="sidebar"
        data-collapsed={pagePanelPinned ? 'false' : 'true'}
        data-pinned={pagePanelPinned ? 'true' : 'false'}
        data-layout="module-rail"
        className={cn(
          'z-50 flex h-full max-h-full min-h-0 shrink-0 bg-sidebar border-r border-sidebar-border',
          'sidebar-transition fixed inset-y-0 left-0 lg:relative lg:translate-x-0',
          sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* ── Module rail ── */}
        <div className="flex w-[76px] shrink-0 flex-col items-center border-r border-sidebar-border">
          <div className="flex h-14 w-full shrink-0 items-center justify-center border-b border-sidebar-border">
            <CompanyBrandMark collapsed />
          </div>
          <div className="flex w-full shrink-0 justify-center px-1.5 pt-2">
            <button
              type="button"
              data-testid="sidebar-search-button"
              aria-label="Search pages"
              aria-pressed={searchOpen}
              title="Search pages"
              onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                searchOpen
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-2 ring-sidebar-primary/60'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
          <nav aria-label="Modules" className="flex w-full flex-1 flex-col gap-1 overflow-y-auto px-1.5 py-2">
            {items.map((item) => {
              const m = NAV_MODULES[item.label]
              if (!m) return null
              const isModule = !!item.children?.length
              const active = item.label === (openModule ?? routeModule)
              const to = isModule ? moduleLandingPath(item.label)! : item.href
              const link = (
                <Link
                  to={to}
                  data-testid={`rail-${m.slug}`}
                  aria-current={active ? 'page' : undefined}
                  aria-haspopup={isModule ? 'menu' : undefined}
                  aria-expanded={isModule ? hoverModule === item.label : undefined}
                  onMouseEnter={isModule ? () => openFlyout(item.label) : undefined}
                  onMouseLeave={isModule ? scheduleClose : undefined}
                  onFocus={isModule ? () => openFlyout(item.label) : undefined}
                  onBlur={isModule ? scheduleClose : undefined}
                  onClick={() => {
                    // Opening a module goes to its landing page; the hover menu closes and does not dock.
                    setOpenModule(item.label)
                    cancelClose()
                    setHoverModule(undefined)
                    if (!isModule) closeMobile()
                  }}
                  className={cn(
                    'group flex w-full flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                      active
                        ? 'bg-sidebar-accent shadow-sm ring-2 ring-sidebar-primary/60'
                        : hoverModule === item.label
                          ? 'bg-sidebar-accent'
                          : 'group-hover:bg-sidebar-accent',
                    )}
                  >
                    <ModuleIllustration
                      label={item.label}
                      fallback={<m.Icon className="h-5 w-5 text-sidebar-foreground/80" />}
                      className={cn('h-7 w-7 transition-transform', !active && 'group-hover:scale-110')}
                    />
                  </span>
                  <span
                    className={cn(
                      // rail-label: grows with the reader's text size but is capped to fit the fixed-width rail.
                      'rail-label font-medium leading-tight',
                      active ? 'text-sidebar-foreground' : 'text-sidebar-foreground/75',
                    )}
                  >
                    {m.railLabel}
                  </span>
                </Link>
              )
              // Modules preview their pages in the fly-out; single pages (Home, My tasks) get a tooltip.
              return isModule ? (
                <React.Fragment key={item.label}>{link}</React.Fragment>
              ) : (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[14rem]">
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-xs opacity-80">{m.description}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </nav>
          <div className="flex w-full shrink-0 flex-col items-center gap-1 border-t border-sidebar-border px-1.5 py-2">
            <button
              type="button"
              data-testid="sidebar-collapse-button"
              aria-label={pagePanelPinned ? 'Unpin page menu (show on hover)' : 'Pin page menu open'}
              aria-pressed={pagePanelPinned}
              title={pagePanelPinned ? 'Unpin page menu (show on hover)' : 'Pin page menu open'}
              onClick={togglePagePanelPinned}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:inline-flex"
            >
              {pagePanelPinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
            </button>
            <button
              type="button"
              data-testid="sidebar-sign-out-button"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => {
                logout('sidebar')
                navigate({ to: '/auth/login' })
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Page panel ── */}
        {panelVisible ? (
          <div className="flex w-[268px] min-w-0 flex-col" data-testid="sidebar-panel">
            {panelModule && !searching && !searchOpen ? (
              <ModulePanelHeader
                module={panelModule}
                onNavigate={closeMobile}
                trailing={
                  <button className="shrink-0 text-muted-foreground hover:text-foreground lg:hidden" onClick={closeMobile} aria-label="Close menu">
                    <X className="h-5 w-5" />
                  </button>
                }
              />
            ) : (
              <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3.5">
                <span className="flex-1 font-display text-[15px] font-semibold text-sidebar-foreground">
                  {searching ? 'Search results' : 'Search'}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    closeSearch()
                    closeMobile()
                  }}
                  aria-label="Close search"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="shrink-0 px-3 pt-2.5">
              <Input
                type="search"
                value={menuQuery}
                onChange={(e) => setMenuQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    closeSearch()
                    closeMobile()
                  }
                }}
                aria-label="Search all pages"
                placeholder="Search all pages"
                data-testid="sidebar-search"
                leftElement={<Search className="h-4 w-4" />}
                className="h-9 rounded-xl border-sidebar-border bg-background/70 text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus-visible:border-sidebar-ring focus-visible:ring-sidebar-ring"
              />
            </div>
            <nav aria-label={searching ? 'Search results' : searchOpen ? 'Search' : `${panelModule?.label} pages`} className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-2.5">
              {searching ? (
                searchResults.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-sidebar-foreground/70">No matching pages</p>
                ) : (
                  <ul className="space-y-0.5">
                    {searchResults.map((mod) =>
                      mod.children?.length ? (
                        <React.Fragment key={mod.label}>
                          <NavChildList
                            variant="panel"
                            items={mod.children.map((c) => ({ ...c, section: mod.label }))}
                            pathname={pathname}
                            search={search}
                            onNavigate={() => {
                              closeSearch()
                              closeMobile()
                            }}
                          />
                        </React.Fragment>
                      ) : (
                        <li key={mod.label}>
                          <NavChildLink
                            variant="panel"
                            child={{ label: mod.label, icon: mod.icon, href: mod.href }}
                            pathname={pathname}
                            search={search}
                            onNavigate={() => {
                              closeSearch()
                              closeMobile()
                            }}
                          />
                        </li>
                      ),
                    )}
                  </ul>
                )
              ) : searchOpen ? (
                <p className="px-2 py-6 text-center text-sm text-sidebar-foreground/70">
                  Type to search all pages…
                </p>
              ) : panelModule ? (
                <ul className="space-y-0.5">
                  <NavChildList variant="panel" items={panelModule.children!} pathname={pathname} search={search} onNavigate={closeMobile} />
                </ul>
              ) : null}
            </nav>
          </div>
        ) : null}

      </aside>

      {/* ── Hover fly-out (desktop): floating card portaled to the body so it escapes the sidebar's
           stacking context and always sits above page content (e.g. the schedule board's sticky
           columns use z-[60]). The transparent left padding bridges the gap from the rail. ── */}
      {showFlyout && flyoutModule && flyoutMeta && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="menu"
              aria-label={`${flyoutModule.label} pages`}
              data-testid="sidebar-flyout"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              onFocus={cancelClose}
              onBlur={scheduleClose}
              className="fixed inset-y-0 left-[76px] z-[70] hidden py-2.5 pl-2 lg:flex"
            >
              <div className="flex w-[280px] flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar shadow-2xl ring-1 ring-black/5 animate-in fade-in-0 slide-in-from-left-1 duration-150">
                <ModulePanelHeader
                  module={flyoutModule}
                  onNavigate={() => {
                    setOpenModule(flyoutModule.label)
                    setHoverModule(undefined)
                  }}
                />
                <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-2.5">
                  <ul className="space-y-0.5">
                    <NavChildList
                      variant="panel"
                      items={flyoutModule.children!}
                      pathname={pathname}
                      search={search}
                      onNavigate={() => setHoverModule(undefined)}
                    />
                  </ul>
                </nav>
              </div>
            </div>,
            document.body,
          )
        : null}
    </TooltipProvider>
  )
}

function ClassicSidebar({ variant = 'admin' }: { variant?: LayoutVariant }) {
  const { sidebarCollapsed, toggleSidebar, sidebarMobileOpen, setSidebarMobileOpen } = useUIStore()
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const { pathname, search } = location
  const searchKey = React.useMemo(() => JSON.stringify(search ?? {}), [search])
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const can = useAuthStore(s => s.can)
  const isPortal = variant === 'portal'
  const navSource = isPortal
    ? portalNavItems
    : user?.role === 'temporary_inspector'
      ? inspectorOnlyNavItems
      : navItems
  const navItemsFiltered = React.useMemo(() => {
    if (isPortal) return navSource
    // Temporary inspector list is already curated; skip strict ACL filter.
    if (user?.role === 'temporary_inspector') return navSource
    return filterNavByPermission(navSource, can, user?.role, hasOrganisationPayScope(user))
  }, [can, isPortal, navSource, user])
  const [menuQuery, setMenuQuery] = React.useState('')
  const isMenuSearching = !sidebarCollapsed && menuQuery.trim().length > 0
  const visibleNavItems = React.useMemo(() => {
    if (sidebarCollapsed) return navItemsFiltered
    return filterNavByQuery(navItemsFiltered, menuQuery)
  }, [menuQuery, navItemsFiltered, sidebarCollapsed])
  const signOutRedirect = isPortal ? '/portal/login' : '/auth/login'
  // const accountHref = isPortal ? '/portal/profile' : '/account' // TODO(later): restore with sidebar Super Admin / account card

  // Track which parent groups are open — open a group when its child route is active
  const [openGroups, setOpenGroups] = React.useState<Set<string>>(() => new Set())

  React.useEffect(() => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      for (const item of navSource) {
        if (item.children?.some(c => matchNavTarget(c.label, c.href, c.ready, pathname, search, c.search))) {
          next.add(item.label)
        }
      }
      return next
    })
  }, [pathname, searchKey, navSource])

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupLabel)) next.delete(groupLabel)
      else next.add(groupLabel)
      return next
    })
  }

  const handleNav = () => {
    setSidebarMobileOpen(false)
  }

  // When sidebar collapses, close all open groups
  React.useEffect(() => {
    if (sidebarCollapsed) setOpenGroups(new Set())
  }, [sidebarCollapsed])

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile Overlay */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        data-collapsed={sidebarCollapsed ? 'true' : 'false'}
        className={cn(
          'z-50 flex h-full max-h-full min-h-0 shrink-0 flex-col bg-sidebar border-r border-sidebar-border',
          'sidebar-transition',
          /* Mobile: overlay drawer. Desktop: in-flow column that stays put while main scrolls. */
          'fixed inset-y-0 left-0 lg:static lg:translate-x-0',
          sidebarCollapsed ? 'w-[68px]' : 'w-[260px]',
          sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo / Brand + collapse (desktop, top) */}
        <div
          className={cn(
            'flex shrink-0 flex-col border-b border-sidebar-border',
            sidebarCollapsed ? 'items-center gap-1 px-1 py-2' : 'px-2',
          )}
        >
          <div
            className={cn(
              'flex w-full items-center gap-1 overflow-hidden',
              sidebarCollapsed ? 'justify-center' : 'h-14',
            )}
          >
            <CompanyBrandMark
              collapsed={sidebarCollapsed}
              className={cn('min-w-0', !sidebarCollapsed && 'flex-1')}
            />
            {!sidebarCollapsed ? (
              <button
                type="button"
                data-testid="sidebar-collapse-button"
                aria-label="Collapse sidebar"
                title="Collapse"
                onClick={toggleSidebar}
                className={cn(
                  'hidden lg:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                  'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  'transition-colors',
                )}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : null}
            <button
              className="ml-auto shrink-0 text-muted-foreground hover:text-foreground lg:hidden"
              onClick={() => setSidebarMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {sidebarCollapsed ? (
            <button
              type="button"
              data-testid="sidebar-collapse-button"
              aria-label="Expand sidebar"
              title="Expand"
              onClick={toggleSidebar}
              className={cn(
                'hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-md',
                'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                'transition-colors',
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {!sidebarCollapsed ? (
          <div className="shrink-0 px-2 pt-2">
            <Input
              type="search"
              value={menuQuery}
              onChange={(e) => setMenuQuery(e.target.value)}
              aria-label="Search menu"
              placeholder="Search menu"
              data-testid="sidebar-search"
              leftElement={<Search className="h-4 w-4" />}
              className="h-9 border-sidebar-border bg-sidebar text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus-visible:border-sidebar-ring focus-visible:ring-sidebar-ring"
            />
          </div>
        ) : null}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
          {visibleNavItems.length === 0 ? (
            isMenuSearching ? (
              <p className="px-2 py-6 text-center text-sm text-sidebar-foreground/70">
                No matching pages
              </p>
            ) : null
          ) : (
          <ul className="flex flex-col gap-0.5">
            {visibleNavItems.map((item) => {
              const hasChildren = !!item.children?.length
              const isActive = hasChildren
                ? item.children!.some(c => matchNavTarget(c.label, c.href, c.ready, pathname, search, c.search))
                : matchNavTarget(item.label, item.href, item.ready, pathname, search)
              const isOpen = isMenuSearching || openGroups.has(item.label)

              return (
                <li key={item.label}>
                  {sidebarCollapsed ? (
                    <CollapsedSidebarItem
                      item={item}
                      isActive={!!isActive}
                      pathname={pathname}
                      search={search}
                      onNavigate={handleNav}
                    />
                  ) : hasChildren ? (
                    /* ── Expanded: collapsible group ── */
                    <div>
                      <NavButton
                        item={item}
                        isActive={!!isActive}
                        isOpen={isOpen}
                        hasChildren
                        onClick={() => {
                          if (isMenuSearching) return
                          toggleGroup(item.label)
                        }}
                      />
                      {isOpen && (
                        <ul className="mt-0.5 ml-3 pl-3 border-l border-sidebar-border space-y-0.5 pb-1">
                          <NavChildList
                            items={item.children!}
                            pathname={pathname}
                            search={search}
                            onNavigate={handleNav}
                          />
                        </ul>
                      )}
                    </div>
                  ) : (
                    /* ── Expanded: plain link ── */
                    <Link {...navLinkProps(item.label, item.href, item.ready)} onClick={handleNav} className="block">
                      <NavButton
                        item={item}
                        isActive={!!isActive}
                      />
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
          )}
        </nav>

        {/* Bottom section */}
        <div className="shrink-0 border-t border-sidebar-border p-2 space-y-1">
          {/* TODO(later): restore sidebar Super Admin / account card — redundant with top-right user control.
          <Link
            to={accountHref}
            onClick={handleNav}
            className={cn('flex items-center gap-2.5 rounded-lg px-2 py-2', 'hover:bg-sidebar-accent cursor-pointer transition-colors group', sidebarCollapsed && 'justify-center px-1')}
          >
            <UserAvatar name={user?.displayName ?? 'Guest'} size="sm" online={!!user} className="shrink-0" />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">{user?.displayName ?? 'Sign in'}</p>
                <p className="text-xs text-sidebar-foreground/75 truncate leading-tight">
                  {isPortal ? 'My care portal' : user?.jobTitle ?? user?.role ?? ''}
                </p>
              </div>
            )}
            {!sidebarCollapsed && <LogOut className="h-4 w-4 text-sidebar-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
          </Link>
          */}
          <button
            type="button"
            data-testid="sidebar-sign-out-button"
            onClick={() => {
              logout('sidebar')
              navigate({ to: signOutRedirect })
            }}
            className={cn(
              'w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/90',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}

/* ─── NavButton ────────────────────────────────────────────── */
interface NavButtonProps {
  item: NavItem
  isActive: boolean
  collapsed?: boolean
  hasChildren?: boolean
  isOpen?: boolean
  onClick?: () => void
}

function NavButton({ item, isActive, collapsed, hasChildren, isOpen, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        'w-full flex items-center gap-3 rounded-md text-base transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        collapsed ? 'justify-center h-10 w-10 mx-auto' : 'px-3 h-10',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
      )}
    >
      <span className={cn('shrink-0', isActive && 'text-sidebar-primary')}>{item.icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {item.badge && !hasChildren && (
            <Badge variant={item.badgeVariant ?? 'muted'} size="sm" className="shrink-0 ml-auto">{item.badge}</Badge>
          )}
          {hasChildren && (
            <ChevronRight className={cn('h-4 w-4 text-sidebar-foreground/80 shrink-0 transition-transform', isOpen && 'rotate-90')} />
          )}
        </>
      )}
    </button>
  )
}

/* ─── Notification Bell ──────────────────────────────────── */
export function NotificationBell() {
  const notifications = [{ id: '1', read: false }, { id: '2', read: false }]
  const unread = notifications.filter(n => !n.read).length
  return (
    <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">{unread}</span>
      )}
    </button>
  )
}
