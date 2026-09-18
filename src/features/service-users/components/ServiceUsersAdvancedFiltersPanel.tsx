import * as React from 'react'
import {
  Bell,
  CalendarClock,
  ChevronDown,
  HeartPulse,
  ShieldAlert,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Switch } from '@/shared/ui/toggle-controls'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { MultiSelect, type MultiSelectOption } from '@/shared/ui/multi-select'
import type { CarePlanListStatus } from '@/features/service-users/api'
import {
  CARE_PLAN_LIST_STATUS_FILTER_LABELS,
  EMPTY_SERVICE_USERS_ADVANCED_FILTERS,
  INITIAL_ASSESSMENT_STATUS_FILTER_LABELS,
  advancedFilterRangeErrors,
  clearAdvancedFilterChip,
  countActiveAdvancedFilters,
  countAdvancedFiltersInGroup,
  describeAdvancedFilterChips,
  hasAdvancedFilterRangeErrors,
  statusFilterLabel,
  toDateOfDeathInputValue,
  uniqueFilterIds,
  type AdvancedFilterChipKey,
  type AdvancedFilterGroupId,
  type InitialAssessmentStatusFilter,
  type ServiceUsersAdvancedFilters,
} from '@/features/service-users/utils/service-users-list-query'
import { useMedicalConditionCatalog } from '@/features/alerts/hooks/useMedicalClinical'
import { useCareForms } from '@/features/care-pathway/hooks/useCarePathwayTabs'
import { useAuthStore } from '@/features/auth/store'
import type { ServiceUserLookupsBundle } from '@/features/service-users/types'

const SELECT_ANY = '__any__'

const CARE_PLAN_OPTIONS: { value: CarePlanListStatus | 'any'; label: string }[] = [
  { value: 'any', label: 'Any care plan status' },
  ...(Object.entries(CARE_PLAN_LIST_STATUS_FILTER_LABELS) as [CarePlanListStatus, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
]

const IA_OPTIONS: { value: InitialAssessmentStatusFilter | 'any'; label: string }[] = [
  { value: 'any', label: 'Any assessment status' },
  ...(Object.entries(INITIAL_ASSESSMENT_STATUS_FILTER_LABELS) as [
    Exclude<InitialAssessmentStatusFilter, ''>,
    string,
  ][]).map(([value, label]) => ({ value, label })),
]

const FILTER_GROUPS: {
  id: AdvancedFilterGroupId
  title: string
  description: string
  panelTitle: string
  panelDescription: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    id: 'profile',
    title: 'Profile',
    description: 'Age, care, funding & dates',
    panelTitle: 'Profile',
    panelDescription: 'Filter service users by age, care type, funding type, and start / death dates.',
    icon: UserRound,
  },
  {
    id: 'clinical',
    title: 'Clinical',
    description: 'Plans & conditions',
    panelTitle: 'Clinical',
    panelDescription: 'Care plans, assessments, and medical conditions.',
    icon: HeartPulse,
  },
  {
    id: 'visits',
    title: 'Visits',
    description: 'More than N missed visits',
    panelTitle: 'Visits',
    panelDescription: 'Confirmed ECM missed visits strictly greater than a threshold, with an optional date window.',
    icon: CalendarClock,
  },
  {
    id: 'alerts',
    title: 'Alerts & absences',
    description: 'Flash messages & hospital stays',
    panelTitle: 'Alerts & absences',
    panelDescription: 'Current flash alerts and hospitalised absences.',
    icon: Bell,
  },
  {
    id: 'safety',
    title: 'Safety & behaviour',
    description: 'Lone worker, aggression & safeguarding',
    panelTitle: 'Safety & behaviour',
    panelDescription: 'Lone worker risk, aggression, and safeguarding incidents.',
    icon: ShieldAlert,
  },
]

function parseAge(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 150) return undefined
  return n
}

function parseNonNegativeInt(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return undefined
  return n
}

function syncTextFields(next: ServiceUsersAdvancedFilters) {
  return {
    ageMinText: next.ageMin != null ? String(next.ageMin) : '',
    ageMaxText: next.ageMax != null ? String(next.ageMax) : '',
    missedMinText: next.missedVisitsMin != null ? String(next.missedVisitsMin) : '',
  }
}

