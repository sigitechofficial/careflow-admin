import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { GeneralSettingsEmployeePanel } from '@/features/settings/components/GeneralSettingsEmployeePanel'
import { GeneralSettingsEmployeeVisaPanel } from '@/features/settings/components/GeneralSettingsEmployeeVisaPanel'

type EmployeeSettingsSubTab = 'general' | 'visa'

const SUB_TABS: { id: EmployeeSettingsSubTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'visa', label: 'Visa & contracted hours' },
]

export function GeneralSettingsEmployeeSection() {
  const [subTab, setSubTab] = React.useState<EmployeeSettingsSubTab>('general')

  return (
    <div className="space-y-4" data-testid="general-settings-employee-section">
      <div
        className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/30 p-1"
        role="tablist"
        aria-label="Employee settings sections"
      >
        {SUB_TABS.map(tab => {
          const active = subTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`employee-settings-subtab-${tab.id}`}
              onClick={() => setSubTab(tab.id)}
              className={cn(
                'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {subTab === 'general' ? <GeneralSettingsEmployeePanel /> : <GeneralSettingsEmployeeVisaPanel />}
    </div>
  )
}
