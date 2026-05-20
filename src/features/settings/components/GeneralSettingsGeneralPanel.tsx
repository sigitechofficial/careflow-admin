import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  fetchGeneralSettings,
  updateGeneralSettings,
  type OrganisationGeneralSettings,
  type TimeDisplayFormat,
} from '@/lib/general-settings-api'
import { toastApiError, toastSuccess } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/form-field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/toggle-controls'
import { GeneralSettingsCard } from '@/features/settings/components/GeneralSettingsCard'
import { useAuthStore } from '@/store/auth.store'

const DEFAULTS = {
  reviewCarePlanAfterDays: 180,
  handoverReportLastHours: 12,
  archiveServiceUserAfterMonths: 3,
  timeDisplayFormat: 'HH_MM' as TimeDisplayFormat,
}

function NumericField({
  id,
  label,
  suffix,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  suffix: string
  value: number
  onChange: (n: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Label htmlFor={id} className="text-sm font-normal text-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          min={1}
          className="h-9 w-20 text-center tabular-nums"
          value={value}
          disabled={disabled}
          onChange={e => {
            const n = Number.parseInt(e.target.value, 10)
            if (!Number.isNaN(n)) onChange(n)
          }}
        />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
    </div>
  )
}

export function GeneralSettingsGeneralPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState<OrganisationGeneralSettings | null>(null)
  const [draft, setDraft] = React.useState(DEFAULTS)

  const apply = React.useCallback((s: OrganisationGeneralSettings) => {
    setSaved(s)
    setDraft({
      reviewCarePlanAfterDays: s.reviewCarePlanAfterDays,
      handoverReportLastHours: s.handoverReportLastHours,
      archiveServiceUserAfterMonths: s.archiveServiceUserAfterMonths,
      timeDisplayFormat: s.timeDisplayFormat,
    })
  }, [])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const s = await fetchGeneralSettings()
        if (!cancelled) apply(s)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Could not load general settings.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apply])

  async function onSave() {
    if (!canUpdate) return
    setSaving(true)
    try {
      const updated = await updateGeneralSettings(draft)
      apply(updated)
      toastSuccess('Saved', 'General settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function onReset() {
    if (saved) apply(saved)
    else setDraft(DEFAULTS)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-general-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <GeneralSettingsCard title="Care Information">
          <NumericField
            id="review-care-plan-days"
            label="Review care plan after"
            suffix="Days"
            value={draft.reviewCarePlanAfterDays}
            disabled={!canUpdate}
            onChange={n => setDraft(d => ({ ...d, reviewCarePlanAfterDays: n }))}
          />
          <NumericField
            id="handover-hours"
            label="Handover report for last"
            suffix="Hours"
            value={draft.handoverReportLastHours}
            disabled={!canUpdate}
            onChange={n => setDraft(d => ({ ...d, handoverReportLastHours: n }))}
          />
          <NumericField
            id="archive-months"
            label="Archive Service User details after"
            suffix="Months"
            value={draft.archiveServiceUserAfterMonths}
            disabled={!canUpdate}
            onChange={n => setDraft(d => ({ ...d, archiveServiceUserAfterMonths: n }))}
          />
        </GeneralSettingsCard>

        <GeneralSettingsCard title="Time Settings">
          <p className="text-sm font-medium text-foreground">How to display time recorded</p>
          <RadioGroup
            value={draft.timeDisplayFormat}
            onValueChange={v => setDraft(d => ({ ...d, timeDisplayFormat: v as TimeDisplayFormat }))}
            disabled={!canUpdate}
            className="space-y-3 pt-1"
          >
            <label className="flex cursor-pointer items-start gap-3">
              <RadioGroupItem value="HH_XX" className="mt-0.5" />
              <span className="text-sm text-foreground">HH.XX — Display time recorded as decimals.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <RadioGroupItem value="HH_MM" className="mt-0.5" />
              <span className="text-sm text-foreground">
                HH:MM — Display time recorded as hours and minutes
              </span>
            </label>
          </RadioGroup>
        </GeneralSettingsCard>
      </div>

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
