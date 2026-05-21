import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  fetchGeneralSettings,
  updateGeneralSettings,
  type OrganisationCriticalInformationSettings,
  type OrganisationGeneralSettings,
} from '@/lib/general-settings-api'
import { toastApiError, toastSuccess } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import {
  GeneralSettingsCard,
  SettingsHint,
  SettingsNoYesToggle,
  SettingsRow,
} from '@/features/settings/components/GeneralSettingsCard'
import {
  CRITICAL_INFORMATION_TOOLTIPS,
  criticalInformationSettingsToPayload,
  DEFAULT_CRITICAL_INFORMATION_SETTINGS,
  IP_LOCKDOWN_DESCRIPTION,
} from '@/features/settings/critical-information/critical-information-settings-defaults'
import { useAuthStore } from '@/store/auth.store'

function toDraft(s: OrganisationGeneralSettings): OrganisationCriticalInformationSettings {
  return s.criticalInformationSettings ?? DEFAULT_CRITICAL_INFORMATION_SETTINGS
}

export function GeneralSettingsCriticalInformationPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState<OrganisationCriticalInformationSettings | null>(null)
  const [draft, setDraft] = React.useState<OrganisationCriticalInformationSettings>(
    DEFAULT_CRITICAL_INFORMATION_SETTINGS,
  )

  const apply = React.useCallback((s: OrganisationGeneralSettings) => {
    const d = toDraft(s)
    setSaved(structuredClone(d))
    setDraft(structuredClone(d))
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
          setError(
            e instanceof ApiError ? e.message : 'Could not load critical information settings.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apply])

  function patch(p: Partial<OrganisationCriticalInformationSettings>) {
    setDraft(d => ({ ...d, ...p }))
  }

  async function onSave() {
    if (!canUpdate) return
    setSaving(true)
    try {
      const updated = await updateGeneralSettings(criticalInformationSettingsToPayload(draft))
      apply(updated)
      toastSuccess('Saved', 'Critical information settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function onReset() {
    if (saved) setDraft(structuredClone(saved))
    else setDraft(structuredClone(DEFAULT_CRITICAL_INFORMATION_SETTINGS))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-critical-information-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <GeneralSettingsCard title="Core Operation">
            <SettingsRow label="Generate actions" hint={CRITICAL_INFORMATION_TOOLTIPS.generateActions}>
              <SettingsNoYesToggle
                value={draft.generateActions}
                onChange={v => patch({ generateActions: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
          </GeneralSettingsCard>

          <GeneralSettingsCard title="Multifactor Authentication">
            <SettingsRow
              label="Memorable answer required"
              hint={CRITICAL_INFORMATION_TOOLTIPS.memorableAnswerRequired}
            >
              <SettingsNoYesToggle
                value={draft.memorableAnswerRequired}
                onChange={v => patch({ memorableAnswerRequired: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
          </GeneralSettingsCard>
        </div>

        <GeneralSettingsCard title="IP Lockdown Security">
          <p className="text-sm leading-relaxed text-muted-foreground">{IP_LOCKDOWN_DESCRIPTION}</p>
          <SettingsRow
            label="Lock down web access to whitelisted IP Addresses"
            hint={CRITICAL_INFORMATION_TOOLTIPS.lockdownWebAccess}
          >
            <SettingsNoYesToggle
              value={draft.lockdownWebAccess}
              onChange={v => patch({ lockdownWebAccess: v })}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow
            label="Lock down Care App access to whitelisted IP Addresses"
            hint={CRITICAL_INFORMATION_TOOLTIPS.lockdownCareAppAccess}
          >
            <SettingsNoYesToggle
              value={draft.lockdownCareAppAccess}
              onChange={v => patch({ lockdownCareAppAccess: v })}
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
