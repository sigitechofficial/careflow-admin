import * as React from 'react'
import { Settings } from 'lucide-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui/page-elements'
import { cn } from '@/shared/lib/utils'
import { LookupNamePanel } from '@/features/settings/components/LookupNamePanel'
import { LookupIntervalPanel } from '@/features/settings/components/LookupIntervalPanel'
import { ComplianceTypesSettingsPanel } from '@/features/settings/components/ComplianceTypesSettingsPanel'
import { ComplianceRequirementsSettingsPanel } from '@/features/settings/components/ComplianceRequirementsSettingsPanel'
import { MedicationStatusCodesSettingsPanel } from '@/features/settings/components/MedicationStatusCodesSettingsPanel'
import { MedicationTimeSlotsSettingsPanel } from '@/features/settings/components/MedicationTimeSlotsSettingsPanel'
import { ServiceUserCareTypesSettingsPanel } from '@/features/settings/components/ServiceUserCareTypesSettingsPanel'
import { ServiceUserCodeNameLookupSettingsPanel } from '@/features/settings/components/ServiceUserCodeNameLookupSettingsPanel'
import { ServiceUserFundingTypesSettingsPanel } from '@/features/settings/components/ServiceUserFundingTypesSettingsPanel'
import { AllergiesCatalogSettingsPanel } from '@/features/settings/components/AllergiesCatalogSettingsPanel'
import { TaskCatalogueSettingsPanel } from '@/features/settings/components/TaskCatalogueSettingsPanel'
import { BodyMapRecordTypesSettingsPanel } from '@/features/settings/components/BodyMapRecordTypesSettingsPanel'
import { VitalAcceptedRangesSettingsPanel } from '@/features/settings/components/VitalAcceptedRangesSettingsPanel'
import { EcmThresholdLookupsSettingsPanel } from '@/features/settings/components/EcmThresholdLookupsSettingsPanel'
import { GeneralSettingsEmployeeVisaPanel } from '@/features/settings/components/GeneralSettingsEmployeeVisaPanel'

export type SettingsTabId =
  | 'job-titles'
  | 'skills'
  | 'compliance'
  | 'compliance-requirements'
  | 'work-areas'
  | 'contract-types'
  | 'immigration-statuses'
  | 'grades'
  | 'locations'
  | 'certifications'
  | 'non-core'
  | 'leaving-reasons'
  | 'review-types'
  | 'travel-payment'
  | 'medication'
  | 'time-slots'
  | 'care-types'
  | 'funding-types'
  | 'ethnicities'
  | 'languages'
  | 'record-types'
  | 'allergies'
  | 'tasks-planner'
  | 'vital-ranges'
  | 'ecm-thresholds'

const SETTINGS_TABS: { id: SettingsTabId; label: string }[] = [
  { id: 'job-titles', label: 'Job titles' },
  { id: 'skills', label: 'Skills' },
  { id: 'compliance', label: 'Compliance documents' },
  { id: 'compliance-requirements', label: 'Compliance requirements' },
  { id: 'work-areas', label: 'Work areas' },
  { id: 'contract-types', label: 'Contract types' },
  { id: 'immigration-statuses', label: 'Immigration statuses' },
  { id: 'grades', label: 'Grades' },
  { id: 'locations', label: 'Locations' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'non-core', label: 'Non-core activities' },
  { id: 'leaving-reasons', label: 'Leaving reasons' },
  { id: 'review-types', label: 'Review types' },
  { id: 'travel-payment', label: 'Travel payment' },
  { id: 'medication', label: 'Medication (MAR)' },
  { id: 'time-slots', label: 'Time slots' },
  { id: 'tasks-planner', label: 'Tasks planner' },
  { id: 'care-types', label: 'Care types' },
  { id: 'funding-types', label: 'Funding types' },
  { id: 'ethnicities', label: 'Ethnicities' },
  { id: 'languages', label: 'Languages' },
  { id: 'record-types', label: 'Record types' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'vital-ranges', label: 'Accepted ranges' },
  { id: 'ecm-thresholds', label: 'ECM thresholds' },
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
    <div className="flex flex-col gap-4" data-testid="settings-page">
      <PageHeader
        className="shrink-0"
        title="Settings"
        description="Manage lookup data used across employee and service user forms."
        icon={<Settings className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Settings' },
        ]}
      />

      <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm md:flex-row">
        <nav
          className={cn(
            'flex shrink-0 gap-0.5 overflow-x-auto',
            'border-b border-border bg-muted/30 p-2',
            'md:sticky md:top-0 md:h-fit md:max-h-[calc(100dvh-5rem)] md:w-56 md:flex-col md:overflow-y-auto md:overflow-x-visible',
            'md:border-b-0 md:border-r',
          )}
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

        <div className="min-w-0 flex-1 p-5">
          {activeTab === 'job-titles' && (
            <LookupNamePanel
              resource="job-titles"
              title="Job titles"
              description="Used on employee employment details and compliance matching."
              placeholder="Filter job titlesâ€¦"
            />
          )}
          {activeTab === 'skills' && (
            <LookupIntervalPanel
              resource="skill-types"
              title="Skills"
              description="Skill types for employee records. Default refresh months suggest when a skill should be renewed."
              intervalLabel="Refresh (months)"
              intervalField="defaultRefreshMonths"
              intervalMax={120}
              placeholder="Filter skills…"
            />
          )}
          {activeTab === 'compliance' && <ComplianceTypesSettingsPanel />}
          {activeTab === 'compliance-requirements' && <ComplianceRequirementsSettingsPanel />}
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
          {activeTab === 'immigration-statuses' && <GeneralSettingsEmployeeVisaPanel />}
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
            <LookupIntervalPanel
              resource="certification-types"
              title="Certifications"
              description="Certification types for employee training records. Default validity months prefill expiry when recording a certificate."
              intervalLabel="Validity (months)"
              intervalField="defaultValidityMonths"
              intervalMax={600}
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
            <LookupIntervalPanel
              resource="review-types"
              title="Review types"
              description="Staff review types (supervision, appraisal, probation). Default interval drives overdue review alerts."
              intervalLabel="Interval (days)"
              intervalField="defaultIntervalDays"
              intervalMax={3650}
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
          {activeTab === 'time-slots' && <MedicationTimeSlotsSettingsPanel />}
          {activeTab === 'care-types' && <ServiceUserCareTypesSettingsPanel />}
          {activeTab === 'funding-types' && <ServiceUserFundingTypesSettingsPanel />}
          {activeTab === 'ethnicities' && <ServiceUserCodeNameLookupSettingsPanel variant="ethnicities" />}
          {activeTab === 'languages' && <ServiceUserCodeNameLookupSettingsPanel variant="languages" />}
          {activeTab === 'record-types' && <BodyMapRecordTypesSettingsPanel />}
          {activeTab === 'allergies' && <AllergiesCatalogSettingsPanel />}
          {activeTab === 'tasks-planner' && <TaskCatalogueSettingsPanel />}
          {activeTab === 'vital-ranges' && <VitalAcceptedRangesSettingsPanel />}
          {activeTab === 'ecm-thresholds' && <EcmThresholdLookupsSettingsPanel />}
        </div>
      </div>
    </div>
  )
}
