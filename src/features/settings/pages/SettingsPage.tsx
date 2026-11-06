import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Award,
  BadgeCheck,
  Briefcase,
  CheckSquare,
  Clock,
  FileCheck,
  FileWarning,
  Globe,
  GraduationCap,
  HeartPulse,
  Languages,
  LayoutList,
  ListChecks,
  LogOut,
  MapPin,
  Package,
  Pill,
  Scale,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Stethoscope,
  Timer,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react'
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
import { WelfareOutcomesSettingsPanel } from '@/features/settings/components/WelfareOutcomesSettingsPanel'
import { ClockInArrivalReasonsSettingsPanel } from '@/features/settings/components/ClockInArrivalReasonsSettingsPanel'
import { ManualAuthorisationReasonsSettingsPanel } from '@/features/settings/components/ManualAuthorisationReasonsSettingsPanel'
import { LeftAreaAllowReasonsSettingsPanel } from '@/features/settings/components/LeftAreaAllowReasonsSettingsPanel'
import { ClockOutEndReasonsSettingsPanel } from '@/features/settings/components/ClockOutEndReasonsSettingsPanel'
import { VisitOutcomeReasonsSettingsPanel } from '@/features/settings/components/VisitOutcomeReasonsSettingsPanel'
import { EcmThresholdLookupsSettingsPanel } from '@/features/settings/components/EcmThresholdLookupsSettingsPanel'
import { EmergencyProtocolsSettingsPanel } from '@/features/settings/components/EmergencyProtocolsSettingsPanel'
import { GeneralSettingsEmployeeVisaPanel } from '@/features/settings/components/GeneralSettingsEmployeeVisaPanel'
import { MedicalConditionsCatalogSettingsPanel } from '@/features/settings/components/MedicalConditionsCatalogSettingsPanel'
import { AllocationItemsSettingsPanel } from '@/features/settings/components/AllocationItemsSettingsPanel'

export type SettingsTabId =
  | 'job-titles'
  | 'skills'
  | 'compliance'
  | 'compliance-requirements'
  | 'work-areas'
  | 'contract-types'
  | 'immigration-statuses'
  | 'grades'
  | 'certifications'
  | 'non-core'
  | 'allocation-items'
  | 'leaving-reasons'
  | 'visit-status-reasons'
  | 'review-types'
  | 'travel-payment'
  | 'medication'
  | 'time-slots'
  | 'care-types'
  | 'funding-types'
  | 'ethnicities'
  | 'languages'
  | 'genders'
  | 'sexes'
  | 'sexual-orientations'
  | 'record-types'
  | 'allergies'
  | 'medical-conditions'
  | 'tasks-planner'
  | 'vital-ranges'
  | 'welfare-outcomes'
  | 'clock-in-arrival-reasons'
  | 'manual-authorisation-reasons'
  | 'left-area-allow-reasons'
  | 'clock-out-end-reasons'
  | 'outcome-reasons'
  | 'ecm-thresholds'
  | 'emergency-protocols'

