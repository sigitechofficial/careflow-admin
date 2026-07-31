import * as React from 'react'
import { Search, X, ChevronDown, Filter } from 'lucide-react'
import type { EmployeeLookupsBundle, EmployeeListFacets } from '@/features/employees/api'
import type { EmployeeVisaType } from '@/features/settings/types'
import {
  type StaffListComplianceFilter,
  type StaffListFiltersState,
  type StaffListInCountryFilter,
  staffListFilterChips,
  hasStaffListFilters,
  DEFAULT_STAFF_LIST_FILTERS,
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
import { Input } from '@/shared/ui/input'
import { FormField } from '@/shared/ui/form-field'
import { MultiSelect, type MultiSelectOption } from '@/shared/ui/multi-select'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'

type Props = {
  lookups: EmployeeLookupsBundle | null
  visaTypes: EmployeeVisaType[]
  facets: EmployeeListFacets | null
  filters: StaffListFiltersState
  onFiltersChange: (next: StaffListFiltersState) => void
  searchInput: string
  onSearchInputChange: (value: string) => void
  disabled?: boolean
}

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

const filterGridClassName =
  'grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3'
const filterControlClassName =
  'rounded-lg border border-border bg-background px-3 py-1.5'
const filterComboboxClassName =
  'min-h-10 h-10 w-full min-w-0 border-0 bg-transparent px-0 py-1.5 text-sm shadow-none focus:outline-none focus:ring-0 focus:ring-offset-0 hover:border-transparent'
const filterSelectClassName =
  'h-10 w-full rounded-md border-0 bg-transparent px-0 text-sm focus:outline-none focus:ring-0'

type StaffListFilterFieldProps = {
  label: string
  hint?: string
  className?: string
  children: (anchorRef: React.RefObject<HTMLDivElement | null>) => React.ReactNode
}

function StaffListFilterField({ label, hint, className, children }: StaffListFilterFieldProps) {
  const anchorRef = React.useRef<HTMLDivElement>(null)
  return (
    <FormField label={label} hint={hint} className={cn('min-w-0', className)}>
      <div ref={anchorRef} className={filterControlClassName}>
        {children(anchorRef)}
      </div>
    </FormField>
  )
}

function formatMultiSelectCountSummary(
  selected: MultiSelectOption[],
  countLabel: string,
): MultiSelectOption[] {
  if (selected.length <= 1) return selected
  return [{ value: '__summary__', label: `${selected.length} ${countLabel}` }]
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
}: Props) {
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
    () => staffListFacetOptions(lookups?.roles ?? [], facets?.roles, filters.roleIds),
    [lookups?.roles, facets?.roles, filters.roleIds],
  )
  const jobTitleOptions = React.useMemo(
    () => staffListFacetOptions(lookups?.jobTitles ?? [], facets?.jobTitles, filters.jobTitleIds),
    [lookups?.jobTitles, facets?.jobTitles, filters.jobTitleIds],
  )
  const gradeOptions = React.useMemo(
    () => staffListFacetOptions(lookups?.grades ?? [], facets?.grades, filters.gradeIds),
    [lookups?.grades, facets?.grades, filters.gradeIds],
  )
  const contractTypeOptions = React.useMemo(
    () =>
      staffListFacetOptions(lookups?.contractTypes ?? [], facets?.contractTypes, filters.contractTypeIds),
    [lookups?.contractTypes, facets?.contractTypes, filters.contractTypeIds],
  )
  const statusOptions = React.useMemo(
    () =>
      staffListFacetOptions(
        lookups?.employeeStatuses ?? [],
        facets?.statuses,
        filters.statusIds,
      ),
    [lookups?.employeeStatuses, facets?.statuses, filters.statusIds],
  )
  const immigrationOptions = React.useMemo(
    () => staffListVisaFacetOptions(visaTypes, facets?.visaTypes, filters.visaTypeIds),
    [visaTypes, facets?.visaTypes, filters.visaTypeIds],
  )

  const visaLabelMap = React.useMemo(
    () => new Map(visaTypes.map((row) => [row.id, row.label])),
    [visaTypes],
  )

  const chips = staffListFilterChips(filters, lookups, onFiltersChange, visaLabelMap)
  const showClearAll = hasStaffListFilters(filters)
  const filtersActive = showClearAll || searchInput.trim().length > 0
  const summaryParts = [
    filtersActive ? 'Filters active' : null,
    chips.length > 0 ? `${chips.length} applied` : null,
  ].filter(Boolean)

  return (
    <div className="space-y-3" data-testid="employee-staff-list-filters">
      <details className="group rounded-lg border border-border bg-card">
        <summary
          className={cn(
            'flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-muted/30',
            '[&::-webkit-details-marker]:hidden',
          )}
        >
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden
          />
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="font-medium text-foreground">Filters</span>
          {summaryParts.length > 0 ? (
            <span className="truncate text-xs text-muted-foreground">{summaryParts.join(' · ')}</span>
          ) : null}
        </summary>

        <div className="space-y-3 border-t border-border/60 bg-muted/10 p-3">
          <div className={filterGridClassName}>
        <FormField label="Search" className="min-w-0 sm:col-span-2">
          <div className={cn(filterControlClassName, 'flex items-center gap-2')}>
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              placeholder="Search name, email, username"
              disabled={disabled}
              className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              data-testid="employee-staff-search"
            />
          </div>
        </FormField>

        <StaffListFilterField
          label="Branch"
          hint="Organisation locations — same ids as Schedule Jobs"
        >
          {(anchorRef) => (
            <MultiSelect
              popoverAnchorRef={anchorRef}
              options={branchOptions}
              value={filters.locationIds}
              onChange={(next) =>
                onFiltersChange({
                  ...filters,
                  locationIds: normalizeScheduleJobsFilterChange(next),
                })
              }
              placeholder="All branches"
              searchPlaceholder="Search branches…"
              disabled={disabled}
              checkPosition="right"
              className={filterComboboxClassName}
              isOptionSelected={(option, value) =>
                isScheduleJobsFilterAllOptionSelected(option, value)
              }
              formatSelectedOptions={(selected) => formatMultiSelectCountSummary(selected, 'branches')}
              onRemoveOption={(option, value) =>
                option.value === '__summary__' ? [] : value.filter((id) => id !== option.value)
              }
            />
          )}
        </StaffListFilterField>

        <StaffListFilterField label="Role">
          {(anchorRef) => (
            <MultiSelect
              popoverAnchorRef={anchorRef}
              options={roleOptions}
              value={filters.roleIds}
              onChange={(next) => onFiltersChange({ ...filters, roleIds: next })}
              placeholder="All roles"
              searchPlaceholder="Search roles…"
              disabled={disabled}
              checkPosition="right"
              className={filterComboboxClassName}
              formatSelectedOptions={(selected) => formatMultiSelectCountSummary(selected, 'roles')}
              onRemoveOption={(option, value) =>
                option.value === '__summary__' ? [] : value.filter((id) => id !== option.value)
              }
            />
          )}
        </StaffListFilterField>

        <StaffListFilterField label="Job title">
          {(anchorRef) => (
            <MultiSelect
              popoverAnchorRef={anchorRef}
              options={jobTitleOptions}
              value={filters.jobTitleIds}
              onChange={(next) => onFiltersChange({ ...filters, jobTitleIds: next })}
              placeholder="All job titles"
              searchPlaceholder="Search job titles…"
              disabled={disabled}
              checkPosition="right"
              className={filterComboboxClassName}
              formatSelectedOptions={(selected) => formatMultiSelectCountSummary(selected, 'job titles')}
              onRemoveOption={(option, value) =>
                option.value === '__summary__' ? [] : value.filter((id) => id !== option.value)
              }
            />
          )}
        </StaffListFilterField>

        <StaffListFilterField label="Grade">
          {(anchorRef) => (
            <MultiSelect
              popoverAnchorRef={anchorRef}
              options={gradeOptions}
              value={filters.gradeIds}
              onChange={(next) => onFiltersChange({ ...filters, gradeIds: next })}
              placeholder="All grades"
              searchPlaceholder="Search grades…"
              disabled={disabled}
              checkPosition="right"
              className={filterComboboxClassName}
              formatSelectedOptions={(selected) => formatMultiSelectCountSummary(selected, 'grades')}
              onRemoveOption={(option, value) =>
                option.value === '__summary__' ? [] : value.filter((id) => id !== option.value)
              }
            />
          )}
        </StaffListFilterField>

        <StaffListFilterField label="Employment">
          {(anchorRef) => (
            <MultiSelect
              popoverAnchorRef={anchorRef}
              options={contractTypeOptions}
              value={filters.contractTypeIds}
              onChange={(next) => onFiltersChange({ ...filters, contractTypeIds: next })}
              placeholder="All types"
              searchPlaceholder="Search types…"
              disabled={disabled}
              checkPosition="right"
              className={filterComboboxClassName}
              formatSelectedOptions={(selected) => formatMultiSelectCountSummary(selected, 'types')}
              onRemoveOption={(option, value) =>
                option.value === '__summary__' ? [] : value.filter((id) => id !== option.value)
              }
            />
          )}
        </StaffListFilterField>

        <StaffListFilterField label="Status">
          {(anchorRef) => (
            <MultiSelect
              popoverAnchorRef={anchorRef}
              options={withScheduleJobsFilterAllOption(
                'All statuses',
                statusOptions,
              )}
              value={filters.allStatuses ? [] : filters.statusIds}
              onChange={(next) => {
                if (!next.length || next.includes(SCHEDULE_JOBS_FILTER_ALL_VALUE)) {
                  onFiltersChange({ ...filters, allStatuses: true, statusIds: [] })
                  return
                }
                onFiltersChange({
                  ...filters,
                  allStatuses: false,
                  statusIds: normalizeScheduleJobsFilterChange(next),
                })
              }}
              placeholder={filters.allStatuses ? 'All statuses' : 'Select statuses'}
              searchPlaceholder="Search statuses…"
              disabled={disabled}
              checkPosition="right"
              className={filterComboboxClassName}
              isOptionSelected={(option, value) =>
                option.value === SCHEDULE_JOBS_FILTER_ALL_VALUE
                  ? filters.allStatuses
                  : value.includes(option.value)
              }
              formatSelectedOptions={(selected) =>
                formatMultiSelectCountSummary(selected, 'statuses')
              }
              onRemoveOption={(option, value) =>
                option.value === '__summary__' || option.value === SCHEDULE_JOBS_FILTER_ALL_VALUE
                  ? []
                  : value.filter((id) => id !== option.value)
              }
            />
          )}
        </StaffListFilterField>

        <StaffListFilterField label="Immigration">
          {(anchorRef) => (
            <MultiSelect
              popoverAnchorRef={anchorRef}
              options={immigrationOptions}
              value={filters.visaTypeIds}
              onChange={(next) => onFiltersChange({ ...filters, visaTypeIds: next })}
              placeholder="All immigration"
              searchPlaceholder="Search immigration…"
              disabled={disabled}
              checkPosition="right"
              className={filterComboboxClassName}
              formatSelectedOptions={(selected) =>
                formatMultiSelectCountSummary(selected, 'immigration types')
              }
              onRemoveOption={(option, value) =>
                option.value === '__summary__' ? [] : value.filter((id) => id !== option.value)
              }
            />
          )}
        </StaffListFilterField>

        <StaffListFilterField label="In country">
          {() => (
            <select
              value={filters.inCountry}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  inCountry: e.target.value as StaffListInCountryFilter,
                })
              }
              disabled={disabled}
              data-testid="employee-in-country-filter"
              className={filterSelectClassName}
            >
              {IN_COUNTRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          )}
        </StaffListFilterField>

        <StaffListFilterField label="Branch scope">
          {(anchorRef) => (
            <MultiSelect
              popoverAnchorRef={anchorRef}
              options={BRANCH_SCOPE_OPTIONS.map((row) => ({
                value: row.value,
                label: row.label,
              }))}
              value={filters.branchScopeKinds}
              onChange={(next) =>
                onFiltersChange({
                  ...filters,
                  branchScopeKinds: next as EmployeeBranchScopeKind[],
                })
              }
              placeholder="All scopes"
              disabled={disabled}
              checkPosition="right"
              className={filterComboboxClassName}
              formatSelectedOptions={(selected) => formatMultiSelectCountSummary(selected, 'scopes')}
              onRemoveOption={(option, value) =>
                option.value === '__summary__' ? [] : value.filter((id) => id !== option.value)
              }
            />
          )}
        </StaffListFilterField>

        <StaffListFilterField label="Compliance">
          {() => (
            <select
              value={filters.compliance}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  compliance: e.target.value as StaffListComplianceFilter,
                })
              }
              disabled={disabled}
              data-testid="employee-compliance-filter"
              className={filterSelectClassName}
            >
              {COMPLIANCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          )}
        </StaffListFilterField>
          </div>
        </div>
      </details>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                aria-label={`Remove filter ${chip.label}`}
                onClick={chip.onRemove}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </Badge>
          ))}
          {showClearAll ? (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              data-testid="employee-staff-clear-filters"
              onClick={() => onFiltersChange(DEFAULT_STAFF_LIST_FILTERS)}
            >
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
