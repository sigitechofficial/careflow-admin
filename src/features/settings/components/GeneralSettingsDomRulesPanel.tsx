import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  fetchGeneralSettings,
  updateGeneralSettings,
  type DomAllocationRuleBehavior,
  type DomCareAllocationRule,
  type OrganisationGeneralSettings,
} from '@/lib/general-settings-api'
import { toastApiError, toastSuccess } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/toggle-controls'
import { GeneralSettingsCard } from '@/features/settings/components/GeneralSettingsCard'
import {
  ALLOCATION_BEHAVIOR_OPTIONS,
  DEFAULT_DOM_CARE_ALLOCATION_RULES,
  mergeAllocationRules,
  ruleSupportsMinutes,
} from '@/features/settings/dom-care/dom-care-allocation-rules-defaults'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

const RULE_ROW_GRID =
  'grid w-full grid-cols-[minmax(12rem,1.4fr)_repeat(3,minmax(7rem,1fr))] items-center gap-x-4'

function toDraft(s: OrganisationGeneralSettings): DomCareAllocationRule[] {
  const rows =
    s.domCareAllocationRules?.length > 0 ? s.domCareAllocationRules : DEFAULT_DOM_CARE_ALLOCATION_RULES
  return mergeAllocationRules(rows.map(r => ({ ...r })))
}

export function GeneralSettingsDomRulesPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState<DomCareAllocationRule[] | null>(null)
  const [rules, setRules] = React.useState<DomCareAllocationRule[]>(DEFAULT_DOM_CARE_ALLOCATION_RULES)

  const apply = React.useCallback((s: OrganisationGeneralSettings) => {
    const d = toDraft(s)
    setSaved(d)
    setRules(d)
  }, [])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const settings = await fetchGeneralSettings()
        if (!cancelled) apply(settings)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Could not load dom rules.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apply])

  function updateRule(key: string, patch: Partial<DomCareAllocationRule>) {
    setRules(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)))
  }

  async function onSave() {
    if (!canUpdate) return
    setSaving(true)
    try {
      const payload = rules.map(r => ({
        ...r,
        minutes: ruleSupportsMinutes(r.key)
          ? Math.max(0, Math.min(999, Math.round(r.minutes ?? 0)))
          : null,
      }))
      const updated = await updateGeneralSettings({ domCareAllocationRules: payload })
      apply(updated)
      toastSuccess('Saved', 'Dom rules updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setSaving(false)
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
          {rules.map((rule, index) => (
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
