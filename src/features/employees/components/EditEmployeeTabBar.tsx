import * as React from 'react'
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

export const EDIT_EMPLOYEE_TABS: { id: EditEmployeeTabId; label: string }[] = [
  { id: 'personal', label: 'Personal Details' },
  { id: 'employment', label: 'Employment' },
  { id: 'pay-card', label: 'Pay card' },
  { id: 'earning', label: 'Earning' },
  { id: 'visits', label: 'Visits' },
  { id: 'salary', label: 'Salary' },
  { id: 'skills', label: 'Skills' },
  { id: 'staff-reviews', label: 'Staff Reviews' },
  { id: 'documents', label: 'Documents' },
  { id: 'non-core-activity', label: 'Non Core Activities' },
  { id: 'holidays', label: 'Holidays & Leave' },
  { id: 'working-pattern', label: 'Working Pattern' },
  { id: 'employment-compliance', label: 'Employment Compliance' },
  { id: 'learning', label: 'Learning' },
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
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`employee-edit-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors whitespace-nowrap md:w-full md:whitespace-normal',
                isActive
                  ? 'bg-card text-foreground shadow-sm ring-1 ring-border md:border-l-2 md:border-l-primary md:pl-[10px] md:ring-0'
                  : 'text-muted-foreground hover:bg-card/70 hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
