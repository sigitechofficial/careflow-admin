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
  exceptions: FinanceExceptionCode[]
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
  serviceUser: string
  message: string
}

export type ApproveScope = 'PAY' | 'INVOICE' | 'BOTH'

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
  timeWindows: {
    planned: string
    actual: string
    approvedPayable: string
    approvedBillable: string
  }
  carerPay: VisitReconciliationRateBreakdown | null
  clientCharge: VisitReconciliationRateBreakdown | null
  exceptionDetails: Array<{
    code: FinanceExceptionCode
    message: string
    resolved: boolean
  }>
}

export type VisitReconciliationDetail = VisitReconciliationRow & {
  calculationPreview: VisitReconciliationCalculationPreview
}
