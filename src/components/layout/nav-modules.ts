import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Calendar,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HeartHandshake,
  Home,
  Inbox,
  Landmark,
  ListChecks,
  MessagesSquare,
  Pill,
  PoundSterling,
  Radio,
  Settings,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'

/**
 * Presentation data for each top-level module in the admin sidebar (keyed by the
 * NavItem label in Sidebar.tsx). Drives the module rail, the page panel header and
 * the `/apps/$module` landing pages.
 */
export interface NavModuleMeta {
  /** URL segment for the landing page: /apps/<slug>. */
  slug: string
  /** Short label under the rail icon. */
  railLabel: string
  description: string
  Icon: LucideIcon
  /** Tailwind classes for the module's icon tile. */
  tone: string
}

export const NAV_MODULES: Record<string, NavModuleMeta> = {
  Home: {
    slug: 'home',
    railLabel: 'Home',
    description: 'Your dashboard',
    Icon: Home,
    tone: 'bg-primary/10 text-primary',
  },
  Checklist: {
    slug: 'checklist',
    railLabel: 'Checklist',
    description: 'Setup checklist for your organisation',
    Icon: ListChecks,
    tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  'My tasks': {
    slug: 'my-tasks',
    railLabel: 'My tasks',
    description: 'Tasks assigned to your roles',
    Icon: ClipboardCheck,
    tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  'Service Users': {
    slug: 'service-users',
    railLabel: 'Service users',
    description: 'People, assessments and care plans',
    Icon: Users,
    tone: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  },
  'Specialist Pathways': {
    slug: 'specialist-pathways',
    railLabel: 'Pathways',
    description: 'Specialist pathway assessments and care plans',
    Icon: HeartHandshake,
    tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
  Safeguarding: {
    slug: 'safeguarding',
    railLabel: 'Safeguarding',
    description: 'Raise, triage, refer and close safeguarding concerns',
    Icon: ShieldAlert,
    tone: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  },
  CRM: {
    slug: 'crm',
    railLabel: 'Enquiries',
    description: 'Capture enquiries and convert them into clients',
    Icon: Inbox,
    tone: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  },
  Scheduling: {
    slug: 'scheduling',
    railLabel: 'Scheduling',
    description: 'Rota, schedule jobs and list views',
    Icon: Calendar,
    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  Operations: {
    slug: 'operations',
    railLabel: 'Operations',
    description: 'Operational dashboards and service overview',
    Icon: Settings2,
    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  Employee: {
    slug: 'employee',
    railLabel: 'Employee',
    description: 'Staff records, compliance, hours and absence',
    Icon: UserCheck,
    tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  Reports: {
    slug: 'reports',
    railLabel: 'Reports',
    description: 'Scheduling, carer, ECM, incident and learning reports',
    Icon: BarChart3,
    tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  },
  ECM: {
    slug: 'ecm',
    railLabel: 'ECM',
    description: 'Electronic call monitoring, live view and graphs',
    Icon: Radio,
    tone: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  },
  Learning: {
    slug: 'learning',
    railLabel: 'Learning',
    description: 'Courses, assignments, training records and certificates',
    Icon: GraduationCap,
    tone: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  },
  Policies: {
    slug: 'policies',
    railLabel: 'Policies',
    description: 'Policy library, categories and tags',
    Icon: FileText,
    tone: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200',
  },
  'UK Payroll': {
    slug: 'uk-payroll',
    railLabel: 'Payroll',
    description: 'Pay runs, payslips, taxes and employee setup',
    Icon: Landmark,
    tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  'Office salaries': {
    slug: 'office-salaries',
    railLabel: 'Salaries',
    description: 'Office staff salaries and payments',
    Icon: Banknote,
    tone: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',
  },
  Billing: {
    slug: 'billing',
    railLabel: 'Billing',
    description: 'Visit reconciliation, carer pay, payouts and invoices',
    Icon: PoundSterling,
    tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  'Accident & Incident': {
    slug: 'accident-incident',
    railLabel: 'Incidents',
    description: 'Incidents, complaints, compliments and actions',
    Icon: AlertTriangle,
    tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
  Surveys: {
    slug: 'surveys',
    railLabel: 'Surveys',
    description: 'Create and review surveys',
    Icon: MessagesSquare,
    tone: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  },
  Settings: {
    slug: 'settings',
    railLabel: 'Settings',
    description: 'Company details, lookups, roles and care pathway',
    Icon: Settings,
    tone: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  },
  'UI Showcase': {
    slug: 'ui-showcase',
    railLabel: 'Showcase',
    description: 'Component and UI showcase',
    Icon: Sparkles,
    tone: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  },
  'Quality & Compliance': {
    slug: 'quality-compliance',
    railLabel: 'Quality',
    description: 'Incidents, policies and surveys',
    Icon: ShieldCheck,
    tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
  Medication: {
    slug: 'medication',
    railLabel: 'eMAR',
    description: 'Medication administration, exceptions, reviews and stock',
    Icon: Pill,
    tone: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  },
  Administration: {
    slug: 'administration',
    railLabel: 'Admin',
    description: 'Organisation, configuration, security and audit',
    Icon: Settings,
    tone: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  },
  'Care Operations': {
    slug: 'care-operations',
    railLabel: 'Operations',
    description: 'Rota, live visits and reconciliation',
    Icon: Calendar,
    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  Workforce: {
    slug: 'workforce',
    railLabel: 'Workforce',
    description: 'Staff records, compliance, hours and absence',
    Icon: UserCheck,
    tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  Finance: {
    slug: 'finance',
    railLabel: 'Finance',
    description: 'Billing, carer pay and UK payroll',
    Icon: PoundSterling,
    tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
}

export function moduleLabelForSlug(slug: string): string | undefined {
  return Object.entries(NAV_MODULES).find(([, m]) => m.slug === slug)?.[0]
}

export function moduleLandingPath(label: string): string | undefined {
  const m = NAV_MODULES[label]
  return m ? `/apps/${m.slug}` : undefined
}
