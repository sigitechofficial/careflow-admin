import * as React from 'react'
import { Info, Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import {
  type DomAllocationRuleBehavior,
  type DomCareAllocationRule,
  type DomWeeklyHoursRuleOptions,
  type OrganisationGeneralSettings,
  type WeeklyHoursLimitBasis,
  type WeeklyHoursRejectAction,
} from '@/features/settings/types'
import {
  useGeneralSettings,
  useUpdateGeneralSettings,
} from '@/features/settings/hooks/useGeneralSettings'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { GeneralSettingsCard, SettingsRow } from '@/features/settings/components/GeneralSettingsCard'
import {
  ALLOCATION_BEHAVIOR_OPTIONS,
  DEFAULT_DOM_CARE_ALLOCATION_RULES,
  DEFAULT_WEEKLY_HOURS_RULE_OPTIONS,
  WEEKLY_HOURS_BEHAVIOR_OPTIONS,
  WEEKLY_HOURS_LIMIT_OPTIONS,
  WEEKLY_HOURS_REJECT_OPTIONS,
  WEEKLY_HOURS_RULE_KEY,
  mergeAllocationRules,
  ruleSupportsMinutes,
} from '@/features/settings/dom-care/dom-care-allocation-rules-defaults'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'

const RULE_ROW_GRID =
  'grid w-full grid-cols-[minmax(12rem,1.4fr)_repeat(3,minmax(7rem,1fr))] items-center gap-x-4'

function toDraft(s: OrganisationGeneralSettings): DomCareAllocationRule[] {
  const rows =
    s.domCareAllocationRules?.length > 0 ? s.domCareAllocationRules : DEFAULT_DOM_CARE_ALLOCATION_RULES
  return mergeAllocationRules(rows.map(r => ({ ...r })))
}

export function GeneralSettingsDomRulesPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const { data: settingsData, isLoading: loading, error: queryError } = useGeneralSettings()
  const updateMutation = useUpdateGeneralSettings()
  const [saved, setSaved] = React.useState<DomCareAllocationRule[] | null>(null)
  const [rules, setRules] = React.useState<DomCareAllocationRule[]>(DEFAULT_DOM_CARE_ALLOCATION_RULES)
  const saving = updateMutation.isPending
  const error =
    queryError instanceof ApiError
      ? queryError.message
      : queryError
        ? 'Could not load dom rules.'
        : null

  React.useEffect(() => {
    if (settingsData) {
      const d = toDraft(settingsData)
      setSaved(d)
      setRules(d)
    }
  }, [settingsData])

  function updateRule(key: string, patch: Partial<DomCareAllocationRule>) {
    setRules(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)))
  }

  const gridRules = rules.filter(r => r.key !== WEEKLY_HOURS_RULE_KEY)
  const weeklyRule = rules.find(r => r.key === WEEKLY_HOURS_RULE_KEY)
  const weeklyOptions = weeklyRule?.weeklyHours ?? DEFAULT_WEEKLY_HOURS_RULE_OPTIONS

  function updateWeeklyOptions(patch: Partial<DomWeeklyHoursRuleOptions>) {
    updateRule(WEEKLY_HOURS_RULE_KEY, { weeklyHours: { ...weeklyOptions, ...patch } })
  }

  async function onSave() {
    if (!canUpdate) return
    try {
      const payload = rules.map(r => ({
        ...r,
        minutes: ruleSupportsMinutes(r.key)
          ? Math.max(0, Math.min(999, Math.round(r.minutes ?? 0)))
          : null,
        ...(r.weeklyHours
          ? {
              weeklyHours: {
                ...r.weeklyHours,
                maxApprovableHours: Math.max(
                  1,
                  Math.min(168, Math.round(r.weeklyHours.maxApprovableHours || 0)),
                ),
              },
            }
          : {}),
      }))
      const updated = await updateMutation.mutateAsync({ domCareAllocationRules: payload })
      const d = toDraft(updated)
      setSaved(d)
      setRules(d)
      toastSuccess('Saved', 'Dom rules updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  function onReset() {
    if (saved) setRules(saved.map(r => ({ ...r })))
    else setRules(DEFAULT_DOM_CARE_ALLOCATION_RULES.map(r => ({ ...r })))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-dom-rules-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <GeneralSettingsCard title="Allocation Rules">
        <div className={cn(RULE_ROW_GRID, 'border-b border-border pb-3 text-sm font-medium text-foreground')}>
          <span />
          {ALLOCATION_BEHAVIOR_OPTIONS.map(opt => (
            <span key={opt.value} className="text-center text-muted-foreground">
              {opt.label}
            </span>
          ))}
        </div>

        <div className="divide-y divide-border">
          {gridRules.map((rule, index) => (
            <div
              key={rule.key}
              className={cn(RULE_ROW_GRID, 'py-3', index % 2 === 1 && 'bg-muted/20')}
            >
              <div className="min-w-0 pr-2 text-sm text-foreground">
                <span>{rule.label}</span>
                {ruleSupportsMinutes(rule.key) ? (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={999}
                      className="h-8 w-16 tabular-nums"
                      value={rule.minutes ?? 0}
                      disabled={!canUpdate}
                      onChange={e =>
                        updateRule(rule.key, {
                          minutes: Number.parseInt(e.target.value, 10) || 0,
                        })
                      }
                      aria-label={`${rule.label} minutes`}
                    />
                    <span className="text-sm text-muted-foreground">Minutes</span>
                  </div>
                ) : null}
              </div>

              <RadioGroup
                value={rule.behavior}
                onValueChange={v =>
                  updateRule(rule.key, { behavior: v as DomAllocationRuleBehavior })
                }
                disabled={!canUpdate}
                className="col-span-3 grid grid-cols-3 gap-4"
              >
                {ALLOCATION_BEHAVIOR_OPTIONS.map(opt => (
                  <div key={opt.value} className="flex justify-center">
                    <RadioGroupItem
                      value={opt.value}
                      id={`${rule.key}-${opt.value}`}
                      aria-label={`${rule.label}: ${opt.label}`}
                    />
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
        </div>
      </GeneralSettingsCard>

      {weeklyRule ? (
        <GeneralSettingsCard title="Carer weekly hours limit">
          <div
            className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
            data-testid="weekly-hours-rule-not-applied"
          >
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Saved only. This rule is not applied to visit plans, the rota or other allocations
              yet.
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-foreground">When a carer goes over their weekly hours</p>
            <RadioGroup
              value={weeklyRule.behavior}
              onValueChange={v =>
                updateRule(WEEKLY_HOURS_RULE_KEY, { behavior: v as DomAllocationRuleBehavior })
              }
              disabled={!canUpdate}
              className="grid gap-2"
            >
              {WEEKLY_HOURS_BEHAVIOR_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  htmlFor={`${WEEKLY_HOURS_RULE_KEY}-${opt.value}`}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md border border-border px-3 py-2',
                    weeklyRule.behavior === opt.value && 'border-primary bg-primary/5',
                  )}
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`${WEEKLY_HOURS_RULE_KEY}-${opt.value}`}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground">{opt.label}</span>
                    <span className="block text-xs text-muted-foreground">{opt.description}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <SettingsRow
            label="Weekly limit to use"
            hint="Which of the carer's employment hours counts as their weekly limit."
          >
            <Select
              value={weeklyOptions.limitBasis}
              onValueChange={v => updateWeeklyOptions({ limitBasis: v as WeeklyHoursLimitBasis })}
              disabled={!canUpdate}
            >
              <SelectTrigger className="h-9 w-[22rem] max-w-full" aria-label="Weekly limit to use">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKLY_HOURS_LIMIT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>

          <SettingsRow
            label="Grace before the rule applies"
            hint="How far over the limit a carer can go before the rule is triggered."
          >
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                max={999}
                className="h-8 w-16 tabular-nums"
                value={weeklyRule.minutes ?? 0}
                disabled={!canUpdate}
                onChange={e =>
                  updateRule(WEEKLY_HOURS_RULE_KEY, {
                    minutes: Number.parseInt(e.target.value, 10) || 0,
                  })
                }
                aria-label="Grace minutes"
              />
              <span className="text-sm text-muted-foreground">Minutes</span>
            </div>
          </SettingsRow>

          {weeklyRule.behavior === 'MANAGER_APPROVAL' ? (
            <>
              <SettingsRow label="If the manager rejects">
                <Select
                  value={weeklyOptions.rejectAction}
                  onValueChange={v =>
                    updateWeeklyOptions({ rejectAction: v as WeeklyHoursRejectAction })
                  }
                  disabled={!canUpdate}
                >
                  <SelectTrigger
                    className="h-9 w-[22rem] max-w-full"
                    aria-label="If the manager rejects"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKLY_HOURS_REJECT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsRow>

              <SettingsRow
                label="Highest weekly hours a manager can approve"
                hint="Requests above this cannot be approved."
              >
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    className="h-8 w-16 tabular-nums"
                    value={weeklyOptions.maxApprovableHours}
                    disabled={!canUpdate}
                    onChange={e =>
                      updateWeeklyOptions({
                        maxApprovableHours: Number.parseInt(e.target.value, 10) || 0,
                      })
                    }
                    aria-label="Highest weekly hours a manager can approve"
                  />
                  <span className="text-sm text-muted-foreground">Hours</span>
                </div>
              </SettingsRow>
            </>
          ) : null}
        </GeneralSettingsCard>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
          Reset
        </Button>
        <Button type="button" onClick={() => void onSave()} disabled={!canUpdate || saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </div>
  )
}
