import * as React from 'react'
import {
  BadgeCheck,
  Briefcase,
  Building2,
  ChevronDown,
  Globe,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type { EmployeeLookupsBundle, EmployeeListFacets } from '@/features/employees/api'
import type { EmployeeVisaType } from '@/features/settings/types'
import {
  type StaffListComplianceFilter,
  type StaffListFilterChipKey,
  type StaffListFilterGroupId,
  type StaffListFiltersState,
  type StaffListInCountryFilter,
  DEFAULT_STAFF_LIST_FILTERS,
  clearStaffListFilterChip,
  countActiveStaffListFilters,
  countStaffListFiltersInGroup,
  describeStaffListFilterChips,
} from '@/features/employees/utils/staff-list-filter.util'
import type { EmployeeBranchScopeKind } from '@/features/scheduling/utils/employee-branch-scope.util'
import {
  staffListBranchFacetOptions,
  staffListFacetOptions,
  staffListVisaFacetOptions,
} from '@/features/employees/utils/staff-list-facet.util'
import {
  isScheduleJobsFilterAllOptionSelected,
  normalizeScheduleJobsFilterChange,
  SCHEDULE_JOBS_FILTER_ALL_VALUE,
  withScheduleJobsFilterAllOption,
} from '@/features/scheduling/utils/schedule-jobs-multi-filter.util'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { MultiSelect } from '@/shared/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

type Props = {
  lookups: EmployeeLookupsBundle | null
  visaTypes: EmployeeVisaType[]
  facets: EmployeeListFacets | null
  filters: StaffListFiltersState
  onFiltersChange: (next: StaffListFiltersState) => void
  searchInput: string
  onSearchInputChange: (value: string) => void
  disabled?: boolean
  locationFilterDisabled?: boolean
}

const TEAL = '#4db8c8'

const IN_COUNTRY_OPTIONS: { value: StaffListInCountryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'In country' },
  { value: 'out', label: 'Out of country' },
]
const COMPLIANCE_OPTIONS: { value: StaffListComplianceFilter; label: string }[] = [
  { value: 'all', label: 'All compliance' },
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'up_to_date', label: 'Up to date' },
]
const BRANCH_SCOPE_OPTIONS: { value: EmployeeBranchScopeKind; label: string }[] = [
  { value: 'all-zones', label: 'All branches' },
  { value: 'single', label: 'Single branch' },
  { value: 'multiple', label: 'Multiple branches' },
  { value: 'none', label: 'Not assigned' },
]

const FILTER_GROUPS: {
  id: StaffListFilterGroupId
  title: string
  description: string
  panelTitle: string
  panelDescription: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    id: 'organisation',
    title: 'Organisation',
    description: 'Branch & assignment',
    panelTitle: 'Organisation',
    panelDescription: 'Filter staff by organisation location and branch assignment.',
    icon: Building2,
  },
  {
    id: 'job',
    title: 'Job',
    description: 'Role, title & grade',
    panelTitle: 'Job',
    panelDescription: 'Role, job title, grade, and employment type.',
    icon: Briefcase,
  },
  {
    id: 'status',
    title: 'Status',
    description: 'Employment & compliance',
    panelTitle: 'Status',
    panelDescription: 'Employee status and compliance attention.',
    icon: BadgeCheck,
  },
  {
    id: 'immigration',
    title: 'Immigration',
    description: 'Visa & in-country',
    panelTitle: 'Immigration',
    panelDescription: 'Visa / immigration type and in-country status.',
    icon: Globe,
  },
]

function cloneFilters(value: StaffListFiltersState): StaffListFiltersState {
  return {
    ...value,
    statusIds: [...value.statusIds],
    locationIds: [...value.locationIds],
    roleIds: [...value.roleIds],
    jobTitleIds: [...value.jobTitleIds],
    gradeIds: [...value.gradeIds],
    contractTypeIds: [...value.contractTypeIds],
    visaTypeIds: [...value.visaTypeIds],
    branchScopeKinds: [...value.branchScopeKinds],
  }
}

