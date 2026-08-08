import * as React from 'react'
import { MultiSelect, type MultiSelectOption } from '@/shared/ui/multi-select'
import {
  isScheduleJobsFilterAllOptionSelected,
  normalizeScheduleJobsFilterChange,
  SCHEDULE_JOBS_FILTER_ALL_VALUE,
  withScheduleJobsFilterAllOption,
} from '@/features/scheduling/utils/schedule-jobs-multi-filter.util'
import {
  scheduleJobsRequiredCarersFiltersLabel,
  type ScheduleJobsRequiredCarersFilterValue,
} from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'
import {
  SchedulePeriodDayToolbar,
  type SchedulePeriodDayToolbarPeriodProps,
} from '@/features/scheduling/components/schedule-filters/SchedulePeriodDayToolbar'
import { ScheduleJobsDateControls } from '@/features/scheduling/components/schedule-jobs/ScheduleJobsDateControls'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { shiftIsoDate } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { todayIso } from '@/features/scheduling/utils/scheduling-format'

export type ScheduleFilterBarBranchOption = {
  id: string
  label: string
  displayLabel?: string
}

export type ScheduleFilterBarNamedOption = {
  id: string
  label: string
}

export type ScheduleFilterBarPeriodProps = SchedulePeriodDayToolbarPeriodProps

export type ScheduleFilterBarProps = {
  date: string
  onDateChange?: (isoDate: string) => void
  /** ECM-style operational period (preferred over single-day controls). */
  period?: ScheduleFilterBarPeriodProps
  locationIds: string[]
  branchFilterOptions: ScheduleFilterBarBranchOption[]
  allBranchesLabel?: string
  onLocationChange: (locationIds: string[]) => void
  locationFilterDisabled?: boolean
  serviceUserIds: string[]
  serviceUsers: ScheduleFilterBarNamedOption[]
  allServiceUsersLabel?: string
  onServiceUserChange: (serviceUserIds: string[]) => void
  employeeIds: string[]
  carers: ScheduleFilterBarNamedOption[]
  allCarersLabel?: string
  onEmployeeChange: (employeeIds: string[]) => void
  requiredCarersFilters: ScheduleJobsRequiredCarersFilterValue[]
  requiredCarersOptions?: Array<{ value: string; label: string; description?: string }>
  allVisitsLabel?: string
  onRequiredCarersFiltersChange: (filters: ScheduleJobsRequiredCarersFilterValue[]) => void
  showRequiredCarersFilter?: boolean
  onClearFilters?: () => void
  className?: string
  /**
   * Single-day prev/next/today + calendar picker.
   * Shown alongside operational period when both are provided.
   */
  showDateControls?: boolean
}

const DEFAULT_REQUIRED_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '1', label: 'Single carer' },
  { value: '2', label: 'Double up (2 carers)' },
  { value: '3plus', label: '3+ carers' },
]

function formatMultiSelectCountSummary(
  selected: MultiSelectOption[],
  countLabel: string,
): MultiSelectOption[] {
  if (selected.length <= 1) return selected
  return [{ value: '__summary__', label: `${selected.length} ${countLabel}` }]
}

function removeMultiSelectOption(option: MultiSelectOption, current: string[]): string[] {
  if (option.value === '__summary__' || option.value === SCHEDULE_JOBS_FILTER_ALL_VALUE) return []
  return current.filter((id) => id !== option.value)
}

