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

const DEVICE_LIMIT_CHOICES = [0, 2, 3, 4, 5, 10] as const

/** How many devices at once, when more than one is allowed (0 = no limit). */
function DeviceLimitRow({
  id,
  value,
  onChange,
  disabled,
  noun,
}: {
  id: string
  value: number
  onChange: (v: number) => void
  disabled: boolean
  noun: string
}) {
  const choices = DEVICE_LIMIT_CHOICES.includes(value as (typeof DEVICE_LIMIT_CHOICES)[number])
    ? DEVICE_LIMIT_CHOICES
    : [...DEVICE_LIMIT_CHOICES, value].sort((a, b) => a - b)
  return (
    <SettingsRow label={<label htmlFor={id}>How many at once?</label>}>
      <select
        id={id}
        className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-2 text-sm"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
      >
        {choices.map(n => (
          <option key={n} value={n}>
            {n === 0 ? 'No limit' : `Up to ${n} ${noun}`}
          </option>
        ))}
      </select>
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

        <GeneralSettingsCard title="Office website sign-in">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Choose whether office staff can be signed in on more than one browser or device, and how
            many at once. Signing in on one more than allowed signs out the one signed in longest
            ago, and that browser is told why.
          </p>
          <div data-testid="office-device-login" className="space-y-4">
            <SettingsRow label="Allow multiple device login?" hint={APP_SETTINGS_TOOLTIPS.officeMultipleDeviceLogin}>
              <SettingsNoYesToggle
                value={draft.officeMultipleDeviceLogin}
                onChange={v => patch({ officeMultipleDeviceLogin: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
            {draft.officeMultipleDeviceLogin ? (
              <DeviceLimitRow
                id="office-max-devices"
                value={draft.officeMaxDevices}
                onChange={v => patch({ officeMaxDevices: v })}
                disabled={!canUpdate}
                noun="browsers or devices"
              />
            ) : (
              <p className="text-xs text-muted-foreground">One browser or device: signing in on another signs the first one out.</p>
            )}
          </div>
        </GeneralSettingsCard>

        <GeneralSettingsCard title="Care app sign-in">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Choose whether a carer can be signed in on more than one phone, and how many at once.
            Signing in on one more than allowed signs out the phone signed in longest ago, and that
            phone is told why.
          </p>
          <div data-testid="care-app-device-login" className="space-y-4">
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
            {!draft.singleDeviceLoginCareApp ? (
              <DeviceLimitRow
                id="care-app-max-devices"
                value={draft.maxDevicesCareApp}
                onChange={v => patch({ maxDevicesCareApp: v })}
                disabled={!canUpdate}
                noun="phones"
              />
            ) : (
              <p className="text-xs text-muted-foreground">One phone: signing in on another phone signs the first one out.</p>
            )}
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
