import * as React from 'react'
import { Briefcase, Car, ChevronDown, Clock, Moon, Plus, PoundSterling, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { toastWarning } from '@/shared/lib/toast'
import { BillingFieldLabel } from '@/features/billing/components/BillingFieldLabel'
import {
  BILLING_DAY_TYPE_OPTIONS,
  BILLING_VISIT_DURATION_OPTIONS,
  DEFAULT_VISIT_DURATION_MINUTES,
  PAY_CARD_RULE_CATEGORY_ORDER,
  categorizePayCardRule,
  formatPayCardRuleDayType,
  formatPayCardRuleTimeBand,
  formatVisitDurationLabel,
  defaultFixedVisitRuleLabel,
  fixedVisitRuleTitle,
  type BillingDayType,
  type ChargeCardRule,
  type PayCardRule,
  type PayCardRuleCategory,
  type PayEnhancementMethod,
  type BillingRateType,
} from '@/features/billing/types/billing-cards.types'
import {
  PAY_TIME_PERIOD_GROUPS,
  PAY_TIME_PERIOD_LOOKUP,
  getPayTimePeriodByCode,
  matchPayTimePeriod,
  type PayTimePeriodCode,
} from '@/features/billing/data/pay-time-period.lookup'
import {
  applyDurationChangeToChargeRule,
  applyDurationChangeToRule,
  findOverlappingHourlyPayRule,
  formatHourlyOverlapMessage,
  getRuleAmountFieldLabel,
  getRuleChargeMethodLabel,
  getRuleRateTypeLabel,
  isHourlyChargePeriodRule,
  isHourlyLongVisitRule,
  isMileageRule,
  isNightDutyChargeRule,
  isTimeBandRule,
  isTravelOrWaitingRule,
  isTravelTimeRule,
  isWaitingTimeRule,
} from '@/features/billing/utils/billing-card-rule.util'
import { normalizeBillingTimeInput } from '@/features/billing/utils/billing-time.util'

type RuleMode = 'pay' | 'charge'

type BillingCardRulesEditorProps = {
  mode: RuleMode
  rules: PayCardRule[] | ChargeCardRule[]
  onChange: (rules: PayCardRule[] | ChargeCardRule[]) => void
  disabled?: boolean
}

type VisitPayMethod = 'PRO_RATA_HOURLY' | 'FIXED_BY_DURATION' | 'BOTH'

/**
 * Decimal (pounds & pence) amount input. Keeps its own text buffer so the user
 * can type a decimal point / partial value (e.g. "12." → "12.5" → "12.50")
 * without it being stripped by the round-trip through a numeric value.
 */
function DecimalAmountInput({
  value,
  onValueChange,
  disabled,
  placeholder,
  required,
  className,
}: {
  value: number
  onValueChange: (amount: number) => void
  disabled?: boolean
  placeholder?: string
  required?: boolean
  className?: string
}) {
  const [text, setText] = React.useState(() => (value === 0 || value == null ? '' : String(value)))

  // Re-sync when the numeric value changes externally (e.g. a preset is applied),
  // but not while the user is mid-typing a value that already equals it ("12." vs 12).
  React.useEffect(() => {
    const parsed = text.trim() === '' ? 0 : Number(text)
    if (Number.isNaN(parsed) || parsed !== value) {
      setText(value === 0 || value == null ? '' : String(value))
    }
    // Intentionally only resync when the external numeric value changes.
  }, [value])

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={text}
      disabled={disabled}
      placeholder={placeholder}
      required={required}
      className={className}
      onChange={(e) => {
        const raw = e.target.value.replace(/\s+/g, '')
        // Allow empty, digits and a single decimal point (partial decimals allowed).
        if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return
        setText(raw)
        const parsed = raw === '' ? 0 : Number(raw)
        if (!Number.isNaN(parsed)) onValueChange(parsed)
      }}
    />
  )
}

/** Pay only: how an hourly rule's number is used (absolute £/hr, or on top of the card's weekday base rate). */
/**
 * Value of the "Custom…" entry in the "When this rate applies" list. It must not be empty: the
 * list is required, and an empty value made the browser refuse to save a card with a custom period.
 */
const CUSTOM_PERIOD_VALUE = 'CUSTOM'

const PAY_RATE_METHOD_OPTIONS: { value: PayEnhancementMethod; label: string; amountLabel: string }[] = [
  { value: 'ABSOLUTE_HOURLY', label: '£ per hour (actual hourly rate)', amountLabel: '£ per hour' },
  { value: 'ADDITIONAL_PER_HOUR', label: 'Base rate + £ per hour premium', amountLabel: '+ £ per hour' },
  { value: 'MULTIPLIER', label: 'Base rate × multiplier', amountLabel: 'Multiplier (×)' },
  { value: 'PERCENTAGE_UPLIFT', label: 'Base rate + % uplift', amountLabel: 'Uplift (%)' },
]

function payRateAmountLabel(method?: PayEnhancementMethod | null): string {
  return PAY_RATE_METHOD_OPTIONS.find(o => o.value === method)?.amountLabel ?? '£ per hour'
}

/** Keeps the method-specific field in step with the amount so the engine never guesses (e.g. multiplier). */
function payRateMethodFields(
  method: PayEnhancementMethod | null | undefined,
  amount: number,
): Pick<PayCardRule, 'enhancementMethod' | 'multiplier' | 'additionalAmount' | 'percentageUplift'> {
  const m = method ?? 'ABSOLUTE_HOURLY'
  return {
    enhancementMethod: m,
    multiplier: m === 'MULTIPLIER' ? amount : null,
    additionalAmount: m === 'ADDITIONAL_PER_HOUR' ? amount : null,
    percentageUplift: m === 'PERCENTAGE_UPLIFT' ? amount : null,
  }
}

/** Pay only: non-visit pay rates (paid in visit pay runs / pay items, never as a visit rate). */
const ADDITIONAL_PAY_TYPES: {
  rateType: BillingRateType
  title: string
  amountLabel: string
  defaultLabel: string
  hint: string
}[] = [
  {
    rateType: 'OVERTIME',
    title: 'Overtime',
    amountLabel: 'Multiplier (×)',
    defaultLabel: 'Overtime',
    hint: 'Weekly visit hours above the threshold get this premium in the visit pay run. Base pay for those hours is already paid, so only the extra is added.',
  },
  {
    rateType: 'ON_CALL',
    title: 'On-call allowance',
    amountLabel: '£ per on-call period',
    defaultLabel: 'On-call allowance',
    hint: 'Paid for non-core activity marked "on call" (and on-call pay items). Visits attended while on call are paid as normal visits.',
  },
  {
    rateType: 'TRAINING',
    title: 'Training pay',
    amountLabel: '£ per hour',
    defaultLabel: 'Training',
    hint: 'Paid for non-core activity marked "include in payroll" (training, meetings) and training pay items. Counts as working time for the minimum wage check.',
  },
  {
    rateType: 'LIVE_IN_DAILY',
    title: 'Live-in (daily)',
    amountLabel: '£ per day',
    defaultLabel: 'Live-in daily rate',
    hint: 'Used as the default rate when live-in days are entered as pay items.',
  },
  {
    rateType: 'LIVE_IN_WEEKLY',
    title: 'Live-in (weekly)',
    amountLabel: '£ per week',
    defaultLabel: 'Live-in weekly rate',
    hint: 'Used as the default rate when live-in weeks are entered as pay items.',
  },
]

const OVERTIME_METHOD_OPTIONS: { value: PayEnhancementMethod; label: string; amountLabel: string }[] = [
  { value: 'MULTIPLIER', label: 'Base rate × multiplier (e.g. time and a half)', amountLabel: 'Multiplier (×)' },
  { value: 'ADDITIONAL_PER_HOUR', label: '+ £ per overtime hour', amountLabel: '+ £ per hour' },
  { value: 'ABSOLUTE_HOURLY', label: 'Overtime £ per hour (premium = rate − base)', amountLabel: 'Overtime £ per hour' },
]

function isAdditionalPayRule(rule: Pick<PayCardRule, 'rateType'>): boolean {
  return ADDITIONAL_PAY_TYPES.some(t => t.rateType === rule.rateType)
}

function emptyAdditionalPayRule(rateType: BillingRateType): PayCardRule {
  const meta = ADDITIONAL_PAY_TYPES.find(t => t.rateType === rateType)!
  const base: PayCardRule = {
    label: meta.defaultLabel,
    dayType: 'ANY',
    startTime: null,
    endTime: null,
    rateType,
    amount: 0,
    priority: 0,
    appliesToVisit: false,
    appliesToTravel: false,
    appliesToWaiting: false,
    appliesToTraining: rateType === 'TRAINING',
  }
  if (rateType === 'OVERTIME') {
    return { ...base, amount: 1.5, enhancementMethod: 'MULTIPLIER', multiplier: 1.5, minimumMinutes: 40 * 60 }
  }
  return { ...base, enhancementMethod: 'ABSOLUTE_HOURLY' }
}

