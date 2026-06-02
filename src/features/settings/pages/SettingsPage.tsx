import * as React from 'react'
import { Settings } from 'lucide-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui/page-elements'
import { cn } from '@/shared/lib/utils'
import { LookupNamePanel } from '@/features/settings/components/LookupNamePanel'
import { ComplianceTypesSettingsPanel } from '@/features/settings/components/ComplianceTypesSettingsPanel'
import { MedicationStatusCodesSettingsPanel } from '@/features/settings/components/MedicationStatusCodesSettingsPanel'

export type SettingsTabId =
  | 'job-titles'
  | 'skills'
  | 'compliance'
  | 'work-areas'
  | 'contract-types'
  | 'grades'
  | 'locations'
  | 'certifications'
  | 'non-core'
  | 'leaving-reasons'
  | 'review-types'
  | 'travel-payment'
  | 'medication'

const SETTINGS_TABS: { id: SettingsTabId; label: string }[] = [
  { id: 'job-titles', label: 'Job titles' },
  { id: 'skills', label: 'Skills' },
  { id: 'compliance', label: 'Compliance documents' },
  { id: 'work-areas', label: 'Work areas' },
  { id: 'contract-types', label: 'Contract types' },
  { id: 'grades', label: 'Grades' },
  { id: 'locations', label: 'Locations' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'non-core', label: 'Non-core activities' },
  { id: 'leaving-reasons', label: 'Leaving reasons' },
  { id: 'review-types', label: 'Review types' },
  { id: 'travel-payment', label: 'Travel payment' },
  { id: 'medication', label: 'Medication (MAR)' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const search = useRouterState({ select: s => s.location.search as { tab?: string } })
  const activeTab =
    search.tab && SETTINGS_TABS.some(t => t.id === search.tab)
      ? (search.tab as SettingsTabId)
      : 'job-titles'

  const setTab = (tab: SettingsTabId) => {
    void navigate({ to: '/settings', search: { tab } as Record<string, string> })
  }

  return (
    <div className="space-y-4" data-testid="settings-page">
      <PageHeader
        title="Settings"
        description="Manage lookup data used across employee and service user forms."
        icon={<Settings className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Settings' },
        ]}
      />

      <div className="flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm md:flex-row">
        <nav
          className="flex max-h-[min(70vh,640px)] shrink-0 gap-0.5 overflow-x-auto overflow-y-auto border-b border-border bg-muted/30 p-2 md:w-56 md:flex-col md:overflow-x-visible md:border-b-0 md:border-r md:p-2"
          aria-label="Settings modules"
          data-testid="settings-tabs"
        >
          {SETTINGS_TABS.map(tab => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-testid={`settings-tab-${tab.id}`}
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

        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          {activeTab === 'job-titles' && (
            <LookupNamePanel
              resource="job-titles"
              title="Job titles"
              description="Used on employee employment details and compliance matching."
              placeholder="Filter job titlesâ€¦"
            />
          )}
          {activeTab === 'skills' && (
            <LookupNamePanel
              resource="skill-types"
              title="Skills"
              description="Skill types available when editing employee skills."
              placeholder="Filter skillsâ€¦"
            />
          )}
          {activeTab === 'compliance' && <ComplianceTypesSettingsPanel />}
          {activeTab === 'work-areas' && (
            <LookupNamePanel
              resource="work-areas"
              title="Work areas"
              description="Determines which compliance checklist applies to an employee."
              placeholder="Filter work areasâ€¦"
            />
          )}
          {activeTab === 'contract-types' && (
            <LookupNamePanel
              resource="contract-types"
              title="Contract types"
              description="Employment contract options on the employee form."
            />
          )}
          {activeTab === 'grades' && (
            <LookupNamePanel resource="grades" title="Grades" description="Pay grades on employee employment." />
          )}
          {activeTab === 'locations' && (
            <LookupNamePanel
              resource="locations"
              title="Locations"
              description="Base locations and zones used in scheduling and employment."
            />
          )}
          {activeTab === 'certifications' && (
            <LookupNamePanel
              resource="certification-types"
              title="Certifications"
              description="Certification types for employee skills and training records."
            />
          )}
          {activeTab === 'non-core' && (
            <LookupNamePanel
              resource="non-core-activity-reasons"
              title="Non-core activity reasons"
              description="Reasons for non-core time on employee calendars."
            />
          )}
          {activeTab === 'leaving-reasons' && (
            <LookupNamePanel
              resource="leaving-reasons"
              title="Leaving reasons"
              description="Options when an employee leaves the organisation."
            />
          )}
          {activeTab === 'review-types' && (
            <LookupNamePanel
              resource="review-types"
              title="Review types"
              description="Staff review types for employee performance records."
            />
          )}
          {activeTab === 'travel-payment' && (
            <LookupNamePanel
              resource="travel-payment-types"
              title="Travel payment types"
              description="How travel is paid for on employee employment records."
            />
          )}
          {activeTab === 'medication' && <MedicationStatusCodesSettingsPanel />}
        </div>
      </div>
    </div>
  )
}