function cloneAppliedFilters(value: ServiceUsersAdvancedFilters): ServiceUsersAdvancedFilters {
  const medicalConditionIds = uniqueFilterIds([
    ...(value.medicalConditionIds ?? []),
    value.medicalConditionId,
  ]) ?? []
  const medicalConditionLabels = { ...(value.medicalConditionLabels ?? {}) }
  if (value.medicalConditionId && value.medicalConditionLabel?.trim()) {
    medicalConditionLabels[value.medicalConditionId] = value.medicalConditionLabel.trim()
  }
  return {
    ...EMPTY_SERVICE_USERS_ADVANCED_FILTERS,
    ...value,
    carePlanFormIds: value.carePlanFormIds ?? [],
    carePlanFormLabels: value.carePlanFormLabels ?? {},
    medicalConditionId: undefined,
    medicalConditionLabel: undefined,
    medicalConditionIds,
    medicalConditionLabels,
  }
}

function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function FilterToggleRow({
  checked,
  disabled,
  label,
  description,
  testId,
  onCheckedChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  description: string
  testId: string
  onCheckedChange: (on: boolean) => void
}) {
  return (
    <label
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-3 py-2.5',
        disabled && 'opacity-60',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        data-testid={testId}
      />
    </label>
  )
}

export function ServiceUsersAdvancedFiltersPanel({
  open,
  onOpenChange,
  value,
  onApply,
  disabled,
  lookups,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Currently applied filters (list query). */
  value: ServiceUsersAdvancedFilters
  /** Called only when the user clicks Apply filters. */
  onApply: (next: ServiceUsersAdvancedFilters) => void
  disabled?: boolean
  lookups?: ServiceUserLookupsBundle | null
}) {
  const canReadMedical = useAuthStore(
    s =>
      s.can('service_users.medical_conditions.read') ||
      s.can('service_users.read') ||
      s.can('lookups.read'),
  )
  const [draft, setDraft] = React.useState<ServiceUsersAdvancedFilters>(value)
  const [group, setGroup] = React.useState<AdvancedFilterGroupId>('profile')
  const catalogQuery = useMedicalConditionCatalog('', open && canReadMedical)
  const catalog = catalogQuery.data ?? []
  const carePlansQuery = useCareForms({ formType: 'CARE_PLAN', limit: 100 }, open)
  const carePlanOptions = React.useMemo<MultiSelectOption[]>(() => {
    const rows = carePlansQuery.data?.rows ?? []
    const options = rows.map(row => ({ value: row.id, label: row.name }))
    const selectedIds = draft.carePlanFormIds ?? []
    const labels = draft.carePlanFormLabels ?? {}
    for (const id of selectedIds) {
      if (!options.some(opt => opt.value === id)) {
        options.push({ value: id, label: labels[id]?.trim() || 'Selected care plan' })
      }
    }
    return options
  }, [carePlansQuery.data?.rows, draft.carePlanFormIds, draft.carePlanFormLabels])

  const [ageMinText, setAgeMinText] = React.useState('')
  const [ageMaxText, setAgeMaxText] = React.useState('')
  const [missedMinText, setMissedMinText] = React.useState('')

  const applyDraft = React.useCallback((next: ServiceUsersAdvancedFilters) => {
    setDraft(next)
    const texts = syncTextFields(next)
    setAgeMinText(texts.ageMinText)
    setAgeMaxText(texts.ageMaxText)
    setMissedMinText(texts.missedMinText)
  }, [])

  React.useEffect(() => {
    if (!open) return
    applyDraft(cloneAppliedFilters(value))
    setGroup('profile')
  }, [open, value, applyDraft])

  const conditionOptions = React.useMemo<MultiSelectOption[]>(() => {
    const options = catalog.map(row => ({ value: row.id, label: row.name }))
    const selectedIds = draft.medicalConditionIds ?? []
    const labels = draft.medicalConditionLabels ?? {}
    for (const id of selectedIds) {
      if (!options.some(opt => opt.value === id)) {
        options.push({ value: id, label: labels[id]?.trim() || 'Selected condition' })
      }
    }
    return options
  }, [catalog, draft.medicalConditionIds, draft.medicalConditionLabels])

  const draftChips = describeAdvancedFilterChips(draft)
  const draftCount = countActiveAdvancedFilters(draft)
  const rangeErrors = advancedFilterRangeErrors(draft)
  const saveBlocked = hasAdvancedFilterRangeErrors(rangeErrors)
  const activeGroup = FILTER_GROUPS.find(item => item.id === group) ?? FILTER_GROUPS[0]
  if (!activeGroup) {
    throw new Error('Service user filter groups must not be empty')
  }

  const handleApply = () => {
    if (saveBlocked) return
    onApply(draft)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleClearDraft = () => {
    applyDraft(EMPTY_SERVICE_USERS_ADVANCED_FILTERS)
  }

  const handleChipRemove = (key: AdvancedFilterChipKey) => {
    const next = clearAdvancedFilterChip(draft, key)
    applyDraft(next)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="full"
        className="flex h-[min(82dvh,85vh)] max-h-[min(82dvh,85vh)] w-[95vw] max-w-[72rem] flex-col overflow-hidden"
        data-testid="service-users-advanced-filters"
      >
        <DialogHeader>
          <div className="min-w-0 space-y-1 pr-8">
            <DialogTitle>More filters</DialogTitle>
            <DialogDescription>
              Refine the service user list using profile, clinical, visit and risk criteria.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex shrink-0 items-center gap-2 border-b border-border px-5 py-2.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {draftChips.length === 0 ? (
              <p className="text-xs text-muted-foreground">No filters selected yet.</p>
            ) : (
              draftChips.map(chip => (
                <button
                  key={chip.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleChipRemove(chip.key)}
                  className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
                  title={`Remove ${chip.label}`}
                  data-testid={`service-users-filter-chip-${chip.key}`}
                >
                  <span className="truncate">{chip.label}</span>
                  <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                </button>
              ))
            )}
          </div>
          <p className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            {draftCount} {draftCount === 1 ? 'filter' : 'filters'} selected
          </p>
        </div>

        <DialogBody className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <nav
              className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 md:w-64 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r"
              aria-label="Filter groups"
            >
              {FILTER_GROUPS.map(item => {
                const selected = item.id === group
                const count = countAdvancedFiltersInGroup(draft, item.id)
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGroup(item.id)}
                    aria-current={selected ? 'true' : undefined}
                    data-testid={`service-users-filter-group-${item.id}`}
                    className={cn(
                      'flex min-w-[11rem] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors md:min-w-0',
                      selected
                        ? 'bg-primary/10 text-foreground ring-1 ring-primary/20'
                        : 'text-foreground hover:bg-muted/70',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold',
                        selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-tight">{item.title}</span>
                      <span className="mt-0.5 hidden text-[11px] leading-tight text-muted-foreground md:block">
                        {item.description}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums',
                        count > 0
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto p-5" data-testid={`service-users-filter-panel-${group}`}>
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-foreground">{activeGroup.panelTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{activeGroup.panelDescription}</p>
              </div>

              {group === 'profile' ? (
                <div className="space-y-6">
                  <FieldSection title="Age">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Age from</label>
                      <Input
                        type="number"
                        min={0}
                        max={draft.ageMax ?? 150}
                        inputMode="numeric"
                        placeholder="e.g. 65"
                        disabled={disabled}
                        value={ageMinText}
                        error={Boolean(rangeErrors.age)}
                        aria-invalid={Boolean(rangeErrors.age)}
                        data-testid="service-users-filter-age-min"
                        onChange={e => {
                          setAgeMinText(e.target.value)
                          setDraft(d => ({ ...d, ageMin: parseAge(e.target.value) }))
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Age to</label>
                      <Input
                        type="number"
                        min={draft.ageMin ?? 0}
                        max={150}
                        inputMode="numeric"
                        placeholder="e.g. 90"
                        disabled={disabled}
                        value={ageMaxText}
                        error={Boolean(rangeErrors.age)}
                        aria-invalid={Boolean(rangeErrors.age)}
                        data-testid="service-users-filter-age-max"
                        onChange={e => {
                          setAgeMaxText(e.target.value)
                          setDraft(d => ({ ...d, ageMax: parseAge(e.target.value) }))
                        }}
                        className="h-9"
                      />
                    </div>
                    {rangeErrors.age ? (
                      <p
                        className="text-xs text-destructive sm:col-span-2"
                        role="alert"
                        data-testid="service-users-filter-age-error"
                      >
                        {rangeErrors.age}
                      </p>
                    ) : null}
                  </FieldSection>
                  <FieldSection title="Care & funding">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Care type</label>
                      <Select
                        value={draft.careTypeId || SELECT_ANY}
                        disabled={disabled || !lookups}
                        onValueChange={v => {
                          if (v === SELECT_ANY) {
                            setDraft(d => ({
                              ...d,
                              careTypeId: undefined,
                              careTypeLabel: undefined,
                            }))
                            return
                          }
                          const row = lookups?.careTypes.find(t => t.id === v)
                          setDraft(d => ({
                            ...d,
                            careTypeId: v,
                            careTypeLabel: row?.name ?? d.careTypeLabel,
                          }))
                        }}
                      >
                        <SelectTrigger className="h-9" data-testid="service-users-filter-care-type">
                          <SelectValue placeholder="Any care type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_ANY}>Any care type</SelectItem>
                          {(lookups?.careTypes ?? []).map(row => (
                            <SelectItem key={row.id} value={row.id}>
                              {row.name}
                            </SelectItem>
                          ))}
                          {draft.careTypeId &&
                          !(lookups?.careTypes ?? []).some(row => row.id === draft.careTypeId) ? (
                            <SelectItem value={draft.careTypeId}>
                              {draft.careTypeLabel?.trim() || 'Selected care type'}
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Funding type</label>
                      <Select
                        value={draft.fundingTypeId || SELECT_ANY}
                        disabled={disabled || !lookups}
                        onValueChange={v => {
                          if (v === SELECT_ANY) {
                            setDraft(d => ({
                              ...d,
                              fundingTypeId: undefined,
                              fundingTypeLabel: undefined,
                            }))
                            return
                          }
                          const row = lookups?.fundingTypes.find(t => t.id === v)
                          setDraft(d => ({
                            ...d,
                            fundingTypeId: v,
                            fundingTypeLabel: row?.name ?? d.fundingTypeLabel,
                          }))
                        }}
                      >
                        <SelectTrigger className="h-9" data-testid="service-users-filter-funding-type">
                          <SelectValue placeholder="Any funding type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_ANY}>Any funding type</SelectItem>
                          {(lookups?.fundingTypes ?? []).map(row => (
                            <SelectItem key={row.id} value={row.id}>
                              {row.name}
                            </SelectItem>
                          ))}
                          {draft.fundingTypeId &&
                          !(lookups?.fundingTypes ?? []).some(row => row.id === draft.fundingTypeId) ? (
                            <SelectItem value={draft.fundingTypeId}>
                              {draft.fundingTypeLabel?.trim() || 'Selected funding type'}
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </div>
                  </FieldSection>
                  <FieldSection title="Service start date">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">From date</label>
                      <Input
                        type="date"
                        disabled={disabled}
                        max={draft.serviceStartDateTo}
                        value={draft.serviceStartDateFrom ?? ''}
                        error={Boolean(rangeErrors.serviceStartDate)}
                        aria-invalid={Boolean(rangeErrors.serviceStartDate)}
                        data-testid="service-users-filter-service-start-from"
                        onChange={e =>
                          setDraft(d => ({
                            ...d,
                            serviceStartDateFrom: e.target.value || undefined,
                          }))
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">To date</label>
                      <Input
                        type="date"
                        disabled={disabled}
                        min={draft.serviceStartDateFrom}
                        value={draft.serviceStartDateTo ?? ''}
                        error={Boolean(rangeErrors.serviceStartDate)}
                        aria-invalid={Boolean(rangeErrors.serviceStartDate)}
                        data-testid="service-users-filter-service-start-to"
                        onChange={e =>
                          setDraft(d => ({
                            ...d,
                            serviceStartDateTo: e.target.value || undefined,
                          }))
                        }
                        className="h-9"
                      />
                    </div>
                    {rangeErrors.serviceStartDate ? (
                      <p
                        className="text-xs text-destructive sm:col-span-2"
                        role="alert"
                        data-testid="service-users-filter-service-start-error"
                      >
                        {rangeErrors.serviceStartDate}
                      </p>
                    ) : null}
                  </FieldSection>
                  <FieldSection title="Date & time of death">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">From</label>
                      <Input
                        type="datetime-local"
                        disabled={disabled}
                        max={toDateOfDeathInputValue(draft.dateOfDeathTo) || undefined}
                        value={toDateOfDeathInputValue(draft.dateOfDeathFrom)}
                        error={Boolean(rangeErrors.dateOfDeath)}
                        aria-invalid={Boolean(rangeErrors.dateOfDeath)}
                        data-testid="service-users-filter-dod-from"
                        onChange={e =>
                          setDraft(d => ({
                            ...d,
                            dateOfDeathFrom: e.target.value || undefined,
                          }))
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">To</label>
                      <Input
                        type="datetime-local"
                        disabled={disabled}
                        min={toDateOfDeathInputValue(draft.dateOfDeathFrom) || undefined}
                        value={toDateOfDeathInputValue(draft.dateOfDeathTo)}
                        error={Boolean(rangeErrors.dateOfDeath)}
                        aria-invalid={Boolean(rangeErrors.dateOfDeath)}
                        data-testid="service-users-filter-dod-to"
                        onChange={e =>
                          setDraft(d => ({
                            ...d,
                            dateOfDeathTo: e.target.value || undefined,
                          }))
                        }
                        className="h-9"
                      />
                    </div>
                    {rangeErrors.dateOfDeath ? (
                      <p
                        className="text-xs text-destructive sm:col-span-2"
                        role="alert"
                        data-testid="service-users-filter-dod-error"
                      >
                        {rangeErrors.dateOfDeath}
                      </p>
                    ) : null}
                  </FieldSection>
                </div>
              ) : null}

              {group === 'clinical' ? (
                <div className="space-y-6">
                  <FieldSection title="Care plan">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Care plan status</label>
                      <Select
                        value={draft.carePlanListStatus || 'any'}
                        disabled={disabled}
                        onValueChange={v =>
                          setDraft(d => ({
                            ...d,
                            carePlanListStatus: v === 'any' ? '' : (v as CarePlanListStatus),
                          }))
                        }
                      >
                        <SelectTrigger className="h-9" data-testid="service-users-filter-care-plan">
                          <SelectValue placeholder="Care plan status" />
                        </SelectTrigger>
                        <SelectContent>
                          {CARE_PLAN_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2" data-testid="service-users-filter-care-plans">
                      <label className="text-xs font-medium text-muted-foreground">Care plans</label>
                      <MultiSelect
                        className="min-h-9 w-full"
                        options={carePlanOptions}
                        value={draft.carePlanFormIds ?? []}
                        disabled={disabled || carePlansQuery.isLoading}
                        placeholder={
                          carePlansQuery.isLoading
                            ? 'Loading care plans…'
                            : carePlansQuery.isError
                              ? 'Could not load care plans'
                              : 'Select one or more care plans…'
                        }
                        searchPlaceholder="Search care plans…"
                        onChange={ids =>
                          setDraft(d => {
                            const labels = { ...(d.carePlanFormLabels ?? {}) }
                            for (const id of ids) {
                              const name = carePlanOptions.find(opt => opt.value === id)?.label
                              if (name) labels[id] = name
                            }
                            for (const id of Object.keys(labels)) {
                              if (!ids.includes(id)) delete labels[id]
                            }
                            return { ...d, carePlanFormIds: ids, carePlanFormLabels: labels }
                          })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Shows service users with a published instance of any selected plan.
                      </p>
                    </div>
                  </FieldSection>
                  <FieldSection title="Initial assessment">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Assessment status</label>
                      <Select
                        value={draft.initialAssessmentStatus || 'any'}
                        disabled={disabled}
                        onValueChange={v =>
                          setDraft(d => ({
                            ...d,
                            initialAssessmentStatus:
                              v === 'any' ? '' : (v as InitialAssessmentStatusFilter),
                          }))
                        }
                      >
                        <SelectTrigger className="h-9" data-testid="service-users-filter-ia-status">
                          <SelectValue placeholder="Assessment status" />
                        </SelectTrigger>
                        <SelectContent>
                          {IA_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FieldSection>
                  <FieldSection title="Medical condition">
                    <div className="space-y-1.5 sm:col-span-2" data-testid="service-users-filter-condition">
                      <label className="text-xs font-medium text-muted-foreground">Condition</label>
                      <MultiSelect
                        className="min-h-9 w-full"
                        options={conditionOptions}
                        value={draft.medicalConditionIds ?? []}
                        disabled={disabled || !canReadMedical || catalogQuery.isLoading}
                        placeholder={
                          !canReadMedical
                            ? 'No permission'
                            : catalogQuery.isLoading
                              ? 'Loading conditions…'
                              : catalogQuery.isError
                                ? 'Could not load conditions'
                                : 'Select one or more conditions…'
                        }
                        searchPlaceholder="Search catalogue…"
                        onChange={ids =>
                          setDraft(d => {
                            const labels = { ...(d.medicalConditionLabels ?? {}) }
                            for (const id of ids) {
                              const name = conditionOptions.find(opt => opt.value === id)?.label
                              if (name) labels[id] = name
                            }
                            for (const id of Object.keys(labels)) {
                              if (!ids.includes(id)) delete labels[id]
                            }
                            return {
                              ...d,
                              medicalConditionId: undefined,
                              medicalConditionLabel: undefined,
                              medicalConditionIds: ids,
                              medicalConditionLabels: labels,
                            }
                          })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Shows service users with any of the selected active conditions.
                      </p>
                    </div>
                  </FieldSection>
                </div>
              ) : null}

              {group === 'visits' ? (
                <div className="space-y-6">
                  <FieldSection title="Missed visits">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        More than (missed visits)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="e.g. 3"
                        disabled={disabled}
                        value={missedMinText}
                        data-testid="service-users-filter-missed-min"
                        onChange={e => {
                          setMissedMinText(e.target.value)
                          setDraft(d => ({
                            ...d,
                            missedVisitsMin: parseNonNegativeInt(e.target.value),
                          }))
                        }}
                        className="h-9"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Shows service users with confirmed missed visits strictly greater than this
                        number.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">From date</label>
                      <Input
                        type="date"
                        disabled={disabled}
                        max={draft.missedVisitsTo}
                        value={draft.missedVisitsFrom ?? ''}
                        error={Boolean(rangeErrors.missedVisits)}
                        aria-invalid={Boolean(rangeErrors.missedVisits)}
                        data-testid="service-users-filter-missed-from"
                        onChange={e =>
                          setDraft(d => ({ ...d, missedVisitsFrom: e.target.value || undefined }))
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">To date</label>
                      <Input
                        type="date"
                        disabled={disabled}
                        min={draft.missedVisitsFrom}
                        value={draft.missedVisitsTo ?? ''}
                        error={Boolean(rangeErrors.missedVisits)}
                        aria-invalid={Boolean(rangeErrors.missedVisits)}
                        data-testid="service-users-filter-missed-to"
                        onChange={e =>
                          setDraft(d => ({ ...d, missedVisitsTo: e.target.value || undefined }))
                        }
                        className="h-9"
                      />
                    </div>
                    {rangeErrors.missedVisits ? (
                      <p
                        className="text-xs text-destructive sm:col-span-2"
                        role="alert"
                        data-testid="service-users-filter-missed-dates-error"
                      >
                        {rangeErrors.missedVisits}
                      </p>
                    ) : null}
                  </FieldSection>
                </div>
              ) : null}

              {group === 'alerts' ? (
                <div className="space-y-2">
                  <FilterToggleRow
                    checked={Boolean(draft.hasActiveFlashMessage)}
                    disabled={disabled}
                    label="Active flash alert"
                    description="Service user currently has an active flash message."
                    testId="service-users-filter-flash"
                    onCheckedChange={on => setDraft(d => ({ ...d, hasActiveFlashMessage: on }))}
                  />
                  <FilterToggleRow
                    checked={Boolean(draft.hospitalisedOnly)}
                    disabled={disabled}
                    label="Hospitalised now"
                    description="Has an active hospitalised absence."
                    testId="service-users-filter-hospitalised"
                    onCheckedChange={on => setDraft(d => ({ ...d, hospitalisedOnly: on }))}
                  />
                </div>
              ) : null}

              {group === 'safety' ? (
                <div className="space-y-2">
                  <FilterToggleRow
                    checked={Boolean(draft.loneWorkerRisk)}
                    disabled={disabled}
                    label="Lone worker risk (open)"
                    description="Open lone-worker risk on the initial assessment."
                    testId="service-users-filter-lone-worker"
                    onCheckedChange={on => setDraft(d => ({ ...d, loneWorkerRisk: on }))}
                  />
                  <FilterToggleRow
                    checked={Boolean(draft.verbalAltercation)}
                    disabled={disabled}
                    label="Verbal altercation"
                    description="Recorded verbal aggression incident."
                    testId="service-users-filter-verbal"
                    onCheckedChange={on => setDraft(d => ({ ...d, verbalAltercation: on }))}
                  />
                  <FilterToggleRow
                    checked={Boolean(draft.physicalAltercation)}
                    disabled={disabled}
                    label="Physical altercation (by SU)"
                    description="Recorded physical aggression incident where the service user is primary."
                    testId="service-users-filter-physical"
                    onCheckedChange={on => setDraft(d => ({ ...d, physicalAltercation: on }))}
                  />
                  <FilterToggleRow
                    checked={Boolean(draft.physicalAbuseToSu)}
                    disabled={disabled}
                    label="Physical abuse to SU"
                    description="Safeguarding physical-abuse incident affecting the service user."
                    testId="service-users-filter-physical-abuse-to-su"
                    onCheckedChange={on => setDraft(d => ({ ...d, physicalAbuseToSu: on }))}
                  />
                  <FilterToggleRow
                    checked={Boolean(draft.domesticViolence)}
                    disabled={disabled}
                    label="Domestic violence"
                    description="Domestic abuse / violence safeguarding incident."
                    testId="service-users-filter-domestic"
                    onCheckedChange={on => setDraft(d => ({ ...d, domesticViolence: on }))}
                  />
                  <FilterToggleRow
                    checked={Boolean(draft.safeguardingHistory)}
                    disabled={disabled}
                    label="Safeguarding / abuse history"
                    description="Any safeguarding-category incident on record."
                    testId="service-users-filter-safeguarding-history"
                    onCheckedChange={on => setDraft(d => ({ ...d, safeguardingHistory: on }))}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="justify-between sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={handleClearDraft}
              data-testid="service-users-filters-clear-draft"
            >
              Clear all filters
            </Button>
            <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
              {draftCount} {draftCount === 1 ? 'filter' : 'filters'} active
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={handleCancel}
              data-testid="service-users-filters-cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={disabled || saveBlocked}
              onClick={handleApply}
              data-testid="service-users-filters-save"
            >
              Apply filters ({draftCount})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ServiceUsersFilterToggleButton({
  open,
  activeCount,
  onClick,
}: {
  open: boolean
  activeCount: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors',
        open || activeCount > 0
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-foreground hover:bg-muted',
      )}
      aria-pressed={open}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={activeCount > 0 ? `Open filters, ${activeCount} applied` : 'Open service user filters'}
      title="Open filters — Apply to update the list"
      data-testid="service-users-advanced-filters-toggle"
      onClick={onClick}
    >
      <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
      <span>Filters</span>
      {activeCount > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
          {activeCount}
        </span>
      ) : null}
      <ChevronDown
        className={cn('h-3.5 w-3.5 shrink-0 opacity-70 transition-transform', open && 'rotate-180')}
        aria-hidden
      />
    </button>
  )
}

const filterControlTriggerClass =
  'h-9 w-full justify-between gap-2 border px-2.5 shadow-none focus:ring-ring/40 sm:w-[13.5rem] [&>span]:line-clamp-1 [&>span]:min-w-0'

export function ServiceUsersStatusFilter({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string
  options: { code: string; name: string }[]
  disabled?: boolean
  onChange: (next: string) => void
}) {
  const isDefault = value === 'ACTIVE'
  const selectedLabel =
    value === 'all'
      ? 'All statuses'
      : options.find(o => o.code === value)
        ? statusFilterLabel(value, options.find(o => o.code === value)!.name)
        : value

  return (
    <div
      className="flex w-full items-center gap-2 sm:w-auto"
      data-testid="service-users-status-filter-wrap"
    >
      <span className="hidden shrink-0 text-sm font-medium text-muted-foreground sm:inline">
        Status
      </span>
      <Select value={value} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger
          data-testid="service-users-status-filter"
          className={cn(
            filterControlTriggerClass,
            !isDefault
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-background text-foreground',
          )}
          aria-label={`Status: ${selectedLabel}`}
          title="Filter by service user status"
        >
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[14rem] bg-background text-foreground">
          <SelectItem value="all">All statuses</SelectItem>
          {options.map(s => (
            <SelectItem key={s.code} value={s.code}>
              {statusFilterLabel(s.code, s.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export { EMPTY_SERVICE_USERS_ADVANCED_FILTERS }
