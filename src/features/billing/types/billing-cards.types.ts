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
  | 'INDIVIDUAL'
  | 'CLIENT_FUNDER'
  | 'ROLE'
  | 'BRANCH'
  | 'EMPLOYMENT_TYPE'
  | 'WORKER_TYPE'
  | 'ORGANISATION_DEFAULT'

export type PayStackingPolicy = 'PRIORITY' | 'HIGHEST' | 'STACK'
export type PayEnhancementMethod =
  | 'ABSOLUTE_HOURLY'
  | 'ADDITIONAL_PER_HOUR'
  | 'PERCENTAGE_UPLIFT'
  | 'MULTIPLIER'
  | 'FIXED_SHIFT_ALLOWANCE'

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
  | 'SLEEP_IN'
  | 'WAKING_NIGHT'

export type BillingDayType =
  | 'WEEKDAY'
  | 'SATURDAY'
  | 'SUNDAY'
  | 'BANK_HOLIDAY'
  | 'CHRISTMAS'
  | 'BOXING_DAY'
  | 'NEW_YEAR'
  | 'EASTER'
  | 'SPECIAL'
  | 'ANY'


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
  additionalAmount?: number | null
  percentageUplift?: number | null
  enhancementMethod?: PayEnhancementMethod | null
  minimumMinutes?: number | null
  roundingRule?: string | null
  priority?: number
  sortOrder?: number
  appliesToVisit?: boolean
  appliesToTravel?: boolean
  appliesToWaiting?: boolean
  appliesToTraining?: boolean
}

export type PayCardAssignedCarer = {
  employeeId: string
  fullName: string
  employeeNumber?: string | null
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
  nation?: string | null
  payFrequency?: BillingFrequency
  version?: number
  stackingPolicy?: PayStackingPolicy
  holidayPayMethod?: string | null
  travelInheritsTimeBands?: boolean
  mileageVehicleType?: string
  useUkMileageRates?: boolean
  status: BillingCardStatus
  effectiveFrom: string
  effectiveTo?: string | null
  notes?: string | null
  rules: PayCardRule[]
  assignedCarerCount?: number
  assignedCarers?: PayCardAssignedCarer[]
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
  stackingPolicy?: PayStackingPolicy
  nation?: string
  payFrequency?: BillingFrequency
  holidayPayMethod?: string | null
  travelInheritsTimeBands?: boolean
  useUkMileageRates?: boolean
  mileageVehicleType?: string
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
  { value: 'INDIVIDUAL', label: 'Individual worker' },
  { value: 'CLIENT_FUNDER', label: 'Client / funder' },
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
  source: 'EMPLOYEE_FUNDER' | 'EXPLICIT' | 'MATCHED' | 'NONE'
  payCard: PayCard | null
  matchedLevel: PayCardAssignmentLevel | null
  funderId?: string | null
}

