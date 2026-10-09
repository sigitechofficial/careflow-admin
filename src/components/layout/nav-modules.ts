import {
  BarChart3,
  Calendar,
  ClipboardCheck,
  GraduationCap,
  Home,
  MessagesSquare,
  PoundSterling,
  Settings,
  ShieldCheck,
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
  Learning: {
    slug: 'learning',
    railLabel: 'Learning',
    description: 'Courses, assignments, training records and certificates',
    Icon: GraduationCap,
    tone: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  },
  'Quality & Compliance': {
    slug: 'quality-compliance',
    railLabel: 'Quality',
    description: 'Incidents, policies and surveys',
    Icon: ShieldCheck,
    tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
  Finance: {
    slug: 'finance',
    railLabel: 'Finance',
    description: 'Billing, carer pay and UK payroll',
    Icon: PoundSterling,
    tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  Messages: {
    slug: 'messages',
    railLabel: 'Messages',
    description: 'Staff messaging, SMS and announcements',
    Icon: MessagesSquare,
    tone: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  },
  Reports: {
    slug: 'reports',
    railLabel: 'Reports',
    description: 'Scheduling, carer, ECM, incident and learning reports',
    Icon: BarChart3,
    tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  },
  Administration: {
    slug: 'administration',
    railLabel: 'Admin',
    description: 'Organisation, configuration, security and audit',
    Icon: Settings,
    tone: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  },
}

export function moduleLabelForSlug(slug: string): string | undefined {
  return Object.entries(NAV_MODULES).find(([, m]) => m.slug === slug)?.[0]
}

export function moduleLandingPath(label: string): string | undefined {
  const m = NAV_MODULES[label]
  return m ? `/apps/${m.slug}` : undefined
}
