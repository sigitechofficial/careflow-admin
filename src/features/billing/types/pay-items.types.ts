export type PayItemWageType =
  | 'ON_CALL'
  | 'LIVE_IN'
  | 'TRAINING'
  | 'HOLIDAY_PAY'
  | 'SICK_PAY'
  | 'BONUS'
  | 'MANUAL_ADJUSTMENT'

export type PayItemUnit = 'PERIOD' | 'DAY' | 'WEEK' | 'HOUR' | 'AMOUNT'

export type PayItemStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type PayItem = {
  id: string
  employeeId: string
  employeeName: string
  wageTypeCode: PayItemWageType | string
  workDate: string
  quantity: string | number | null
  unit: PayItemUnit | string | null
  rate: string | number | null
  amount: string | number
  reason: string
  notes?: string | null
  sourceType: string
  sourceId?: string | null
  status: PayItemStatus | string
  createdAt: string
  createdById?: string | null
  createdByName?: string | null
  approvedAt?: string | null
  approvedByName?: string | null
  rejectedAt?: string | null
  rejectedByName?: string | null
  rejectionReason?: string | null
  includedInPayrollRunId?: string | null
  payrollRunLabel?: string | null
  requiresSecondApprover: boolean
}

export type PayItemSuggestion = {
  rate: number | null
  source: 'PAY_CARD' | 'AVERAGE_PAY' | null
  explanation: string
  payCardId: string | null
  payCardVersion: number | null
}

export type CreatePayItemInput = {
  employeeId: string
  wageTypeCode: PayItemWageType
  workDate: string
  unit: PayItemUnit
  quantity?: number
  rate?: number
  amount?: number
  reason: string
  notes?: string
  sourceType?: 'EMPLOYEE_HOLIDAY' | 'EMPLOYEE_ABSENCE'
  sourceId?: string
}

/** What each pay item type can be entered as (mirrors careadmin-backend pay-items.util PAY_ITEM_CONFIG). */
export const PAY_ITEM_TYPE_OPTIONS: Array<{
  value: PayItemWageType
  label: string
  units: PayItemUnit[]
  hint: string
  link?: 'EMPLOYEE_HOLIDAY' | 'EMPLOYEE_ABSENCE'
  secondApprover?: boolean
  allowNegative?: boolean
}> = [
  { value: 'BONUS', label: 'Bonus / incentive', units: ['AMOUNT'], hint: 'One-off or incentive payment. Needs a second approver.', secondApprover: true },
  {
    value: 'MANUAL_ADJUSTMENT',
    label: 'Manual pay adjustment',
    units: ['AMOUNT'],
    hint: 'Positive or negative correction (e.g. arrears for a locked pay run). Deductions must be lawful and agreed. Needs a second approver.',
    secondApprover: true,
    allowNegative: true,
  },
  {
    value: 'HOLIDAY_PAY',
    label: 'Holiday pay',
    units: ['HOUR', 'DAY', 'AMOUNT'],
    hint: 'Holiday taken. Rate suggested from the carer’s average pay over the previous 52 weeks — check it against your holiday pay policy.',
    link: 'EMPLOYEE_HOLIDAY',
  },
  {
    value: 'SICK_PAY',
    label: 'Sick pay',
    units: ['DAY', 'WEEK', 'AMOUNT'],
    hint: 'Statutory or company sick pay. Enter the rate from your sick pay policy (no statutory rate is assumed).',
    link: 'EMPLOYEE_ABSENCE',
  },
  { value: 'ON_CALL', label: 'On-call allowance', units: ['PERIOD'], hint: 'Rate from the carer’s pay card on-call rate.' },
  { value: 'LIVE_IN', label: 'Live-in care', units: ['DAY', 'WEEK'], hint: 'Rate from the carer’s pay card live-in rate. Record working / rest arrangements in notes.' },
  { value: 'TRAINING', label: 'Training pay', units: ['HOUR', 'AMOUNT'], hint: 'Rate from the carer’s pay card training rate. Training logged as non-core activity is paid automatically.' },
]

export const PAY_ITEM_UNIT_LABELS: Record<PayItemUnit, string> = {
  PERIOD: 'On-call periods',
  DAY: 'Days',
  WEEK: 'Weeks',
  HOUR: 'Hours',
  AMOUNT: 'Fixed amount (£)',
}

export const PAY_ITEM_STATUS_LABELS: Record<PayItemStatus, string> = {
  PENDING_APPROVAL: 'Awaiting approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

export function payItemTypeLabel(code: string): string {
  return PAY_ITEM_TYPE_OPTIONS.find(o => o.value === code)?.label ?? code
}
