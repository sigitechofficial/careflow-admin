import * as React from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import {
  type IncidentDefaultStatus,
  type IncidentTypeSetting,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  GeneralSettingsCard,
  SettingsHint,
  SettingsNoYesToggle,
} from '@/features/settings/components/GeneralSettingsCard'
import {
  DEFAULT_INCIDENT_SEVERITY_SETTINGS,
  DEFAULT_INCIDENT_TYPE_SETTINGS,
  DEFAULT_INCIDENT_WHO_INFORMED_SETTINGS,
  INCIDENT_STATUS_OPTIONS,
  isDefaultWhoInformedKey,
  mergeIncidentSeveritySettings,
  mergeIncidentTypeSettings,
  mergeIncidentWhoInformedSettings,
  slugIncidentCatalogKey,
} from '@/features/settings/incident/incident-management-defaults'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'

const TOOLTIPS = {
  editableMinutes:
    'How long after an incident is created that staff can still edit the incident details.',
  displayHours: 'How long completed or closed incidents remain visible on dashboards and lists.',
  showOnApp: 'Yes shows this option on the carer Report an incident sheet.',
} as const

type IncidentDraft = {
  incidentDetailsEditableMinutes: number
  incidentDisplayHours: number
  incidentDefaultStatus: IncidentDefaultStatus
  incidentTypeSettings: IncidentTypeSetting[]
  incidentSeveritySettings: IncidentTypeSetting[]
  incidentWhoInformedSettings: IncidentTypeSetting[]
}

const DEFAULTS: IncidentDraft = {
  incidentDetailsEditableMinutes: 60,
  incidentDisplayHours: 12,
  incidentDefaultStatus: 'REPORTED',
  incidentTypeSettings: DEFAULT_INCIDENT_TYPE_SETTINGS,
  incidentSeveritySettings: DEFAULT_INCIDENT_SEVERITY_SETTINGS,
  incidentWhoInformedSettings: DEFAULT_INCIDENT_WHO_INFORMED_SETTINGS,
}

function toDraft(s: OrganisationGeneralSettings): IncidentDraft {
  return {
    incidentDetailsEditableMinutes: s.incidentDetailsEditableMinutes ?? 60,
    incidentDisplayHours: s.incidentDisplayHours ?? 12,
    incidentDefaultStatus: s.incidentDefaultStatus ?? 'REPORTED',
    incidentTypeSettings: mergeIncidentTypeSettings(
      s.incidentTypeSettings?.length ? s.incidentTypeSettings : DEFAULT_INCIDENT_TYPE_SETTINGS,
    ),
    incidentSeveritySettings: mergeIncidentSeveritySettings(
      s.incidentSeveritySettings?.length
        ? s.incidentSeveritySettings
        : DEFAULT_INCIDENT_SEVERITY_SETTINGS,
    ),
    incidentWhoInformedSettings: mergeIncidentWhoInformedSettings(
      s.incidentWhoInformedSettings?.length
        ? s.incidentWhoInformedSettings
        : DEFAULT_INCIDENT_WHO_INFORMED_SETTINGS,
    ),
  }
}

function clampInt(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? Math.round(n) : min))
}

