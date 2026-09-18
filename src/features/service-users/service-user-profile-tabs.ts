import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  BedDouble,
  Calendar,
  CalendarOff,
  ClipboardCheck,
  ClipboardList,
  Heart,
  Home,
  Images,
  Landmark,
  Package,
  Receipt,
  Shield,
  UserCircle,
  Users,
} from 'lucide-react'

/** Full left-nav from Edit Service User — also used inside the workspace Profile tab. */
export const SERVICE_USER_PROFILE_TAB_IDS = [
  'personal',
  'contacts',
  'about',
  'photos',
  'inventory',
  'allergies',
  'absences',
  'calendar',
  'privacy',
  'dom',
  'assessment',
  'funding',
  'charge-card',
  'visits',
  'livein',
] as const

export type ServiceUserProfileTabId = (typeof SERVICE_USER_PROFILE_TAB_IDS)[number]

export const SERVICE_USER_PROFILE_TABS: {
  id: ServiceUserProfileTabId
  label: string
  Icon: LucideIcon
  iconClassName: string
}[] = [
  { id: 'personal', label: 'Personal Details', Icon: UserCircle, iconClassName: 'text-sky-600 dark:text-sky-400' },
  { id: 'contacts', label: 'Contacts and Family', Icon: Users, iconClassName: 'text-violet-600 dark:text-violet-400' },
  { id: 'about', label: 'About Me', Icon: Heart, iconClassName: 'text-rose-600 dark:text-rose-400' },
  { id: 'photos', label: 'Photographs', Icon: Images, iconClassName: 'text-fuchsia-600 dark:text-fuchsia-400' },
  { id: 'inventory', label: 'Personal Inventory', Icon: Package, iconClassName: 'text-amber-600 dark:text-amber-400' },
  { id: 'allergies', label: 'Allergies', Icon: AlertTriangle, iconClassName: 'text-orange-600 dark:text-orange-400' },
  { id: 'absences', label: 'Record Absences', Icon: CalendarOff, iconClassName: 'text-red-600 dark:text-red-400' },
  { id: 'calendar', label: 'Calendar', Icon: Calendar, iconClassName: 'text-teal-600 dark:text-teal-400' },
  { id: 'privacy', label: 'Privacy', Icon: Shield, iconClassName: 'text-slate-600 dark:text-slate-300' },
  { id: 'dom', label: 'DOM Care', Icon: Home, iconClassName: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'assessment', label: 'Initial Assessment', Icon: ClipboardList, iconClassName: 'text-indigo-600 dark:text-indigo-400' },
  { id: 'funding', label: 'Funding', Icon: Landmark, iconClassName: 'text-yellow-700 dark:text-yellow-400' },
  { id: 'charge-card', label: 'Charge card', Icon: Receipt, iconClassName: 'text-lime-700 dark:text-lime-400' },
  { id: 'visits', label: 'Visits', Icon: ClipboardCheck, iconClassName: 'text-cyan-600 dark:text-cyan-400' },
  { id: 'livein', label: 'Live in Service Profile', Icon: BedDouble, iconClassName: 'text-blue-600 dark:text-blue-400' },
]

export const SERVICE_USER_PROFILE_ROUTE = '/service-users/$serviceUserId/profile' as const
export const SERVICE_USER_EDIT_ROUTE = '/service-users/$serviceUserId' as const

/** List name click lands on the workspace Profile tab. */
export const SERVICE_USER_MANAGEMENT_NAME_TO = SERVICE_USER_PROFILE_ROUTE

export function isServiceUserProfileTabId(value: string | undefined): value is ServiceUserProfileTabId {
  return Boolean(value && (SERVICE_USER_PROFILE_TAB_IDS as readonly string[]).includes(value))
}

export function resolveServiceUserProfileTab(raw: string | undefined): ServiceUserProfileTabId {
  return isServiceUserProfileTabId(raw) ? raw : 'personal'
}

export function validateServiceUserProfileSearch(raw: Record<string, unknown>): { tab?: string } {
  const tab = raw.tab
  return { tab: typeof tab === 'string' && tab.trim() ? tab.trim() : undefined }
}
