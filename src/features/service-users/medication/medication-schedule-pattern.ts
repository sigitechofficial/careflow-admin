import type { MedicationLookupRow } from '@/features/service-users/api/service-users.api'

export type SchedulePattern = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export const SCHEDULE_PATTERN_OPTIONS: { value: SchedulePattern; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
]

export const WEEKDAY_OPTIONS = [
  { value: 'MONDAY', label: 'Mon' },
  { value: 'TUESDAY', label: 'Tue' },
  { value: 'WEDNESDAY', label: 'Wed' },
  { value: 'THURSDAY', label: 'Thu' },
  { value: 'FRIDAY', label: 'Fri' },
  { value: 'SATURDAY', label: 'Sat' },
  { value: 'SUNDAY', label: 'Sun' },
] as const

export type WeekdayValue = (typeof WEEKDAY_OPTIONS)[number]['value']

export function resolveFrequencyIdForPattern(
  frequencies: MedicationLookupRow[],
  pattern: SchedulePattern,
  timesPerDay: number,
): string | undefined {
  const byCode = (code: string) => frequencies.find(f => f.code === code)?.id
  if (pattern === 'WEEKLY') return byCode('WEEKLY')
  if (pattern === 'MONTHLY') return byCode('MONTHLY')
  if (timesPerDay >= 5) return byCode('FIVE_TIMES_DAILY') ?? byCode('FOUR_TIMES_DAILY')
  if (timesPerDay === 4) return byCode('FOUR_TIMES_DAILY')
  if (timesPerDay === 3) return byCode('THREE_TIMES_DAILY')
  if (timesPerDay === 2) return byCode('TWICE_DAILY')
  return byCode('ONCE_DAILY') ?? byCode('EVERY_1_DAY')
}

export function defaultWeekdays(): WeekdayValue[] {
  return ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
}

export function schedulePatternLabel(pattern: SchedulePattern | null | undefined): string {
  const value = pattern ?? 'DAILY'
  return SCHEDULE_PATTERN_OPTIONS.find(o => o.value === value)?.label ?? 'Daily'
}

export function collectWeekdaysFromSchedules(
  schedules: { daysOfWeek?: string[] | null }[] | undefined,
): WeekdayValue[] {
  const selected = new Set<string>()
  for (const s of schedules ?? []) {
    for (const d of s.daysOfWeek ?? []) {
      if (WEEKDAY_OPTIONS.some(w => w.value === d)) selected.add(d)
    }
  }
  return WEEKDAY_OPTIONS.map(w => w.value).filter(v => selected.has(v))
}
