import * as React from 'react'
import { Info, Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import {
  type DomAllocationRuleBehavior,
  type DomCareAllocationRule,
  type DomWeeklyHoursRuleOptions,
  type OrganisationGeneralSettings,
} from '@/features/settings/types'
import {
  useGeneralSettings,
  useUpdateGeneralSettings,
} from '@/features/settings/hooks/useGeneralSettings'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'
import { GeneralSettingsCard, SettingsRow } from '@/features/settings/components/GeneralSettingsCard'
import {
  ALLOCATION_BEHAVIOR_OPTIONS,
  DEFAULT_DOM_CARE_ALLOCATION_RULES,
  DEFAULT_WEEKLY_HOURS_RULE_OPTIONS,
  WEEKLY_HOURS_RULE_KEY,
  mergeAllocationRules,
  ruleSupportsMinutes,
} from '@/features/settings/dom-care/dom-care-allocation-rules-defaults'
import { useAuthStore } from '@/features/auth/store'
import { GeneralSettingsServiceUserHoursPanel } from '@/features/settings/components/GeneralSettingsServiceUserHoursPanel'
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
                allowOverMax: r.weeklyHours.allowOverMax,
                countCalledOff: r.weeklyHours.countCalledOff,
                contractedChangeNeedsApproval: r.weeklyHours.contractedChangeNeedsApproval,
                extraHoursNeedApproval: r.weeklyHours.extraHoursNeedApproval,
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
            data-testid="weekly-hours-rule-info"
          >
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              A carer&apos;s limit is their contracted weekly hours plus any extra hours (Monday to
              Sunday). Carers with no contracted hours can&apos;t be given visits. Every rejection
              needs a reason.
            </span>
          </div>

          <p className="pt-1 text-sm font-medium text-muted-foreground">Visits</p>
          <SettingsRow
            label="Visits over a carer's weekly hours need manager approval"
            hint="Visit plans, rota, extra visits and special visits. Yes: visits within the limit are assigned, the rest go to Hours approvals. No: visits are assigned with a warning."
          >
            <NoYesToggle
              value={weeklyRule.behavior !== 'REQUEST_CONFIRMATION'}
              onChange={v =>
                updateRule(WEEKLY_HOURS_RULE_KEY, {
                  behavior: v ? 'MANAGER_APPROVAL' : 'REQUEST_CONFIRMATION',
                })
              }
              disabled={!canUpdate}
              labelOff="No"
              labelOn="Yes"
            />
          </SettingsRow>

          <SettingsRow
            label="Grace minutes over weekly hours"
            hint="A carer can be assigned visits this many minutes over their weekly hours and it still won't count as over. Example: 20h weekly hours + 20 min grace = up to 20h 20m is OK."
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

          <SettingsRow
            label="Count called-off visits in the carer's hours"
            hint="The carer went but the service user turned the visit down. Cancelled visits never count."
          >
            <NoYesToggle
              value={weeklyOptions.countCalledOff ?? true}
              onChange={v => updateWeeklyOptions({ countCalledOff: v })}
              disabled={!canUpdate}
              labelOff="No"
              labelOn="Yes"
            />
          </SettingsRow>

          <SettingsRow
            label="Allow over a carer's maximum weekly hours"
            hint="Each carer has their own maximum, set in Employment → Working hours (left blank = 60h). Example: maximum 48h, a week of 50h is over. No: stopped, and a message explains why. Yes: follows the manager approval settings in this card."
          >
            <NoYesToggle
              value={weeklyOptions.allowOverMax === 'YES'}
              onChange={v => updateWeeklyOptions({ allowOverMax: v ? 'YES' : 'NO' })}
              disabled={!canUpdate}
              labelOff="No"
              labelOn="Yes"
            />
          </SettingsRow>

          <p className="pt-2 text-sm font-medium text-muted-foreground">Changing a carer&apos;s hours</p>
          <SettingsRow
            label="Changing contracted weekly hours needs manager approval"
            hint="When hours go down, visits over the new limit (latest in each week) are unassigned. You see them before confirming."
          >
            <NoYesToggle
              value={weeklyOptions.contractedChangeNeedsApproval ?? true}
              onChange={v => updateWeeklyOptions({ contractedChangeNeedsApproval: v })}
              disabled={!canUpdate}
              labelOff="No"
              labelOn="Yes"
            />
          </SettingsRow>
          <SettingsRow
            label="Adding extra hours needs manager approval"
            hint="No: extra hours apply at once. Waiting requests that now fit are approved automatically."
          >
            <NoYesToggle
              value={weeklyOptions.extraHoursNeedApproval ?? false}
              onChange={v => updateWeeklyOptions({ extraHoursNeedApproval: v })}
              disabled={!canUpdate}
              labelOff="No"
              labelOn="Yes"
            />
          </SettingsRow>
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

      <GeneralSettingsServiceUserHoursPanel />
    </div>
  )
}