function emptyFixedPayRule(minutes = DEFAULT_VISIT_DURATION_MINUTES): PayCardRule {
  return {
    label: defaultFixedVisitRuleLabel(minutes),
    dayType: 'ANY',
    rateType: 'FIXED',
    amount: 0,
    minimumMinutes: minutes,
    startTime: '00:00',
    endTime: '23:59',
    sortOrder: 0,
  }
}

function emptyFixedChargeRule(minutes = DEFAULT_VISIT_DURATION_MINUTES): ChargeCardRule {
  return {
    ...emptyFixedPayRule(minutes),
    chargeMethod: 'FIXED_VISIT',
    chargeableFlag: true,
  }
}

function emptyHourlyPayRule(periodCode: PayTimePeriodCode = 'WEEKDAY_DAYTIME'): PayCardRule {
  const period =
    getPayTimePeriodByCode(periodCode) ??
    PAY_TIME_PERIOD_LOOKUP[0] ?? {
      label: 'Weekday daytime',
      dayType: 'WEEKDAY' as const,
      startTime: '07:00',
      endTime: '19:00',
      priority: 10,
    }
  return {
    label: period.label,
    dayType: period.dayType,
    startTime: period.startTime ?? '00:00',
    endTime: period.endTime ?? '23:59',
    rateType: 'HOURLY',
    amount: 0,
    enhancementMethod: 'ABSOLUTE_HOURLY',
    appliesToVisit: true,
    priority: period.priority,
    sortOrder: 0,
  }
}

function emptyTimeBandPayRule(periodCode: PayTimePeriodCode = 'WEEKDAY_EVENING'): PayCardRule {
  return emptyHourlyPayRule(periodCode)
}

/** Absolute or enhanced hourly rates for visits (may include day + clock window). */
function isHourlyPeriodRule(rule: PayCardRule): boolean {
  if (isNightDutyChargeRule(rule)) return false
  if (
    rule.rateType === 'FIXED'
    || rule.rateType === 'MILEAGE'
    || rule.rateType === 'TRAVEL_TIME'
    || rule.rateType === 'WAITING_TIME'
  ) {
    return false
  }
  return rule.rateType === 'HOURLY' || rule.rateType === 'BANDED' || rule.rateType === 'PREMIUM' || rule.rateType === 'UPLIFT'
}

function isFixedVisitRule(rule: PayCardRule): boolean {
  return rule.rateType === 'FIXED' && !isNightDutyChargeRule(rule)
}

function emptyHourlyChargeRule(periodCode: PayTimePeriodCode = 'WEEKDAY_DAYTIME'): ChargeCardRule {
  return {
    ...emptyHourlyPayRule(periodCode),
    chargeMethod: 'HOURLY_PRO_RATA',
    chargeableFlag: true,
  }
}

function emptyMileagePayRule(): PayCardRule {
  return {
    label: 'Mileage reimbursement',
    dayType: 'ANY',
    rateType: 'MILEAGE',
    amount: 0.45,
    sortOrder: 0,
  }
}

function emptyTravelTimePayRule(): PayCardRule {
  return {
    label: 'Travel time between visits',
    dayType: 'ANY',
    rateType: 'TRAVEL_TIME',
    amount: 12.71,
    sortOrder: 0,
  }
}

function emptyWaitingTimePayRule(): PayCardRule {
  return {
    label: 'Waiting time between visits',
    dayType: 'ANY',
    rateType: 'WAITING_TIME',
    amount: 12.71,
    sortOrder: 0,
  }
}

function emptyMileageChargeRule(): ChargeCardRule {
  return {
    ...emptyMileagePayRule(),
    label: 'Mileage recharge',
    chargeMethod: 'FIXED_VISIT',
    chargeableFlag: true,
  }
}

function emptyTravelTimeChargeRule(): ChargeCardRule {
  return {
    ...emptyTravelTimePayRule(),
    label: 'Travel time recharge',
    chargeMethod: 'HOURLY_PRO_RATA',
    chargeableFlag: true,
  }
}

function emptyWaitingTimeChargeRule(): ChargeCardRule {
  return {
    ...emptyWaitingTimePayRule(),
    label: 'Waiting time recharge',
    chargeMethod: 'HOURLY_PRO_RATA',
    chargeableFlag: true,
  }
}

function nightDutyDayTypeLabel(dayType: BillingDayType): string {
  return BILLING_DAY_TYPE_OPTIONS.find(o => o.value === dayType)?.label ?? dayType
}

/** More specific calendar days win over ANY when both match a visit. */
function nightDutyPriority(dayType: BillingDayType): number {
  switch (dayType) {
    case 'ANY':
      return 0
    case 'WEEKDAY':
      return 10
    case 'SATURDAY':
      return 20
    case 'SUNDAY':
      return 30
    case 'BANK_HOLIDAY':
      return 100
    case 'SPECIAL':
      return 105
    case 'EASTER':
      return 108
    case 'CHRISTMAS':
    case 'BOXING_DAY':
    case 'NEW_YEAR':
      return 110
    default:
      return 0
  }
}

function nextNightDutyDayType(
  rules: Array<Pick<PayCardRule, 'rateType'> & Partial<Pick<ChargeCardRule, 'chargeMethod'>> & Pick<PayCardRule, 'dayType'>>,
  kind: 'SLEEP_IN' | 'WAKING_NIGHT',
): BillingDayType {
  const used = new Set(
    rules
      .filter(r => r.chargeMethod === kind || r.rateType === kind)
      .map(r => r.dayType),
  )
  const preferred = BILLING_DAY_TYPE_OPTIONS.map(o => o.value)
  return preferred.find(dayType => !used.has(dayType)) ?? 'ANY'
}

function emptySleepingNightChargeRule(dayType: BillingDayType = 'ANY'): ChargeCardRule {
  const dayLabel = nightDutyDayTypeLabel(dayType)
  return {
    label: dayType === 'ANY' ? 'Sleeping night' : `Sleeping night — ${dayLabel}`,
    dayType,
    rateType: 'FIXED',
    amount: 0,
    minimumMinutes: null,
    startTime: null,
    endTime: null,
    chargeMethod: 'SLEEP_IN',
    chargeableFlag: true,
    priority: nightDutyPriority(dayType),
    sortOrder: 0,
  }
}

function emptyWakingNightChargeRule(dayType: BillingDayType = 'ANY'): ChargeCardRule {
  const dayLabel = nightDutyDayTypeLabel(dayType)
  return {
    label: dayType === 'ANY' ? 'Waking night' : `Waking night — ${dayLabel}`,
    dayType,
    rateType: 'HOURLY',
    amount: 0,
    minimumMinutes: null,
    startTime: null,
    endTime: null,
    chargeMethod: 'WAKING_NIGHT',
    chargeableFlag: true,
    priority: nightDutyPriority(dayType),
    sortOrder: 0,
  }
}

function emptySleepingNightPayRule(dayType: BillingDayType = 'ANY'): PayCardRule {
  const dayLabel = nightDutyDayTypeLabel(dayType)
  return {
    label: dayType === 'ANY' ? 'Sleeping night' : `Sleeping night — ${dayLabel}`,
    dayType,
    rateType: 'SLEEP_IN',
    amount: 0,
    minimumMinutes: null,
    startTime: null,
    endTime: null,
    priority: nightDutyPriority(dayType),
    sortOrder: 0,
  }
}

function emptyWakingNightPayRule(dayType: BillingDayType = 'ANY'): PayCardRule {
  const dayLabel = nightDutyDayTypeLabel(dayType)
  return {
    label: dayType === 'ANY' ? 'Waking night' : `Waking night — ${dayLabel}`,
    dayType,
    rateType: 'WAKING_NIGHT',
    amount: 0,
    minimumMinutes: null,
    startTime: null,
    endTime: null,
    priority: nightDutyPriority(dayType),
    sortOrder: 0,
  }
}

function ruleDurationMinutes(rule: PayCardRule): number {
  return rule.minimumMinutes && rule.minimumMinutes > 0
    ? rule.minimumMinutes
    : DEFAULT_VISIT_DURATION_MINUTES
}

function isHourlyRule(rule: PayCardRule, mode: RuleMode): boolean {
  return mode === 'charge'
    ? isHourlyChargePeriodRule(rule as ChargeCardRule)
    : isHourlyLongVisitRule(rule) || isTimeBandRule(rule)
}

function isSupplementRule(rule: PayCardRule): boolean {
  return isMileageRule(rule) || isTravelOrWaitingRule(rule)
}