function emptyAdvancedFilters(base: StaffListFiltersState, keepLocation: boolean): StaffListFiltersState {
  return {
    ...DEFAULT_STAFF_LIST_FILTERS,
    search: base.search,
    locationIds: keepLocation ? [...base.locationIds] : [],
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

export function StaffListFilters({
  lookups,
  visaTypes,
  facets,
  filters,
  onFiltersChange,
  searchInput,
  onSearchInputChange,
  disabled,
  locationFilterDisabled = false,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<StaffListFiltersState>(filters)
  const [group, setGroup] = React.useState<StaffListFilterGroupId>('organisation')
  const chipOptions = { omitLocation: locationFilterDisabled }
  const filtersRef = React.useRef(filters)
  filtersRef.current = filters

  React.useEffect(() => {
    if (!open) return
    setDraft(cloneFilters(filtersRef.current))
    setGroup('organisation')
  }, [open])

  const allBranchesLabel = facets ? `All branches (${facets.branchCohortTotal})` : 'All branches'
  const branchOptions = React.useMemo(
    () =>
      withScheduleJobsFilterAllOption(
        allBranchesLabel,
        staffListBranchFacetOptions(lookups?.locations ?? [], facets),
      ),
    [allBranchesLabel, lookups?.locations, facets],
  )
  const roleOptions = React.useMemo(
    () => staffListFacetOptions(lookups?.roles ?? [], facets?.roles, draft.roleIds),
    [lookups?.roles, facets?.roles, draft.roleIds],
  )
  const jobTitleOptions = React.useMemo(
    () => staffListFacetOptions(lookups?.jobTitles ?? [], facets?.jobTitles, draft.jobTitleIds),
    [lookups?.jobTitles, facets?.jobTitles, draft.jobTitleIds],
  )
  const gradeOptions = React.useMemo(
    () => staffListFacetOptions(lookups?.grades ?? [], facets?.grades, draft.gradeIds),
    [lookups?.grades, facets?.grades, draft.gradeIds],
  )
  const contractTypeOptions = React.useMemo(
    () =>
      staffListFacetOptions(lookups?.contractTypes ?? [], facets?.contractTypes, draft.contractTypeIds),
    [lookups?.contractTypes, facets?.contractTypes, draft.contractTypeIds],
  )
  const statusOptions = React.useMemo(
    () =>
      staffListFacetOptions(lookups?.employeeStatuses ?? [], facets?.statuses, draft.statusIds),
    [lookups?.employeeStatuses, facets?.statuses, draft.statusIds],
  )
  const immigrationOptions = React.useMemo(
    () => staffListVisaFacetOptions(visaTypes, facets?.visaTypes, draft.visaTypeIds),
    [visaTypes, facets?.visaTypes, draft.visaTypeIds],
  )
  const visaLabelMap = React.useMemo(
    () => new Map(visaTypes.map((row) => [row.id, row.label])),
    [visaTypes],
  )

  const appliedChips = describeStaffListFilterChips(filters, lookups, visaLabelMap, chipOptions)
  const appliedCount = countActiveStaffListFilters(filters, chipOptions)
  const draftChips = describeStaffListFilterChips(draft, lookups, visaLabelMap, chipOptions)
  const draftCount = countActiveStaffListFilters(draft, chipOptions)
  const activeGroup = FILTER_GROUPS.find((item) => item.id === group) ?? FILTER_GROUPS[0]

  const handleApply = () => {
    onFiltersChange({ ...draft, search: filters.search })
    setOpen(false)
  }

  const handleCancel = () => setOpen(false)

  const handleClearDraft = () => {
    setDraft(emptyAdvancedFilters(draft, locationFilterDisabled))
  }

  const handleDraftChipRemove = (key: StaffListFilterChipKey) => {
    if (locationFilterDisabled && key === 'locationIds') return
    setDraft((current) => clearStaffListFilterChip(current, key))
  }

  const handleAppliedChipRemove = (key: StaffListFilterChipKey) => {
    if (locationFilterDisabled && key === 'locationIds') return
    onFiltersChange(clearStaffListFilterChip(filters, key))
  }

  const handleClearApplied = () => {
    onFiltersChange(emptyAdvancedFilters(filters, locationFilterDisabled))
  }

  return (
    <div className="space-y-0" data-testid="employee-staff-list-filters">
      <div className="flex flex-col gap-3 border-b border-border bg-background py-3 md:flex-row md:flex-wrap md:items-center md:gap-2 md:py-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors',
              open || appliedCount > 0
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-foreground hover:bg-muted',
            )}
            aria-pressed={open}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label={appliedCount > 0 ? `Open filters, ${appliedCount} applied` : 'Open staff filters'}
            title="Open filters — Apply to update the list"
            data-testid="employee-staff-filters-toggle"
            onClick={() => setOpen((current) => !current)}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
            <span>Filters</span>
            {appliedCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                {appliedCount}
              </span>
            ) : null}
            <ChevronDown
              className={cn('h-3.5 w-3.5 shrink-0 opacity-70 transition-transform', open && 'rotate-180')}
              aria-hidden
            />
          </button>

          <div className="flex min-w-0 w-full flex-1 sm:max-w-md md:w-72 md:flex-initial md:max-w-none">
            <input
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              placeholder="Search name, email, username"
              disabled={disabled}
              className="h-9 min-w-0 flex-1 rounded-l-md border border-border border-r-0 bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
              data-testid="employee-staff-search"
            />
            <span
              className="flex h-9 shrink-0 items-center justify-center rounded-r-md border border-l-0 px-3 text-white"
              style={{ background: TEAL, borderColor: TEAL }}
              title="Search runs as you type"
            >
              <Search className="h-4 w-4" aria-hidden />
            </span>
          </div>
        </div>
      </div>

      {appliedChips.length > 0 ? (
        <div
          className="flex flex-wrap items-center gap-2 border-b border-border bg-background py-2"
          data-testid="employee-staff-active-filter-chips"
        >
          <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
          {appliedChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              disabled={disabled}
              className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
              onClick={() => handleAppliedChipRemove(chip.key)}
              title={`Remove ${chip.label}`}
            >
              <span className="truncate">{chip.label}</span>
              <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            disabled={disabled}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
            data-testid="employee-staff-clear-filters"
            onClick={handleClearApplied}
          >
            Clear all
          </button>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          size="full"
          className="flex h-[min(82dvh,85vh)] max-h-[min(82dvh,85vh)] w-[95vw] max-w-[72rem] flex-col overflow-hidden"
          data-testid="employee-staff-advanced-filters"
        >
          <DialogHeader>
            <div className="min-w-0 space-y-1 pr-8">
              <DialogTitle>More filters</DialogTitle>
              <DialogDescription>
                Refine the staff list using organisation, job, status, and immigration criteria.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex shrink-0 items-center gap-2 border-b border-border px-5 py-2.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {draftChips.length === 0 ? (
                <p className="text-xs text-muted-foreground">No filters selected yet.</p>
              ) : (
                draftChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleDraftChipRemove(chip.key)}
                    className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
                    title={`Remove ${chip.label}`}
                    data-testid={`employee-staff-filter-chip-${chip.key}`}
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
                {FILTER_GROUPS.map((item) => {
                  const selected = item.id === group
                  const count = countStaffListFiltersInGroup(draft, item.id, chipOptions)
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGroup(item.id)}
                      aria-current={selected ? 'true' : undefined}
                      data-testid={`employee-staff-filter-group-${item.id}`}
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

              <div
                className="min-h-0 flex-1 overflow-y-auto p-5"
                data-testid={`employee-staff-filter-panel-${group}`}
              >
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-foreground">{activeGroup.panelTitle}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{activeGroup.panelDescription}</p>
                </div>

                {group === 'organisation' ? (
                  <div className="space-y-6">
                    <FieldSection title="Branch">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Branch</label>
                        <MultiSelect
                          className="min-h-9 w-full"
                          options={branchOptions}
                          value={draft.locationIds}
                          onChange={(next) => {
                            if (locationFilterDisabled) return
                            setDraft((current) => ({
                              ...current,
                              locationIds: normalizeScheduleJobsFilterChange(next),
                            }))
                          }}
                          placeholder="All branches"
                          searchPlaceholder="Search branches…"
                          disabled={disabled || locationFilterDisabled}
                          checkPosition="right"
                          isOptionSelected={(option, value) =>
                            isScheduleJobsFilterAllOptionSelected(option, value)
                          }
                        />
                        <p className="text-[11px] text-muted-foreground">
                          {locationFilterDisabled
                            ? 'Controlled by the header location selector.'
                            : 'Organisation locations — same ids as Schedule Jobs.'}
                        </p>
                      </div>
                    </FieldSection>
                    <FieldSection title="Branch scope">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Assignment</label>
                        <MultiSelect
                          className="min-h-9 w-full"
                          options={BRANCH_SCOPE_OPTIONS.map((row) => ({
                            value: row.value,
                            label: row.label,
                          }))}
                          value={draft.branchScopeKinds}
                          onChange={(next) =>
                            setDraft((current) => ({
                              ...current,
                              branchScopeKinds: next as EmployeeBranchScopeKind[],
                            }))
                          }
                          placeholder="All scopes"
                          disabled={disabled}
                          checkPosition="right"
                        />
                      </div>
                    </FieldSection>
                  </div>
                ) : null}

                {group === 'job' ? (
                  <div className="space-y-6">
                    <FieldSection title="Role & title">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Role</label>
                        <MultiSelect
                          className="min-h-9 w-full"
                          options={roleOptions}
                          value={draft.roleIds}
                          onChange={(next) => setDraft((current) => ({ ...current, roleIds: next }))}
                          placeholder="All roles"
                          searchPlaceholder="Search roles…"
                          disabled={disabled}
                          checkPosition="right"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Job title</label>
                        <MultiSelect
                          className="min-h-9 w-full"
                          options={jobTitleOptions}
                          value={draft.jobTitleIds}
                          onChange={(next) => setDraft((current) => ({ ...current, jobTitleIds: next }))}
                          placeholder="All job titles"
                          searchPlaceholder="Search job titles…"
                          disabled={disabled}
                          checkPosition="right"
                        />
                      </div>
                    </FieldSection>
                    <FieldSection title="Grade & employment">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Grade</label>
                        <MultiSelect
                          className="min-h-9 w-full"
                          options={gradeOptions}
                          value={draft.gradeIds}
                          onChange={(next) => setDraft((current) => ({ ...current, gradeIds: next }))}
                          placeholder="All grades"
                          searchPlaceholder="Search grades…"
                          disabled={disabled}
                          checkPosition="right"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Employment</label>
                        <MultiSelect
                          className="min-h-9 w-full"
                          options={contractTypeOptions}
                          value={draft.contractTypeIds}
                          onChange={(next) =>
                            setDraft((current) => ({ ...current, contractTypeIds: next }))
                          }
                          placeholder="All types"
                          searchPlaceholder="Search types…"
                          disabled={disabled}
                          checkPosition="right"
                        />
                      </div>
                    </FieldSection>
                  </div>
                ) : null}

                {group === 'status' ? (
                  <div className="space-y-6">
                    <FieldSection title="Employee status">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Status</label>
                        <MultiSelect
                          className="min-h-9 w-full"
                          options={withScheduleJobsFilterAllOption('All statuses', statusOptions)}
                          value={draft.allStatuses ? [] : draft.statusIds}
                          onChange={(next) => {
                            if (!next.length || next.includes(SCHEDULE_JOBS_FILTER_ALL_VALUE)) {
                              setDraft((current) => ({ ...current, allStatuses: true, statusIds: [] }))
                              return
                            }
                            setDraft((current) => ({
                              ...current,
                              allStatuses: false,
                              statusIds: normalizeScheduleJobsFilterChange(next),
                            }))
                          }}
                          placeholder={draft.allStatuses ? 'All statuses' : 'Select statuses'}
                          searchPlaceholder="Search statuses…"
                          disabled={disabled}
                          checkPosition="right"
                          isOptionSelected={(option, value) =>
                            option.value === SCHEDULE_JOBS_FILTER_ALL_VALUE
                              ? draft.allStatuses
                              : value.includes(option.value)
                          }
                        />
                      </div>
                    </FieldSection>
                    <FieldSection title="Compliance">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Compliance</label>
                        <Select
                          value={draft.compliance}
                          disabled={disabled}
                          onValueChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              compliance: value as StaffListComplianceFilter,
                            }))
                          }
                        >
                          <SelectTrigger className="h-9" data-testid="employee-compliance-filter">
                            <SelectValue placeholder="Compliance" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPLIANCE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </FieldSection>
                  </div>
                ) : null}

                {group === 'immigration' ? (
                  <div className="space-y-6">
                    <FieldSection title="Visa">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Immigration</label>
                        <MultiSelect
                          className="min-h-9 w-full"
                          options={immigrationOptions}
                          value={draft.visaTypeIds}
                          onChange={(next) => setDraft((current) => ({ ...current, visaTypeIds: next }))}
                          placeholder="All immigration"
                          searchPlaceholder="Search immigration…"
                          disabled={disabled}
                          checkPosition="right"
                        />
                      </div>
                    </FieldSection>
                    <FieldSection title="Location">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">In country</label>
                        <Select
                          value={draft.inCountry}
                          disabled={disabled}
                          onValueChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              inCountry: value as StaffListInCountryFilter,
                            }))
                          }
                        >
                          <SelectTrigger className="h-9" data-testid="employee-in-country-filter">
                            <SelectValue placeholder="In country" />
                          </SelectTrigger>
                          <SelectContent>
                            {IN_COUNTRY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </FieldSection>
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
                data-testid="employee-staff-filters-clear-draft"
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
                data-testid="employee-staff-filters-cancel"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={disabled}
                onClick={handleApply}
                data-testid="employee-staff-filters-save"
              >
                Apply filters ({draftCount})
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
