import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  fetchGeneralSettings,
  updateGeneralSettings,
  type OrganisationGeneralSettings,
  type OrganisationOptionalSettings,
} from '@/lib/general-settings-api'
import { toastApiError, toastSuccess } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/toggle-controls'
import { MultiSelect } from '@/components/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  GeneralSettingsCard,
  SettingsHint,
  SettingsNoYesToggle,
  SettingsRow,
} from '@/features/settings/components/GeneralSettingsCard'
import {
  DEFAULT_OPTIONAL_SETTINGS,
  MEDICATION_AMEND_ROLE_OPTIONS,
  OPTIONAL_TOOLTIPS,
  optionalSettingsToPayload,
} from '@/features/settings/optional/optional-settings-defaults'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

function toDraft(s: OrganisationGeneralSettings): OrganisationOptionalSettings {
  return s.optionalSettings ?? DEFAULT_OPTIONAL_SETTINGS
}

const MONTH_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1)

const VISIT_INFO_FIELDS: {
  key: keyof OrganisationOptionalSettings['familyShareVisitInfo']
  label: string
}[] = [
  { key: 'recordedNotes', label: 'Recorded Notes' },
  { key: 'checklists', label: 'Checklists' },
  { key: 'photographs', label: 'Photographs' },
  { key: 'medications', label: 'Medications' },
]

export function GeneralSettingsOptionalPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState<OrganisationOptionalSettings | null>(null)
  const [draft, setDraft] = React.useState<OrganisationOptionalSettings>(DEFAULT_OPTIONAL_SETTINGS)

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
          setError(e instanceof ApiError ? e.message : 'Could not load optional settings.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apply])

  function patch(p: Partial<OrganisationOptionalSettings>) {
    setDraft(d => ({ ...d, ...p }))
  }

  async function onSave() {
    if (!canUpdate) return
    setSaving(true)
    try {
      const updated = await updateGeneralSettings(optionalSettingsToPayload(draft))
      apply(updated)
      toastSuccess('Saved', 'Optional settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function onReset() {
    if (saved) setDraft(structuredClone(saved))
    else setDraft(structuredClone(DEFAULT_OPTIONAL_SETTINGS))
  }

  const portalOn = draft.familyPortalEnabled
  const roleOptions = MEDICATION_AMEND_ROLE_OPTIONS.map(r => ({
    value: r.value,
    label: r.label,
  }))

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-optional-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <GeneralSettingsCard title="Medication Management">
            <SettingsRow
              label="Integration to external emar system"
              hint={OPTIONAL_TOOLTIPS.emarIntegration}
            >
              <SettingsNoYesToggle
                value={draft.emarIntegration}
                onChange={v => patch({ emarIntegration: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <SettingsRow
              label="Medication list Required"
              hint={OPTIONAL_TOOLTIPS.medicationListRequired}
            >
              <SettingsNoYesToggle
                value={draft.medicationListRequired}
                onChange={v => patch({ medicationListRequired: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-foreground">
                Specify the roles who can amend medication
                <SettingsHint text={OPTIONAL_TOOLTIPS.medicationAmendRoles} />
              </p>
              <MultiSelect
                options={roleOptions}
                value={draft.medicationAmendRoles}
                onChange={ids => patch({ medicationAmendRoles: ids })}
                placeholder="Select roles…"
                disabled={!canUpdate}
              />
            </div>
          </GeneralSettingsCard>

          <GeneralSettingsCard title="Detention Under Mental Health Act (MHA) Required">
            <SettingsRow label="Detention Under Mental Health Act (MHA) Required">
              <SettingsNoYesToggle
                value={draft.mhaDetentionRequired}
                onChange={v => patch({ mhaDetentionRequired: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
          </GeneralSettingsCard>

          <GeneralSettingsCard title="Enhanced Interventions">
            <SettingsRow
              label="Is restraint intervention recording required?"
              hint={OPTIONAL_TOOLTIPS.restraintRecording}
            >
              <SettingsNoYesToggle
                value={draft.restraintRecordingRequired}
                onChange={v => patch({ restraintRecordingRequired: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
          </GeneralSettingsCard>

          <GeneralSettingsCard title="Care Planning">
            <SettingsRow
              label="Care plan read required"
              hint={OPTIONAL_TOOLTIPS.carePlanReadRequired}
            >
              <SettingsNoYesToggle
                value={draft.carePlanReadRequired}
                onChange={v => patch({ carePlanReadRequired: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <SettingsRow
              label="Request read cycle (months)"
              hint={OPTIONAL_TOOLTIPS.carePlanReadCycle}
            >
              <Select
                value={String(draft.carePlanReadCycleMonths)}
                onValueChange={v => patch({ carePlanReadCycleMonths: Number.parseInt(v, 10) || 1 })}
                disabled={!canUpdate}
              >
                <SelectTrigger className="h-9 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>
          </GeneralSettingsCard>

          <GeneralSettingsCard title="Form Builder">
            <SettingsRow label="Form Builder Required">
              <SettingsNoYesToggle
                value={draft.formBuilderRequired}
                onChange={v => patch({ formBuilderRequired: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <SettingsRow label="Remove create new care plan option">
              <SettingsNoYesToggle
                value={draft.removeCreateNewCarePlan}
                onChange={v => patch({ removeCreateNewCarePlan: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
          </GeneralSettingsCard>

          <GeneralSettingsCard title="Inspector Login">
            <SettingsRow label="Allow inspector login">
              <SettingsNoYesToggle
                value={draft.allowInspectorLogin}
                onChange={v => patch({ allowInspectorLogin: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
          </GeneralSettingsCard>
        </div>

        <div className="space-y-6">
          <GeneralSettingsCard title="About Me Settings">
            {draft.aboutMeFields.map(field => (
              <SettingsRow key={field.key} label={field.label}>
                <SettingsNoYesToggle
                  value={field.enabled}
                  onChange={v =>
                    setDraft(d => ({
                      ...d,
                      aboutMeFields: d.aboutMeFields.map(f =>
                        f.key === field.key ? { ...f, enabled: v } : f,
                      ),
                    }))
                  }
                  disabled={!canUpdate}
                />
              </SettingsRow>
            ))}
          </GeneralSettingsCard>

          <GeneralSettingsCard title="Service Management">
            <SettingsRow label="Service Management Required">
              <SettingsNoYesToggle
                value={draft.serviceManagementRequired}
                onChange={v => patch({ serviceManagementRequired: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
          </GeneralSettingsCard>

          <GeneralSettingsCard title="Session Notes">
            <SettingsRow label="Learning and Development sessions required">
              <SettingsNoYesToggle
                value={draft.learningDevSessionsRequired}
                onChange={v => patch({ learningDevSessionsRequired: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>
          </GeneralSettingsCard>

          <GeneralSettingsCard title="Family Portal">
            <SettingsRow
              label="Family Portal Enabled"
              hint={OPTIONAL_TOOLTIPS.familyPortalEnabled}
            >
              <SettingsNoYesToggle
                value={draft.familyPortalEnabled}
                onChange={v => patch({ familyPortalEnabled: v })}
                disabled={!canUpdate}
              />
            </SettingsRow>

            <div
              className={cn(
                'space-y-4 border-l-2 border-primary/20 pl-4',
                !portalOn && 'pointer-events-none opacity-50',
              )}
            >
              <SettingsRow
                label="Sharing authorisation required"
                hint={OPTIONAL_TOOLTIPS.familySharingAuth}
              >
                <SettingsNoYesToggle
                  value={draft.familySharingAuthRequired}
                  onChange={v => patch({ familySharingAuthRequired: v })}
                  disabled={!canUpdate || !portalOn}
                />
              </SettingsRow>
              <SettingsRow
                label="Share all actions - pressing share not required"
                hint={OPTIONAL_TOOLTIPS.familyShareAllActions}
              >
                <SettingsNoYesToggle
                  value={draft.familyShareAllActions}
                  onChange={v => patch({ familyShareAllActions: v })}
                  disabled={!canUpdate || !portalOn}
                />
              </SettingsRow>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-foreground">
                  Share care plans for review/approval
                  <SettingsHint text={OPTIONAL_TOOLTIPS.familyShareCarePlans} />
                </span>
                <SettingsNoYesToggle
                  value={draft.familyShareCarePlans}
                  onChange={v => patch({ familyShareCarePlans: v })}
                  disabled={!canUpdate || !portalOn}
                />
              </div>

              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm text-foreground">
                  Share the following information for completed actions/visits :
                  <SettingsHint text={OPTIONAL_TOOLTIPS.familyShareVisitInfo} />
                </p>
                <div className="space-y-2 pl-1">
                  {VISIT_INFO_FIELDS.map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                    >
                      <Checkbox
                        checked={draft.familyShareVisitInfo[key]}
                        onCheckedChange={checked =>
                          patch({
                            familyShareVisitInfo: {
                              ...draft.familyShareVisitInfo,
                              [key]: checked === true,
                            },
                          })
                        }
                        disabled={!canUpdate || !portalOn}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </GeneralSettingsCard>
        </div>
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
