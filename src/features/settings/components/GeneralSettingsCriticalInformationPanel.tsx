import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import {
  type OrganisationCriticalInformationSettings,
  type OrganisationGeneralSettings,
} from '@/features/settings/types'
import {
  useGeneralSettings,
  useUpdateGeneralSettings,
} from '@/features/settings/hooks/useGeneralSettings'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
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
import { useAuthStore } from '@/features/auth/store'

function toDraft(s: OrganisationGeneralSettings): OrganisationCriticalInformationSettings {
  return s.criticalInformationSettings ?? DEFAULT_CRITICAL_INFORMATION_SETTINGS
}

export function GeneralSettingsCriticalInformationPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const { data: settingsData, isLoading: loading, error: queryError } = useGeneralSettings()
  const updateMutation = useUpdateGeneralSettings()
  const [saved, setSaved] = React.useState<OrganisationCriticalInformationSettings | null>(null)
  const [draft, setDraft] = React.useState<OrganisationCriticalInformationSettings>(
    DEFAULT_CRITICAL_INFORMATION_SETTINGS,
  )
  const saving = updateMutation.isPending
  const error =
    queryError instanceof ApiError
      ? queryError.message
      : queryError
        ? 'Could not load critical information settings.'
        : null

  React.useEffect(() => {
    if (settingsData) {
      const d = toDraft(settingsData)
      setSaved(structuredClone(d))
      setDraft(structuredClone(d))
    }
  }, [settingsData])

  function patch(p: Partial<OrganisationCriticalInformationSettings>) {
    setDraft(d => ({ ...d, ...p }))
  }

  async function onSave() {
    if (!canUpdate) return
    try {
      const updated = await updateMutation.mutateAsync(criticalInformationSettingsToPayload(draft))
      const d = toDraft(updated)
      setSaved(structuredClone(d))
      setDraft(structuredClone(d))
      toastSuccess('Saved', 'Critical information settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
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