function deriveVisitPayMethod(rules: PayCardRule[]): VisitPayMethod {
  const hasFixed = rules.some(isFixedVisitRule)
  const hasHourly = rules.some(isHourlyPeriodRule)
  // Fixed-only cards open as Both so fixed slots stay editable (Fixed-only radio is hidden).
  if (hasFixed) return 'BOTH'
  if (hasHourly) return 'PRO_RATA_HOURLY'
  return 'PRO_RATA_HOURLY'
}

/**
 * Visit pay method is inferred from rules on load. Changing the radio must reshape
 * rules (not only local UI state), or reopen always falls back to pro-rata hourly.
 */
function applyVisitPayMethod(rules: PayCardRule[], method: VisitPayMethod): PayCardRule[] {
  const supplements = rules.filter(isSupplementRule)
  const fixed = rules.filter(isFixedVisitRule)
  const hourly = rules.filter(isHourlyPeriodRule)
  const other = rules.filter(
    r => !isSupplementRule(r) && !isFixedVisitRule(r) && !isHourlyPeriodRule(r),
  )

  const ensureFixed = (): PayCardRule[] => {
    if (fixed.length > 0) return fixed
    return BILLING_VISIT_DURATION_OPTIONS.map(opt => emptyFixedPayRule(opt.value))
  }

  const ensureHourly = (): PayCardRule[] => {
    if (hourly.length > 0) return hourly
    return [emptyHourlyPayRule('WEEKDAY_DAYTIME')]
  }

  if (method === 'FIXED_BY_DURATION') {
    return [...ensureFixed(), ...supplements, ...other]
  }
  if (method === 'BOTH') {
    return [...ensureHourly(), ...ensureFixed(), ...supplements, ...other]
  }
  return [...ensureHourly(), ...supplements, ...other]
}

function applyVisitChargeMethod(rules: ChargeCardRule[], method: VisitPayMethod): ChargeCardRule[] {
  const supplements = rules.filter(isSupplementRule) as ChargeCardRule[]
  const fixed = rules.filter(isFixedVisitRule) as ChargeCardRule[]
  const hourly = rules.filter(isHourlyPeriodRule) as ChargeCardRule[]
  const other = rules.filter(
    r => !isSupplementRule(r) && !isFixedVisitRule(r) && !isHourlyPeriodRule(r),
  ) as ChargeCardRule[]

  const ensureFixed = (): ChargeCardRule[] => {
    if (fixed.length > 0) return fixed
    return BILLING_VISIT_DURATION_OPTIONS.map(opt => emptyFixedChargeRule(opt.value))
  }

  const ensureHourly = (): ChargeCardRule[] => {
    if (hourly.length > 0) return hourly
    return [emptyHourlyChargeRule('WEEKDAY_DAYTIME')]
  }

  if (method === 'FIXED_BY_DURATION') {
    return [...ensureFixed(), ...supplements, ...other]
  }
  if (method === 'BOTH') {
    return [...ensureHourly(), ...ensureFixed(), ...supplements, ...other]
  }
  return [...ensureHourly(), ...supplements, ...other]
}

function ruleTitle(rule: PayCardRule, index: number): string {
  if (rule.rateType === 'FIXED' && (rule.minimumMinutes ?? 0) > 0) {
    return fixedVisitRuleTitle(rule, rule.minimumMinutes!)
  }
  if (rule.label?.trim()) return rule.label.trim()
  const day = formatPayCardRuleDayType(rule.dayType)
  const band = formatPayCardRuleTimeBand(rule)
  if (band) return `${day} · ${band}`
  if (rule.rateType === 'FIXED') {
    return `${day} · ${formatVisitDurationLabel(rule.minimumMinutes) ?? 'visit'}`
  }
  return getRuleRateTypeLabel(rule) || `Rule ${index + 1}`
}

