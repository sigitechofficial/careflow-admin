import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  fetchGeneralSettings,
  updateGeneralSettings,
  type OrganisationAppSettings,
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
  APP_SETTINGS_TOOLTIPS,
  appSettingsToPayload,
  DEFAULT_APP_SETTINGS,
  DEVICE_PIN_BULLETS,
  DEVICE_PIN_DESCRIPTION,
  DEVICE_PIN_SECURITY_NOTE,
} from '@/features/settings/app-settings/app-settings-defaults'
import { useAuthStore } from '@/store/auth.store'

function toDraft(s: OrganisationGeneralSettings): OrganisationAppSettings {
  return s.appSettings ?? DEFAULT_APP_SETTINGS
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
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState<OrganisationAppSettings | null>(null)
  const [draft, setDraft] = React.useState<OrganisationAppSettings>(DEFAULT_APP_SETTINGS)

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
          setError(e instanceof ApiError ? e.message : 'Could not load app settings.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apply])

  function patch(p: Partial<OrganisationAppSettings>) {
    setDraft(d => ({ ...d, ...p }))
  }

  async function onSave() {
    if (!canUpdate) return
    setSaving(true)
    try {
      const updated = await updateGeneralSettings(appSettingsToPayload(draft))
      apply(updated)
      toastSuccess('Saved', 'App settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setSaving(false)
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
