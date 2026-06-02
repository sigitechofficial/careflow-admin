import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import {
  type OrganisationGeneralSettings,
  type OrganisationPrivacySettings,
} from '@/features/settings/types'
import {
  useGeneralSettings,
  useUpdateGeneralSettings,
} from '@/features/settings/hooks/useGeneralSettings'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { MultiSelect } from '@/shared/ui/multi-select'
import {
  GeneralSettingsCard,
  SettingsHint,
  SettingsNoYesToggle,
  SettingsRow,
} from '@/features/settings/components/GeneralSettingsCard'
import {
  DEFAULT_PRIVACY_SETTINGS,
  PRIVACY_SENSITIVE_VIEWER_ROLE_OPTIONS,
  PRIVACY_TOOLTIPS,
  privacySettingsToPayload,
} from '@/features/settings/privacy/privacy-settings-defaults'
import { useAuthStore } from '@/features/auth/store'

function toDraft(s: OrganisationGeneralSettings): OrganisationPrivacySettings {
  return s.privacySettings ?? DEFAULT_PRIVACY_SETTINGS
}

export function GeneralSettingsPrivacyPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const { data: settingsData, isLoading: loading, error: queryError } = useGeneralSettings()
  const updateMutation = useUpdateGeneralSettings()
  const [saved, setSaved] = React.useState<OrganisationPrivacySettings | null>(null)
  const [draft, setDraft] = React.useState<OrganisationPrivacySettings>(DEFAULT_PRIVACY_SETTINGS)
  const saving = updateMutation.isPending
  const error =
    queryError instanceof ApiError
      ? queryError.message
      : queryError
        ? 'Could not load privacy settings.'
        : null

  const roleOptions = PRIVACY_SENSITIVE_VIEWER_ROLE_OPTIONS.map(r => ({
    value: r.value,
    label: r.label,
  }))

  React.useEffect(() => {
    if (settingsData) {
      const d = toDraft(settingsData)
      setSaved(structuredClone(d))
      setDraft(structuredClone(d))
    }
  }, [settingsData])

  function patch(p: Partial<OrganisationPrivacySettings>) {
    setDraft(d => ({ ...d, ...p }))
  }

  async function onSave() {
    if (!canUpdate) return
    try {
      const updated = await updateMutation.mutateAsync(privacySettingsToPayload(draft))
      const d = toDraft(updated)
      setSaved(structuredClone(d))
      setDraft(structuredClone(d))
      toastSuccess('Saved', 'Privacy settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  function onReset() {
    if (saved) setDraft(structuredClone(saved))
    else setDraft(structuredClone(DEFAULT_PRIVACY_SETTINGS))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-privacy-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <GeneralSettingsCard title="Privacy Setting">
          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            <span>Access non active Service Users for</span>
            <Input
              type="number"
              min={1}
              max={3650}
              className="h-9 w-16 text-center tabular-nums"
              value={draft.nonActiveServiceUserDays}
              disabled={!canUpdate}
              onChange={e =>
                patch({
                  nonActiveServiceUserDays: Number.parseInt(e.target.value, 10) || 1,
                })
              }
              aria-label="Days to access non-active service users"
            />
            <span>Days</span>
            <SettingsHint text={PRIVACY_TOOLTIPS.nonActiveServiceUserDays} />
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground">
              Send privacy officer notification by:
            </p>
            <SettingsRow
              label="Internal system message"
              hint={PRIVACY_TOOLTIPS.notifyInternalMessage}
            >
              <SettingsNoYesToggle
                value={draft.notifyInternalMessage}
                onChange={v => patch({ notifyInternalMessage: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <SettingsRow label="Email" hint={PRIVACY_TOOLTIPS.notifyEmail}>
              <SettingsNoYesToggle
                value={draft.notifyEmail}
                onChange={v => patch({ notifyEmail: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
          </div>
        </GeneralSettingsCard>

        <GeneralSettingsCard title="Sensitive Information">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm text-foreground">
              Who can view information flagged as sensitive?
              <SettingsHint text={PRIVACY_TOOLTIPS.sensitiveViewerRoles} />
            </p>
            <MultiSelect
              options={roleOptions}
              value={draft.sensitiveViewerRoles}
              onChange={ids => patch({ sensitiveViewerRoles: ids })}
              placeholder="Search roles…"
              disabled={!canUpdate}
            />
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
