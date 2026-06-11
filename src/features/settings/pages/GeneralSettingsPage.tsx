import * as React from 'react'
import { Settings } from 'lucide-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui/page-elements'
import { cn } from '@/shared/lib/utils'
import { GeneralSettingsGeneralPanel } from '@/features/settings/components/GeneralSettingsGeneralPanel'
import { GeneralSettingsEmployeeSection } from '@/features/settings/components/GeneralSettingsEmployeeSection'
import { GeneralSettingsServiceManagementPanel } from '@/features/settings/components/GeneralSettingsServiceManagementPanel'
import { GeneralSettingsDomCarePanel } from '@/features/settings/components/GeneralSettingsDomCarePanel'
import { GeneralSettingsDomCareShiftsPanel } from '@/features/settings/components/GeneralSettingsDomCareShiftsPanel'
import { GeneralSettingsDomRulesPanel } from '@/features/settings/components/GeneralSettingsDomRulesPanel'
import { GeneralSettingsIncidentManagementPanel } from '@/features/settings/components/GeneralSettingsIncidentManagementPanel'
import { GeneralSettingsOptionalPanel } from '@/features/settings/components/GeneralSettingsOptionalPanel'
import { GeneralSettingsPreAssessmentPanel } from '@/features/settings/components/GeneralSettingsPreAssessmentPanel'
import { GeneralSettingsAlertsPanel } from '@/features/settings/components/GeneralSettingsAlertsPanel'
import { GeneralSettingsCriticalInformationPanel } from '@/features/settings/components/GeneralSettingsCriticalInformationPanel'
import { GeneralSettingsAppSettingPanel } from '@/features/settings/components/GeneralSettingsAppSettingPanel'
import { GeneralSettingsPrivacyPanel } from '@/features/settings/components/GeneralSettingsPrivacyPanel'

export type GeneralSettingsTabId =
  | 'general'
  | 'employee'
  | 'service-management'
  | 'dom-care'
  | 'dom-care-shifts'
  | 'dom-rules'
  | 'incident-management'
  | 'optional'
  | 'pre-assessment'
  | 'alerts'
  | 'critical-information'
  | 'app-setting'
  | 'privacy'

const GENERAL_SETTINGS_TABS: { id: GeneralSettingsTabId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'employee', label: 'Employee Settings' },
  { id: 'service-management', label: 'Service Management' },
  { id: 'dom-care', label: 'Dom Care Settings' },
  { id: 'dom-care-shifts', label: 'Dom Care Shifts & Allocation' },
  { id: 'dom-rules', label: 'Dom Rules' },
  { id: 'incident-management', label: 'Incident Management' },
  { id: 'optional', label: 'Optional Settings' },
  { id: 'pre-assessment', label: 'Pre Assessment' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'critical-information', label: 'Critical Information' },
  { id: 'app-setting', label: 'App Setting' },
  { id: 'privacy', label: 'Privacy' },
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
    <div
      className="flex h-[calc(100dvh-3.5rem-2.5rem)] flex-col gap-4 overflow-hidden md:h-[calc(100dvh-3.5rem-3rem)]"
      data-testid="general-settings-page"
    >
      <PageHeader
        className="shrink-0"
        title="General Settings"
        description="Organisation-wide care rules, time display, and module configuration."
        icon={<Settings className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Settings', href: '/settings' },
          { label: 'General Settings' },
        ]}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm md:flex-row">
        <nav
          className={cn(
            'flex min-h-0 shrink-0 gap-0.5 overflow-x-auto overflow-y-hidden overscroll-y-contain',
            'border-b border-border bg-muted/30 p-2',
            'md:w-64 md:flex-col md:overflow-x-visible md:overflow-y-hidden md:hover:overflow-y-auto',
            'md:border-b-0 md:border-r md:p-2',
          )}
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
                  'shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors md:w-full',
                  isActive
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border md:border-l-2 md:border-l-primary md:pl-[10px] md:ring-0'
                    : 'text-muted-foreground hover:bg-card/70 hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain p-5">
          {activeTab === 'general' && <GeneralSettingsGeneralPanel />}
          {activeTab === 'employee' && <GeneralSettingsEmployeeSection />}
          {activeTab === 'service-management' && <GeneralSettingsServiceManagementPanel />}
          {activeTab === 'dom-care' && <GeneralSettingsDomCarePanel />}
          {activeTab === 'dom-care-shifts' && <GeneralSettingsDomCareShiftsPanel />}
          {activeTab === 'dom-rules' && <GeneralSettingsDomRulesPanel />}
          {activeTab === 'incident-management' && <GeneralSettingsIncidentManagementPanel />}
          {activeTab === 'optional' && <GeneralSettingsOptionalPanel />}
          {activeTab === 'pre-assessment' && <GeneralSettingsPreAssessmentPanel />}
          {activeTab === 'alerts' && <GeneralSettingsAlertsPanel />}
          {activeTab === 'critical-information' && <GeneralSettingsCriticalInformationPanel />}
          {activeTab === 'app-setting' && <GeneralSettingsAppSettingPanel />}
          {activeTab === 'privacy' && <GeneralSettingsPrivacyPanel />}
        </div>
      </div>
    </div>
  )
}
