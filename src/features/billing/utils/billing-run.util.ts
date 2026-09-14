import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import {
  currentOpsMonth,
  salaryMonthDateRange,
  shiftSalaryMonth,
} from '@/features/billing/utils/salary-period.util'

/** Latest full Mon–Sun week in the organisation operational timezone. */
export function defaultBillingWeekRange(): { periodStart: string; periodEnd: string } {
  const [y, m, d] = operationalTodayIso().split('-').map(Number)
  const cal = new Date(Date.UTC(y, m - 1, d))
  cal.setUTCDate(cal.getUTCDate() - cal.getUTCDay())
  const periodEnd = cal.toISOString().slice(0, 10)
  cal.setUTCDate(cal.getUTCDate() - 6)
  return { periodStart: cal.toISOString().slice(0, 10), periodEnd }
}

/** Previous full calendar month in the organisation operational timezone. */
export function defaultBillingMonthRange(): { periodStart: string; periodEnd: string } {
  return salaryMonthDateRange(shiftSalaryMonth(currentOpsMonth(), -1))
}
