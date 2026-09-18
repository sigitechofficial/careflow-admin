import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import {
  type OrganisationAppSettings,
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
  APP_SETTINGS_TOOLTIPS,
  appSettingsToPayload,
  DEFAULT_APP_SETTINGS,
  DEVICE_PIN_BULLETS,
  DEVICE_PIN_DESCRIPTION,
  DEVICE_PIN_SECURITY_NOTE,
} from '@/features/settings/app-settings/app-settings-defaults'
import { useAuthStore } from '@/features/auth/store'

function toDraft(s: OrganisationGeneralSettings): OrganisationAppSettings {
  return { ...DEFAULT_APP_SETTINGS, ...s.appSettings }
}

function AppToggleRow({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  disabled: boolean
  hint?: string
}) {
  return (
    <SettingsRow label={label} hint={hint}>
      <SettingsNoYesToggle value={value} onChange={onChange} disabled={disabled} />
    </SettingsRow>
  )
}

function AppConfigGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export function GeneralSettingsAppSettingPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const { data: settingsData, isLoading: loading, error: queryError } = useGeneralSettings()
  const updateMutation = useUpdateGeneralSettings()
  const [saved, setSaved] = React.useState<OrganisationAppSettings | null>(null)
  const [draft, setDraft] = React.useState<OrganisationAppSettings>(DEFAULT_APP_SETTINGS)
  const saving = updateMutation.isPending
  const error =
    queryError instanceof ApiError
      ? queryError.message
      : queryError
        ? 'Could not load app settings.'
        : null

  React.useEffect(() => {
    if (settingsData) {
      const d = toDraft(settingsData)
      setSaved(structuredClone(d))
      setDraft(structuredClone(d))
    }
  }, [settingsData])

  function patch(p: Partial<OrganisationAppSettings>) {
    setDraft(d => ({ ...d, ...p }))
  }

  async function onSave() {
    if (!canUpdate) return
    try {
      const updated = await updateMutation.mutateAsync(appSettingsToPayload(draft))
      const d = toDraft(updated)
      setSaved(structuredClone(d))
      setDraft(structuredClone(d))
      toastSuccess('Saved', 'App settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  function onReset() {
    if (saved) setDraft(structuredClone(saved))
    else setDraft(structuredClone(DEFAULT_APP_SETTINGS))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-app-setting-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <GeneralSettingsCard title="Device Pin Code">
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>{DEVICE_PIN_DESCRIPTION}</p>
            <ul className="list-disc space-y-1 pl-5">
              {DEVICE_PIN_BULLETS.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="font-medium text-foreground">{DEVICE_PIN_SECURITY_NOTE}</p>
          </div>
          <SettingsRow label="PIN code required?" hint={APP_SETTINGS_TOOLTIPS.pinCodeRequired}>
            <SettingsNoYesToggle
              value={draft.pinCodeRequired}
              onChange={v => patch({ pinCodeRequired: v })}
              disabled={!canUpdate}
            />
          </SettingsRow>
        </GeneralSettingsCard>

        <GeneralSettingsCard title="App Configuration Options">
          <div className="space-y-6">
            <AppConfigGroup title="View Policies on the Application">
              <AppToggleRow
                label="Care app"
                value={draft.viewPoliciesCareApp}
                onChange={v => patch({ viewPoliciesCareApp: v })}
                disabled={!canUpdate}
                hint={APP_SETTINGS_TOOLTIPS.viewPoliciesCareApp}
              />
              <AppToggleRow
                label="Roster app"
                value={draft.viewPoliciesRosterApp}
                onChange={v => patch({ viewPoliciesRosterApp: v })}
                disabled={!canUpdate}
                hint={APP_SETTINGS_TOOLTIPS.viewPoliciesRosterApp}
              />
            </AppConfigGroup>

            <AppConfigGroup title="Book Holidays on the Application">
              <AppToggleRow
                label="Care app"
                value={draft.bookHolidaysCareApp}
                onChange={v => patch({ bookHolidaysCareApp: v })}
                disabled={!canUpdate}
                hint={APP_SETTINGS_TOOLTIPS.bookHolidaysCareApp}
              />
            </AppConfigGroup>

            <AppConfigGroup title="Fingerprint Login">
              <AppToggleRow
                label="Care app"
                value={draft.fingerprintLoginCareApp}
                onChange={v => patch({ fingerprintLoginCareApp: v })}
                disabled={!canUpdate}
                hint={APP_SETTINGS_TOOLTIPS.fingerprintLoginCareApp}
              />
            </AppConfigGroup>
          </div>
        </GeneralSettingsCard>

        <GeneralSettingsCard title="Care app sign-in">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Choose whether a carer can stay signed in on more than one phone. If this is off, the
            first device stays signed in and a second login is blocked until they sign out, the
            office signs out the session, or the session goes stale.
          </p>
          <SettingsRow
            label="Allow multiple device login?"
            hint={APP_SETTINGS_TOOLTIPS.singleDeviceLoginCareApp}
          >
            <SettingsNoYesToggle
              value={!draft.singleDeviceLoginCareApp}
              onChange={v => patch({ singleDeviceLoginCareApp: !v })}
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