export function ScheduleFilterBar({
  date,
  onDateChange,
  period,
  locationIds,
  branchFilterOptions,
  allBranchesLabel = 'All branches',
  onLocationChange,
  locationFilterDisabled = false,
  serviceUserIds,
  serviceUsers,
  allServiceUsersLabel = 'All service users',
  onServiceUserChange,
  employeeIds,
  carers,
  allCarersLabel = 'All carers',
  onEmployeeChange,
  requiredCarersFilters,
  requiredCarersOptions = DEFAULT_REQUIRED_OPTIONS,
  allVisitsLabel = 'All visits',
  onRequiredCarersFiltersChange,
  showRequiredCarersFilter = true,
  onClearFilters,
  className,
  showDateControls = true,
}: ScheduleFilterBarProps) {
  const fieldClassName = 'flex min-w-[12rem] flex-1 flex-col gap-1'
  const labelClassName = 'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'
  const comboboxClassName = 'w-full'

  const branchComboboxOptions = React.useMemo(
    () =>
      withScheduleJobsFilterAllOption(
        allBranchesLabel,
        branchFilterOptions.map((option) => ({ value: option.id, label: option.label })),
      ),
    [allBranchesLabel, branchFilterOptions],
  )

  const serviceUserMultiOptions = React.useMemo(
    () =>
      withScheduleJobsFilterAllOption(
        allServiceUsersLabel,
        serviceUsers.map((option) => ({ value: option.id, label: option.label })),
      ),
    [allServiceUsersLabel, serviceUsers],
  )

  const carerMultiOptions = React.useMemo(
    () =>
      withScheduleJobsFilterAllOption(
        allCarersLabel,
        carers.map((option) => ({ value: option.id, label: option.label })),
      ),
    [allCarersLabel, carers],
  )

  const requiredCarersMultiOptions = React.useMemo(
    () =>
      withScheduleJobsFilterAllOption(
        allVisitsLabel,
        requiredCarersOptions.map((option) => ({
          value: option.value,
          label: option.label,
        })),
      ),
    [allVisitsLabel, requiredCarersOptions],
  )

  const formatBranchTriggerOptions = React.useCallback(
    (selected: MultiSelectOption[]) => {
      if (selected.length <= 1) {
        if (selected.length === 1) {
          const option = branchFilterOptions.find((row) => row.id === selected[0]?.value)
          if (option?.displayLabel) {
            return [{ value: selected[0]!.value, label: option.displayLabel }]
          }
        }
        return selected
      }
      return [{ value: '__summary__', label: `${selected.length} branches` }]
    },
    [branchFilterOptions],
  )

  const hasActiveFilters =
    locationIds.length > 0 ||
    serviceUserIds.length > 0 ||
    employeeIds.length > 0 ||
    requiredCarersFilters.length > 0

  return (
    <div
      className={cn(
        'space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4',
        className,
      )}
      data-testid="schedule-filter-bar"
    >
      {period && onDateChange ? (
        <SchedulePeriodDayToolbar
          {...period}
          date={date}
          onDateChange={onDateChange}
          onPrevDay={() => onDateChange(shiftIsoDate(date, -1))}
          onNextDay={() => onDateChange(shiftIsoDate(date, 1))}
          onToday={() => onDateChange(todayIso())}
        />
      ) : showDateControls && onDateChange ? (
        <ScheduleJobsDateControls
          date={date}
          onPrevDay={() => onDateChange(shiftIsoDate(date, -1))}
          onNextDay={() => onDateChange(shiftIsoDate(date, 1))}
          onToday={() => onDateChange(todayIso())}
          onDateChange={onDateChange}
        />
      ) : null}

      <div className="flex flex-wrap items-stretch gap-3">
        <div className={fieldClassName}>
          <span className={labelClassName}>Branch</span>
          <div data-testid="schedule-filter-branch" className="min-w-0 flex-1">
            <MultiSelect
              options={branchComboboxOptions}
              value={locationIds}
              onChange={(next) => onLocationChange(normalizeScheduleJobsFilterChange(next))}
              placeholder={allBranchesLabel}
              searchPlaceholder="Search branches…"
              disabled={locationFilterDisabled || branchFilterOptions.length === 0}
              checkPosition="right"
              isOptionSelected={isScheduleJobsFilterAllOptionSelected}
              formatSelectedOptions={formatBranchTriggerOptions}
              onRemoveOption={removeMultiSelectOption}
              className={comboboxClassName}
            />
          </div>
        </div>

        <div className={fieldClassName}>
          <span className={labelClassName}>Service user</span>
          <div data-testid="schedule-filter-service-user" className="min-w-0 flex-1">
            <MultiSelect
              options={serviceUserMultiOptions}
              value={serviceUserIds}
              onChange={(next) => onServiceUserChange(normalizeScheduleJobsFilterChange(next))}
              placeholder={allServiceUsersLabel}
              searchPlaceholder="Search service users…"
              disabled={serviceUsers.length === 0}
              checkPosition="right"
              isOptionSelected={isScheduleJobsFilterAllOptionSelected}
              formatSelectedOptions={(selected) =>
                formatMultiSelectCountSummary(selected, 'service users')
              }
              onRemoveOption={removeMultiSelectOption}
              className={comboboxClassName}
            />
          </div>
        </div>

        <div className={fieldClassName}>
          <span className={labelClassName}>Carer</span>
          <div data-testid="schedule-filter-carer" className="min-w-0 flex-1">
            <MultiSelect
              options={carerMultiOptions}
              value={employeeIds}
              onChange={(next) => onEmployeeChange(normalizeScheduleJobsFilterChange(next))}
              placeholder={allCarersLabel}
              searchPlaceholder="Search carers…"
              disabled={carers.length === 0}
              checkPosition="right"
              isOptionSelected={isScheduleJobsFilterAllOptionSelected}
              formatSelectedOptions={(selected) =>
                formatMultiSelectCountSummary(selected, 'carers')
              }
              onRemoveOption={removeMultiSelectOption}
              className={comboboxClassName}
            />
          </div>
        </div>

        {showRequiredCarersFilter ? (
          <div className={fieldClassName}>
            <span className={labelClassName}>Carers required</span>
            <div data-testid="schedule-filter-required-carers" className="min-w-0 flex-1">
              <MultiSelect
                options={requiredCarersMultiOptions}
                value={requiredCarersFilters}
                onChange={(next) =>
                  onRequiredCarersFiltersChange(
                    normalizeScheduleJobsFilterChange(next).filter(
                      (value): value is ScheduleJobsRequiredCarersFilterValue =>
                        value === '1' || value === '2' || value === '3plus',
                    ),
                  )
                }
                placeholder={
                  requiredCarersFilters.length
                    ? scheduleJobsRequiredCarersFiltersLabel(requiredCarersFilters)
                    : allVisitsLabel
                }
                searchPlaceholder="Filter by carers required…"
                checkPosition="right"
                isOptionSelected={isScheduleJobsFilterAllOptionSelected}
                formatSelectedOptions={(selected) =>
                  formatMultiSelectCountSummary(selected, 'carer types')
                }
                onRemoveOption={(option, current) =>
                  removeMultiSelectOption(option, current).filter(
                    (value): value is ScheduleJobsRequiredCarersFilterValue =>
                      value === '1' || value === '2' || value === '3plus',
                  )
                }
                className={comboboxClassName}
              />
            </div>
          </div>
        ) : null}
      </div>

      {hasActiveFilters && onClearFilters ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2">
          <p className="text-xs text-muted-foreground">
            {[
              locationIds.length ? `${locationIds.length} branch(es)` : null,
              serviceUserIds.length ? `${serviceUserIds.length} service user(s)` : null,
              employeeIds.length ? `${employeeIds.length} carer(s)` : null,
              requiredCarersFilters.length
                ? scheduleJobsRequiredCarersFiltersLabel(requiredCarersFilters)
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <Button type="button" size="sm" variant="ghost" className="h-8" onClick={onClearFilters}>
            Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  )
}
