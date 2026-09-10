import * as React from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
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
import type { CarePlanListStatus } from '@/features/service-users/api'
import {
  CARE_PLAN_LIST_STATUS_FILTER_LABELS,
  EMPTY_SERVICE_USERS_ADVANCED_FILTERS,
  INITIAL_ASSESSMENT_STATUS_FILTER_LABELS,
  statusFilterLabel,
  type InitialAssessmentStatusFilter,
  type ServiceUsersAdvancedFilters,
} from '@/features/service-users/utils/service-users-list-query'
import { useMedicalConditionCatalog } from '@/features/alerts/hooks/useMedicalClinical'
import { useAuthStore } from '@/features/auth/store'

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

function parseAge(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 150) return undefined
  return n
}

function parsePositiveInt(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return undefined
  return n
}

function FilterToggle({
  checked,
  disabled,
  label,
  testId,
  onCheckedChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  testId: string
  onCheckedChange: (on: boolean) => void
}) {
  return (
    <label
      className={cn(
        'flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm sm:col-span-2',
        disabled && 'opacity-60',
      )}
    >
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        data-testid={testId}
      />
      {label}
    </label>
  )
}

function FilterGroup({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border/80 bg-background p-3 shadow-sm">
      <div className="mb-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h3>
        {description ? <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function syncTextFields(next: ServiceUsersAdvancedFilters) {
  return {
    ageMinText: next.ageMin != null ? String(next.ageMin) : '',
    ageMaxText: next.ageMax != null ? String(next.ageMax) : '',
    missedMinText: next.missedVisitsMin != null ? String(next.missedVisitsMin) : '',
  }
}

export function ServiceUsersAdvancedFiltersPanel({
  open,
  onOpenChange,
  value,
  onApply,
  disabled,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Currently applied filters (list query). */
  value: ServiceUsersAdvancedFilters
  /** Called only when the user clicks Save. */
  onApply: (next: ServiceUsersAdvancedFilters) => void
  disabled?: boolean
}) {
  const canReadMedical = useAuthStore(
    (s) =>
      s.can('service_users.medical_conditions.read') ||
      s.can('service_users.read') ||
      s.can('lookups.read'),
  )
  const [draft, setDraft] = React.useState<ServiceUsersAdvancedFilters>(value)
  const [conditionSearch, setConditionSearch] = React.useState('')
  const debouncedSearch = useDebounced(conditionSearch, 300)
  const catalogQuery = useMedicalConditionCatalog(debouncedSearch, open && canReadMedical)
  const catalog = catalogQuery.data ?? []

  const [ageMinText, setAgeMinText] = React.useState('')
  const [ageMaxText, setAgeMaxText] = React.useState('')
  const [missedMinText, setMissedMinText] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    const next = { ...EMPTY_SERVICE_USERS_ADVANCED_FILTERS, ...value }
    setDraft(next)
    const texts = syncTextFields(next)
    setAgeMinText(texts.ageMinText)
    setAgeMaxText(texts.ageMaxText)
    setMissedMinText(texts.missedMinText)
    setConditionSearch('')
  }, [open, value])

  const selectedCondition = catalog.find((c) => c.id === draft.medicalConditionId)
  const conditionLabel =
    selectedCondition?.name ??
    draft.medicalConditionLabel ??
    (draft.medicalConditionId ? 'Selected condition' : null)

  const handleSave = () => {
    onApply(draft)
    onOpenChange(false)
  }

  const handleClearDraft = () => {
    setDraft(EMPTY_SERVICE_USERS_ADVANCED_FILTERS)
    setAgeMinText('')
    setAgeMaxText('')
    setMissedMinText('')
    setConditionSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        className="flex h-[min(90dvh,90vh)] max-h-[min(90dvh,90vh)] max-w-5xl flex-col overflow-hidden"
        data-testid="service-users-advanced-filters"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>More filters</DialogTitle>
          <DialogDescription>
            Profile, clinical, visits, alerts, and safety / behaviour criteria.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="min-h-0 flex-1 overflow-y-auto scroll-pb-8 bg-[#f3fafb] pb-24 dark:bg-teal-950/20">
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <FilterGroup title="Profile" description="Age and date of death">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Age from</label>
                <Input
                  type="number"
                  min={0}
                  max={150}
                  inputMode="numeric"
                  placeholder="e.g. 65"
                  disabled={disabled}
                  value={ageMinText}
                  data-testid="service-users-filter-age-min"
                  onChange={(e) => {
                    setAgeMinText(e.target.value)
                    setDraft((d) => ({ ...d, ageMin: parseAge(e.target.value) }))
                  }}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Age to</label>
                <Input
                  type="number"
                  min={0}
                  max={150}
                  inputMode="numeric"
                  placeholder="e.g. 90"
                  disabled={disabled}
                  value={ageMaxText}
                  data-testid="service-users-filter-age-max"
                  onChange={(e) => {
                    setAgeMaxText(e.target.value)
                    setDraft((d) => ({ ...d, ageMax: parseAge(e.target.value) }))
                  }}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date of death from</label>
                <Input
                  type="date"
                  disabled={disabled}
                  value={draft.dateOfDeathFrom ?? ''}
                  data-testid="service-users-filter-dod-from"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, dateOfDeathFrom: e.target.value || undefined }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date of death to</label>
                <Input
                  type="date"
                  disabled={disabled}
                  value={draft.dateOfDeathTo ?? ''}
                  data-testid="service-users-filter-dod-to"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, dateOfDeathTo: e.target.value || undefined }))
                  }
                  className="h-9"
                />
              </div>
            </FilterGroup>

            <FilterGroup title="Clinical" description="Care plans, IA, and conditions">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Care plan</label>
                <Select
                  value={draft.carePlanListStatus || 'any'}
                  disabled={disabled}
                  onValueChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      carePlanListStatus: v === 'any' ? '' : (v as CarePlanListStatus),
                    }))
                  }
                >
                  <SelectTrigger className="h-9" data-testid="service-users-filter-care-plan">
                    <SelectValue placeholder="Care plan status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARE_PLAN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Initial assessment</label>
                <Select
                  value={draft.initialAssessmentStatus || 'any'}
                  disabled={disabled}
                  onValueChange={(v) =>
                    setDraft((d) => ({
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
                    {IA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Medical condition</label>
                <Input
                  value={conditionSearch}
                  disabled={disabled || !canReadMedical}
                  placeholder={canReadMedical ? 'Search catalogue…' : 'No permission'}
                  onChange={(e) => setConditionSearch(e.target.value)}
                  className="h-9"
                  data-testid="service-users-filter-condition-search"
                />
                <Select
                  value={draft.medicalConditionId || 'any'}
                  disabled={disabled || !canReadMedical}
                  onValueChange={(v) => {
                    if (v === 'any') {
                      setDraft((d) => ({
                        ...d,
                        medicalConditionId: undefined,
                        medicalConditionLabel: undefined,
                      }))
                      return
                    }
                    const name = catalog.find((c) => c.id === v)?.name
                    setDraft((d) => ({
                      ...d,
                      medicalConditionId: v,
                      medicalConditionLabel: name,
                    }))
                  }}
                >
                  <SelectTrigger className="h-9" data-testid="service-users-filter-condition">
                    <SelectValue placeholder="Any condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any condition</SelectItem>
                    {draft.medicalConditionId &&
                    !catalog.some((c) => c.id === draft.medicalConditionId) &&
                    conditionLabel ? (
                      <SelectItem value={draft.medicalConditionId}>{conditionLabel}</SelectItem>
                    ) : null}
                    {catalog.slice(0, 80).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FilterGroup>

            <FilterGroup title="Visits" description="Confirmed ECM missed visits">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Minimum missed visits
                </label>
                <Input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="e.g. 3"
                  disabled={disabled}
                  value={missedMinText}
                  data-testid="service-users-filter-missed-min"
                  onChange={(e) => {
                    setMissedMinText(e.target.value)
                    setDraft((d) => ({ ...d, missedVisitsMin: parsePositiveInt(e.target.value) }))
                  }}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">From date</label>
                <Input
                  type="date"
                  disabled={disabled}
                  value={draft.missedVisitsFrom ?? ''}
                  data-testid="service-users-filter-missed-from"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, missedVisitsFrom: e.target.value || undefined }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">To date</label>
                <Input
                  type="date"
                  disabled={disabled}
                  value={draft.missedVisitsTo ?? ''}
                  data-testid="service-users-filter-missed-to"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, missedVisitsTo: e.target.value || undefined }))
                  }
                  className="h-9"
                />
              </div>
            </FilterGroup>

            <FilterGroup title="Alerts & absences" description="Flash messages and hospital stays">
              <FilterToggle
                checked={Boolean(draft.hasActiveFlashMessage)}
                disabled={disabled}
                label="Active flash alert"
                testId="service-users-filter-flash"
                onCheckedChange={(on) => setDraft((d) => ({ ...d, hasActiveFlashMessage: on }))}
              />
              <FilterToggle
                checked={Boolean(draft.hospitalisedOnly)}
                disabled={disabled}
                label="Hospitalised now"
                testId="service-users-filter-hospitalised"
                onCheckedChange={(on) => setDraft((d) => ({ ...d, hospitalisedOnly: on }))}
              />
            </FilterGroup>

            <FilterGroup title="Safety & behaviour" description="Lone worker, aggression, and safeguarding">
              <FilterToggle
                checked={Boolean(draft.loneWorkerRisk)}
                disabled={disabled}
                label="Lone worker risk (open)"
                testId="service-users-filter-lone-worker"
                onCheckedChange={(on) => setDraft((d) => ({ ...d, loneWorkerRisk: on }))}
              />
              <FilterToggle
                checked={Boolean(draft.verbalAltercation)}
                disabled={disabled}
                label="Verbal altercation"
                testId="service-users-filter-verbal"
                onCheckedChange={(on) => setDraft((d) => ({ ...d, verbalAltercation: on }))}
              />
              <FilterToggle
                checked={Boolean(draft.physicalAltercation)}
                disabled={disabled}
                label="Physical altercation (by SU)"
                testId="service-users-filter-physical"
                onCheckedChange={(on) => setDraft((d) => ({ ...d, physicalAltercation: on }))}
              />
              <FilterToggle
                checked={Boolean(draft.physicalAbuseToSu)}
                disabled={disabled}
                label="Physical abuse to SU"
                testId="service-users-filter-physical-abuse-to-su"
                onCheckedChange={(on) => setDraft((d) => ({ ...d, physicalAbuseToSu: on }))}
              />
              <FilterToggle
                checked={Boolean(draft.domesticViolence)}
                disabled={disabled}
                label="Domestic violence"
                testId="service-users-filter-domestic"
                onCheckedChange={(on) => setDraft((d) => ({ ...d, domesticViolence: on }))}
              />
              <FilterToggle
                checked={Boolean(draft.safeguardingHistory)}
                disabled={disabled}
                label="Safeguarding / abuse history"
                testId="service-users-filter-safeguarding-history"
                onCheckedChange={(on) => setDraft((d) => ({ ...d, safeguardingHistory: on }))}
              />
            </FilterGroup>
          </div>
          {/* Extra scroll room so the last Safety toggles clear the sticky footer */}
          <div className="h-4 shrink-0" aria-hidden />
        </DialogBody>

        <DialogFooter className="relative z-10 shrink-0 justify-between bg-muted/30 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={handleClearDraft}
            data-testid="service-users-filters-clear-draft"
          >
            Clear all
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => onOpenChange(false)}
              data-testid="service-users-filters-cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={disabled}
              onClick={handleSave}
              className="bg-[#4db8c8] text-white hover:bg-[#3aa7b7]"
              data-testid="service-users-filters-save"
            >
              Save
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
          ? 'border-[#4db8c8] bg-[#4db8c8]/15 text-[#1f6f7a]'
          : 'border-border bg-background text-foreground hover:bg-muted',
      )}
      aria-pressed={open}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label="Open service user filters"
      title="Open filters — Save to apply to the list"
      data-testid="service-users-advanced-filters-toggle"
      onClick={onClick}
    >
      <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
      <span>Filters</span>
      {activeCount > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4db8c8] px-1.5 text-[11px] font-semibold text-white">
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
  'h-9 w-[13.5rem] shrink-0 justify-between gap-2 border px-2.5 shadow-none focus:ring-[#4db8c8]/40 [&>span]:line-clamp-1 [&>span]:min-w-0'

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
      : options.find((o) => o.code === value)
        ? statusFilterLabel(
            value,
            options.find((o) => o.code === value)!.name,
          )
        : value

  return (
    <div
      className="flex shrink-0 items-center gap-2 border-l border-border pl-3"
      data-testid="service-users-status-filter-wrap"
    >
      <span className="hidden text-sm font-medium text-muted-foreground sm:inline">Status</span>
      <Select value={value} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger
          data-testid="service-users-status-filter"
          className={cn(
            filterControlTriggerClass,
            !isDefault
              ? 'border-[#4db8c8] bg-[#4db8c8]/15 text-[#1f6f7a]'
              : 'border-border bg-background text-foreground',
          )}
          aria-label={`Status: ${selectedLabel}`}
          title="Filter by service user status"
        >
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[14rem] bg-background text-foreground">
          <SelectItem value="all">All statuses</SelectItem>
          {options.map((s) => (
            <SelectItem key={s.code} value={s.code}>
              {statusFilterLabel(s.code, s.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function useDebounced(value: string, ms: number) {
  const [v, setV] = React.useState(value)
  React.useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return v
}

export { EMPTY_SERVICE_USERS_ADVANCED_FILTERS }
