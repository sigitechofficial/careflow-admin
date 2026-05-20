import * as React from 'react'
import { Settings } from 'lucide-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { PageHeader } from '@/components/ui/page-elements'
import { cn } from '@/lib/utils'
import { GeneralSettingsGeneralPanel } from '@/features/settings/components/GeneralSettingsGeneralPanel'
import { GeneralSettingsEmployeePanel } from '@/features/settings/components/GeneralSettingsEmployeePanel'
import { GeneralSettingsServiceManagementPanel } from '@/features/settings/components/GeneralSettingsServiceManagementPanel'
import { GeneralSettingsDomCarePanel } from '@/features/settings/components/GeneralSettingsDomCarePanel'
import { GeneralSettingsDomCareShiftsPanel } from '@/features/settings/components/GeneralSettingsDomCareShiftsPanel'
import { GeneralSettingsDomRulesPanel } from '@/features/settings/components/GeneralSettingsDomRulesPanel'
import { GeneralSettingsIncidentManagementPanel } from '@/features/settings/components/GeneralSettingsIncidentManagementPanel'

export type GeneralSettingsTabId =
  | 'general'
  | 'employee'
  | 'service-management'
  | 'dom-care'
  | 'dom-care-shifts'
  | 'dom-rules'
  | 'incident-management'

const GENERAL_SETTINGS_TABS: { id: GeneralSettingsTabId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'employee', label: 'Employee Settings' },
  { id: 'service-management', label: 'Service Management' },
  { id: 'dom-care', label: 'Dom Care Settings' },
  { id: 'dom-care-shifts', label: 'Dom Care Shifts & Allocation' },
  { id: 'dom-rules', label: 'Dom Rules' },
  { id: 'incident-management', label: 'Incident Management' },
]

export default function GeneralSettingsPage() {
  const navigate = useNavigate()
  const search = useRouterState({ select: s => s.location.search as { tab?: string } })
  const activeTab =
    search.tab && GENERAL_SETTINGS_TABS.some(t => t.id === search.tab)
      ? (search.tab as GeneralSettingsTabId)
      : 'general'

  const setTab = (tab: GeneralSettingsTabId) => {
    void navigate({ to: '/settings/general', search: { tab } as Record<string, string> })
  }

  return (
    <div className="space-y-4" data-testid="general-settings-page">
      <PageHeader
        title="General Settings"
        description="Organisation-wide care rules, time display, and module configuration."
        icon={<Settings className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Settings', href: '/settings' },
          { label: 'General Settings' },
        ]}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <nav
          className="flex gap-0 overflow-x-auto border-b border-border bg-muted/20 px-2"
          aria-label="General settings sections"
          data-testid="general-settings-tabs"
        >
          {GENERAL_SETTINGS_TABS.map(tab => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-testid={`general-settings-tab-${tab.id}`}
                onClick={() => setTab(tab.id)}
                className={cn(
                  'shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="p-5">
          {activeTab === 'general' && <GeneralSettingsGeneralPanel />}
          {activeTab === 'employee' && <GeneralSettingsEmployeePanel />}
          {activeTab === 'service-management' && <GeneralSettingsServiceManagementPanel />}
          {activeTab === 'dom-care' && <GeneralSettingsDomCarePanel />}
          {activeTab === 'dom-care-shifts' && <GeneralSettingsDomCareShiftsPanel />}
          {activeTab === 'dom-rules' && <GeneralSettingsDomRulesPanel />}
          {activeTab === 'incident-management' && <GeneralSettingsIncidentManagementPanel />}
        </div>
      </div>
    </div>
  )
}
