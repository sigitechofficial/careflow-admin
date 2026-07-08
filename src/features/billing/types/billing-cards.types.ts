export type BillingCardStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'SCHEDULED'
  | 'EXPIRED'
  | 'ARCHIVED'
  | 'SUSPENDED'
  | 'REPLACED'

export type PayCardAssignmentLevel =
  | 'ROLE'
  | 'BRANCH'
  | 'EMPLOYMENT_TYPE'
  | 'WORKER_TYPE'
  | 'ORGANISATION_DEFAULT'

export type PayCardWorkerTypeKey = 'AGENCY' | 'BANK' | 'INTERNAL'

export type ChargeCardAssignmentLevel =
  | 'SERVICE_USER'
  | 'FUNDER'
  | 'FUNDING_CONTRACT'
  | 'CARE_PACKAGE'
  | 'SERVICE_TYPE'
  | 'BRANCH_REGION'
  | 'GROUP_HOUSEHOLD'
  | 'ORGANISATION_DEFAULT'

export type BillingRateType =
  | 'HOURLY'
  | 'FIXED'
  | 'BANDED'
  | 'MILEAGE'
  | 'TRAVEL_TIME'
  | 'WAITING_TIME'
  | 'PER_VISIT_FEE'
  | 'SUBSCRIPTION'
  | 'UPLIFT'
  | 'PREMIUM'
  | 'DEDUCTION'

export type BillingDayType = 'WEEKDAY' | 'SATURDAY' | 'SUNDAY' | 'BANK_HOLIDAY' | 'ANY'

export type BillingFrequency = 'WEEKLY' | 'FOUR_WEEKLY' | 'MONTHLY' | 'CUSTOM'

export type BillingChargeMethod =
  | 'HOURLY_PRO_RATA'
  | 'FIXED_VISIT'
  | 'BANDED_DURATION'
  | 'DAILY_RATE'
  | 'WEEKLY_PACKAGE'
  | 'MONTHLY_PACKAGE'
  | 'SLEEP_IN'
  | 'WAKING_NIGHT'
  | 'NON_CHARGEABLE'

export type PayCardRule = {
  id?: string
  label?: string | null
  serviceType?: string | null
  dayType: BillingDayType
  startTime?: string | null
  endTime?: string | null
  rateType: BillingRateType
  amount: number
  multiplier?: number | null
  minimumMinutes?: number | null
  roundingRule?: string | null
  priority?: number
  sortOrder?: number
}

export type PayCard = {
  id: string
  name: string
  code: string
  assignmentLevel: PayCardAssignmentLevel
  assignmentTargetId?: string | null
  assignmentTargetKey?: PayCardWorkerTypeKey | null
  assignmentLabel?: string | null
  currency: string
  status: BillingCardStatus
  effectiveFrom: string
  effectiveTo?: string | null
  notes?: string | null
  rules: PayCardRule[]
  assignedCarerCount?: number
  createdAt?: string
  updatedAt?: string
}

export type ChargeCardRule = PayCardRule & {
  chargeMethod: BillingChargeMethod
  chargeableFlag?: boolean
}

export type ChargeCard = {
  id: string
  name: string
  code: string
  assignmentLevel: ChargeCardAssignmentLevel
  assignmentTargetId?: string | null
  assignmentTargetKey?: string | null
  assignmentLabel?: string | null
  currency: string
  billingFrequency: BillingFrequency
  paymentTerms?: string | null
  taxTreatment?: string | null
  invoiceGroupingRule?: string | null
  defaultChargeMethod: BillingChargeMethod
  status: BillingCardStatus
  effectiveFrom: string
  effectiveTo?: string | null
  notes?: string | null
  rules: ChargeCardRule[]
  attachedRecordCount?: number
  createdAt?: string
  updatedAt?: string
}

export type PayCardInput = {
  name: string
  code: string
  assignmentLevel?: PayCardAssignmentLevel
  assignmentTargetId?: string | null
  assignmentTargetKey?: PayCardWorkerTypeKey | null
  assignmentLabel?: string
  currency?: string
  status?: BillingCardStatus
  effectiveFrom: string
  effectiveTo?: string | null
  notes?: string
  rules?: PayCardRule[]
}

export type ChargeCardInput = {
  name: string
  code: string
  assignmentLevel?: ChargeCardAssignmentLevel
  assignmentTargetId?: string | null
  assignmentTargetKey?: string | null
  assignmentLabel?: string
  currency?: string
  billingFrequency?: BillingFrequency
  paymentTerms?: string
  taxTreatment?: string
  invoiceGroupingRule?: string
  defaultChargeMethod?: BillingChargeMethod
  status?: BillingCardStatus
  effectiveFrom: string
  effectiveTo?: string | null
  notes?: string
  rules?: ChargeCardRule[]
}

export type ChargeCardAssignmentPreview = {
  matchingCount: number
  unassignedCount: number
  assignedCount: number
}

export type ChargeCardResolveResult = {
  source: 'EXPLICIT_FUNDING' | 'EXPLICIT_SERVICE_USER' | 'EXPLICIT_FUNDER' | 'MATCHED' | 'NONE'
  chargeCard: ChargeCard | null
  matchedLevel: ChargeCardAssignmentLevel | null
}

