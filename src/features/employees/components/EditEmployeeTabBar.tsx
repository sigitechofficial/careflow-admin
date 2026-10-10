import type { LucideIcon } from 'lucide-react'
import {
  Award,
  Banknote,
  Briefcase,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutGrid,
  Package,
  ShieldCheck,
  Star,
  UserCircle,
  UserX,
  Wallet,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export type EditEmployeeTabId =
  | 'personal'
  | 'employment'
  | 'pay-card'
  | 'earning'
  | 'visits'
  | 'salary'
  | 'skills'
  | 'staff-reviews'
  | 'documents'
  | 'non-core-activity'
  | 'holidays'
  | 'working-pattern'
  | 'employment-compliance'
  | 'learning'
  | 'suspensions'
  | 'allocation'

export const EDIT_EMPLOYEE_TABS: {
  id: EditEmployeeTabId
  label: string
  Icon: LucideIcon
  iconClassName: string
}[] = [
  { id: 'personal', label: 'Personal Details', Icon: UserCircle, iconClassName: 'text-sky-600 dark:text-sky-400' },
  { id: 'employment', label: 'Employment', Icon: Briefcase, iconClassName: 'text-indigo-600 dark:text-indigo-400' },
  { id: 'pay-card', label: 'Pay card', Icon: CreditCard, iconClassName: 'text-violet-600 dark:text-violet-400' },
  { id: 'earning', label: 'Earning', Icon: Wallet, iconClassName: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'visits', label: 'Visits', Icon: ClipboardCheck, iconClassName: 'text-cyan-600 dark:text-cyan-400' },
  { id: 'salary', label: 'Salary', Icon: Banknote, iconClassName: 'text-lime-700 dark:text-lime-400' },
  { id: 'skills', label: 'Skills', Icon: Award, iconClassName: 'text-amber-600 dark:text-amber-400' },
  { id: 'staff-reviews', label: 'Staff Reviews', Icon: Star, iconClassName: 'text-yellow-600 dark:text-yellow-400' },
  { id: 'documents', label: 'Documents', Icon: FileText, iconClassName: 'text-slate-600 dark:text-slate-300' },
  { id: 'non-core-activity', label: 'Non Core Activities', Icon: LayoutGrid, iconClassName: 'text-fuchsia-600 dark:text-fuchsia-400' },
  { id: 'holidays', label: 'Holidays & Leave', Icon: CalendarDays, iconClassName: 'text-rose-600 dark:text-rose-400' },
  { id: 'working-pattern', label: 'Working Pattern', Icon: CalendarClock, iconClassName: 'text-teal-600 dark:text-teal-400' },
  { id: 'employment-compliance', label: 'Employment Compliance', Icon: ShieldCheck, iconClassName: 'text-orange-600 dark:text-orange-400' },
  { id: 'learning', label: 'Learning', Icon: GraduationCap, iconClassName: 'text-blue-600 dark:text-blue-400' },
  { id: 'suspensions', label: 'Suspensions', Icon: UserX, iconClassName: 'text-red-600 dark:text-red-400' },
  { id: 'allocation', label: 'Allocation', Icon: Package, iconClassName: 'text-amber-700 dark:text-amber-400' },
]

const EDIT_EMPLOYEE_TAB_IDS = new Set(EDIT_EMPLOYEE_TABS.map(t => t.id))

export function parseEditEmployeeTabId(raw: unknown): EditEmployeeTabId | undefined {
  return typeof raw === 'string' && EDIT_EMPLOYEE_TAB_IDS.has(raw as EditEmployeeTabId)
    ? (raw as EditEmployeeTabId)
    : undefined
}

export function EditEmployeeTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: EditEmployeeTabId
  onTabChange: (tab: EditEmployeeTabId) => void
}) {
  return (
    <nav
      className="w-full shrink-0 border-b border-border bg-muted/30 md:w-56 md:border-b-0 md:border-r"
      aria-label="Edit employee sections"
      data-testid="employee-edit-tabs"
    >
      <p className="hidden px-4 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:block">
        Sections
      </p>
      <div className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-x-visible md:overflow-y-auto md:p-2">
        {EDIT_EMPLOYEE_TABS.map(tab => {
          const isActive = tab.id === activeTab
          const Icon = tab.Icon
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`employee-edit-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors whitespace-nowrap md:w-full md:whitespace-normal',
                isActive
                  ? 'bg-card text-foreground shadow-sm ring-1 ring-border md:border-l-2 md:border-l-primary md:pl-[10px] md:ring-0'
                  : 'text-muted-foreground hover:bg-card/70 hover:text-foreground',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', tab.iconClassName)} aria-hidden />
              <span className="min-w-0">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