const SETTINGS_TABS: { id: SettingsTabId; label: string; Icon: LucideIcon }[] = [
  { id: 'job-titles', label: 'Job titles', Icon: Briefcase },
  { id: 'skills', label: 'Skills', Icon: Award },
  { id: 'compliance', label: 'Compliance documents', Icon: FileCheck },
  { id: 'compliance-requirements', label: 'Compliance requirements', Icon: ShieldCheck },
  { id: 'work-areas', label: 'Work areas', Icon: MapPin },
  { id: 'contract-types', label: 'Contract types', Icon: FileWarning },
  { id: 'immigration-statuses', label: 'Immigration statuses', Icon: Globe },
  { id: 'grades', label: 'Grades', Icon: BadgeCheck },
  { id: 'certifications', label: 'Certifications', Icon: GraduationCap },
  { id: 'non-core', label: 'Non-core activities', Icon: LayoutList },
  { id: 'allocation-items', label: 'Allocation items', Icon: Package },
  { id: 'leaving-reasons', label: 'Leaving reasons', Icon: LogOut },
  { id: 'visit-status-reasons', label: 'Visit status reasons', Icon: ListChecks },
  { id: 'review-types', label: 'Review types', Icon: UserCheck },
  { id: 'travel-payment', label: 'Travel payment', Icon: Activity },
  { id: 'medication', label: 'Medication (MAR)', Icon: Pill },
  { id: 'time-slots', label: 'Time slots', Icon: Clock },
  { id: 'tasks-planner', label: 'Tasks planner', Icon: CheckSquare },
  { id: 'care-types', label: 'Care types', Icon: HeartPulse },
  { id: 'funding-types', label: 'Funding types', Icon: Scale },
  { id: 'ethnicities', label: 'Ethnicities', Icon: Users },
  { id: 'languages', label: 'Languages', Icon: Languages },
  { id: 'genders', label: 'Genders', Icon: UserRound },
  { id: 'sexes', label: 'Sex', Icon: UserRound },
  { id: 'sexual-orientations', label: 'Sexual orientation', Icon: UserRound },
  { id: 'record-types', label: 'Record types', Icon: Stethoscope },
  { id: 'allergies', label: 'Allergies', Icon: AlertTriangle },
  { id: 'medical-conditions', label: 'Medical conditions', Icon: ClipboardList },
  { id: 'vital-ranges', label: 'Accepted ranges', Icon: Timer },
  { id: 'welfare-outcomes', label: 'On-entry welfare outcomes', Icon: ShieldAlert },
  { id: 'clock-in-arrival-reasons', label: 'Clock-in arrival reasons', Icon: Clock },
  { id: 'manual-authorisation-reasons', label: 'Manual authorisation reasons', Icon: BadgeCheck },
  { id: 'left-area-allow-reasons', label: 'Left-area allow reasons', Icon: MapPin },
  { id: 'clock-out-end-reasons', label: 'Clock-out end reasons', Icon: LogOut },
  { id: 'outcome-reasons', label: 'Outcome reasons', Icon: ListChecks },
  { id: 'ecm-thresholds', label: 'ECM thresholds', Icon: Timer },
  { id: 'emergency-protocols', label: 'Emergency protocols', Icon: Siren },
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
            const Icon = tab.Icon
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-testid={`settings-tab-${tab.id}`}
                onClick={() => setTab(tab.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors md:w-full',
                  isActive
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border md:border-l-2 md:border-l-primary md:pl-[10px] md:ring-0'
                    : 'text-muted-foreground hover:bg-card/70 hover:text-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}
                  aria-hidden
                />
                <span className="min-w-0">{tab.label}</span>
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
              placeholder="Filter job titles…"
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
              placeholder="Filter work areas…"
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
          {activeTab === 'allocation-items' && <AllocationItemsSettingsPanel />}
          {activeTab === 'leaving-reasons' && (
            <LookupNamePanel
              resource="leaving-reasons"
              title="Leaving reasons"
              description="Options when an employee leaves the organisation."
            />
          )}
          {activeTab === 'visit-status-reasons' && (
            <LookupNamePanel
              resource="visit-status-reasons"
              title="Visit status reasons"
              description="Reasons required when recording a visit outcome on the schedule."
            />
          )}
          {activeTab === 'review-types' && (
            <LookupIntervalPanel
              resource="review-types"
              title="Review types"
              description="Staff review types (supervision, appraisal, probation). Set when each is due (repeating, milestones after the start date, or only when it happens), who it applies to and its form in Settings → General Settings → Supervision → Review types."
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
          {activeTab === 'genders' && <ServiceUserCodeNameLookupSettingsPanel variant="genders" />}
          {activeTab === 'sexes' && <ServiceUserCodeNameLookupSettingsPanel variant="sexes" />}
          {activeTab === 'sexual-orientations' && (
            <ServiceUserCodeNameLookupSettingsPanel variant="sexualOrientations" />
          )}
          {activeTab === 'record-types' && <BodyMapRecordTypesSettingsPanel />}
          {activeTab === 'allergies' && <AllergiesCatalogSettingsPanel />}
          {activeTab === 'medical-conditions' && <MedicalConditionsCatalogSettingsPanel />}
          {activeTab === 'tasks-planner' && <TaskCatalogueSettingsPanel />}
          {activeTab === 'vital-ranges' && <VitalAcceptedRangesSettingsPanel />}
          {activeTab === 'welfare-outcomes' && <WelfareOutcomesSettingsPanel />}
          {activeTab === 'clock-in-arrival-reasons' && <ClockInArrivalReasonsSettingsPanel />}
          {activeTab === 'manual-authorisation-reasons' && <ManualAuthorisationReasonsSettingsPanel />}
          {activeTab === 'left-area-allow-reasons' && <LeftAreaAllowReasonsSettingsPanel />}
          {activeTab === 'clock-out-end-reasons' && <ClockOutEndReasonsSettingsPanel />}
          {activeTab === 'outcome-reasons' && <VisitOutcomeReasonsSettingsPanel />}
          {activeTab === 'ecm-thresholds' && <EcmThresholdLookupsSettingsPanel />}
          {activeTab === 'emergency-protocols' && <EmergencyProtocolsSettingsPanel />}
        </div>
      </div>
    </div>
  )
}
