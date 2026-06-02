import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import {
  type OrganisationAlertsSettings,
  type OrganisationGeneralSettings,
} from '@/features/settings/types'
import {
  useGeneralSettings,
  useUpdateGeneralSettings,
} from '@/features/settings/hooks/useGeneralSettings'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  GeneralSettingsCard,
  SettingsHint,
  SettingsNoYesToggle,
  SettingsRow,
} from '@/features/settings/components/GeneralSettingsCard'
import {
  ALERTS_TOOLTIPS,
  alertsSettingsToPayload,
  clampAlertsDraft,
  DEFAULT_ALERTS_SETTINGS,
} from '@/features/settings/alerts/alerts-settings-defaults'
import { useAuthStore } from '@/features/auth/store'

function toDraft(s: OrganisationGeneralSettings): OrganisationAlertsSettings {
  return s.alertsSettings ?? DEFAULT_ALERTS_SETTINGS
}

export function GeneralSettingsAlertsPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const { data: settingsData, isLoading: loading, error: queryError } = useGeneralSettings()
  const updateMutation = useUpdateGeneralSettings()
  const [saved, setSaved] = React.useState<OrganisationAlertsSettings | null>(null)
  const [draft, setDraft] = React.useState<OrganisationAlertsSettings>(DEFAULT_ALERTS_SETTINGS)
  const saving = updateMutation.isPending
  const error =
    queryError instanceof ApiError
      ? queryError.message
      : queryError
        ? 'Could not load alerts settings.'
        : null

  React.useEffect(() => {
    if (settingsData) {
      const d = toDraft(settingsData)
      setSaved(structuredClone(d))
      setDraft(structuredClone(d))
    }
  }, [settingsData])

  function patch(p: Partial<OrganisationAlertsSettings>) {
    setDraft(d => ({ ...d, ...p }))
  }

  async function onSave() {
    if (!canUpdate) return
    try {
      const payload = alertsSettingsToPayload(clampAlertsDraft(draft))
      const updated = await updateMutation.mutateAsync(payload)
      const d = toDraft(updated)
      setSaved(structuredClone(d))
      setDraft(structuredClone(d))
      toastSuccess('Saved', 'Alerts settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  function onReset() {
    if (saved) setDraft(structuredClone(saved))
    else setDraft(structuredClone(DEFAULT_ALERTS_SETTINGS))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-alerts-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <GeneralSettingsCard title="Alerts">
          <SettingsRow
            label="Alert when actions are overdue"
            hint={ALERTS_TOOLTIPS.actionsOverdue}
          >
            <SettingsNoYesToggle
              value={draft.actionsOverdueEnabled}
              onChange={v => patch({ actionsOverdueEnabled: v })}
              disabled={!canUpdate}
            />
          </SettingsRow>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm text-foreground">
              <span>Alert after</span>
              <Input
                type="number"
                min={1}
                max={1440}
                className="h-9 w-16 text-center tabular-nums"
                value={draft.actionsOverdueMinutes}
                disabled={!canUpdate || !draft.actionsOverdueEnabled}
                onChange={e =>
                  patch({
                    actionsOverdueMinutes: Number.parseInt(e.target.value, 10) || 1,
                  })
                }
                aria-label="Alert after minutes"
              />
              <span>Minutes</span>
              <SettingsHint text={ALERTS_TOOLTIPS.actionsOverdueMinutes} />
            </span>
          </div>

          <SettingsRow
            label="Alert when required check not ticked off"
            hint={ALERTS_TOOLTIPS.requiredCheckNotTicked}
          >
            <SettingsNoYesToggle
              value={draft.requiredCheckNotTicked}
              onChange={v => patch({ requiredCheckNotTicked: v })}
              disabled={!canUpdate}
            />
          </SettingsRow>

          <SettingsRow
            label="Alert if required medication not given"
            hint={ALERTS_TOOLTIPS.requiredMedicationNotGiven}
          >
            <SettingsNoYesToggle
              value={draft.requiredMedicationNotGiven}
              onChange={v => patch({ requiredMedicationNotGiven: v })}
              disabled={!canUpdate}
            />
          </SettingsRow>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm text-foreground">
              <span>Get schedule jobs before</span>
              <Input
                type="number"
                min={1}
                max={168}
                className="h-9 w-16 text-center tabular-nums"
                value={draft.scheduleJobsBeforeHours}
                disabled={!canUpdate}
                onChange={e =>
                  patch({
                    scheduleJobsBeforeHours: Number.parseInt(e.target.value, 10) || 1,
                  })
                }
                aria-label="Get schedule jobs before hours"
              />
              <span>Hours</span>
              <SettingsHint text={ALERTS_TOOLTIPS.scheduleJobsBeforeHours} />
            </span>
          </div>

          <SettingsRow label="Beep on new alert?" hint={ALERTS_TOOLTIPS.beepOnNewAlert}>
            <SettingsNoYesToggle
              value={draft.beepOnNewAlert}
              onChange={v => patch({ beepOnNewAlert: v })}
              disabled={!canUpdate}
            />
          </SettingsRow>
        </GeneralSettingsCard>

        <GeneralSettingsCard title="Fluid Alerts">
          <SettingsRow label="Fluid Alerts" hint={ALERTS_TOOLTIPS.fluidAlerts}>
            <SettingsNoYesToggle
              value={draft.fluidAlertsEnabled}
              onChange={v => patch({ fluidAlertsEnabled: v })}
              disabled={!canUpdate}
            />
          </SettingsRow>
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
