export const SCHEDULE_JOBS_FILTER_ALL_VALUE = '__all__'

export function withScheduleJobsFilterAllOption(
  label: string,
  options: Array<{ value: string; label: string }>,
) {
  return [{ value: SCHEDULE_JOBS_FILTER_ALL_VALUE, label }, ...options]
}

export function isScheduleJobsFilterAllOptionSelected(
  option: { value: string },
  value: string[],
) {
  if (option.value === SCHEDULE_JOBS_FILTER_ALL_VALUE) return value.length === 0
  return value.includes(option.value)
}

export function normalizeScheduleJobsFilterChange(next: string[]): string[] {
  if (!next.length || next.includes(SCHEDULE_JOBS_FILTER_ALL_VALUE)) return []
  return next.filter((value) => value !== SCHEDULE_JOBS_FILTER_ALL_VALUE)
}
