import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  BedDouble,
  Calendar,
  CalendarOff,
  ClipboardCheck,
  ClipboardList,
  FileText,
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
  'invoices',
  'livein',
] as const

export type ServiceUserProfileTabId = (typeof SERVICE_USER_PROFILE_TAB_IDS)[number]

export const SERVICE_USER_PROFILE_TABS: { id: ServiceUserProfileTabId; label: string; Icon: LucideIcon }[] = [
  { id: 'personal', label: 'Personal Details', Icon: UserCircle },
  { id: 'contacts', label: 'Contacts and Family', Icon: Users },
  { id: 'about', label: 'About Me', Icon: Heart },
  { id: 'photos', label: 'Photographs', Icon: Images },
  { id: 'inventory', label: 'Personal Inventory', Icon: Package },
  { id: 'allergies', label: 'Allergies', Icon: AlertTriangle },
  { id: 'absences', label: 'Record Absences', Icon: CalendarOff },
  { id: 'calendar', label: 'Calendar', Icon: Calendar },
  { id: 'privacy', label: 'Privacy', Icon: Shield },
  { id: 'dom', label: 'DOM Care', Icon: Home },
  { id: 'assessment', label: 'Initial Assessment', Icon: ClipboardList },
  { id: 'funding', label: 'Funding', Icon: Landmark },
  { id: 'charge-card', label: 'Charge card', Icon: Receipt },
  { id: 'visits', label: 'Visits', Icon: ClipboardCheck },
  { id: 'invoices', label: 'Invoices', Icon: FileText },
  { id: 'livein', label: 'Live in Service Profile', Icon: BedDouble },
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
