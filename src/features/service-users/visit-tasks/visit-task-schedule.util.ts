import type {
  VisitPlanMonthlyDayMode,
  VisitPlanMonthlyOrdinal,
  VisitPlanRepeatUnit,
  VisitPlanScheduleFrequency,
} from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import {
  VISIT_PLAN_MONTHLY_ORDINALS,
  VISIT_PLAN_WEEKDAY_NAMES,
} from '@/features/service-users/visit-plan/visit-plan-constants'

export type VisitTaskSchedule = {
  daysOfWeek: number[]
  scheduleFrequency: VisitPlanScheduleFrequency
  repeatEvery: number
  repeatUnit: VisitPlanRepeatUnit
  timeCritical: boolean
  timeToleranceMinutes: number
  monthlyDayMode: VisitPlanMonthlyDayMode
  monthlyDaysOfMonth: number[]
  monthlyPatternOrdinal: VisitPlanMonthlyOrdinal | null
  monthlyPatternWeekday: number | null
}

export const DEFAULT_VISIT_TASK_SCHEDULE: VisitTaskSchedule = {
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  scheduleFrequency: 'DAILY',
  repeatEvery: 1,
  repeatUnit: 'DAYS',
  timeCritical: false,
  timeToleranceMinutes: 30,
  monthlyDayMode: 'BY_DATE',
  monthlyDaysOfMonth: [],
  monthlyPatternOrdinal: 'FIRST',
  monthlyPatternWeekday: 1,
}

function repeatUnitForFrequency(freq: VisitPlanScheduleFrequency): VisitPlanRepeatUnit {
  if (freq === 'MONTHLY') return 'MONTHS'
  if (freq === 'WEEKLY') return 'WEEKS'
  return 'DAYS'
}

export function mergeVisitTaskSchedule(
  input?: Partial<VisitTaskSchedule> | null,
): VisitTaskSchedule {
  const scheduleFrequency = input?.scheduleFrequency ?? DEFAULT_VISIT_TASK_SCHEDULE.scheduleFrequency
  const days =
    Array.isArray(input?.daysOfWeek) && input.daysOfWeek.length > 0
      ? [...new Set(input.daysOfWeek.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b)
      : [...DEFAULT_VISIT_TASK_SCHEDULE.daysOfWeek]

  return {
    daysOfWeek: days,
    scheduleFrequency,
    repeatEvery: Math.max(1, Math.min(365, Number(input?.repeatEvery) || 1)),
    repeatUnit: input?.repeatUnit ?? repeatUnitForFrequency(scheduleFrequency),
    timeCritical: input?.timeCritical ?? DEFAULT_VISIT_TASK_SCHEDULE.timeCritical,
    timeToleranceMinutes: Math.max(
      0,
      Math.min(
        240,
        Number(input?.timeToleranceMinutes) ?? DEFAULT_VISIT_TASK_SCHEDULE.timeToleranceMinutes,
      ),
    ),
    monthlyDayMode: input?.monthlyDayMode ?? DEFAULT_VISIT_TASK_SCHEDULE.monthlyDayMode,
    monthlyDaysOfMonth: Array.isArray(input?.monthlyDaysOfMonth)
      ? [...new Set(input.monthlyDaysOfMonth.filter((d) => d >= 1 && d <= 31))].sort((a, b) => a - b)
      : [],
    monthlyPatternOrdinal:
      input?.monthlyPatternOrdinal ?? DEFAULT_VISIT_TASK_SCHEDULE.monthlyPatternOrdinal,
    monthlyPatternWeekday:
      input?.monthlyPatternWeekday !== undefined && input.monthlyPatternWeekday !== null
        ? input.monthlyPatternWeekday
        : DEFAULT_VISIT_TASK_SCHEDULE.monthlyPatternWeekday,
  }
}

export function visitTaskFrequencyLabel(
  frequency: VisitPlanScheduleFrequency,
): 'Daily' | 'Weekly' | 'Monthly' {
  if (frequency === 'WEEKLY') return 'Weekly'
  if (frequency === 'MONTHLY') return 'Monthly'
  return 'Daily'
}

/** Weekdays or monthly dates/pattern for display next to Daily/Weekly/Monthly. */
export function formatVisitTaskScheduleDetail(schedule: VisitTaskSchedule): string {
  if (schedule.scheduleFrequency === 'MONTHLY') {
    if (schedule.monthlyDayMode === 'BY_PATTERN') {
      const ordinal =
        VISIT_PLAN_MONTHLY_ORDINALS.find((o) => o.value === schedule.monthlyPatternOrdinal)?.label ??
        'First'
      const weekday = VISIT_PLAN_WEEKDAY_NAMES[schedule.monthlyPatternWeekday ?? 1] ?? 'Monday'
      return `${ordinal} ${weekday}`
    }
    if (!schedule.monthlyDaysOfMonth.length) return 'No dates selected'
    return schedule.monthlyDaysOfMonth.map((d) => String(d).padStart(2, '0')).join(', ')
  }

  if (!schedule.daysOfWeek.length) return 'No days selected'
  if (schedule.daysOfWeek.length === 7) return 'Every day'
  return schedule.daysOfWeek.map((d) => VISIT_PLAN_DAY_LABELS[d]).join(', ')
}

/** Compact badge text e.g. "Weekly · Mon, Wed" or "Monthly · 01, 15". */
export function formatVisitTaskScheduleSummary(schedule: VisitTaskSchedule): string {
  const frequency = visitTaskFrequencyLabel(schedule.scheduleFrequency)
  const detail = formatVisitTaskScheduleDetail(schedule)
  const every =
    schedule.repeatEvery > 1
      ? ` · every ${schedule.repeatEvery} ${
          schedule.scheduleFrequency === 'MONTHLY'
            ? 'months'
            : schedule.scheduleFrequency === 'WEEKLY'
              ? 'weeks'
              : 'days'
        }`
      : ''
  return `${frequency}${every} · ${detail}`
}
