import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  BILLING_CHARGE_METHOD_OPTIONS,
  BILLING_DAY_TYPE_OPTIONS,
  BILLING_VISIT_DURATION_OPTIONS,
  type BillingDayType,
  type ChargeCardRule,
  type PayCardRule,
} from '@/features/billing/types/billing-cards.types'

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

function isBankHolidayRule(rule: PayCardRule): boolean {
  return rule.dayType === 'BANK_HOLIDAY'
}

function regularDayType(rule: PayCardRule): BillingDayType {
  return rule.dayType === 'BANK_HOLIDAY' ? 'ANY' : rule.dayType
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
          {rules.map((rule, index) => {
            const bankHoliday = isBankHolidayRule(rule)

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
                      placeholder="e.g. Weekday 30-minute visit"
                      disabled={disabled}
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">Visit duration</span>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={rule.minimumMinutes ?? ''}
                      onChange={e => {
                        const raw = e.target.value
                        updateRule(index, {
                          minimumMinutes: raw ? Number(raw) : undefined,
                        })
                      }}
                      disabled={disabled}
                    >
                      {BILLING_VISIT_DURATION_OPTIONS.map(opt => (
                        <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>

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

                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">Rate type</span>
                    <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                      Hourly
                    </div>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">Hourly rate (£)</span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={rule.amount}
                      onChange={e => updateRule(index, { amount: Number(e.target.value), rateType: 'HOURLY' })}
                      disabled={disabled}
                    />
                  </label>

                  {mode === 'charge' && (
                    <label className="space-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Charge method</span>
                      <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                        {BILLING_CHARGE_METHOD_OPTIONS[0]?.label ?? 'Hourly pro-rata'}
                      </div>
                    </label>
                  )}

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
