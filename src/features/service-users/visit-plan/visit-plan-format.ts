import {
  VISIT_PLAN_ANALYSIS_AREAS,
  VISIT_PLAN_MONTHLY_ORDINALS,
  VISIT_PLAN_SCHEDULE_FREQUENCIES,
  VISIT_PLAN_WEEKDAY_NAMES,
} from '@/features/service-users/visit-plan/visit-plan-constants'
import { VISIT_PLAN_DAY_LABELS, type VisitPlanSlot } from '@/features/service-users/visit-plan/types'

export function formatVisitPlanFrequency(slot: VisitPlanSlot): string {
  const freq =
    VISIT_PLAN_SCHEDULE_FREQUENCIES.find((f) => f.value === slot.scheduleFrequency)?.label ?? slot.scheduleFrequency
  const unit =
    slot.repeatUnit === 'MONTHS' ? 'month' : slot.repeatUnit === 'WEEKS' ? 'week' : 'day'
  const plural = slot.repeatEvery === 1 ? unit : `${unit}s`
  return `Every ${slot.repeatEvery} ${plural} (${freq})`
}

export function formatMonthlyDays(slot: VisitPlanSlot): string {
  if (slot.scheduleFrequency !== 'MONTHLY') return '—'
  if (slot.monthlyDayMode === 'BY_DATE') {
    if (!slot.monthlyDaysOfMonth.length) return 'No days selected'
    return slot.monthlyDaysOfMonth.map((d) => String(d).padStart(2, '0')).join(', ')
  }
  const ordinal =
    VISIT_PLAN_MONTHLY_ORDINALS.find((o) => o.value === slot.monthlyPatternOrdinal)?.label ?? 'First'
  const weekday = VISIT_PLAN_WEEKDAY_NAMES[slot.monthlyPatternWeekday ?? 1] ?? 'Monday'
  return `${ordinal} ${weekday} of month`
}

export function formatWeekdays(slot: VisitPlanSlot): string {
  if (!slot.daysOfWeek.length) return '—'
  return slot.daysOfWeek.map((d) => VISIT_PLAN_DAY_LABELS[d]).join(', ')
}

export function formatAnalysisArea(value: string | null): string {
  if (!value) return '—'
  return VISIT_PLAN_ANALYSIS_AREAS.find((a) => a.value === value)?.label ?? value
}

export function formatYesNo(value: boolean): string {
  return value ? 'Yes' : 'No'
}
