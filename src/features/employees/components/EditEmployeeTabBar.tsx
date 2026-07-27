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
      className="flex overflow-x-auto border-b border-border bg-muted/30"
      aria-label="Edit employee sections"
      data-testid="employee-edit-tabs"
    >
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
              'shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'border-t-2 border-t-primary border-b-transparent bg-card text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