function CatalogList({
  items,
  canUpdate,
  onToggle,
  onRemove,
  canRemove,
}: {
  items: IncidentTypeSetting[]
  canUpdate: boolean
  onToggle: (key: string, required: boolean) => void
  onRemove?: (key: string) => void
  canRemove?: (key: string) => boolean
}) {
  return (
    <>
      <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border pb-2 text-sm font-medium text-foreground">
        <span>Option</span>
        <span className="text-right">Show on app</span>
      </div>
      <div className="divide-y divide-border">
        {items.map((row, index) => (
          <div
            key={row.key}
            className={cn(
              'grid grid-cols-[1fr_auto] items-center gap-4 py-3',
              index % 2 === 1 && 'bg-muted/20',
            )}
          >
            <span className="flex items-center gap-2 text-sm text-foreground">
              {row.label}
              {onRemove && canRemove?.(row.key) ? (
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                  disabled={!canUpdate}
                  aria-label={`Remove ${row.label}`}
                  onClick={() => onRemove(row.key)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </span>
            <SettingsNoYesToggle
              value={row.required}
              onChange={v => onToggle(row.key, v)}
              disabled={!canUpdate}
            />
          </div>
        ))}
      </div>
    </>
  )
}

export function GeneralSettingsIncidentManagementPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const { data: settingsData, isLoading: loading, error: queryError } = useGeneralSettings()
  const updateMutation = useUpdateGeneralSettings()
  const [saved, setSaved] = React.useState<IncidentDraft | null>(null)
  const [draft, setDraft] = React.useState<IncidentDraft>(DEFAULTS)
  const [newWhoLabel, setNewWhoLabel] = React.useState('')
  const saving = updateMutation.isPending
  const error =
    queryError instanceof ApiError
      ? queryError.message
      : queryError
        ? 'Could not load incident management settings.'
        : null

  React.useEffect(() => {
    if (settingsData) {
      const d = toDraft(settingsData)
      setSaved(d)
      setDraft(d)
    }
  }, [settingsData])

  function updateList(
    field: 'incidentTypeSettings' | 'incidentSeveritySettings' | 'incidentWhoInformedSettings',
    key: string,
    required: boolean,
  ) {
    setDraft(d => ({
      ...d,
      [field]: d[field].map(t => (t.key === key ? { ...t, required } : t)),
    }))
  }

  function addWhoInformed() {
    const label = newWhoLabel.trim()
    if (!label) return
    let key = slugIncidentCatalogKey(label)
    if (draft.incidentWhoInformedSettings.some(t => t.key === key)) {
      key = `${key}_${Date.now()}`
    }
    setDraft(d => ({
      ...d,
      incidentWhoInformedSettings: [
        ...d.incidentWhoInformedSettings,
        { key, label, required: true },
      ],
    }))
    setNewWhoLabel('')
  }

  async function onSave() {
    if (!canUpdate) return
    try {
      const updated = await updateMutation.mutateAsync({
        incidentDetailsEditableMinutes: clampInt(draft.incidentDetailsEditableMinutes, 1, 10080),
        incidentDisplayHours: clampInt(draft.incidentDisplayHours, 1, 8760),
        incidentDefaultStatus: draft.incidentDefaultStatus,
        incidentTypeSettings: draft.incidentTypeSettings,
        incidentSeveritySettings: draft.incidentSeveritySettings,
        incidentWhoInformedSettings: draft.incidentWhoInformedSettings,
      })
      const d = toDraft(updated)
      setSaved(d)
      setDraft(d)
      toastSuccess('Saved', 'Incident management settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  function onReset() {
    if (saved) {
      setDraft({
        ...saved,
        incidentTypeSettings: saved.incidentTypeSettings.map(t => ({ ...t })),
        incidentSeveritySettings: saved.incidentSeveritySettings.map(t => ({ ...t })),
        incidentWhoInformedSettings: saved.incidentWhoInformedSettings.map(t => ({ ...t })),
      })
    } else setDraft(DEFAULTS)
    setNewWhoLabel('')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-incident-management-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <GeneralSettingsCard title="Incident Management">
          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            <span>Allow incident details to be edited for</span>
            <Input
              type="number"
              min={1}
              max={10080}
              className="h-9 w-16 text-center tabular-nums"
              value={draft.incidentDetailsEditableMinutes}
              disabled={!canUpdate}
              onChange={e =>
                setDraft(d => ({
                  ...d,
                  incidentDetailsEditableMinutes: Number.parseInt(e.target.value, 10) || 1,
                }))
              }
              aria-label="Minutes incident details remain editable"
            />
            <span>minutes — default to 60 minutes</span>
            <SettingsHint text={TOOLTIPS.editableMinutes} />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            <span>Allow Incident to be displayed for</span>
            <Input
              type="number"
              min={1}
              max={8760}
              className="h-9 w-16 text-center tabular-nums"
              value={draft.incidentDisplayHours}
              disabled={!canUpdate}
              onChange={e =>
                setDraft(d => ({
                  ...d,
                  incidentDisplayHours: Number.parseInt(e.target.value, 10) || 1,
                }))
              }
              aria-label="Hours incidents remain displayed"
            />
            <span>hours — default to 12 hours</span>
            <SettingsHint text={TOOLTIPS.displayHours} />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            <span>Set default incident status</span>
            <Select
              value={draft.incidentDefaultStatus}
              onValueChange={v =>
                setDraft(d => ({ ...d, incidentDefaultStatus: v as IncidentDefaultStatus }))
              }
              disabled={!canUpdate}
            >
              <SelectTrigger className="h-9 w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </GeneralSettingsCard>

        <GeneralSettingsCard title="Incident Types">
          <p className="text-xs text-muted-foreground">
            Carer Report an incident · Type.{' '}
            <SettingsHint text={TOOLTIPS.showOnApp} />
          </p>
          <CatalogList
            items={draft.incidentTypeSettings}
            canUpdate={canUpdate}
            onToggle={(key, required) => updateList('incidentTypeSettings', key, required)}
          />
        </GeneralSettingsCard>

        <GeneralSettingsCard title="Severity">
          <p className="text-xs text-muted-foreground">
            Fixed scale for filters and audit. Hide a level with Show on app = No.
          </p>
          <CatalogList
            items={draft.incidentSeveritySettings}
            canUpdate={canUpdate}
            onToggle={(key, required) => updateList('incidentSeveritySettings', key, required)}
          />
        </GeneralSettingsCard>

        <GeneralSettingsCard title="Who was informed">
          <p className="text-xs text-muted-foreground">
            Carer Report an incident checklist. Add extra contacts for this organisation.
          </p>
          <CatalogList
            items={draft.incidentWhoInformedSettings}
            canUpdate={canUpdate}
            onToggle={(key, required) =>
              updateList('incidentWhoInformedSettings', key, required)
            }
            canRemove={key => !isDefaultWhoInformedKey(key)}
            onRemove={key =>
              setDraft(d => ({
                ...d,
                incidentWhoInformedSettings: d.incidentWhoInformedSettings.filter(
                  t => t.key !== key,
                ),
              }))
            }
          />
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Input
              className="h-9 min-w-[12rem] flex-1"
              placeholder="Add contact (e.g. CQC)"
              value={newWhoLabel}
              disabled={!canUpdate}
              onChange={e => setNewWhoLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addWhoInformed()
                }
              }}
              aria-label="New who-was-informed option"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!canUpdate || !newWhoLabel.trim()}
              onClick={addWhoInformed}
            >
              Add
            </Button>
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