export function BillingCardRulesEditor({ mode, rules, onChange, disabled }: BillingCardRulesEditorProps) {
  const payRules = rules as PayCardRule[]
  const [visitPayMethod, setVisitPayMethod] = React.useState<VisitPayMethod>(() =>
    deriveVisitPayMethod(payRules),
  )
  const [travelOpen, setTravelOpen] = React.useState(() => payRules.some(r => isSupplementRule(r)))
  const [additionalOpen, setAdditionalOpen] = React.useState(() => payRules.some(r => isAdditionalPayRule(r)))
  const [advancedOpen, setAdvancedOpen] = React.useState<Record<number, boolean>>({})
  const [forceCustomPeriod, setForceCustomPeriod] = React.useState<Record<number, boolean>>({})
  const [flashIndices, setFlashIndices] = React.useState<Set<number>>(() => new Set())
  const flashClearRef = React.useRef<number | null>(null)

  const flashNewRules = React.useCallback((count: number) => {
    if (count <= 0) return
    if (flashClearRef.current != null) window.clearTimeout(flashClearRef.current)
    setFlashIndices(new Set(Array.from({ length: count }, (_, i) => i)))
    flashClearRef.current = window.setTimeout(() => {
      setFlashIndices(new Set())
      flashClearRef.current = null
    }, 1600)
    // After paint, bring the new card into view inside the dialog body.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.querySelector('.billing-rule-flash')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      })
    })
  }, [])

  React.useEffect(() => {
    return () => {
      if (flashClearRef.current != null) window.clearTimeout(flashClearRef.current)
    }
  }, [])

  React.useEffect(() => {
    if ((rules as PayCardRule[]).some(r => isSupplementRule(r))) {
      setTravelOpen(true)
    }
  }, [rules])

  // Keep radio in sync when rules are loaded/remounted (source of truth is the rule set).
  React.useEffect(() => {
    setVisitPayMethod(deriveVisitPayMethod(rules as PayCardRule[]))
  }, [rules])

  const onVisitPayMethodChange = (method: VisitPayMethod) => {
    if (method === visitPayMethod) return
    setVisitPayMethod(method)
    if (mode === 'charge') {
      onChange(applyVisitChargeMethod(rules as ChargeCardRule[], method))
    } else {
      onChange(applyVisitPayMethod(payRules, method))
    }
    if (method === 'FIXED_BY_DURATION' || method === 'BOTH') {
      const hadFixed = payRules.some(isFixedVisitRule)
      if (!hadFixed) flashNewRules(BILLING_VISIT_DURATION_OPTIONS.length)
    }
  }

  const ruleShellClass = (index: number) =>
    cn(
      'rounded-lg border bg-background p-3 space-y-3 transition-[box-shadow,background-color,border-color,transform] duration-500',
      flashIndices.has(index)
        ? 'billing-rule-flash border-primary ring-2 ring-primary/35 bg-primary/5 shadow-md'
        : 'border-border',
    )

  const addFixedRule = (minutes?: number) => {
    onChange(
      mode === 'charge'
        ? [emptyFixedChargeRule(minutes), ...rules]
        : [emptyFixedPayRule(minutes), ...rules],
    )
    flashNewRules(1)
  }

  const addStandardFixedSlots = () => {
    const existing = new Set(
      (rules as PayCardRule[])
        .filter(r => r.rateType === 'FIXED' && r.minimumMinutes)
        .map(r => r.minimumMinutes),
    )
    if (mode === 'charge') {
      const added: ChargeCardRule[] = []
      for (const opt of BILLING_VISIT_DURATION_OPTIONS) {
        if (!existing.has(opt.value)) added.push(emptyFixedChargeRule(opt.value))
      }
      onChange([...added, ...(rules as ChargeCardRule[])])
      flashNewRules(added.length)
      return
    }
    const added: PayCardRule[] = []
    for (const opt of BILLING_VISIT_DURATION_OPTIONS) {
      if (!existing.has(opt.value)) added.push(emptyFixedPayRule(opt.value))
    }
    onChange([...added, ...(rules as PayCardRule[])])
    flashNewRules(added.length)
  }

  const addHourlyRule = () => {
    const existing = rules as PayCardRule[]
    const nextPeriod = PAY_TIME_PERIOD_LOOKUP.find(period => {
      const candidate = {
        label: period.label,
        dayType: period.dayType,
        startTime: period.startTime ?? '00:00',
        endTime: period.endTime ?? '23:59',
        rateType: 'HOURLY' as const,
      }
      return !findOverlappingHourlyPayRule(existing, candidate)
    })

    if (!nextPeriod) {
      toastWarning(
        'Period already used',
        'Every day/time window already has an hourly rate. Remove or change an existing rate first.',
      )
      return
    }

    onChange(
      mode === 'charge'
        ? [emptyHourlyChargeRule(nextPeriod.code), ...(rules as ChargeCardRule[])]
        : [emptyHourlyPayRule(nextPeriod.code), ...existing],
    )
    flashNewRules(1)
  }

  const applyPeriodToRule = (index: number, code: PayTimePeriodCode): boolean => {
    const period = getPayTimePeriodByCode(code)
    if (!period) return false
    const current = rules[index] as PayCardRule
    const presetStart = period.startTime ?? '00:00'
    const presetEnd = period.endTime ?? '23:59'
    // Custom From/Until (e.g. 01:00–23:59) must stay when picking a named period like
    // "Weekday daytime". Only apply the preset clock window when the row is still on
    // a standard period (or has no times yet).
    const keepCustomTimes = Boolean(forceCustomPeriod[index])
    const nextStart = keepCustomTimes
      ? (current.startTime?.trim() || presetStart)
      : presetStart
    const nextEnd = keepCustomTimes
      ? (current.endTime?.trim() || presetEnd)
      : presetEnd
    const candidate: PayCardRule = {
      ...current,
      label: period.label,
      dayType: period.dayType,
      startTime: nextStart,
      endTime: nextEnd,
      priority: period.priority,
      rateType: 'HOURLY',
      enhancementMethod: mode === 'pay' ? (current.enhancementMethod ?? 'ABSOLUTE_HOURLY') : 'ABSOLUTE_HOURLY',
    }
    const overlap = findOverlappingHourlyPayRule(rules as PayCardRule[], candidate, index)
    if (overlap) {
      // Allow the selection — finance may use priority/stacking. Warn so overlaps are visible.
      toastWarning('Overlapping period', formatHourlyOverlapMessage(candidate, overlap.rule))
    }
    updateRule(index, {
      label: period.label,
      dayType: period.dayType,
      startTime: nextStart,
      endTime: nextEnd,
      priority: period.priority,
      rateType: 'HOURLY',
      enhancementMethod: mode === 'pay' ? (current.enhancementMethod ?? 'ABSOLUTE_HOURLY') : 'ABSOLUTE_HOURLY',
      ...(mode === 'charge'
        ? { chargeMethod: 'HOURLY_PRO_RATA' as const, chargeableFlag: true }
        : {}),
    })
    return true
  }

  const tryUpdateHourlyWindow = (
    index: number,
    patch: Partial<Pick<PayCardRule, 'dayType' | 'startTime' | 'endTime' | 'label' | 'enhancementMethod'>>,
  ) => {
    const current = rules[index] as PayCardRule
    const candidate = { ...current, ...patch }
    const overlap = findOverlappingHourlyPayRule(rules as PayCardRule[], candidate, index)
    if (overlap) {
      // Do not block custom From/Until (e.g. 01:00–23:59). Warn only.
      toastWarning('Overlapping period', formatHourlyOverlapMessage(candidate, overlap.rule))
    }
    updateRule(index, patch)
    return true
  }

  const addMileageRule = () => {
    onChange(
      mode === 'charge'
        ? [emptyMileageChargeRule(), ...rules]
        : [emptyMileagePayRule(), ...rules],
    )
    flashNewRules(1)
  }

  const addTravelTimeRule = () => {
    onChange(
      mode === 'charge'
        ? [emptyTravelTimeChargeRule(), ...(rules as ChargeCardRule[])]
        : [emptyTravelTimePayRule(), ...rules],
    )
    setTravelOpen(true)
    flashNewRules(1)
  }

  const addWaitingTimeRule = () => {
    onChange(
      mode === 'charge'
        ? [emptyWaitingTimeChargeRule(), ...(rules as ChargeCardRule[])]
        : [emptyWaitingTimePayRule(), ...rules],
    )
    setTravelOpen(true)
    flashNewRules(1)
  }

  const addSleepingNightRule = () => {
    const dayType = nextNightDutyDayType(rules as PayCardRule[], 'SLEEP_IN')
    const already = (rules as PayCardRule[]).some(
      r =>
        (r.rateType === 'SLEEP_IN' || (r as ChargeCardRule).chargeMethod === 'SLEEP_IN')
        && r.dayType === dayType,
    )
    if (already) {
      toastWarning(
        'Already covered',
        `This card already has a Sleeping night rate for ${nightDutyDayTypeLabel(dayType)}.`,
      )
      return
    }
    onChange(
      mode === 'charge'
        ? [emptySleepingNightChargeRule(dayType), ...(rules as ChargeCardRule[])]
        : [emptySleepingNightPayRule(dayType), ...(rules as PayCardRule[])],
    )
    flashNewRules(1)
  }

  const addWakingNightRule = () => {
    const dayType = nextNightDutyDayType(rules as PayCardRule[], 'WAKING_NIGHT')
    const already = (rules as PayCardRule[]).some(
      r =>
        (r.rateType === 'WAKING_NIGHT' || (r as ChargeCardRule).chargeMethod === 'WAKING_NIGHT')
        && r.dayType === dayType,
    )
    if (already) {
      toastWarning(
        'Already covered',
        `This card already has a Waking night rate for ${nightDutyDayTypeLabel(dayType)}.`,
      )
      return
    }
    onChange(
      mode === 'charge'
        ? [emptyWakingNightChargeRule(dayType), ...(rules as ChargeCardRule[])]
        : [emptyWakingNightPayRule(dayType), ...(rules as PayCardRule[])],
    )
    flashNewRules(1)
  }

  const tryUpdateNightDutyDayType = (
    index: number,
    dayType: BillingDayType,
  ) => {
    const current = rules[index] as PayCardRule & Partial<ChargeCardRule>
    const kind: 'SLEEP_IN' | 'WAKING_NIGHT' | null =
      current.chargeMethod === 'SLEEP_IN' || current.rateType === 'SLEEP_IN'
        ? 'SLEEP_IN'
        : current.chargeMethod === 'WAKING_NIGHT' || current.rateType === 'WAKING_NIGHT'
          ? 'WAKING_NIGHT'
          : null
    if (!kind) {
      updateRule(index, { dayType })
      return
    }
    const duplicate = (rules as PayCardRule[]).some(
      (rule, i) =>
        i !== index
        && (rule.rateType === kind || (rule as ChargeCardRule).chargeMethod === kind)
        && rule.dayType === dayType,
    )
    if (duplicate) {
      toastWarning(
        'Already covered',
        `This card already has a ${kind === 'SLEEP_IN' ? 'Sleeping' : 'Waking'} night rate for ${nightDutyDayTypeLabel(dayType)}.`,
      )
      return
    }
    const autoLabel =
      (kind === 'SLEEP_IN'
        ? (mode === 'charge' ? emptySleepingNightChargeRule(dayType) : emptySleepingNightPayRule(dayType)).label
        : (mode === 'charge' ? emptyWakingNightChargeRule(dayType) : emptyWakingNightPayRule(dayType)).label) ?? ''
    const currentAuto =
      (kind === 'SLEEP_IN'
        ? (mode === 'charge'
            ? emptySleepingNightChargeRule(current.dayType)
            : emptySleepingNightPayRule(current.dayType)).label
        : (mode === 'charge'
            ? emptyWakingNightChargeRule(current.dayType)
            : emptyWakingNightPayRule(current.dayType)).label) ?? ''
    const keepCustomLabel =
      Boolean(current.label?.trim())
      && current.label!.trim().toLowerCase() !== currentAuto.toLowerCase()
    updateRule(index, {
      dayType,
      priority: nightDutyPriority(dayType),
      label: keepCustomLabel ? current.label : autoLabel,
    })
  }

  const updateRule = (index: number, patch: Partial<PayCardRule & ChargeCardRule>) => {
    onChange(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)))
  }

  const replaceRule = (index: number, nextRule: PayCardRule | ChargeCardRule) => {
    onChange(rules.map((rule, i) => (i === index ? nextRule : rule)))
  }

  const removeRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index))
  }

  const toggleAdvanced = (index: number) => {
    setAdvancedOpen(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const showAddHourly = visitPayMethod === 'PRO_RATA_HOURLY' || visitPayMethod === 'BOTH'
  const showAddFixed = visitPayMethod === 'FIXED_BY_DURATION' || visitPayMethod === 'BOTH'

  const canAddSleepingNight = React.useMemo(() => {
    const used = new Set(
      (rules as PayCardRule[])
        .filter(r => r.rateType === 'SLEEP_IN' || (r as ChargeCardRule).chargeMethod === 'SLEEP_IN')
        .map(r => r.dayType),
    )
    return BILLING_DAY_TYPE_OPTIONS.some(opt => !used.has(opt.value))
  }, [rules])

  const canAddWakingNight = React.useMemo(() => {
    const used = new Set(
      (rules as PayCardRule[])
        .filter(r => r.rateType === 'WAKING_NIGHT' || (r as ChargeCardRule).chargeMethod === 'WAKING_NIGHT')
        .map(r => r.dayType),
    )
    return BILLING_DAY_TYPE_OPTIONS.some(opt => !used.has(opt.value))
  }, [rules])

  const hasAvailableHourlyPeriod = React.useMemo(() => {
    const existing = rules as PayCardRule[]
    return PAY_TIME_PERIOD_LOOKUP.some(period =>
      !findOverlappingHourlyPayRule(existing, {
        label: period.label,
        dayType: period.dayType,
        startTime: period.startTime ?? '00:00',
        endTime: period.endTime ?? '23:59',
        rateType: 'HOURLY',
      }),
    )
  }, [rules])

  const groupedPayRules = React.useMemo(() => {
    const indexed = (rules as PayCardRule[]).map((rule, index) => ({ rule, index }))
    const map = new Map<PayCardRuleCategory, { rule: PayCardRule; index: number }[]>()
    for (const cat of PAY_CARD_RULE_CATEGORY_ORDER) map.set(cat, [])
    for (const item of indexed) {
      const cat = categorizePayCardRule(item.rule)
      const list = map.get(cat) ?? []
      list.push(item)
      map.set(cat, list)
    }
    return map
  }, [rules])

  const addAdditionalPayRule = (rateType: BillingRateType) => {
    onChange([emptyAdditionalPayRule(rateType), ...rules])
    setAdditionalOpen(true)
    flashNewRules(1)
  }

  const renderAdditionalPayRule = (rule: PayCardRule, index: number) => {
    const meta = ADDITIONAL_PAY_TYPES.find(t => t.rateType === rule.rateType)
    const overtime = rule.rateType === 'OVERTIME'
    const method = (rule.enhancementMethod ?? (overtime ? 'MULTIPLIER' : 'ABSOLUTE_HOURLY')) as PayEnhancementMethod
    const amountLabel = overtime
      ? (OVERTIME_METHOD_OPTIONS.find(o => o.value === method)?.amountLabel ?? 'Multiplier (×)')
      : (meta?.amountLabel ?? '£')
    return (
      <div
        key={index}
        data-testid={`additional-pay-${rule.rateType}`}
        className={cn(
          'flex flex-col gap-4 border-t border-border py-4 transition-colors md:flex-row md:items-start md:justify-between',
          flashIndices.has(index) ? 'billing-rule-flash bg-primary/5' : '',
        )}
      >
        <div className="min-w-0 space-y-1 md:max-w-sm md:flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
            <span className="truncate">{rule.label?.trim() || meta?.title}</span>
            <Badge variant="secondary" className="text-[10px] font-normal">{meta?.title}</Badge>
          </div>
          {meta?.hint ? <p className="text-xs text-muted-foreground">{meta.hint}</p> : null}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="w-44 space-y-1 text-sm">
            <span className="text-xs font-medium text-foreground/90">Label</span>
            <Input
              value={rule.label ?? ''}
              onChange={e => updateRule(index, { label: e.target.value })}
              disabled={disabled}
            />
          </label>
          {overtime ? (
            <label className="w-64 space-y-1 text-sm">
              <span className="text-xs font-medium text-foreground/90">How overtime is paid</span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={method}
                onChange={e => updateRule(index, payRateMethodFields(e.target.value as PayEnhancementMethod, Number(rule.amount)))}
                disabled={disabled}
                data-testid="overtime-method"
              >
                {OVERTIME_METHOD_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="w-40 space-y-1 text-sm">
            <span className="text-xs font-medium text-foreground/90">
              {amountLabel} <span className="text-destructive" aria-hidden>*</span>
            </span>
            <DecimalAmountInput
              value={rule.amount}
              onValueChange={value =>
                updateRule(index, {
                  amount: value,
                  ...(overtime ? payRateMethodFields(method, Number(value)) : {}),
                })
              }
              disabled={disabled}
              placeholder="0.00"
              required
            />
          </label>
          {overtime ? (
            <label className="w-40 space-y-1 text-sm">
              <span className="text-xs font-medium text-foreground/90">
                Weekly threshold (hours) <span className="text-destructive" aria-hidden>*</span>
              </span>
              <Input
                type="number"
                min={1}
                step="0.5"
                value={rule.minimumMinutes ? rule.minimumMinutes / 60 : ''}
                onChange={e => {
                  const hrs = Number(e.target.value)
                  updateRule(index, { minimumMinutes: Number.isFinite(hrs) && hrs > 0 ? Math.round(hrs * 60) : null })
                }}
                disabled={disabled}
                data-testid="overtime-threshold"
                required
              />
            </label>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 p-0 text-destructive"
            onClick={() => removeRule(index)}
            disabled={disabled}
            title="Remove rule"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const renderRuleCard = (rule: PayCardRule, index: number) => {
    const hourly = isHourlyRule(rule, mode)
    const mileage = isMileageRule(rule)
    const travelTime = isTravelTimeRule(rule)
    const waitingTime = isWaitingTimeRule(rule)
    const timeBand = isTimeBandRule(rule)
    const plainHourly = hourly && !timeBand
    const supplement = isSupplementRule(rule)
    const durationMinutes = ruleDurationMinutes(rule)
    const amountLabel = getRuleAmountFieldLabel(rule)
    const rateTypeLabel = getRuleRateTypeLabel(rule)
    const chargeMethodLabel = getRuleChargeMethodLabel(rule as ChargeCardRule)
    const showAdvanced = Boolean(advancedOpen[index])

    return (
      <div key={index} className={ruleShellClass(index)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground truncate">{ruleTitle(rule, index)}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px] font-normal">
                {rateTypeLabel}
              </Badge>
              {flashIndices.has(index) ? (
                <Badge variant="default" className="text-[10px] font-normal">
                  New
                </Badge>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0 text-destructive"
            onClick={() => removeRule(index)}
            disabled={disabled}
            title="Remove rule"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-3">
            <span className="text-xs font-medium text-foreground/90">Label</span>
            <Input
              value={rule.label ?? ''}
              onChange={e => updateRule(index, { label: e.target.value })}
              placeholder={
                mileage
                  ? 'e.g. Mileage reimbursement'
                  : travelTime
                    ? 'e.g. Travel time between visits'
                    : waitingTime
                      ? 'e.g. Waiting time between visits'
                      : timeBand
                        ? 'e.g. Weekday evening'
                        : plainHourly
                          ? 'e.g. Base hourly rate'
                          : `e.g. ${formatVisitDurationLabel(durationMinutes)?.toLowerCase() ?? 'visit'} rate`
              }
              disabled={disabled}
            />
          </label>

          {!hourly && !supplement ? (
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-foreground/90">Visit duration</span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={durationMinutes}
                onChange={e => {
                  const nextMinutes = Number(e.target.value)
                  const next =
                    mode === 'charge'
                      ? applyDurationChangeToChargeRule(rule as ChargeCardRule, nextMinutes)
                      : applyDurationChangeToRule(rule, nextMinutes)
                  replaceRule(index, {
                    ...next,
                  })
                }}
                disabled={disabled}
              >
                {BILLING_VISIT_DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          ) : null}

          {!supplement ? (
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-foreground/90">Day type</span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={rule.dayType}
                onChange={e =>
                  updateRule(index, {
                    dayType: e.target.value as BillingDayType,
                  })
                }
                disabled={disabled}
              >
                {BILLING_DAY_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          ) : null}

          {!hourly && !supplement ? (
            <>
              <label className="space-y-1 text-sm">
                <span className="text-xs font-medium text-foreground/90">From</span>
                <Input
                  type="time"
                  value={normalizeBillingTimeInput(rule.startTime)}
                  onChange={e => updateRule(index, { startTime: e.target.value || null })}
                  disabled={disabled}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs font-medium text-foreground/90">Until</span>
                <Input
                  type="time"
                  value={normalizeBillingTimeInput(rule.endTime)}
                  onChange={e => updateRule(index, { endTime: e.target.value || null })}
                  disabled={disabled}
                />
              </label>
            </>
          ) : null}

          {timeBand ? (
            <>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Band start</span>
                <Input
                  type="time"
                  value={normalizeBillingTimeInput(rule.startTime)}
                  onChange={e => updateRule(index, { startTime: e.target.value || null })}
                  disabled={disabled}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Band end</span>
                <Input
                  type="time"
                  value={normalizeBillingTimeInput(rule.endTime)}
                  onChange={e => updateRule(index, { endTime: e.target.value || null })}
                  disabled={disabled}
                />
              </label>
            </>
          ) : null}

          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-foreground/90">{amountLabel}</span>
            <DecimalAmountInput
              value={rule.amount}
              disabled={disabled}
              placeholder="0.00"
              onValueChange={amount => {
                if (mileage) {
                  updateRule(index, {
                    amount,
                    rateType: 'MILEAGE',
                    minimumMinutes: null,
                    ...(mode === 'charge' ? { chargeMethod: 'FIXED_VISIT' } : {}),
                  })
                } else if (travelTime) {
                  updateRule(index, {
                    amount,
                    rateType: 'TRAVEL_TIME',
                    minimumMinutes: null,
                  })
                } else if (waitingTime) {
                  updateRule(index, {
                    amount,
                    rateType: 'WAITING_TIME',
                    minimumMinutes: null,
                  })
                } else if (hourly || timeBand) {
                  updateRule(index, {
                    amount,
                    rateType: 'HOURLY',
                    minimumMinutes: null,
                    ...(mode === 'charge' ? { chargeMethod: 'HOURLY_PRO_RATA' } : {}),
                  })
                } else {
                  updateRule(index, {
                    amount,
                    rateType: 'FIXED',
                    minimumMinutes: durationMinutes,
                    ...(mode === 'charge' ? { chargeMethod: 'FIXED_VISIT' } : {}),
                  })
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {mileage
                ? 'Miles × this rate'
                : travelTime
                  ? 'Travel minutes ÷ 60 × this rate'
                  : waitingTime
                    ? 'Waiting minutes ÷ 60 × this rate'
                    : timeBand
                      ? 'Applies to minutes that fall inside this time window'
                      : plainHourly
                        ? 'Visit minutes ÷ 60 × this rate'
                        : `Flat fee for one ${formatVisitDurationLabel(durationMinutes)?.toLowerCase()} visit${
                            rule.startTime || rule.endTime ? ' in this time window' : ''
                          }`}
            </p>
          </label>

          {mode === 'charge' && !mileage ? (
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Charge method</span>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                {chargeMethodLabel}
              </div>
            </label>
          ) : null}

          {mode === 'charge' && mileage ? (
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Charge method</span>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                Mileage recharge
              </div>
            </label>
          ) : null}
        </div>

        {mode === 'pay' && (timeBand || !supplement) ? (
          <div className="space-y-2 border-t border-border pt-2">
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => toggleAdvanced(index)}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              Advanced
            </button>
            {showAdvanced ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-xs text-muted-foreground">Service type (optional)</span>
                  <Input
                    value={rule.serviceType ?? ''}
                    onChange={e => updateRule(index, { serviceType: e.target.value })}
                    placeholder="Personal care, Complex care…"
                    disabled={disabled}
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : mode === 'charge' ? (
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-xs text-muted-foreground">Service type</span>
            <Input
              value={rule.serviceType ?? ''}
              onChange={e => updateRule(index, { serviceType: e.target.value })}
              placeholder="Personal care, Complex care…"
              disabled={disabled}
            />
          </label>
        ) : supplement ? (
          <div className="space-y-2 border-t border-border pt-2">
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => toggleAdvanced(index)}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              Advanced
            </button>
            {showAdvanced ? (
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Service type (optional)</span>
                <Input
                  value={rule.serviceType ?? ''}
                  onChange={e => updateRule(index, { serviceType: e.target.value })}
                  placeholder="Personal care, Complex care…"
                  disabled={disabled}
                />
              </label>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  const renderDayTimePremiumCard = (rule: PayCardRule, index: number) => {
    const matched = forceCustomPeriod[index] ? undefined : matchPayTimePeriod(rule)
    const isCustom = !matched
    // Pay cards: a named period shows its days and times as one line; From / Until open on request.
    const compact = mode === 'pay' && !isCustom
    const fieldLabelClass = 'text-xs font-medium text-foreground/90'
    const isPeriodTaken = (code: PayTimePeriodCode) => {
      if (matched?.code === code) return false
      // Only treat a named period as taken when another rule is already that period
      // (same label/day+times). Do not disable Daytime just because a Custom window
      // like 01:00–23:59 overlaps the default 07:00–19:00 band.
      return (rules as PayCardRule[]).some((other, otherIndex) => {
        if (otherIndex === index || !isHourlyRule(other, mode)) return false
        return matchPayTimePeriod(other)?.code === code
      })
    }

    return (
      <tr
        key={index}
        className={cn(
          'transition-colors hover:bg-muted/40',
          flashIndices.has(index) ? 'billing-rule-flash bg-primary/5' : '',
        )}
      >
        <td className="border-b border-border px-3 py-2.5 align-top first:pl-4">
          <label className="block space-y-1 text-sm">
            <span className="sr-only">When this rate applies</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={matched?.code ?? CUSTOM_PERIOD_VALUE}
              onChange={e => {
                const code = e.target.value as PayTimePeriodCode | typeof CUSTOM_PERIOD_VALUE
                if (code !== CUSTOM_PERIOD_VALUE) {
                  if (applyPeriodToRule(index, code)) {
                    setForceCustomPeriod(prev => ({ ...prev, [index]: false }))
                  }
                } else {
                  // Unlock Custom without rewriting From/Until (forcing 00:00–23:59
                  // often overlaps other rates and blocked Custom entirely).
                  setForceCustomPeriod(prev => ({ ...prev, [index]: true }))
                  updateRule(index, {
                    label: 'Custom period',
                    enhancementMethod:
                      mode === 'pay' ? (rule.enhancementMethod ?? 'ABSOLUTE_HOURLY') : 'ABSOLUTE_HOURLY',
                    rateType: 'HOURLY',
                    ...(mode === 'charge'
                      ? { chargeMethod: 'HOURLY_PRO_RATA' as const, chargeableFlag: true }
                      : {}),
                  })
                }
              }}
              disabled={disabled}
              required
            >
              <option value={CUSTOM_PERIOD_VALUE}>Custom…</option>
              {PAY_TIME_PERIOD_GROUPS.map(group => (
                <optgroup key={group.id} label={group.label}>
                  {PAY_TIME_PERIOD_LOOKUP.filter(p => p.group === group.id).map(p => {
                    const taken = isPeriodTaken(p.code)
                    return (
                      <option key={p.code} value={p.code} disabled={taken}>
                        {taken ? `${p.label} (already used)` : p.label}
                      </option>
                    )
                  })}
                </optgroup>
              ))}
            </select>
          </label>
          {flashIndices.has(index) ? (
            <Badge variant="default" className="mt-1 inline-flex text-[10px] font-normal">
              New
            </Badge>
          ) : null}
        </td>

        <td className="border-b border-border px-3 py-2.5 align-top">
          <div className="space-y-2">
            {isCustom ? (
              <label className="block space-y-1 text-sm">
                <span className="sr-only">Label</span>
                <Input
                  value={rule.label ?? ''}
                  onChange={e => updateRule(index, { label: e.target.value })}
                  placeholder="e.g. Midweek twilight"
                  disabled={disabled}
                />
              </label>
            ) : null}

            {isCustom ? (
              <label className="block space-y-1 text-sm">
                <span className="sr-only">Applies on</span>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={rule.dayType}
                  onChange={e => {
                    const dayType = e.target.value as BillingDayType
                    const ok = tryUpdateHourlyWindow(index, {
                      dayType,
                      label: rule.label?.trim() || 'Custom period',
                      enhancementMethod:
                        mode === 'pay' ? (rule.enhancementMethod ?? 'ABSOLUTE_HOURLY') : 'ABSOLUTE_HOURLY',
                    })
                    if (ok) setForceCustomPeriod(prev => ({ ...prev, [index]: true }))
                  }}
                  disabled={disabled}
                  required
                >
                  {BILLING_DAY_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            ) : null}

            {compact ? (
              <p className="text-xs text-muted-foreground" data-testid="pay-rule-period-summary">
                {formatPayCardRuleDayType(rule.dayType)} · {formatPayCardRuleTimeBand(rule) ?? 'any time'} ·{' '}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setForceCustomPeriod(prev => ({ ...prev, [index]: true }))}
                  disabled={disabled}
                >
                  Change days or times
                </button>
              </p>
            ) : null}

            {compact ? null : (
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1 text-sm">
                  <span className={fieldLabelClass}>
                    From <span className="text-destructive" aria-hidden>*</span>
                  </span>
                  <Input
                    type="time"
                    value={normalizeBillingTimeInput(rule.startTime)}
                    onChange={e => {
                      const startTime = e.target.value || null
                      const ok = tryUpdateHourlyWindow(index, {
                        startTime,
                        label: isCustom
                          ? (rule.label?.trim() || 'Custom period')
                          : 'Custom period',
                      })
                      if (ok) setForceCustomPeriod(prev => ({ ...prev, [index]: true }))
                    }}
                    disabled={disabled}
                    required
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className={fieldLabelClass}>
                    Until <span className="text-destructive" aria-hidden>*</span>
                  </span>
                  <Input
                    type="time"
                    value={normalizeBillingTimeInput(rule.endTime)}
                    onChange={e => {
                      const ok = tryUpdateHourlyWindow(index, {
                        endTime: e.target.value || null,
                        label: isCustom
                          ? (rule.label?.trim() || 'Custom period')
                          : 'Custom period',
                      })
                      if (ok) setForceCustomPeriod(prev => ({ ...prev, [index]: true }))
                    }}
                    disabled={disabled}
                    required
                  />
                </label>
              </div>
            )}
          </div>
        </td>

        {mode === 'pay' ? (
          <td className="border-b border-border px-3 py-2.5 align-top">
            <label className="block space-y-1 text-sm">
              <span className="sr-only">How this rate is paid</span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={rule.enhancementMethod ?? 'ABSOLUTE_HOURLY'}
                onChange={e =>
                  updateRule(
                    index,
                    payRateMethodFields(e.target.value as PayEnhancementMethod, Number(rule.amount)),
                  )
                }
                disabled={disabled}
                data-testid="pay-rule-method"
              >
                {PAY_RATE_METHOD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            {rule.enhancementMethod && rule.enhancementMethod !== 'ABSOLUTE_HOURLY' ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Applied to this card&apos;s weekday base hourly rate — check the result in Pay preview.
              </p>
            ) : null}
          </td>
        ) : null}

        <td className="border-b border-border px-3 py-2.5 align-top text-right">
          <label className="block space-y-1 text-sm">
            <span className="sr-only">
              {mode === 'pay' ? payRateAmountLabel(rule.enhancementMethod) : '£ per hour'}
            </span>
            <DecimalAmountInput
              value={rule.amount}
              onValueChange={value => {
                updateRule(index, {
                  amount: value,
                  ...(mode === 'pay'
                    ? payRateMethodFields(rule.enhancementMethod, Number(value))
                    : { enhancementMethod: 'ABSOLUTE_HOURLY' as const }),
                  rateType: 'HOURLY',
                  ...(mode === 'charge'
                    ? { chargeMethod: 'HOURLY_PRO_RATA' as const, chargeableFlag: true }
                    : {}),
                })
              }}
              disabled={disabled}
              placeholder="0.00"
              required
              className="text-right"
            />
          </label>
        </td>

        <td className="border-b border-border px-3 py-2.5 align-top text-right">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0 text-destructive"
            onClick={() => removeRule(index)}
            disabled={disabled}
            title="Remove rule"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>
    )
  }

  const renderFixedVisitCard = (rule: PayCardRule, index: number) => {
    const durationMinutes = ruleDurationMinutes(rule)
    const cellClass = 'border-b border-border px-3 py-2.5 align-top'

    return (
      <tr
        key={index}
        className={cn(
          'transition-colors hover:bg-muted/40',
          flashIndices.has(index) ? 'billing-rule-flash bg-primary/5' : '',
        )}
      >
        <td className={cn(cellClass, 'first:pl-4')}>
          <label className="block space-y-1 text-sm">
            <span className="sr-only">
              Visit length <span className="text-destructive" aria-hidden>*</span>
            </span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={durationMinutes}
              onChange={e => {
                const nextMinutes = Number(e.target.value)
                const next =
                  mode === 'charge'
                    ? applyDurationChangeToChargeRule(rule as ChargeCardRule, nextMinutes)
                    : applyDurationChangeToRule(rule, nextMinutes)
                replaceRule(index, {
                  ...next,
                  startTime: rule.startTime?.trim() || '00:00',
                  endTime: rule.endTime?.trim() || '23:59',
                })
              }}
              disabled={disabled}
              required
            >
              {BILLING_VISIT_DURATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          {flashIndices.has(index) ? (
            <Badge variant="default" className="mt-1 inline-flex text-[10px] font-normal">
              New
            </Badge>
          ) : null}
        </td>
        <td className={cellClass}>
          <label className="block space-y-1 text-sm">
            <span className="sr-only">
              Applies on <span className="text-destructive" aria-hidden>*</span>
            </span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={rule.dayType}
              onChange={e => updateRule(index, { dayType: e.target.value as BillingDayType })}
              disabled={disabled}
              required
            >
              {BILLING_DAY_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </td>
        <td className={cellClass}>
          <label className="block space-y-1 text-sm">
            <span className="sr-only">
              From <span className="text-destructive" aria-hidden>*</span>
            </span>
            <Input
              type="time"
              value={normalizeBillingTimeInput(rule.startTime)}
              onChange={e => updateRule(index, { startTime: e.target.value || null })}
              disabled={disabled}
              required
            />
          </label>
        </td>
        <td className={cellClass}>
          <label className="block space-y-1 text-sm">
            <span className="sr-only">
              Until <span className="text-destructive" aria-hidden>*</span>
            </span>
            <Input
              type="time"
              value={normalizeBillingTimeInput(rule.endTime)}
              onChange={e => updateRule(index, { endTime: e.target.value || null })}
              disabled={disabled}
              required
            />
          </label>
        </td>
        <td className={cn(cellClass, 'text-right')}>
          <label className="block space-y-1 text-sm">
            <span className="sr-only">
              Flat £ <span className="text-destructive" aria-hidden>*</span>
            </span>
            <DecimalAmountInput
              value={rule.amount}
              onValueChange={amount => {
                updateRule(index, {
                  amount,
                  rateType: 'FIXED',
                  minimumMinutes: durationMinutes,
                  ...(mode === 'charge'
                    ? { chargeMethod: 'FIXED_VISIT' as const, chargeableFlag: true }
                    : {}),
                })
              }}
              disabled={disabled}
              placeholder="0.00"
              required
              className="text-right"
            />
          </label>
        </td>
        <td className={cn(cellClass, 'text-right')}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0 text-destructive"
            onClick={() => removeRule(index)}
            disabled={disabled}
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>
    )
  }

  // —— Shared pay/charge layout (same rule definition UX) ——
  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-5">
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {mode === 'charge' ? 'Visit charge method' : 'Visit pay method'}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
              visitPayMethod === 'PRO_RATA_HOURLY'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/10'
            } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
          >
            <input
              type="radio"
              name={`${mode}-visit-rate-method`}
              className="shrink-0"
              checked={visitPayMethod === 'PRO_RATA_HOURLY'}
              onChange={() => onVisitPayMethodChange('PRO_RATA_HOURLY')}
              disabled={disabled}
            />
            <BillingFieldLabel
              label="Pro-rata (hourly)"
              tooltip={
                mode === 'charge'
                  ? 'Charge by £/hr for each day and time window. Visit length is pro-rated from the hourly rate.'
                  : 'Pay by £/hr for each day and time window. Visit length is pro-rated from the hourly rate.'
              }
              className="font-medium text-foreground"
            />
          </label>

          <label
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
              visitPayMethod === 'BOTH' || visitPayMethod === 'FIXED_BY_DURATION'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/10'
            } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
          >
            <input
              type="radio"
              name={`${mode}-visit-rate-method`}
              className="shrink-0"
              checked={visitPayMethod === 'BOTH' || visitPayMethod === 'FIXED_BY_DURATION'}
              onChange={() => onVisitPayMethodChange('BOTH')}
              disabled={disabled}
            />
            <BillingFieldLabel
              label="Non pro-rata (fixed + hourly)"
              tooltip="Flat £ only when the visit length matches a fixed slot (e.g. 15 or 30 min). If there is no exact slot, hourly £/hr is used (pro-rata)."
              className="font-medium text-foreground"
            />
          </label>
        </div>
      </fieldset>

      {showAddHourly ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
                <Clock className="h-4 w-4" aria-hidden />
              </span>
              <BillingFieldLabel
                label="Hourly rates"
                tooltip={
                  mode === 'charge'
                    ? 'Add £/hr for weekdays, weekends, and bank / org / public holidays. Used for visits over 1 hour, and for shorter visits when no exact fixed duration slot exists.'
                    : 'Add £/hr for weekdays, weekends, and bank / org / public holidays. Used for visits over 1 hour, and for shorter visits when no exact fixed duration slot exists. On special dates the matching holiday rate is used first.'
                }
                className="text-sm font-semibold text-foreground"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={addHourlyRule}
              disabled={disabled || !hasAvailableHourlyPeriod}
              title={
                hasAvailableHourlyPeriod
                  ? undefined
                  : 'Every day/time window already has an hourly rate'
              }
            >
              Add rate
            </Button>
          </div>
          {(() => {
            const items = (rules as PayCardRule[])
              .map((rule, index) => ({ rule, index }))
              .filter(({ rule }) => isHourlyPeriodRule(rule))
            if (items.length === 0) {
              return (
                <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                  No hourly rates yet. Add a rate, pick when it applies, then enter £/hr.
                </p>
              )
            }
            return (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="border-b border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-4">
                        When this rate applies
                      </th>
                      <th className="border-b border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Days &amp; times
                      </th>
                      {mode === 'pay' ? (
                        <th className="border-b border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          How it&apos;s paid
                        </th>
                      ) : null}
                      <th className="border-b border-border px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        £ per hour
                      </th>
                      <th className="w-14 border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(({ rule, index }) => renderDayTimePremiumCard(rule, index))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      ) : null}

      {showAddFixed ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <PoundSterling className="h-4 w-4" aria-hidden />
              </span>
              <BillingFieldLabel
                label="Fixed short visits"
                tooltip="Flat £ by visit length (and optional day/time)."
                className="text-sm font-semibold text-foreground"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => addFixedRule()}
                disabled={disabled}
              >
                Add visit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addStandardFixedSlots}
                disabled={disabled}
              >
                Add 15/30/45/60
              </Button>
            </div>
          </div>
          {(() => {
            const items = (rules as PayCardRule[])
              .map((rule, index) => ({ rule, index }))
              .filter(({ rule }) => isFixedVisitRule(rule))
            if (items.length === 0) {
              return (
                <p className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                  No fixed rates yet. Use <span className="font-medium">Add 15/30/45/60</span> for the usual set.
                </p>
              )
            }
            return (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="border-b border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-4">
                        Visit length
                      </th>
                      <th className="border-b border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Applies on
                      </th>
                      <th className="border-b border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        From
                      </th>
                      <th className="border-b border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Until
                      </th>
                      <th className="border-b border-border px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Flat £
                      </th>
                      <th className="w-14 border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(({ rule, index }) => renderFixedVisitCard(rule, index))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      ) : null}

      <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                <Moon className="h-4 w-4" aria-hidden />
              </span>
              <BillingFieldLabel
                label="Night duty"
                tooltip="Used only when the visit plan night duty is Sleeping night or Waking night. Add separate rates for weekdays, weekends, and holidays if they differ. Day visits still use the hourly / fixed rules above."
                className="text-sm font-semibold text-foreground"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={addSleepingNightRule}
                disabled={disabled || !canAddSleepingNight}
                title={
                  canAddSleepingNight
                    ? undefined
                    : 'A Sleeping night rate already exists for every day type'
                }
              >
                Sleeping night
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={addWakingNightRule}
                disabled={disabled || !canAddWakingNight}
                title={
                  canAddWakingNight
                    ? undefined
                    : 'A Waking night rate already exists for every day type'
                }
              >
                Waking night
              </Button>
            </div>
          </div>
          {(() => {
            const items = (rules as PayCardRule[])
              .map((rule, index) => ({ rule, index }))
              .filter(({ rule }) => isNightDutyChargeRule(rule as ChargeCardRule))
            if (items.length === 0) {
              return (
                <p className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                  Optional — add one or more rates (e.g. weekday and bank holiday). Flat £/night for sleeping nights, or £/hour for waking nights.
                </p>
              )
            }
            return (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="border-b border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-4">
                        Type
                      </th>
                      <th className="border-b border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Label
                      </th>
                      <th className="border-b border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Applies on
                      </th>
                      <th className="border-b border-border px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Rate
                      </th>
                      <th className="w-14 border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(({ rule, index }) => {
                      const isSleepIn =
                        rule.rateType === 'SLEEP_IN'
                        || (rule as ChargeCardRule).chargeMethod === 'SLEEP_IN'
                      const cellClass = 'border-b border-border px-3 py-2.5 align-top'
                      return (
                        <tr
                          key={index}
                          className={cn(
                            'transition-colors hover:bg-muted/40',
                            flashIndices.has(index) ? 'billing-rule-flash bg-primary/5' : '',
                          )}
                        >
                          <td className={cn(cellClass, 'first:pl-4')}>
                            <p className="text-sm font-medium text-foreground">
                              {getRuleRateTypeLabel(rule)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {isSleepIn
                                ? `Fixed — one amount for the whole night.`
                                : `Hourly — ${mode === 'charge' ? 'billed' : 'paid'} for the hours worked.`}
                            </p>
                            {flashIndices.has(index) ? (
                              <Badge variant="default" className="mt-1 inline-flex text-[10px] font-normal">
                                New
                              </Badge>
                            ) : null}
                          </td>
                          <td className={cellClass}>
                            <label className="block space-y-1 text-sm">
                              <span className="sr-only">Label</span>
                              <Input
                                value={rule.label ?? ''}
                                onChange={e => updateRule(index, { label: e.target.value })}
                                placeholder={
                                  isSleepIn
                                    ? 'e.g. Sleeping night — weekday'
                                    : 'e.g. Waking night — weekend'
                                }
                                disabled={disabled}
                              />
                            </label>
                          </td>
                          <td className={cellClass}>
                            <label className="block space-y-1 text-sm">
                              <span className="sr-only">Applies on</span>
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                value={rule.dayType}
                                onChange={e =>
                                  tryUpdateNightDutyDayType(index, e.target.value as BillingDayType)
                                }
                                disabled={disabled}
                              >
                                {BILLING_DAY_TYPE_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </label>
                          </td>
                          <td className={cn(cellClass, 'text-right')}>
                            <label className="block space-y-1 text-sm">
                              <span className="sr-only">
                                {getRuleAmountFieldLabel(rule)} <span className="text-destructive" aria-hidden>*</span>
                              </span>
                              <DecimalAmountInput
                                value={rule.amount}
                                onValueChange={amount => updateRule(index, { amount })}
                                disabled={disabled}
                                placeholder="0.00"
                                required
                                className="text-right"
                              />
                            </label>
                          </td>
                          <td className={cn(cellClass, 'text-right')}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 shrink-0 p-0 text-destructive"
                              onClick={() => removeRule(index)}
                              disabled={disabled}
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>

      <div className="space-y-3 border-t border-border pt-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setTravelOpen(o => !o)}
        >
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Car className="h-4 w-4" aria-hidden />
            </span>
            <BillingFieldLabel
              label={mode === 'charge' ? 'Travel & expenses (recharge)' : 'Travel & expenses'}
              tooltip={
                mode === 'charge'
                  ? 'Optional mileage (£/mile) and travel or waiting time (£/hr) recharged to the client/funder.'
                  : 'Optional mileage (£/mile) and travel or waiting time (£/hr).'
              }
              className="text-sm font-semibold text-foreground"
            />
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${travelOpen ? 'rotate-180' : ''}`} />
        </button>
        {travelOpen ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addMileageRule} disabled={disabled}>
                {mode === 'charge' ? 'Add mileage recharge' : 'Add mileage'}
              </Button>
              <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addTravelTimeRule} disabled={disabled}>
                Add travel time
              </Button>
              <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addWaitingTimeRule} disabled={disabled}>
                Add waiting time
              </Button>
            </div>
            {(() => {
              const items = groupedPayRules.get('Travel & expenses') ?? []
              if (items.length === 0) {
                return (
                  <p className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                    {mode === 'charge'
                      ? 'Optional — add only if this card recharges mileage or travel time.'
                      : 'Optional — add only if this card pays mileage or travel time.'}
                  </p>
                )
              }
              return (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map(({ rule, index }) => renderRuleCard(rule, index))}
                </div>
              )
            })()}
          </>
        ) : null}
      </div>

      {mode === 'pay' ? (
        <div className="space-y-3 border-t border-border pt-3" data-testid="additional-pay-section">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() => setAdditionalOpen(o => !o)}
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300">
                <Briefcase className="h-4 w-4" aria-hidden />
              </span>
              <BillingFieldLabel
                label="Additional pay"
                tooltip="Optional non-visit pay: overtime, on-call, training and live-in rates. Bonuses, adjustments, holiday and sick pay are entered as pay items (Billing → Pay items)."
                className="text-sm font-semibold text-foreground"
              />
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${additionalOpen ? 'rotate-180' : ''}`} />
          </button>
          {additionalOpen ? (
            <>
              <div className="flex flex-wrap gap-2">
                {ADDITIONAL_PAY_TYPES.map(t => {
                  const exists = payRules.some(r => r.rateType === t.rateType)
                  return (
                    <Button
                      key={t.rateType}
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                      onClick={() => addAdditionalPayRule(t.rateType)}
                      disabled={disabled || exists}
                      title={exists ? `This card already has a ${t.title.toLowerCase()} rate` : undefined}
                      data-testid={`add-additional-${t.rateType}`}
                    >
                      {t.title}
                    </Button>
                  )
                })}
              </div>
              {(() => {
                const items = payRules
                  .map((rule, index) => ({ rule, index }))
                  .filter(({ rule }) => isAdditionalPayRule(rule))
                if (!items.length) {
                  return (
                    <p className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                      Optional — add only the rates this card pays. Nothing changes for carers until a rate is added.
                    </p>
                  )
                }
                return <div className="flex flex-col">{items.map(({ rule, index }) => renderAdditionalPayRule(rule, index))}</div>
              })()}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
    </TooltipProvider>
  )
}
