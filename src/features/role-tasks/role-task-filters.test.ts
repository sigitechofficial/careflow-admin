import { describe, expect, it } from 'vitest'
import {
  EMPTY_ROLE_TASK_FILTERS,
  applyRoleTaskFilters,
  countByStatus,
  hasActiveFilters,
  roleTaskFilterOptions,
} from '@/features/role-tasks/role-task-filters'
import type { RoleTask } from '@/features/role-tasks/types'

const task = (over: Partial<RoleTask>): RoleTask =>
  ({
    id: Math.random().toString(36),
    templateId: null,
    sourceType: null,
    title: 't',
    description: null,
    link: null,
    dueDate: '2026-11-19',
    dueState: 'today',
    status: 'OPEN',
    note: null,
    role: { id: 'r', name: 'Super Admin' },
    location: { id: 'bex', name: 'Bexley ISF - Bexley', label: 'London · Bexley' },
    startedAt: null,
    completedAt: null,
    completedByName: null,
    ...over,
  }) as RoleTask

describe('role task filters', () => {
  const open = [
    task({ dueState: 'overdue', sourceType: 'LEARNING_LATE_REVIEW', about: { kind: 'CARER', name: 'Priya Sharma' } }),
    task({ dueState: 'today', sourceType: 'CARER_SIGNUP', about: { kind: 'CARER', name: 'Phone Tester' } }),
    task({ dueState: 'upcoming', location: null }),
  ]

  it('filters To do by due state, type and branch', () => {
    expect(applyRoleTaskFilters(open, { ...EMPTY_ROLE_TASK_FILTERS, status: 'overdue' })).toHaveLength(1)
    expect(applyRoleTaskFilters(open, { ...EMPTY_ROLE_TASK_FILTERS, type: 'Care app sign-up' })).toHaveLength(1)
    expect(applyRoleTaskFilters(open, { ...EMPTY_ROLE_TASK_FILTERS, branch: 'none' })).toHaveLength(1)
    expect(countByStatus(open, 'today')).toBe(1)
  })

  it('filters Done by late or on time', () => {
    const done = [task({ status: 'DONE', dueState: null, completedLate: true }), task({ status: 'DONE', dueState: null })]
    expect(applyRoleTaskFilters(done, { ...EMPTY_ROLE_TASK_FILTERS, status: 'late' })).toHaveLength(1)
    expect(applyRoleTaskFilters(done, { ...EMPTY_ROLE_TASK_FILTERS, status: 'onTime' })).toHaveLength(1)
  })

  it('lists every type and every visible branch, and knows when filters are on', () => {
    const o = roleTaskFilterOptions([{ id: 'bex', label: 'London · Bexley' }])
    expect(o.types).toContain('Survey')
    expect(o.types).toContain('Certificate expiring or expired')
    expect(o.branches.map(b => b.label)).toEqual(['All branches (no branch set)', 'London · Bexley'])
    expect(hasActiveFilters(EMPTY_ROLE_TASK_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_ROLE_TASK_FILTERS, type: 'Survey' })).toBe(true)
  })
})
