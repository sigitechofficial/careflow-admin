import { describe, expect, it } from 'vitest'
import {
  isScheduleJobsFilterAllOptionSelected,
  normalizeScheduleJobsFilterChange,
  SCHEDULE_JOBS_FILTER_ALL_VALUE,
  withScheduleJobsFilterAllOption,
} from './schedule-jobs-multi-filter.util'

describe('schedule-jobs-multi-filter.util', () => {
  it('prepends an All option', () => {
    expect(
      withScheduleJobsFilterAllOption('All branches (5)', [{ value: 'a', label: 'Branch A' }]),
    ).toEqual([
      { value: SCHEDULE_JOBS_FILTER_ALL_VALUE, label: 'All branches (5)' },
      { value: 'a', label: 'Branch A' },
    ])
  })

  it('treats empty selection as All', () => {
    const allOption = { value: SCHEDULE_JOBS_FILTER_ALL_VALUE, label: 'All' }
    expect(isScheduleJobsFilterAllOptionSelected(allOption, [])).toBe(true)
    expect(isScheduleJobsFilterAllOptionSelected(allOption, ['branch-1'])).toBe(false)
    expect(isScheduleJobsFilterAllOptionSelected({ value: 'branch-1' }, [])).toBe(false)
  })

  it('normalizes All selection to empty filters', () => {
    expect(normalizeScheduleJobsFilterChange([])).toEqual([])
    expect(normalizeScheduleJobsFilterChange([SCHEDULE_JOBS_FILTER_ALL_VALUE])).toEqual([])
    expect(normalizeScheduleJobsFilterChange(['branch-1', SCHEDULE_JOBS_FILTER_ALL_VALUE])).toEqual([])
    expect(normalizeScheduleJobsFilterChange(['branch-1', 'branch-2'])).toEqual(['branch-1', 'branch-2'])
  })
})
