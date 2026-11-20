import { ALL_ROLE_TASK_TYPES, roleTaskTags } from '@/features/role-tasks/role-task-tags'
import type { RoleTask } from '@/features/role-tasks/types'

/** To do: by due state. Done: late or on time (19 Nov 2026). */
export type OpenStatusFilter = 'all' | 'overdue' | 'today' | 'upcoming'
export type DoneStatusFilter = 'all' | 'late' | 'onTime'

export type RoleTaskFilters = {
  status: OpenStatusFilter | DoneStatusFilter
  /** Type label from roleTaskTags, or 'all'. */
  type: string
  /** Location id, 'none' for all-branch tasks, or 'all'. */
  branch: string
}

export const EMPTY_ROLE_TASK_FILTERS: RoleTaskFilters = { status: 'all', type: 'all', branch: 'all' }

export function hasActiveFilters(f: RoleTaskFilters): boolean {
  return f.status !== 'all' || f.type !== 'all' || f.branch !== 'all'
}

function statusMatches(task: RoleTask, status: RoleTaskFilters['status']): boolean {
  switch (status) {
    case 'all':
      return true
    case 'overdue':
    case 'today':
    case 'upcoming':
      return task.dueState === status
    case 'late':
      return Boolean(task.completedLate)
    case 'onTime':
      return task.status === 'DONE' && !task.completedLate
  }
}

/** The same filters without the status one: chip counts show what each status would give. */
export function applyRoleTaskFilters(tasks: RoleTask[], f: RoleTaskFilters, opts: { ignoreStatus?: boolean } = {}) {
  return tasks.filter(t => {
    if (!opts.ignoreStatus && !statusMatches(t, f.status)) return false
    const tags = roleTaskTags(t)
    if (f.type !== 'all' && tags.type !== f.type) return false
    if (f.branch !== 'all' && (t.location?.id ?? 'none') !== f.branch) return false
    return true
  })
}

export function countByStatus(tasks: RoleTask[], status: RoleTaskFilters['status']): number {
  return tasks.filter(t => statusMatches(t, status)).length
}

/**
 * Filter options for every task, not only those listed now (19 Nov 2026): all task types, and
 * every branch the user can see (from the API), plus "All branches" for tasks with no branch.
 */
export function roleTaskFilterOptions(branches: Array<{ id: string; label: string }> = []) {
  return {
    types: [...ALL_ROLE_TASK_TYPES].sort((a, b) => a.localeCompare(b)),
    branches: [{ id: 'none', label: 'All branches (no branch set)' }, ...branches],
  }
}
