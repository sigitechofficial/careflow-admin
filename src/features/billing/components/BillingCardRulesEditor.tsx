import * as React from 'react'
import { Car, ChevronDown, Clock, Plus, PoundSterling, Trash2 } from 'lucide-react'
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
  type BillingDayType,
  type ChargeCardRule,
  type PayCardRule,
  type PayCardRuleCategory,
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
    startTime: '00:00',
    endTime: '23:59',
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

export function BillingCardRulesEditor({ mode, rules, onChange, disabled }: BillingCardRulesEditorProps) {
  const payRules = rules as PayCardRule[]
  const [visitPayMethod, setVisitPayMethod] = React.useState<VisitPayMethod>(() =>
    mode === 'pay' ? deriveVisitPayMethod(payRules) : 'PRO_RATA_HOURLY',
  )
  const [travelOpen, setTravelOpen] = React.useState(() =>
    mode === 'pay' && payRules.some(r => isSupplementRule(r)),
  )
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
    if (mode === 'charge') {
      onChange([emptyHourlyChargeRule(), ...rules])
      flashNewRules(1)
      return
    }

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

    onChange([emptyHourlyPayRule(nextPeriod.code), ...existing])
    flashNewRules(1)
  }

  const applyPeriodToRule = (index: number, code: PayTimePeriodCode): boolean => {
    const period = getPayTimePeriodByCode(code)
    if (!period) return false
    const candidate: PayCardRule = {
      ...(rules[index] as PayCardRule),
      label: period.label,
      dayType: period.dayType,
      startTime: period.startTime ?? '00:00',
      endTime: period.endTime ?? '23:59',
      priority: period.priority,
      rateType: 'HOURLY',
      enhancementMethod: 'ABSOLUTE_HOURLY',
    }
    const overlap = findOverlappingHourlyPayRule(rules as PayCardRule[], candidate, index)
    if (overlap) {
      toastWarning('Overlapping period', formatHourlyOverlapMessage(candidate, overlap.rule))
      return false
    }
    updateRule(index, {
      label: period.label,
      dayType: period.dayType,
      startTime: period.startTime ?? '00:00',
      endTime: period.endTime ?? '23:59',
      priority: period.priority,
      rateType: 'HOURLY',
      enhancementMethod: 'ABSOLUTE_HOURLY',
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
      toastWarning('Overlapping period', formatHourlyOverlapMessage(candidate, overlap.rule))
      return false
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

  const hasAvailableHourlyPeriod = React.useMemo(() => {
    if (mode !== 'pay') return true
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
  }, [mode, rules])

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
                <span className="text-xs font-medium text-foreground/90">From (HH:mm)</span>
                <Input
                  value={rule.startTime ?? ''}
                  onChange={e => updateRule(index, { startTime: e.target.value || null })}
                  placeholder="Blank = start of day"
                  disabled={disabled}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs font-medium text-foreground/90">Until (HH:mm)</span>
                <Input
                  value={rule.endTime ?? ''}
                  onChange={e => updateRule(index, { endTime: e.target.value || null })}
                  placeholder="Blank = end of day"
                  disabled={disabled}
                />
              </label>
            </>
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
            <span className="text-xs font-medium text-foreground/90">{amountLabel}</span>
            <Input
              type="text"
              inputMode="decimal"
              value={rule.amount === 0 || rule.amount == null ? '' : String(rule.amount)}
              onChange={e => {
                const raw = e.target.value.trim()
                const amount = raw === '' ? 0 : Number(raw)
                if (Number.isNaN(amount)) return
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
              placeholder="0.00"
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
    const fieldLabelClass = 'text-xs font-medium text-foreground/90'
    const isPeriodTaken = (code: PayTimePeriodCode) => {
      if (matched?.code === code) return false
      const period = getPayTimePeriodByCode(code)
      if (!period) return false
      return Boolean(
        findOverlappingHourlyPayRule(
          rules as PayCardRule[],
          {
            label: period.label,
            dayType: period.dayType,
            startTime: period.startTime ?? '00:00',
            endTime: period.endTime ?? '23:59',
            rateType: 'HOURLY',
          },
          index,
        ),
      )
    }

    return (
      <div key={index} className={ruleShellClass(index)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground truncate">
              {matched?.label ?? (rule.label?.trim() || 'Custom period')}
            </p>
            {flashIndices.has(index) ? (
              <Badge variant="default" className="text-[10px] font-normal">
                New
              </Badge>
            ) : null}
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

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className={fieldLabelClass}>
              When this rate applies <span className="text-destructive" aria-hidden>*</span>
            </span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={matched?.code ?? ''}
              onChange={e => {
                const code = e.target.value as PayTimePeriodCode
                if (code) {
                  if (applyPeriodToRule(index, code)) {
                    setForceCustomPeriod(prev => ({ ...prev, [index]: false }))
                  }
                } else {
                  const ok = tryUpdateHourlyWindow(index, {
                    label: 'Custom period',
                    enhancementMethod: 'ABSOLUTE_HOURLY',
                    startTime: rule.startTime?.trim() || '00:00',
                    endTime: rule.endTime?.trim() || '23:59',
                  })
                  if (ok) setForceCustomPeriod(prev => ({ ...prev, [index]: true }))
                }
              }}
              disabled={disabled}
              required
            >
              <option value="">Custom…</option>
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

          <label className="space-y-1 text-sm">
            <span className={fieldLabelClass}>
              £ per hour <span className="text-destructive" aria-hidden>*</span>
            </span>
            <Input
              type="text"
              inputMode="decimal"
              value={rule.amount === 0 || rule.amount == null ? '' : String(rule.amount)}
              onChange={e => {
                const raw = e.target.value.trim()
                const value = raw === '' ? 0 : Number(raw)
                if (Number.isNaN(value)) return
                updateRule(index, {
                  amount: value,
                  enhancementMethod: 'ABSOLUTE_HOURLY',
                  rateType: 'HOURLY',
                })
              }}
              disabled={disabled}
              placeholder="0.00"
              required
            />
          </label>

          {isCustom ? (
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className={fieldLabelClass}>
                Applies on <span className="text-destructive" aria-hidden>*</span>
              </span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={rule.dayType}
                onChange={e => {
                  const dayType = e.target.value as BillingDayType
                  tryUpdateHourlyWindow(index, {
                    dayType,
                    label: 'Custom period',
                    enhancementMethod: 'ABSOLUTE_HOURLY',
                  })
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

          <label className="space-y-1 text-sm">
            <span className={fieldLabelClass}>
              From (HH:mm) <span className="text-destructive" aria-hidden>*</span>
            </span>
            <Input
              value={rule.startTime ?? ''}
              onChange={e => {
                const startTime = e.target.value || null
                const ok = tryUpdateHourlyWindow(index, {
                  startTime,
                  label: matched?.label ?? rule.label ?? 'Custom period',
                })
                if (ok && matched) setForceCustomPeriod(prev => ({ ...prev, [index]: false }))
              }}
              placeholder="HH:mm"
              disabled={disabled}
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className={fieldLabelClass}>
              Until (HH:mm) <span className="text-destructive" aria-hidden>*</span>
            </span>
            <Input
              value={rule.endTime ?? ''}
              onChange={e => {
                tryUpdateHourlyWindow(index, {
                  endTime: e.target.value || null,
                  label: matched?.label ?? rule.label ?? 'Custom period',
                })
              }}
              placeholder="HH:mm"
              disabled={disabled}
              required
            />
          </label>
        </div>
      </div>
    )
  }

  const renderFixedVisitCard = (rule: PayCardRule, index: number) => {
    const durationMinutes = ruleDurationMinutes(rule)
    const fieldLabelClass = 'text-xs font-medium text-foreground/90'
    const band = formatPayCardRuleTimeBand(rule)

    return (
      <div key={index} className={ruleShellClass(index)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-foreground truncate">
              {rule.label?.trim()
                || `${formatVisitDurationLabel(durationMinutes) ?? `${durationMinutes} min`} visit`}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatPayCardRuleDayType(rule.dayType)}
              {band ? ` · ${band}` : ' · any time'}
            </p>
          </div>
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
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className={fieldLabelClass}>
              Visit length <span className="text-destructive" aria-hidden>*</span>
            </span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={durationMinutes}
              onChange={e => {
                const nextMinutes = Number(e.target.value)
                const next = applyDurationChangeToRule(rule, nextMinutes)
                replaceRule(index, {
                  ...next,
                  label: rule.label?.trim()
                    ? rule.label
                    : `${formatVisitDurationLabel(nextMinutes) ?? `${nextMinutes} min`} visit`,
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
          <label className="space-y-1 text-sm">
            <span className={fieldLabelClass}>
              Flat £ <span className="text-destructive" aria-hidden>*</span>
            </span>
            <Input
              type="text"
              inputMode="decimal"
              value={rule.amount === 0 || rule.amount == null ? '' : String(rule.amount)}
              onChange={e => {
                const raw = e.target.value.trim()
                const amount = raw === '' ? 0 : Number(raw)
                if (Number.isNaN(amount)) return
                updateRule(index, {
                  amount,
                  rateType: 'FIXED',
                  minimumMinutes: durationMinutes,
                })
              }}
              disabled={disabled}
              placeholder="0.00"
              required
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className={fieldLabelClass}>
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
          <label className="space-y-1 text-sm">
            <span className={fieldLabelClass}>
              From (HH:mm) <span className="text-destructive" aria-hidden>*</span>
            </span>
            <Input
              value={rule.startTime ?? ''}
              onChange={e => updateRule(index, { startTime: e.target.value || null })}
              placeholder="HH:mm"
              disabled={disabled}
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className={fieldLabelClass}>
              Until (HH:mm) <span className="text-destructive" aria-hidden>*</span>
            </span>
            <Input
              value={rule.endTime ?? ''}
              onChange={e => updateRule(index, { endTime: e.target.value || null })}
              placeholder="HH:mm"
              disabled={disabled}
              required
            />
          </label>
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

  // —— Pay mode: simple layout ——
  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-5">
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Visit pay method
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
              name="visit-pay-method"
              className="shrink-0"
              checked={visitPayMethod === 'PRO_RATA_HOURLY'}
              onChange={() => onVisitPayMethodChange('PRO_RATA_HOURLY')}
              disabled={disabled}
            />
            <BillingFieldLabel
              label="Pro-rata (hourly)"
              tooltip="Pay by £/hr for each day and time window. Visit length is pro-rated from the hourly rate."
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
              name="visit-pay-method"
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
                tooltip="Add £/hr for weekdays, weekends, and bank / org / public holidays. Used for visits over 1 hour, and for shorter visits when no exact fixed duration slot exists. On special dates the matching holiday rate is used first."
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
              <div className="space-y-3">
                {items.map(({ rule, index }) => renderDayTimePremiumCard(rule, index))}
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
              <div className="space-y-3">
                {items.map(({ rule, index }) => renderFixedVisitCard(rule, index))}
              </div>
            )
          })()}
        </div>
      ) : null}

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
              label="Travel & expenses"
              tooltip="Optional mileage (£/mile) and travel or waiting time (£/hr)."
              className="text-sm font-semibold text-foreground"
            />
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
                    Optional — add only if this card pays mileage or travel time.
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
    </TooltipProvider>
  )
}
