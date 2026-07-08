import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  BILLING_CHARGE_METHOD_OPTIONS,
  BILLING_DAY_TYPE_OPTIONS,
  BILLING_RATE_TYPE_OPTIONS,
  type BillingDayType,
  type BillingRateType,
  type ChargeCardRule,
  type PayCardRule,
} from '@/features/billing/types/billing-cards.types'
import { normalizeBillingTimeInput } from '@/features/billing/utils/billing-time.util'

type RuleMode = 'pay' | 'charge'

type BillingCardRulesEditorProps = {
  mode: RuleMode
  rules: PayCardRule[] | ChargeCardRule[]
  onChange: (rules: PayCardRule[] | ChargeCardRule[]) => void
  disabled?: boolean
}

function emptyPayRule(): PayCardRule {
  return {
    dayType: 'ANY',
    rateType: 'HOURLY',
    amount: 0,
    sortOrder: 0,
  }
}

function emptyChargeRule(): ChargeCardRule {
  return {
    ...emptyPayRule(),
    chargeMethod: 'HOURLY_PRO_RATA',
    chargeableFlag: true,
  }
}

export function BillingCardRulesEditor({ mode, rules, onChange, disabled }: BillingCardRulesEditorProps) {
  const addRule = () => {
    const next = mode === 'charge'
      ? [...rules, emptyChargeRule()]
      : [...rules, emptyPayRule()]
    onChange(next)
  }

  const updateRule = (index: number, patch: Partial<PayCardRule & ChargeCardRule>) => {
    onChange(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)))
  }

  const removeRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">Rate rules</h4>
        <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addRule} disabled={disabled}>
          Add rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          No rules yet. Add at least one rate rule before activating this card.
        </p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
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
                    placeholder="e.g. Weekday morning"
                    disabled={disabled}
                  />
                </label>

                {mode === 'charge' && (
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">Charge method</span>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={(rule as ChargeCardRule).chargeMethod}
                      onChange={e => updateRule(index, { chargeMethod: e.target.value as ChargeCardRule['chargeMethod'] })}
                      disabled={disabled}
                    >
                      {BILLING_CHARGE_METHOD_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                )}

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
                  <span className="text-xs text-muted-foreground">Rate type</span>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={rule.rateType}
                    onChange={e => updateRule(index, { rateType: e.target.value as BillingRateType })}
                    disabled={disabled}
                  >
                    {BILLING_RATE_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Amount (£)</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={rule.amount}
                    onChange={e => updateRule(index, { amount: Number(e.target.value) })}
                    disabled={disabled}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Start time</span>
                  <Input
                    type="time"
                    step={60}
                    className="h-9 w-full sm:w-[8.5rem]"
                    value={normalizeBillingTimeInput(rule.startTime)}
                    onChange={e =>
                      updateRule(index, {
                        startTime: e.target.value ? normalizeBillingTimeInput(e.target.value) : undefined,
                      })
                    }
                    disabled={disabled}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">End time</span>
                  <Input
                    type="time"
                    step={60}
                    className="h-9 w-full sm:w-[8.5rem]"
                    value={normalizeBillingTimeInput(rule.endTime)}
                    onChange={e =>
                      updateRule(index, {
                        endTime: e.target.value ? normalizeBillingTimeInput(e.target.value) : undefined,
                      })
                    }
                    disabled={disabled}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Min. minutes</span>
                  <Input
                    type="number"
                    min={0}
                    step={15}
                    value={rule.minimumMinutes ?? ''}
                    onChange={e =>
                      updateRule(index, {
                        minimumMinutes: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="30"
                    disabled={disabled}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Multiplier</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={rule.multiplier ?? ''}
                    onChange={e =>
                      updateRule(index, {
                        multiplier: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="2 for bank holiday"
                    disabled={disabled}
                  />
                </label>

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
          ))}
        </div>
      )}
    </div>
  )
}
