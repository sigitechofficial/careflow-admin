import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import {
  EMPTY_ROLE_TASK_FILTERS,
  applyRoleTaskFilters,
  countByStatus,
  hasActiveFilters,
  roleTaskFilterOptions,
  type RoleTaskFilters,
} from '@/features/role-tasks/role-task-filters'
import type { RoleTask } from '@/features/role-tasks/types'

const OPEN_CHIPS = [
  { key: 'all', label: 'All', tone: '' },
  { key: 'overdue', label: 'Overdue', tone: 'text-destructive' },
  { key: 'today', label: 'Due today', tone: '' },
  { key: 'upcoming', label: 'Coming up', tone: '' },
] as const

const DONE_CHIPS = [
  { key: 'all', label: 'All', tone: '' },
  { key: 'late', label: 'Done late', tone: 'text-amber-700 dark:text-amber-300' },
  { key: 'onTime', label: 'Done on time', tone: '' },
] as const

function FilterSelect({
  label,
  value,
  onChange,
  options,
  testId,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  testId: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto min-w-36 gap-1 text-xs" aria-label={label} data-testid={testId}>
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * My tasks filters (19 Nov 2026): status chips with counts (To do: overdue / today / coming up;
 * Done: late / on time) and Type and Branch dropdowns listing every type and every branch you can see.
 */
export function MyTasksFilterBar({
  tab,
  tasks,
  branches,
  filters,
  onChange,
  shown,
}: {
  tab: 'open' | 'done'
  tasks: RoleTask[]
  /** Every branch the user can see. */
  branches?: Array<{ id: string; label: string }>
  filters: RoleTaskFilters
  onChange: (f: RoleTaskFilters) => void
  shown: number
}) {
  const options = React.useMemo(() => roleTaskFilterOptions(branches), [branches])
  // Chip counts follow the other filters, so they always match what a click would show.
  const forChips = React.useMemo(() => applyRoleTaskFilters(tasks, filters, { ignoreStatus: true }), [tasks, filters])
  const chips = tab === 'open' ? OPEN_CHIPS : DONE_CHIPS
  const set = (patch: Partial<RoleTaskFilters>) => onChange({ ...filters, ...patch })

  return (
    <div className="space-y-2" data-testid="my-tasks-filters">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        {chips.map(c => {
          const active = filters.status === c.key
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => set({ status: c.key })}
              aria-pressed={active}
              data-testid={`my-tasks-chip-${c.key}`}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active ? 'border-foreground bg-foreground/5' : 'border-border hover:bg-muted',
                c.tone,
              )}
            >
              {c.label} {countByStatus(forChips, c.key)}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Type"
          value={filters.type}
          onChange={v => set({ type: v })}
          options={options.types.map(t => ({ value: t, label: t }))}
          testId="my-tasks-filter-type"
        />
        <FilterSelect
          label="Branch"
          value={filters.branch}
          onChange={v => set({ branch: v })}
          options={options.branches.map(b => ({ value: b.id, label: b.label }))}
          testId="my-tasks-filter-branch"
        />
        {hasActiveFilters(filters) ? (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => onChange(EMPTY_ROLE_TASK_FILTERS)}
            data-testid="my-tasks-clear-filters"
          >
            Clear filters
          </button>
        ) : null}
        {hasActiveFilters(filters) ? (
          <span className="text-xs text-muted-foreground" data-testid="my-tasks-showing">
            Showing {shown} of {tasks.length} tasks
          </span>
        ) : null}
      </div>
    </div>
  )
}
