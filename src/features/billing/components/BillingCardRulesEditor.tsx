import * as React from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import {
  BILLING_DAY_TYPE_OPTIONS,
  BILLING_VISIT_DURATION_OPTIONS,
  DEFAULT_VISIT_DURATION_MINUTES,
  PAY_CARD_RULE_CATEGORY_ORDER,
  PAY_ENHANCEMENT_METHOD_OPTIONS,
  categorizePayCardRule,
  formatPayCardRuleDayType,
  formatPayCardRuleTimeBand,
  formatVisitDurationLabel,
  type BillingDayType,
  type ChargeCardRule,
  type PayCardRule,
  type PayCardRuleCategory,
  type PayEnhancementMethod,
} from '@/features/billing/types/billing-cards.types'
import {
  PAY_TIME_PERIOD_LOOKUP,
  getPayTimePeriodByCode,
  matchPayTimePeriod,
  type PayTimePeriodCode,
} from '@/features/billing/data/pay-time-period.lookup'
import {
  applyDurationChangeToChargeRule,
  applyDurationChangeToRule,
  getRuleAmountFieldLabel,
  getRuleChargeMethodLabel,
  getRuleRateTypeLabel,
  isHourlyLongChargeRule,
  isHourlyLongVisitRule,
  isMileageRule,
  isTimeBandRule,
  isTravelOrWaitingRule,
  isTravelTimeRule,
  isWaitingTimeRule,
} from '@/features/billing/utils/billing-card-rule.util'

type RuleMode = 'pay' | 'charge'

type BillingCardRulesEditorProps = {
  mode: RuleMode
  rules: PayCardRule[] | ChargeCardRule[]
  onChange: (rules: PayCardRule[] | ChargeCardRule[]) => void
  disabled?: boolean
}

type VisitPayMethod = 'PRO_RATA_HOURLY' | 'FIXED_BY_DURATION' | 'BOTH'

function emptyFixedPayRule(minutes = DEFAULT_VISIT_DURATION_MINUTES): PayCardRule {
  return {
    label: `${formatVisitDurationLabel(minutes) ?? `${minutes} min`} visit`,
    dayType: 'ANY',
    rateType: 'FIXED',
    amount: 0,
    minimumMinutes: minutes,
    sortOrder: 0,
  }
}