export type EmployeeFunderPayAssignment = {
  id: string
  employeeId: string
  funderId: string
  funder: { id: string; name: string; code: string | null } | null
  payCardId: string
  payCard: PayCard
  effectiveFrom: string
  effectiveTo: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type EmployeeFunderPayAssignmentInput = {
  employeeId: string
  funderId: string
  payCardId: string
  effectiveFrom?: string
  effectiveTo?: string | null
  notes?: string | null
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

/** Hourly-only options shown in the rate rules editor (schema retains other types for legacy data). */
export const BILLING_RATE_TYPE_OPTIONS: { value: BillingRateType; label: string }[] = [
  { value: 'HOURLY', label: 'Hourly' },
]

export const BILLING_DAY_TYPE_OPTIONS: { value: BillingDayType; label: string }[] = [
  { value: 'ANY', label: 'Any day' },
  { value: 'WEEKDAY', label: 'Weekday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
  { value: 'BANK_HOLIDAY', label: 'Bank holiday' },
  { value: 'CHRISTMAS', label: 'Christmas Day' },
  { value: 'BOXING_DAY', label: 'Boxing Day' },
  { value: 'NEW_YEAR', label: 'New Year\'s Day' },
  { value: 'EASTER', label: 'Easter' },
  { value: 'SPECIAL', label: 'Organisation special day' },
]

export const PAY_STACKING_POLICY_OPTIONS: { value: PayStackingPolicy; label: string }[] = [
  { value: 'PRIORITY', label: 'Highest priority band wins' },
  { value: 'HIGHEST', label: 'Highest calculated rate wins' },
  { value: 'STACK', label: 'Stack enhancements (policy approval required)' },
]

export const PAY_ENHANCEMENT_METHOD_OPTIONS: { value: PayEnhancementMethod; label: string; hint: string }[] = [
  {
    value: 'ABSOLUTE_HOURLY',
    label: 'Fixed alternative hourly rate',
    hint: 'Replaces the base hourly rate for this period',
  },
  {
    value: 'ADDITIONAL_PER_HOUR',
    label: 'Additional amount per hour',
    hint: 'Base hourly + this £/hr while in the period',
  },
  {
    value: 'PERCENTAGE_UPLIFT',
    label: 'Percentage uplift',
    hint: 'Base hourly × (1 + % / 100)',
  },
  {
    value: 'MULTIPLIER',
    label: 'Rate multiplier',
    hint: 'Base hourly × multiplier (e.g. 1.5)',
  },
  {
    value: 'FIXED_SHIFT_ALLOWANCE',
    label: 'Fixed shift allowance',
    hint: 'Base hourly for time in period, plus a flat £ allowance',
  },
]

export const BILLING_VISIT_DURATION_OPTIONS: { value: number; label: string }[] =
  Array.from({ length: 10 }, (_, i) => {
    const value = 15 + i * 5 // 15, 20, 25 … 60
    return {
      value,
      label: value === 60 ? '60 minutes (1 hour)' : `${value} minutes`,
    }
  })

/** Fixed visit slots apply up to this duration; longer visits use hourly rate × hours. */
export const MAX_FIXED_VISIT_MINUTES = 60

export const DEFAULT_VISIT_DURATION_MINUTES = 30

export const BILLING_CHARGE_METHOD_OPTIONS: { value: BillingChargeMethod; label: string }[] = [
  { value: 'FIXED_VISIT', label: 'Fixed visit charge (up to 1 hour)' },
  { value: 'HOURLY_PRO_RATA', label: 'Hourly (visits over 1 hour)' },
  { value: 'SLEEP_IN', label: 'Sleeping night (fixed £/night)' },
  { value: 'WAKING_NIGHT', label: 'Waking night (£/hour)' },
]

export function formatVisitDurationLabel(minutes?: number | null): string | null {
  if (minutes == null || minutes <= 0) return null
  const match = BILLING_VISIT_DURATION_OPTIONS.find(o => o.value === minutes)
  return match?.label ?? `${minutes} minutes`
}

/** Default card title for a fixed visit-length rule, e.g. "30 minutes visit". */
export function defaultFixedVisitRuleLabel(minutes: number): string {
  return `${formatVisitDurationLabel(minutes) ?? `${minutes} min`} visit`
}

/**
 * True when the label is empty or matches an auto-generated fixed-visit title
 * (any standard duration). Custom labels like "Morning short call" return false.
 */
export function isAutoFixedVisitRuleLabel(label?: string | null): boolean {
  const trimmed = label?.trim()
  if (!trimmed) return true
  const lower = trimmed.toLowerCase()
  return BILLING_VISIT_DURATION_OPTIONS.some(opt => {
    const duration = opt.label.toLowerCase()
    return (
      lower === `${duration} visit`
      || lower === `${opt.value} min visit`
      || lower === `${opt.value} minutes visit`
      || lower === `fixed — ${duration} visit`
      || lower === `fixed - ${duration} visit`
      || lower === `${duration} charge`
      || lower === `${duration} visit charge`
    )
  })
}

/** Keep custom titles; refresh auto duration titles when visit length changes. */
export function nextFixedVisitRuleLabel(
  currentLabel: string | null | undefined,
  nextMinutes: number,
): string {
  if (isAutoFixedVisitRuleLabel(currentLabel)) {
    return defaultFixedVisitRuleLabel(nextMinutes)
  }
  return currentLabel!.trim()
}

/** Header for a fixed visit rule: custom label wins, else current visit length. */
export function fixedVisitRuleTitle(
  rule: Pick<PayCardRule, 'label' | 'minimumMinutes'>,
  durationMinutes: number,
): string {
  const label = rule.label?.trim()
  if (label && !isAutoFixedVisitRuleLabel(label)) return label
  return defaultFixedVisitRuleLabel(durationMinutes)
}

export function formatPayCardRuleDayType(dayType: BillingDayType): string {
  return BILLING_DAY_TYPE_OPTIONS.find(o => o.value === dayType)?.label ?? dayType
}

/** Display currency for UI — GBP shows as pound (£). */
export function formatBillingCurrencyDisplay(currency?: string | null): string {
  const code = (currency ?? 'GBP').trim().toUpperCase()
  if (code === 'GBP') return '£'
  return code
}

export function formatPayCardRuleTimeBand(rule: Pick<PayCardRule, 'startTime' | 'endTime'>): string | null {
  const start = rule.startTime?.trim()
  const end = rule.endTime?.trim()
  if (!start && !end) return null
  if (start && end) return `${start}–${end}`
  return start ?? end ?? null
}

export function formatPayCardRuleAmount(
  rule: Pick<PayCardRule, 'rateType' | 'amount' | 'multiplier' | 'minimumMinutes'> & {
    chargeMethod?: BillingChargeMethod
  },
  currency = 'GBP',
): string {
  const amount = Number(rule.amount)
  const symbol = formatBillingCurrencyDisplay(currency)
  if (rule.chargeMethod === 'SLEEP_IN' || rule.rateType === 'SLEEP_IN') return `${symbol}${amount.toFixed(2)} per night`
  if (rule.chargeMethod === 'WAKING_NIGHT' || rule.rateType === 'WAKING_NIGHT') return `${symbol}${amount.toFixed(2)}/hr`
  const durationLabel = formatVisitDurationLabel(rule.minimumMinutes)
  if (
    (rule.rateType === 'FIXED' || rule.rateType === 'PER_VISIT_FEE')
    && durationLabel
  ) {
    return `${symbol}${amount.toFixed(2)} per ${durationLabel.toLowerCase()} visit`
  }
  if (rule.rateType === 'MILEAGE') return `${symbol}${amount.toFixed(2)}/mile`
  if (rule.rateType === 'FIXED' || rule.rateType === 'PER_VISIT_FEE') return `${symbol}${amount.toFixed(2)} flat`
  if (rule.rateType === 'PREMIUM') return `+${symbol}${amount.toFixed(2)}/hr`
  if (rule.rateType === 'DEDUCTION') return amount > 0 ? `−${symbol}${amount.toFixed(2)}` : 'Deduction (variable)'
  if (rule.rateType === 'UPLIFT') {
    const mult = rule.multiplier != null ? Number(rule.multiplier) : amount
    return `${mult}× multiplier`
  }
  if (rule.rateType === 'TRAVEL_TIME' || rule.rateType === 'WAITING_TIME') {
    return `${symbol}${amount.toFixed(2)}/hr`
  }
  return `${symbol}${amount.toFixed(2)}/hr`
}

export type PayCardRuleCategory =
  | 'Visit pay'
  | 'Weekend & bank holiday'
  | 'Time of day & night'
  | 'Premiums & overtime'
  | 'Travel & expenses'
  | 'Fees & adjustments'

export function categorizePayCardRule(
  rule: Pick<PayCardRule, 'rateType' | 'dayType' | 'startTime' | 'endTime'>,
): PayCardRuleCategory {
  switch (rule.rateType) {
    case 'TRAVEL_TIME':
    case 'WAITING_TIME':
    case 'MILEAGE':
      return 'Travel & expenses'
    case 'PER_VISIT_FEE':
    case 'DEDUCTION':
      return 'Fees & adjustments'
    case 'PREMIUM':
    case 'UPLIFT':
      return 'Premiums & overtime'
    case 'SLEEP_IN':
    case 'WAKING_NIGHT':
      return 'Time of day & night'
    case 'FIXED':
      // Fixed visit slots are visit pay, not time-of-day bands.
      if (rule.dayType === 'BANK_HOLIDAY' || rule.dayType === 'SATURDAY' || rule.dayType === 'SUNDAY') {
        return 'Weekend & bank holiday'
      }
      return 'Visit pay'
    default:
      if (rule.startTime?.trim() || rule.endTime?.trim()) return 'Time of day & night'
      if (rule.dayType === 'BANK_HOLIDAY' || rule.dayType === 'SATURDAY' || rule.dayType === 'SUNDAY') {
        return 'Weekend & bank holiday'
      }
      return 'Visit pay'
  }
}

export const PAY_CARD_RULE_CATEGORY_ORDER: PayCardRuleCategory[] = [
  'Visit pay',
  'Weekend & bank holiday',
  'Time of day & night',
  'Premiums & overtime',
  'Travel & expenses',
  'Fees & adjustments',
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
