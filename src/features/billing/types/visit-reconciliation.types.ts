import type { VisitReconciliationStatus } from '@/features/billing/types/billing.types'

export type FinanceExceptionCode =
  | 'MISSING_CHECK_IN'
  | 'MISSING_CHECK_OUT'
  | 'OVERRUN'
  | 'UNDERRUN'
  | 'GPS_MISMATCH'
  | 'RATE_MISSING'
  | 'CHARGE_CARD_MISSING'
  | 'PAY_CARD_MISSING'
  | 'TASKS_INCOMPLETE'
  | 'FUNDING_SETUP_INCOMPLETE'
  | 'PO_EXPIRED'
  | 'PO_MISSING'

export type VisitReconciliationException = {
  code: FinanceExceptionCode
  message: string
}

/** Must match backend `BLOCKING_EXCEPTION_CODES` — blocks approve unless managerOverride. */
export const BLOCKING_EXCEPTION_CODES = new Set<FinanceExceptionCode>([
  'MISSING_CHECK_IN',
  'MISSING_CHECK_OUT',
  'PAY_CARD_MISSING',
  'CHARGE_CARD_MISSING',
  'RATE_MISSING',
  'FUNDING_SETUP_INCOMPLETE',
  'PO_EXPIRED',
  'PO_MISSING',
  'TASKS_INCOMPLETE',
])

export function listBlockingExceptionCodes(
  exceptions: Array<FinanceExceptionCode | VisitReconciliationException>,
): FinanceExceptionCode[] {
  const codes = exceptions.map(e => (typeof e === 'string' ? e : e.code))
  return [...new Set(codes.filter(c => BLOCKING_EXCEPTION_CODES.has(c)))]
}

export type VisitOverrunDecision = 'PENDING' | 'APPROVED' | 'REJECTED'

/** Acknowledged overrun: price on the planned slot or the actual clock times. */
export type VisitOverrunTimeBasis = 'PLANNED' | 'ACTUAL'

export type VisitReconciliationRow = {
  id: string
  visitRef: string
  scheduledVisitId: string
  scheduledJobId: string
  serviceUserId: string
  serviceUserName: string
  employeeId: string | null
  carerName: string | null
  date: string
  planned: string
  actual: string
  approvedPayable: string
  approvedBillable: string
  payableAmount: string | null
  billableAmount: string | null
  travelMiles: number | null
  travelMinutes: number | null
  currency: string
  status: VisitReconciliationStatus
  exceptions: VisitReconciliationException[]
  overrunMinutes: number | null
  overrunReason: string | null
  overrunDecision: VisitOverrunDecision | null
  /** Null on both = legacy acknowledged rule (carer pay actual, charge from actual). */
  overrunPayBasis?: VisitOverrunTimeBasis | null
  overrunBillBasis?: VisitOverrunTimeBasis | null
  approvalNotes: string | null
  /** Visit-log columns (client format). */
  emonitored?: 'LOGGED' | 'NOT LOG'
  clientId?: string
  clientFirstName?: string
  clientSecondName?: string
  clientAddress?: string
  clientPostCode?: string
  visitDate?: string
  careType?: string
  plannedArrival?: string
  plannedDeparture?: string
  actualArrival?: string
  actualDeparture?: string
  /** ISO timestamp — used to keep newest list entries on top. */
  createdAt?: string
  nightDuty?: 'NONE' | 'SLEEPING_NIGHT' | 'WAKING_NIGHT'
  nightDutyLabel?: string
}

export type VisitNightDutyFilter = 'overnight' | 'SLEEPING_NIGHT' | 'WAKING_NIGHT' | 'standard'

export function formatVisitNightDutyLabel(
  nightDuty?: VisitReconciliationRow['nightDuty'] | null,
  nightDutyLabel?: string | null,
): string {
  if (nightDuty === 'SLEEPING_NIGHT') return nightDutyLabel?.trim() || 'Sleeping night'
  if (nightDuty === 'WAKING_NIGHT') return nightDutyLabel?.trim() || 'Waking night'
  const fromApi = nightDutyLabel?.trim()
  if (fromApi && fromApi !== 'Standard') return fromApi
  return 'Standard'
}

export type VisitReconciliationsSummary = {
  pendingReview: number
  visitsWithExceptions: number
  visitsReady: number
  requiresManagerApproval: number
}

export type ExceptionQueueRow = {
  id: string
  code: FinanceExceptionCode
  visitRef: string
  reconciliationId: string
  serviceUserId: string
  serviceUser: string
  employeeId: string | null
  scheduledJobId: string | null
  message: string
}

export type ApproveScope = 'PAY' | 'INVOICE' | 'BOTH'

export type VisitReconciliationRateSegment = {
  startLabel: string
  endLabel: string
  hoursLabel: string
  minutes: number
  unitRate: string
  ruleLabel: string | null
  lineFormula: string
  amount: string
}

export type VisitReconciliationAppliedRule = {
  label: string
  rateType: string
  rateTypeLabel: string
  dayType: string | null
  dayTypeLabel: string | null
  timeWindow: string | null
  unitRate: string | null
  amount: string | null
  detail: string
}

export type VisitReconciliationRateBreakdown = {
  minutes: number
  hoursLabel: string
  rateType: string
  unitRate: string | null
  amount: string | null
  formula: string
  cardName: string | null
  cardCode: string | null
  cardSource: string | null
  ruleLabel: string | null
  appliedRules?: VisitReconciliationAppliedRule[]
  segments?: VisitReconciliationRateSegment[]
  /** True when amount was set manually rather than from card rules. */
  manualOverride?: boolean
  explanation?: string | null
}

export type VisitReconciliationFunderSplitLine = {
  funderName: string
  splitPercent: number | null
  amount: string
  included: boolean
  reason: string | null
  chargeCardName: string | null
  pricedWithVisitCard: boolean
  pricingNote: string | null
}

export type VisitReconciliationFunderSplitPreview = {
  note: string
  totalAmount: string
  visitChargeCardName: string | null
  lines: VisitReconciliationFunderSplitLine[]
}

export type VisitReconciliationFunderClientCharge = {
  funderName: string
  splitPercent: number | null
  shareAmount: string
  cardGrossAmount: string | null
  breakdown: VisitReconciliationRateBreakdown | null
  reason: string | null
}

export type VisitReconciliationCalculationPreview = {
  plannedMinutes: number | null
  actualMinutes: number | null
  plannedHours: string | null
  actualHours: string | null
  payableMinutes: number
  billableMinutes: number
  payableHours: string | null
  billableHours: string | null
  multiCarerFunderChargeMode?: 'COMBINED' | 'FIXED'
  isFunderBillingRow?: boolean
  funderChargeNote?: string | null
  funderSplitPreview?: VisitReconciliationFunderSplitPreview | null
  /** True when pay/charge amounts were frozen at visit completion. */
  pricingFrozen?: boolean
  pricingFrozenNote?: string | null
  timeWindows: {
    planned: string
    actual: string
    approvedPayable: string
    approvedBillable: string
  }
  carerPay: VisitReconciliationRateBreakdown | null
  clientCharge: VisitReconciliationRateBreakdown | null
  funderClientCharges?: VisitReconciliationFunderClientCharge[] | null
  exceptionDetails: Array<{
    code: FinanceExceptionCode
    message: string
    resolved: boolean
  }>
}

export type VisitReconciliationDetail = VisitReconciliationRow & {
  calculationPreview: VisitReconciliationCalculationPreview
  /** Pay is in a locked visit pay run or a closed UK run: changed only through a pay correction. */
  paySettled?: boolean
}