function emptyFixedChargeRule(): ChargeCardRule {
  return {
    ...emptyFixedPayRule(),
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
    startTime: period.startTime,
    endTime: period.endTime,
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
  return rule.rateType === 'FIXED'
}

/** Prefer weekday daytime (or open all-day) absolute rate as the linked base for uplifts. */
function resolveLinkedBaseHourly(rules: PayCardRule[]): {
  amount: number
  label: string
  index: number
} | null {
  const candidates = rules
    .map((rule, index) => ({ rule, index }))
    .filter(({ rule }) => {
      if (!isHourlyPeriodRule(rule) || Number(rule.amount) <= 0) return false
      const method = rule.enhancementMethod ?? 'ABSOLUTE_HOURLY'
      return method === 'ABSOLUTE_HOURLY'
    })
  if (!candidates.length) return null

  const score = (rule: PayCardRule) => {
    const start = rule.startTime?.trim() || null
    const end = rule.endTime?.trim() || null
    let s = 0
    if (!start && !end && (rule.dayType === 'ANY' || rule.dayType === 'WEEKDAY')) s += 100
    if (rule.dayType === 'WEEKDAY' || rule.dayType === 'ANY') s += 20
    if (start === '07:00' || start === '06:00' || start === '08:00') s += 30
    if (end === '19:00' || end === '18:00' || end === '20:00') s += 20
    if ((rule.label ?? '').toLowerCase().includes('daytime')) s += 15
    return s
  }

  candidates.sort((a, b) => score(b.rule) - score(a.rule) || Number(b.rule.amount) - Number(a.rule.amount))
  const best = candidates[0]
  if (!best) return null
  return {
    amount: Number(best.rule.amount),
    label: best.rule.label?.trim() || 'Weekday daytime',
    index: best.index,
  }
}

function enhancementAmountLabel(method: PayEnhancementMethod): string {
  switch (method) {
    case 'ADDITIONAL_PER_HOUR':
      return 'Additional £/hr'
    case 'PERCENTAGE_UPLIFT':
      return 'Uplift (%)'
    case 'MULTIPLIER':
      return 'Multiplier'
    case 'FIXED_SHIFT_ALLOWANCE':
      return 'Shift allowance (£)'
    case 'ABSOLUTE_HOURLY':
    default:
      return 'Hourly rate for this period (£/hr)'
  }
}

/** Methods that need another absolute daytime rate as starting point. */
function enhancementNeedsBase(method: PayEnhancementMethod): boolean {
  return (
    method === 'ADDITIONAL_PER_HOUR'
    || method === 'PERCENTAGE_UPLIFT'
    || method === 'MULTIPLIER'
    || method === 'FIXED_SHIFT_ALLOWANCE'
  )
}

function formatGbpRate(amount: number): string {
  return `£${amount.toFixed(2)}`
}

function previewPremiumEffect(
  method: PayEnhancementMethod,
  rule: PayCardRule,
  baseAmount: number | null,
): string | null {
  const amount = Number(rule.amount) || 0
  const add = Number(rule.additionalAmount ?? rule.amount) || 0
  const pct = Number(rule.percentageUplift ?? rule.amount) || 0
  const mult = Number(rule.multiplier ?? rule.amount) || 0

  if (method === 'ABSOLUTE_HOURLY') {
    const band = formatPayCardRuleTimeBand(rule)
    const day = formatPayCardRuleDayType(rule.dayType)
    if (amount <= 0) return 'Set the £/hr for this day and time window.'
    return band
      ? `Paid ${formatGbpRate(amount)}/hr for ${day} ${band}.`
      : `Paid ${formatGbpRate(amount)}/hr for ${day} (whole day).`
  }
  if (baseAmount == null || baseAmount <= 0) {
    return 'Add a weekday daytime (or all-day) absolute rate first — this method needs it as a starting point.'
  }
  if (method === 'ADDITIONAL_PER_HOUR') {
    return `Effective ${formatGbpRate(baseAmount + add)}/hr (${formatGbpRate(baseAmount)} + ${formatGbpRate(add)}).`
  }
  if (method === 'PERCENTAGE_UPLIFT') {
    const effective = baseAmount * (1 + pct / 100)
    return `Effective ${formatGbpRate(effective)}/hr (${formatGbpRate(baseAmount)} × ${pct}%).`
  }
  if (method === 'MULTIPLIER') {
    return `Effective ${formatGbpRate(baseAmount * mult)}/hr (${formatGbpRate(baseAmount)} × ${mult}).`
  }
  if (method === 'FIXED_SHIFT_ALLOWANCE') {
    return `${formatGbpRate(baseAmount)}/hr in this window, plus ${formatGbpRate(amount)} flat allowance.`
  }
  return null
}

function emptyHourlyChargeRule(): ChargeCardRule {
  return {
    label: 'Hourly (over 1 hour)',
    dayType: 'WEEKDAY',
    rateType: 'HOURLY',
    amount: 0,
    enhancementMethod: 'ABSOLUTE_HOURLY',
    chargeMethod: 'HOURLY_PRO_RATA',
    chargeableFlag: true,
    sortOrder: 0,
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

function ruleDurationMinutes(rule: PayCardRule): number {
  return rule.minimumMinutes && rule.minimumMinutes > 0
    ? rule.minimumMinutes
    : DEFAULT_VISIT_DURATION_MINUTES
}

function isHourlyRule(rule: PayCardRule, mode: RuleMode): boolean {
  return mode === 'charge'
    ? isHourlyLongChargeRule(rule as ChargeCardRule)
    : isHourlyLongVisitRule(rule) || isTimeBandRule(rule)
}

function isSupplementRule(rule: PayCardRule): boolean {
  return isMileageRule(rule) || isTravelOrWaitingRule(rule)
}

function deriveVisitPayMethod(rules: PayCardRule[]): VisitPayMethod {
  const hasFixed = rules.some(isFixedVisitRule)
  const hasHourly = rules.some(isHourlyPeriodRule)
  if (hasFixed && hasHourly) return 'BOTH'
  if (hasFixed) return 'FIXED_BY_DURATION'
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

function ruleTitle(rule: PayCardRule, index: number): string {
  if (rule.label?.trim()) return rule.label.trim()
  const day = formatPayCardRuleDayType(rule.dayType)
  const band = formatPayCardRuleTimeBand(rule)
  if (band) return `${day} · ${band}`
  if (rule.rateType === 'FIXED') {
    return `${day} · ${formatVisitDurationLabel(rule.minimumMinutes) ?? 'visit'}`
  }
  return getRuleRateTypeLabel(rule) || `Rule ${index + 1}`
}

const METHOD_HELP: Record<VisitPayMethod, string> = {
  PRO_RATA_HOURLY:
    'Add an hourly rate for each day/time you need (e.g. Weekday daytime 07:00–19:00). Visits in that window use that £/hr.',
  FIXED_BY_DURATION:
    'Flat amounts for 15 / 30 / 45 / 60-minute visits. Hourly day/time rates are removed while this method is selected.',
  BOTH:
    'Fixed amounts for visits up to 1 hour, plus hourly rates by day and time for longer visits or banded pay.',
}

function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-sm font-semibold text-foreground">{title}</h5>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  )
}

export function BillingCardRulesEditor({ mode, rules, onChange, disabled }: BillingCardRulesEditorProps) {
  const payRules = rules as PayCardRule[]
  const [visitPayMethod, setVisitPayMethod] = React.useState<VisitPayMethod>(() =>
    mode === 'pay' ? deriveVisitPayMethod(payRules) : 'PRO_RATA_HOURLY',
  )
  const [travelOpen, setTravelOpen] = React.useState(() =>
    mode === 'pay' && payRules.some(r => isSupplementRule(r)),
  )
  const [advancedOpen, setAdvancedOpen] = React.useState<Record<number, boolean>>({})
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
    if (mode === 'pay' && (rules as PayCardRule[]).some(r => isSupplementRule(r))) {
      setTravelOpen(true)
    }
  }, [mode, rules])

  // Keep radio in sync when rules are loaded/remounted (source of truth is the rule set).
  React.useEffect(() => {
    if (mode !== 'pay') return
    setVisitPayMethod(deriveVisitPayMethod(rules as PayCardRule[]))
  }, [mode, rules])

  const onVisitPayMethodChange = (method: VisitPayMethod) => {
    if (mode !== 'pay' || method === visitPayMethod) return
    setVisitPayMethod(method)
    onChange(applyVisitPayMethod(payRules, method))
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
        ? [emptyFixedChargeRule(), ...rules]
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
    const added: PayCardRule[] = []
    for (const opt of BILLING_VISIT_DURATION_OPTIONS) {
      if (!existing.has(opt.value)) added.push(emptyFixedPayRule(opt.value))
    }
    onChange([...added, ...(rules as PayCardRule[])])
    flashNewRules(added.length)
  }

  const addHourlyRule = () => {
    onChange(
      mode === 'charge'
        ? [emptyHourlyChargeRule(), ...rules]
        : [emptyHourlyPayRule('WEEKDAY_DAYTIME'), ...rules],
    )
    flashNewRules(1)
  }

  const addTimeBandRule = () => {
    onChange([emptyHourlyPayRule('WEEKDAY_EVENING'), ...rules])
    flashNewRules(1)
  }

  const applyPeriodToRule = (index: number, code: PayTimePeriodCode) => {
    const period = getPayTimePeriodByCode(code)
    if (!period) return
    updateRule(index, {
      label: period.label,
      dayType: period.dayType,
      startTime: period.startTime,
      endTime: period.endTime,
      priority: period.priority,
      rateType: 'HOURLY',
    })
  }

  const setEnhancementMethod = (index: number, method: PayEnhancementMethod) => {
    updateRule(index, {
      enhancementMethod: method,
      ...(method === 'MULTIPLIER' ? { multiplier: 1.5, amount: 1.5 } : {}),
      ...(method === 'PERCENTAGE_UPLIFT' ? { percentageUplift: 25, amount: 25 } : {}),
      ...(method === 'ADDITIONAL_PER_HOUR' ? { additionalAmount: 2, amount: 2 } : {}),
      ...(method === 'FIXED_SHIFT_ALLOWANCE' ? { amount: 25 } : {}),
      ...(method === 'ABSOLUTE_HOURLY' ? { amount: 0 } : {}),
    })
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
    onChange([emptyTravelTimePayRule(), ...rules])
    setTravelOpen(true)
    flashNewRules(1)
  }

  const addWaitingTimeRule = () => {
    onChange([emptyWaitingTimePayRule(), ...rules])
    setTravelOpen(true)
    flashNewRules(1)
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

  const showAddHourly = mode === 'charge' || visitPayMethod === 'PRO_RATA_HOURLY' || visitPayMethod === 'BOTH'
  const showAddFixed = mode === 'charge' || visitPayMethod === 'FIXED_BY_DURATION' || visitPayMethod === 'BOTH'

  const linkedBase = React.useMemo(
    () => (mode === 'pay' ? resolveLinkedBaseHourly(rules as PayCardRule[]) : null),
    [mode, rules],
  )

  const setEnhancementMethodSafe = (index: number, method: PayEnhancementMethod) => {
    if (enhancementNeedsBase(method) && !linkedBase) {
      // Fall back to replacement rate until a base exists.
      setEnhancementMethod(index, 'ABSOLUTE_HOURLY')
      return
    }
    setEnhancementMethod(index, method)
  }

  const groupedPayRules = React.useMemo(() => {
    if (mode !== 'pay') return null
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
  }, [mode, rules])

  const renderRuleCard = (rule: PayCardRule, index: number) => {
    const hourly = isHourlyRule(rule, mode)
    const mileage = isMileageRule(rule)
    const travelTime = isTravelTimeRule(rule)
    const waitingTime = isWaitingTimeRule(rule)
    const timeBand = mode === 'pay' && isTimeBandRule(rule)
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
            <span className="text-xs text-muted-foreground">Label</span>
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
              <span className="text-xs text-muted-foreground">Visit duration</span>
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
                    label: rule.label?.trim()
                      ? rule.label
                      : `${formatVisitDurationLabel(nextMinutes) ?? `${nextMinutes} min`} visit`,
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
              <span className="text-xs text-muted-foreground">Day type</span>
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

          {timeBand ? (
            <>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Band start (HH:mm)</span>
                <Input
                  value={rule.startTime ?? ''}
                  onChange={e => updateRule(index, { startTime: e.target.value || null })}
                  placeholder="e.g. 18:00"
                  disabled={disabled}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Band end (HH:mm)</span>
                <Input
                  value={rule.endTime ?? ''}
                  onChange={e => updateRule(index, { endTime: e.target.value || null })}
                  placeholder="e.g. 22:00"
                  disabled={disabled}
                />
              </label>
            </>
          ) : null}

          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">{amountLabel}</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={rule.amount}
              onChange={e => {
                const amount = Number(e.target.value)
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
              disabled={disabled}
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
                        : `Flat fee for one ${formatVisitDurationLabel(durationMinutes)?.toLowerCase()} visit`}
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
                {timeBand ? (
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">Enhancement method</span>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={rule.enhancementMethod ?? 'ABSOLUTE_HOURLY'}
                      onChange={e =>
                        updateRule(index, {
                          enhancementMethod: e.target.value as PayEnhancementMethod,
                        })
                      }
                      disabled={disabled}
                    >
                      {PAY_ENHANCEMENT_METHOD_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
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
    const matched = matchPayTimePeriod(rule)
    const method = (rule.enhancementMethod ?? 'ABSOLUTE_HOURLY') as PayEnhancementMethod
    const methodMeta = PAY_ENHANCEMENT_METHOD_OPTIONS.find(o => o.value === method)
    const showAdvanced = Boolean(advancedOpen[index])
    const needsBase = enhancementNeedsBase(method)
    const preview = previewPremiumEffect(method, rule, linkedBase?.amount ?? null)

    return (
      <div key={index} className={ruleShellClass(index)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground truncate">{ruleTitle(rule, index)}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px] font-normal">
                Hourly by day & time
              </Badge>
              {flashIndices.has(index) ? (
                <Badge variant="default" className="text-[10px] font-normal">
                  New
                </Badge>
              ) : null}
              {method === 'ABSOLUTE_HOURLY' ? (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {formatPayCardRuleDayType(rule.dayType)}
                  {formatPayCardRuleTimeBand(rule) ? ` · ${formatPayCardRuleTimeBand(rule)}` : ' · all day'}
                </Badge>
              ) : linkedBase ? (
                <Badge variant="outline" className="text-[10px] font-normal">
                  From {linkedBase.label}: {formatGbpRate(linkedBase.amount)}/hr
                </Badge>
              ) : (
                <Badge variant="warning" className="text-[10px] font-normal">
                  Needs a daytime absolute rate
                </Badge>
              )}
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

        <div
          className={`rounded-md border px-3 py-2 text-xs ${
            linkedBase
              ? 'border-primary/30 bg-primary/5 text-foreground'
              : 'border-amber-500/40 bg-amber-500/10 text-foreground'
          }`}
        >
          {linkedBase && method !== 'ABSOLUTE_HOURLY' ? (
            <p>
              Starts from <span className="font-medium">{linkedBase.label}</span>
              {' '}({formatGbpRate(linkedBase.amount)}/hr), then applies this period’s uplift.
            </p>
          ) : method === 'ABSOLUTE_HOURLY' ? (
            <p>
              Choose the <span className="font-medium">day and time</span> below — this £/hr applies only when the visit falls in that window.
            </p>
          ) : (
            <p>
              Add a <span className="font-medium">Weekday daytime</span> (or all-day) absolute hourly rate first if you want +£/%/multiplier methods.
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-xs text-muted-foreground">Standard period</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={matched?.code ?? ''}
              onChange={e => {
                const code = e.target.value as PayTimePeriodCode
                if (code) applyPeriodToRule(index, code)
              }}
              disabled={disabled}
            >
              <option value="">Custom day / times below…</option>
              {PAY_TIME_PERIOD_LOOKUP.map(p => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Sets day type and the clock window when this rate applies.
            </p>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Day type</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={rule.dayType}
              onChange={e => updateRule(index, { dayType: e.target.value as BillingDayType })}
              disabled={disabled}
            >
              {BILLING_DAY_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Applies from (HH:mm)</span>
            <Input
              value={rule.startTime ?? ''}
              onChange={e => updateRule(index, { startTime: e.target.value || null })}
              placeholder="Blank = start of day"
              disabled={disabled}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Applies until (HH:mm)</span>
            <Input
              value={rule.endTime ?? ''}
              onChange={e => updateRule(index, { endTime: e.target.value || null })}
              placeholder="Blank = end of day"
              disabled={disabled}
            />
          </label>

          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-xs text-muted-foreground">How this period pays</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={method}
              onChange={e => setEnhancementMethodSafe(index, e.target.value as PayEnhancementMethod)}
              disabled={disabled}
            >
              {PAY_ENHANCEMENT_METHOD_OPTIONS.map(opt => {
                const blocked = enhancementNeedsBase(opt.value) && !linkedBase
                return (
                  <option key={opt.value} value={opt.value} disabled={blocked}>
                    {opt.label}{blocked ? ' (needs base hourly)' : ''}
                  </option>
                )
              })}
            </select>
            {methodMeta ? (
              <p className="text-xs text-muted-foreground">{methodMeta.hint}</p>
            ) : null}
            {needsBase && !linkedBase ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                This method was blocked until a base hourly exists under Base rates.
              </p>
            ) : null}
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">{enhancementAmountLabel(method)}</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={
                method === 'PERCENTAGE_UPLIFT'
                  ? (rule.percentageUplift ?? rule.amount)
                  : method === 'MULTIPLIER'
                    ? (rule.multiplier ?? rule.amount)
                    : method === 'ADDITIONAL_PER_HOUR'
                      ? (rule.additionalAmount ?? rule.amount)
                      : rule.amount
              }
              onChange={e => {
                const value = Number(e.target.value)
                if (method === 'PERCENTAGE_UPLIFT') {
                  updateRule(index, { percentageUplift: value, amount: value, enhancementMethod: method })
                } else if (method === 'MULTIPLIER') {
                  updateRule(index, { multiplier: value, amount: value, enhancementMethod: method })
                } else if (method === 'ADDITIONAL_PER_HOUR') {
                  updateRule(index, { additionalAmount: value, amount: value, enhancementMethod: method })
                } else {
                  updateRule(index, { amount: value, enhancementMethod: method, rateType: 'HOURLY' })
                }
              }}
              disabled={disabled}
            />
            {preview ? <p className="text-xs text-muted-foreground">{preview}</p> : null}
          </label>
        </div>

        <div className="space-y-2 border-t border-border pt-2">
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => toggleAdvanced(index)}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Label & notes
          </button>
          {showAdvanced ? (
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Label</span>
              <Input
                value={rule.label ?? ''}
                onChange={e => updateRule(index, { label: e.target.value })}
                disabled={disabled}
              />
            </label>
          ) : null}
        </div>
      </div>
    )
  }

  // —— Charge mode: keep simpler flat layout ——
  if (mode === 'charge') {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">Rate rules</h4>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => addFixedRule()} disabled={disabled}>
              Add fixed visit rule
            </Button>
            <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addHourlyRule} disabled={disabled}>
              Add hourly rule
            </Button>
            <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addMileageRule} disabled={disabled}>
              Add mileage recharge
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Fixed rates apply to visits up to 1 hour. Longer visits use hourly × duration. Mileage recharge bills the client/funder per mile when the contract allows it.
        </p>
        {rules.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
            No rules yet. Add at least one rate rule before activating this card.
          </p>
        ) : (
          <div className="space-y-3">
            {(rules as ChargeCardRule[]).map((rule, index) => renderRuleCard(rule, index))}
          </div>
        )}
      </div>
    )
  }

  // —— Pay mode: sectioned layout ——
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">1. Visit pay method</h4>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              { value: 'PRO_RATA_HOURLY' as const, label: 'Pro-rata hourly' },
              { value: 'FIXED_BY_DURATION' as const, label: 'Fixed by visit length' },
              { value: 'BOTH' as const, label: 'Both (fixed + hourly)' },
            ]
          ).map(opt => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                visitPayMethod === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/10'
              } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <input
                type="radio"
                className="mt-1"
                name="visitPayMethod"
                checked={visitPayMethod === opt.value}
                onChange={() => onVisitPayMethodChange(opt.value)}
                disabled={disabled}
              />
              <span className="font-medium">{opt.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{METHOD_HELP[visitPayMethod]}</p>
      </div>

      <div className="space-y-4">
        <SectionHeading
          title="2. Visit & time rates"
          description={
            visitPayMethod === 'FIXED_BY_DURATION'
              ? 'Set a flat £ amount for each visit length. These rates are saved with the card.'
              : visitPayMethod === 'BOTH'
                ? 'Fixed rates for short visits, plus hourly rates by day and time for longer or banded pay.'
                : 'Each hourly rate is for a specific day and time (e.g. Weekday daytime 07:00–19:00). Add another rate for evening, night, weekend, etc.'
          }
          actions={(
            <>
              {showAddHourly ? (
                <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addHourlyRule} disabled={disabled}>
                  Add weekday daytime
                </Button>
              ) : null}
              {showAddHourly ? (
                <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addTimeBandRule} disabled={disabled}>
                  Add another day/time
                </Button>
              ) : null}
              {showAddFixed ? (
                <>
                  <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => addFixedRule()} disabled={disabled}>
                    Add fixed visit
                  </Button>
                  <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addStandardFixedSlots} disabled={disabled}>
                    Add 15/30/45/60 slots
                  </Button>
                </>
              ) : null}
            </>
          )}
        />

        {showAddHourly ? (
          <div className="space-y-2">
            <h6 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hourly rates by day & time
            </h6>
            {(() => {
              const items = (rules as PayCardRule[])
                .map((rule, index) => ({ rule, index }))
                .filter(({ rule }) => isHourlyPeriodRule(rule))
              if (items.length === 0) {
                return (
                  <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                    No hourly rates yet. Start with <span className="font-medium">Add weekday daytime</span>, set the £/hr, then add evening/night/weekend as needed.
                  </p>
                )
              }
              return (
                <div className="space-y-3">
                  {items.map(({ rule, index }) => renderDayTimePremiumCard(rule, index))}
                </div>
              )
            })()}
          </div>
        ) : null}

        {showAddFixed ? (
          <div className="space-y-2">
            <h6 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fixed visit rates</h6>
            {(() => {
              const items = (rules as PayCardRule[])
                .map((rule, index) => ({ rule, index }))
                .filter(({ rule }) => isFixedVisitRule(rule))
              if (items.length === 0) {
                return (
                  <p className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                    No fixed visit rates yet.
                  </p>
                )
              }
              return (
                <div className="space-y-3">
                  {items.map(({ rule, index }) => renderRuleCard(rule, index))}
                </div>
              )
            })()}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setTravelOpen(o => !o)}
        >
          <div>
            <h5 className="text-sm font-semibold text-foreground">3. Travel & expenses</h5>
            <p className="text-xs text-muted-foreground">
              Mileage (£/mile), travel time and waiting time (£/hr) between visits.
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${travelOpen ? 'rotate-180' : ''}`} />
        </button>
        {travelOpen ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addMileageRule} disabled={disabled}>
                Add mileage
              </Button>
              <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addTravelTimeRule} disabled={disabled}>
                Add travel time
              </Button>
              <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addWaitingTimeRule} disabled={disabled}>
                Add waiting time
              </Button>
            </div>
            {(() => {
              const items = groupedPayRules?.get('Travel & expenses') ?? []
              if (items.length === 0) {
                return (
                  <p className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                    Optional. Without a travel time rate, qualifying inter-visit gaps still count toward NMW hours.
                  </p>
                )
              }
              return (
                <div className="space-y-3">
                  {items.map(({ rule, index }) => renderRuleCard(rule, index))}
                </div>
              )
            })()}
          </>
        ) : null}
      </div>
    </div>
  )
}
