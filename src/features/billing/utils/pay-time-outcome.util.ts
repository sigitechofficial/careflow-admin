import type { ToastVariant } from '@/store/toast.store'

/** What a request to change a visit's payable time did, as the server reports it. */
export type PayTimeEdit = {
  outcome: 'PAY_TIME_CHANGED' | 'PAY_TIME_UNCHANGED' | 'PAY_TIME_NOT_APPLIED'
  message: string
  rule: 'DURATION_TOLERANCE' | 'OVERRUN_DECISION' | 'PAY_RULE' | null
  reason: string | null
  requested: { start: string | null; end: string | null }
  effective: { start: string | null; end: string | null; payableMinutes: number | null }
}

/** One carer's pay after an office-verified attendance time (VW-15). */
export type AttendancePayResult = {
  reconciliationId: string
  visitRef: string
  outcome:
    | 'REPRICED'
    | 'PAY_UNCHANGED'
    | 'PAY_NOT_RECALCULATED'
    | 'MANUAL_AMOUNT_KEPT'
    | 'CORRECTION_RECORDED'
    | 'NO_CORRECTION'
    | 'REVIEW_NEEDED'
  message: string
  payableBefore: string | null
  payableAfter: string | null
}

export type PayNotice = { variant: ToastVariant; title: string; description?: string }

/**
 * The notice for a payable-time edit. Only an edit that changed the payable time is reported as
 * a success; one that a pay rule did not let take effect says so, with the payable time in force.
 */
export function payTimeEditNotice(edit: PayTimeEdit | null | undefined): PayNotice | null {
  if (!edit) return null
  switch (edit.outcome) {
    case 'PAY_TIME_CHANGED':
      return { variant: 'success', title: 'Payable time changed', description: edit.message }
    case 'PAY_TIME_UNCHANGED':
      return { variant: 'default', title: 'Payable time unchanged', description: edit.message }
    default:
      return { variant: 'warning', title: 'Payable time not changed', description: edit.message }
  }
}

/** The pay results carried by a manual attendance response, wherever the envelope puts them. */
export function attendancePayResults(response: unknown): AttendancePayResult[] {
  const body = response as { data?: { pay?: unknown }; pay?: unknown } | null | undefined
  const pay = body?.data?.pay ?? body?.pay
  return Array.isArray(pay) ? (pay as AttendancePayResult[]) : []
}

/**
 * The notice after an office-verified attendance time. The time itself is always recorded; what
 * happened to pay is said plainly, so that "recorded" is never read as "pay updated".
 */
export function attendancePayNotice(response: unknown): PayNotice {
  const results = attendancePayResults(response)
  if (!results.length) return { variant: 'success', title: 'Manual attendance recorded' }
  const lines = results.map(r => (results.length > 1 ? `${r.visitRef}: ${r.message}` : r.message)).join(' ')
  const outcomes = new Set(results.map(r => r.outcome))
  // The times are on record but pay is not: never shown as a success.
  if (outcomes.has('PAY_NOT_RECALCULATED')) {
    return { variant: 'destructive', title: 'Attendance recorded; carer pay not recalculated', description: lines }
  }
  if ([...outcomes].every(o => o === 'REPRICED')) {
    return { variant: 'success', title: 'Attendance recorded; carer pay recalculated', description: lines }
  }
  if ([...outcomes].every(o => o === 'CORRECTION_RECORDED')) {
    return { variant: 'success', title: 'Attendance recorded; a pay correction awaits approval', description: lines }
  }
  if ([...outcomes].every(o => o === 'PAY_UNCHANGED' || o === 'MANUAL_AMOUNT_KEPT')) {
    return { variant: 'default', title: 'Attendance recorded; carer pay unchanged', description: lines }
  }
  return { variant: 'warning', title: 'Attendance recorded; check carer pay', description: lines }
}
