import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  BILLING_DAY_TYPE_OPTIONS,
  BILLING_VISIT_DURATION_OPTIONS,
  DEFAULT_VISIT_DURATION_MINUTES,
  formatVisitDurationLabel,
  type BillingDayType,
  type ChargeCardRule,
  type PayCardRule,
} from '@/features/billing/types/billing-cards.types'
import {
  applyDurationChangeToChargeRule,
  applyDurationChangeToRule,
  getRuleAmountFieldLabel,
  getRuleChargeMethodLabel,
  getRuleRateTypeLabel,
  isHourlyLongChargeRule,
  isHourlyLongVisitRule,
  isMileageRule,
  isTravelTimeRule,
} from '@/features/billing/utils/billing-card-rule.util'

type RuleMode = 'pay' | 'charge'

type BillingCardRulesEditorProps = {
  mode: RuleMode
  rules: PayCardRule[] | ChargeCardRule[]
  onChange: (rules: PayCardRule[] | ChargeCardRule[]) => void
  disabled?: boolean
}

function emptyFixedPayRule(): PayCardRule {
  return {
    dayType: 'ANY',
    rateType: 'FIXED',
    amount: 0,
    minimumMinutes: DEFAULT_VISIT_DURATION_MINUTES,
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

function emptyHourlyPayRule(): PayCardRule {
  return {
    dayType: 'WEEKDAY',
    rateType: 'HOURLY',
    amount: 0,
    sortOrder: 0,
  }
}

function emptyHourlyChargeRule(): ChargeCardRule {
  return {
    ...emptyHourlyPayRule(),
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

function emptyMileageChargeRule(): ChargeCardRule {
  return {
    ...emptyMileagePayRule(),
    label: 'Mileage recharge',
    chargeMethod: 'FIXED_VISIT',
    chargeableFlag: true,
  }
}

function isBankHolidayRule(rule: PayCardRule): boolean {
  return rule.dayType === 'BANK_HOLIDAY'
}

function regularDayType(rule: PayCardRule): BillingDayType {
  return rule.dayType === 'BANK_HOLIDAY' ? 'ANY' : rule.dayType
}

function ruleDurationMinutes(rule: PayCardRule): number {
  return rule.minimumMinutes && rule.minimumMinutes > 0
    ? rule.minimumMinutes
    : DEFAULT_VISIT_DURATION_MINUTES
}

function isHourlyRule(rule: PayCardRule, mode: RuleMode): boolean {
  return mode === 'charge'
    ? isHourlyLongChargeRule(rule as ChargeCardRule)
    : isHourlyLongVisitRule(rule)
}

function isSupplementRule(rule: PayCardRule): boolean {
  return isMileageRule(rule) || isTravelTimeRule(rule)
}

export function BillingCardRulesEditor({ mode, rules, onChange, disabled }: BillingCardRulesEditorProps) {
  const addFixedRule = () => {
    onChange(mode === 'charge' ? [...rules, emptyFixedChargeRule()] : [...rules, emptyFixedPayRule()])
  }

  const addHourlyRule = () => {
    onChange(mode === 'charge' ? [...rules, emptyHourlyChargeRule()] : [...rules, emptyHourlyPayRule()])
  }

  const addMileageRule = () => {
    onChange(mode === 'charge' ? [...rules, emptyMileageChargeRule()] : [...rules, emptyMileagePayRule()])
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">Rate rules</h4>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addFixedRule} disabled={disabled}>
            Add fixed visit rule
          </Button>
          <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addHourlyRule} disabled={disabled}>
            Add hourly rule
          </Button>
          <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addMileageRule} disabled={disabled}>
            {mode === 'pay' ? 'Add mileage' : 'Add mileage recharge'}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Fixed rates apply to visits up to 1 hour (exact slot, or nearest slot if none matches). Longer visits use hourly × duration.
        {mode === 'pay'
          ? ' Mileage is £/mile for approved journey distance between visits.'
          : ' Mileage recharge bills the client/funder per mile when the contract allows it.'}
      </p>

      {rules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          No rules yet. Add at least one rate rule before activating this card.
        </p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => {
            if (mode === 'pay' && isTravelTimeRule(rule)) return null
            const hourly = isHourlyRule(rule, mode)
            const mileage = isMileageRule(rule)
            const travelTime = isTravelTimeRule(rule)
            const supplement = isSupplementRule(rule)
            const bankHoliday = isBankHolidayRule(rule)
            const durationMinutes = ruleDurationMinutes(rule)
            const amountLabel = getRuleAmountFieldLabel(rule)
            const rateTypeLabel = getRuleRateTypeLabel(rule)
            const chargeMethodLabel = getRuleChargeMethodLabel(rule as ChargeCardRule)

            return (
              <div key={index} className="rounded-lg border border-border bg-muted/10 p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rule {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive"
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
                            : hourly
                              ? `e.g. ${bankHoliday ? 'Bank holiday' : 'Weekday'} hourly (over 1 hour)`
                              : `e.g. ${bankHoliday ? 'Bank holiday' : 'Weekday'} ${formatVisitDurationLabel(durationMinutes)?.toLowerCase() ?? 'visit'}`
                      }
                      disabled={disabled}
                    />
                  </label>

                  {!hourly && !supplement ? (
                    <label className="space-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Visit duration (max 1 hour)</span>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={durationMinutes}
                        onChange={e => {
                          const nextMinutes = Number(e.target.value)
                          const next =
                            mode === 'charge'
                              ? applyDurationChangeToChargeRule(rule as ChargeCardRule, nextMinutes)
                              : applyDurationChangeToRule(rule, nextMinutes)
                          replaceRule(index, next)
                        }}
                        disabled={disabled}
                      >
                        {BILLING_VISIT_DURATION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">Day type</span>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={regularDayType(rule)}
                      onChange={e =>
                        updateRule(index, {
                          dayType: bankHoliday ? 'BANK_HOLIDAY' : (e.target.value as BillingDayType),
                        })
                      }
                      disabled={disabled || bankHoliday}
                    >
                      {BILLING_DAY_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>

                  {!supplement ? (
                    <label className="flex items-end gap-2 text-sm pb-1.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={bankHoliday}
                        onChange={e => {
                          if (e.target.checked) {
                            updateRule(index, { dayType: 'BANK_HOLIDAY' })
                          } else {
                            updateRule(index, { dayType: 'ANY' })
                          }
                        }}
                        disabled={disabled}
                      />
                      <span className="text-xs text-muted-foreground">Bank holiday rate</span>
                    </label>
                  ) : null}

                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">Rate type</span>
                    <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                      {rateTypeLabel}
                    </div>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">{amountLabel}</span>
                    <Input
                      type="number"
                      min={0}
                      step={mileage ? '0.01' : '0.01'}
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
                        } else if (hourly) {
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
                        ? 'Paid as miles × this rate (e.g. 6 miles × £0.45 = £2.70)'
                        : travelTime
                          ? 'Paid as travel hours × this rate for approved travel minutes'
                          : hourly
                            ? 'Applied as hourly rate × visit hours when duration exceeds 1 hour'
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

                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="text-xs text-muted-foreground">Service type</span>
                    <Input
                      value={rule.serviceType ?? ''}
                      onChange={e => updateRule(index, { serviceType: e.target.value })}
                      placeholder="Personal care, Complex care…"
                      disabled={disabled}
                    />
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
