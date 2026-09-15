import type { InvoiceRunRow } from '@/features/billing/api/invoice-runs.api'
import {
  currentOpsMonth,
  currentOpsWeek,
  salaryMonthDateRange,
  salaryWeekDateRange,
  shiftSalaryMonth,
  shiftSalaryWeek,
} from '@/features/billing/utils/salary-period.util'

export type InvoiceRunDatePreset =
  | 'all'
  | 'this-week'
  | 'previous-week'
  | 'this-month'
  | 'previous-month'
  | 'custom'

export function rangeForInvoiceRunDatePreset(
  preset: InvoiceRunDatePreset,
  custom?: { dateFrom?: string; dateTo?: string },
): { dateFrom?: string; dateTo?: string } {
  if (preset === 'this-week') return salaryWeekDateRange(currentOpsWeek())
  if (preset === 'previous-week') {
    return salaryWeekDateRange(shiftSalaryWeek(currentOpsWeek(), -1))
  }
  if (preset === 'this-month') return salaryMonthDateRange(currentOpsMonth())
  if (preset === 'previous-month') {
    return salaryMonthDateRange(shiftSalaryMonth(currentOpsMonth(), -1))
  }
  if (preset === 'custom') {
    return {
      dateFrom: custom?.dateFrom || undefined,
      dateTo: custom?.dateTo || undefined,
    }
  }
  return {}
}

/** Keep runs whose billing period overlaps the selected date range. */
export function invoiceRunOverlapsDateRange(
  row: Pick<InvoiceRunRow, 'periodStart' | 'periodEnd'>,
  dateFrom?: string,
  dateTo?: string,
): boolean {
  if (!dateFrom && !dateTo) return true
  if (dateFrom && row.periodEnd < dateFrom) return false
  if (dateTo && row.periodStart > dateTo) return false
  return true
}