export const PAY_CARD_ASSIGNMENT_OPTIONS: { value: PayCardAssignmentLevel; label: string }[] = [
  { value: 'ORGANISATION_DEFAULT', label: 'Organisation default' },
  { value: 'BRANCH', label: 'Branch' },
  { value: 'ROLE', label: 'Role' },
  { value: 'EMPLOYMENT_TYPE', label: 'Employment type' },
  { value: 'WORKER_TYPE', label: 'Worker type' },
]

export const PAY_CARD_WORKER_TYPE_OPTIONS: { value: PayCardWorkerTypeKey; label: string }[] = [
  { value: 'INTERNAL', label: 'Internal staff' },
  { value: 'AGENCY', label: 'Agency workers' },
  { value: 'BANK', label: 'Bank staff' },
]

export type PayCardAssignmentPreview = {
  matchingCount: number
  unassignedCount: number
  assignedCount: number
}

export type PayCardResolveResult = {
  source: 'EXPLICIT' | 'MATCHED' | 'NONE'
  payCard: PayCard | null
  matchedLevel: PayCardAssignmentLevel | null
}

export const CHARGE_CARD_ASSIGNMENT_OPTIONS: { value: ChargeCardAssignmentLevel; label: string }[] = [
  { value: 'ORGANISATION_DEFAULT', label: 'Organisation default' },
  { value: 'FUNDER', label: 'Funder / payer' },
  { value: 'SERVICE_USER', label: 'Service user' },
  { value: 'FUNDING_CONTRACT', label: 'Funding contract' },
  { value: 'CARE_PACKAGE', label: 'Care package' },
  { value: 'SERVICE_TYPE', label: 'Service type' },
  { value: 'BRANCH_REGION', label: 'Branch / region' },
  { value: 'GROUP_HOUSEHOLD', label: 'Group / household' },
]

export const CHARGE_CARD_KEY_TARGET_LEVELS: ChargeCardAssignmentLevel[] = [
  'CARE_PACKAGE',
  'SERVICE_TYPE',
  'GROUP_HOUSEHOLD',
]

export const BILLING_CARD_STATUS_OPTIONS: { value: BillingCardStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

export const BILLING_FREQUENCY_OPTIONS: { value: BillingFrequency; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'FOUR_WEEKLY', label: '4-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'CUSTOM', label: 'Custom' },
]

export const BILLING_RATE_TYPE_OPTIONS: { value: BillingRateType; label: string }[] = [
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'FIXED', label: 'Fixed' },
  { value: 'BANDED', label: 'Banded' },
  { value: 'MILEAGE', label: 'Mileage' },
  { value: 'TRAVEL_TIME', label: 'Travel time' },
  { value: 'WAITING_TIME', label: 'Waiting time' },
  { value: 'PER_VISIT_FEE', label: 'Per-visit fee' },
  { value: 'UPLIFT', label: 'Uplift / multiplier' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'DEDUCTION', label: 'Deduction' },
]

export const BILLING_DAY_TYPE_OPTIONS: { value: BillingDayType; label: string }[] = [
  { value: 'ANY', label: 'Any day' },
  { value: 'WEEKDAY', label: 'Weekday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
  { value: 'BANK_HOLIDAY', label: 'Bank holiday' },
]

export const BILLING_CHARGE_METHOD_OPTIONS: { value: BillingChargeMethod; label: string }[] = [
  { value: 'HOURLY_PRO_RATA', label: 'Hourly pro-rata' },
  { value: 'FIXED_VISIT', label: 'Fixed visit charge' },
  { value: 'BANDED_DURATION', label: 'Banded duration' },
  { value: 'DAILY_RATE', label: 'Daily rate' },
  { value: 'WEEKLY_PACKAGE', label: 'Weekly package' },
  { value: 'MONTHLY_PACKAGE', label: 'Monthly package' },
  { value: 'SLEEP_IN', label: 'Sleep-in' },
  { value: 'WAKING_NIGHT', label: 'Waking night' },
  { value: 'NON_CHARGEABLE', label: 'Non-chargeable' },
]

export function slugBillingCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function formatBillingDate(value?: string | null): string {
  if (!value) return '—'
  return value.slice(0, 10)
}

export function formatPayCardAssignmentDisplay(card: Pick<
  PayCard,
  'assignmentLevel' | 'assignmentLabel' | 'assignmentTargetKey'
>): string {
  if (card.assignmentLabel?.trim()) return card.assignmentLabel.trim()
  if (card.assignmentLevel === 'WORKER_TYPE' && card.assignmentTargetKey) {
    return PAY_CARD_WORKER_TYPE_OPTIONS.find(o => o.value === card.assignmentTargetKey)?.label ?? card.assignmentTargetKey
  }
  return PAY_CARD_ASSIGNMENT_OPTIONS.find(o => o.value === card.assignmentLevel)?.label ?? card.assignmentLevel
}

export function formatChargeCardAssignmentDisplay(card: Pick<
  ChargeCard,
  'assignmentLevel' | 'assignmentLabel' | 'assignmentTargetKey'
>): string {
  if (card.assignmentLabel?.trim()) return card.assignmentLabel.trim()
  if (card.assignmentTargetKey && CHARGE_CARD_KEY_TARGET_LEVELS.includes(card.assignmentLevel)) {
    return card.assignmentTargetKey
  }
  return CHARGE_CARD_ASSIGNMENT_OPTIONS.find(o => o.value === card.assignmentLevel)?.label ?? card.assignmentLevel
}
