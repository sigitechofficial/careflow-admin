import * as React from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import {
  type EmployeeVisaType,
  type OrganisationGeneralSettings,
} from '@/features/settings/types'
import {
  useGeneralSettings,
  useUpdateGeneralSettings,
} from '@/features/settings/hooks/useGeneralSettings'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField } from '@/shared/ui/form-field'
import {
  GeneralSettingsCard,
  SettingsRow,
} from '@/features/settings/components/GeneralSettingsCard'
import { useAuthStore } from '@/features/auth/store'
import {
  DEFAULT_EMPLOYEE_VISA_TYPES,
  isBuiltInVisaTypeId,
  normalizeVisaTypeRow,
  resolveEmployeeVisaTypes,
} from '@/features/settings/employee/employee-visa-defaults'

function newVisaType(index: number): EmployeeVisaType {
  return {
    id: `custom_${Date.now()}_${index}`,
    label: '',
    maxWeeklyHours: 40,
    defaultContractedHours: null,
  }
}

function parseOptionalHours(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function normalizeVisaTypes(types: EmployeeVisaType[]): EmployeeVisaType[] {
  return types
    .map((t, index) => {
      const row = normalizeVisaTypeRow(t)
      return {
        id: row.id.trim() || `custom_${index}`,
        label: row.label.trim(),
        maxWeeklyHours: Math.min(168, Math.max(0, row.maxWeeklyHours)),
        defaultContractedHours:
          row.defaultContractedHours != null
            ? Math.min(168, Math.max(0, row.defaultContractedHours))
            : null,
      }
    })
    .filter(t => t.label.length > 0)
    .map(t => {
      if (
        t.defaultContractedHours != null &&
        t.defaultContractedHours > t.maxWeeklyHours
      ) {
        return { ...t, defaultContractedHours: t.maxWeeklyHours }
      }
      return t
    })
}

function toDraft(s: OrganisationGeneralSettings): EmployeeVisaType[] {
  return resolveEmployeeVisaTypes(s.employeeVisaTypes).map(row => normalizeVisaTypeRow(row))
}

export function GeneralSettingsEmployeeVisaPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const { data: settingsData, isLoading: loading, error: queryError } = useGeneralSettings()
  const updateMutation = useUpdateGeneralSettings()
  const [saved, setSaved] = React.useState<EmployeeVisaType[] | null>(null)
  const [draft, setDraft] = React.useState<EmployeeVisaType[]>(DEFAULT_EMPLOYEE_VISA_TYPES)
  const saving = updateMutation.isPending
  const error =
    queryError instanceof ApiError
      ? queryError.message
      : queryError
        ? 'Could not load immigration status settings.'
        : null

  React.useEffect(() => {
    if (settingsData) {
      const d = toDraft(settingsData)
      setSaved(d)
      setDraft(d)
    }
  }, [settingsData])

  async function onSave() {
    if (!canUpdate) return
    const normalized = normalizeVisaTypes(draft)
    if (normalized.length === 0) {
      toastApiError(new Error('Add at least one immigration status with a label.'), 'Save failed')
      return
    }
    try {
      const updated = await updateMutation.mutateAsync({ employeeVisaTypes: normalized })
      const d = toDraft(updated)
      setSaved(d)
      setDraft(d)
      toastSuccess('Saved', 'Immigration status limits updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  function onReset() {
    if (saved) setDraft(saved.map(row => ({ ...row })))
    else setDraft(DEFAULT_EMPLOYEE_VISA_TYPES.map(row => ({ ...row })))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-employee-visa-panel">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <GeneralSettingsCard title="Immigration statuses & weekly hour limits">
        <p className="text-sm text-muted-foreground">
          Configure immigration status labels and the maximum hours allowed per week for each status
          (standard 40h; lower for student routes). Optional default contracted hours prefill the
          employment form when a status is selected — leave blank to keep existing hours. Admins can
          add custom statuses, edit labels and limits, and remove custom rows. Built-in status ids
          cannot be deleted. Right-to-work evidence stays on Employment Compliance.
        </p>
        <div className="space-y-4">
          {draft.map((row, index) => (
            <div
              key={row.id || `row-${index}`}
              className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-[1fr_minmax(7rem,9rem)_minmax(7rem,9rem)_minmax(7rem,9rem)_auto]"
            >
              <FormField label="Status label" htmlFor={`visa-label-${index}`}>
                <Input
                  id={`visa-label-${index}`}
                  value={row.label}
                  disabled={!canUpdate}
                  onChange={e => {
                    const label = e.target.value
                    setDraft(d => d.map((r, i) => (i === index ? { ...r, label } : r)))
                  }}
                  placeholder="e.g. Skilled Worker"
                />
              </FormField>
              <FormField label="Type id" htmlFor={`visa-id-${index}`}>
                <Input
                  id={`visa-id-${index}`}
                  value={row.id}
                  disabled={!canUpdate || isBuiltInVisaTypeId(row.id)}
                  onChange={e => {
                    const id = e.target.value.replace(/\s+/g, '_')
                    setDraft(d => d.map((r, i) => (i === index ? { ...r, id } : r)))
                  }}
                  className="font-mono text-xs"
                />
              </FormField>
              <FormField label="Max hours / week" htmlFor={`visa-max-${index}`}>
                <Input
                  id={`visa-max-${index}`}
                  type="number"
                  min={0}
                  max={168}
                  step={0.5}
                  value={row.maxWeeklyHours}
                  disabled={!canUpdate}
                  onChange={e => {
                    const maxWeeklyHours = Number(e.target.value)
                    setDraft(d =>
                      d.map((r, i) =>
                        i === index
                          ? {
                              ...r,
                              maxWeeklyHours: Number.isFinite(maxWeeklyHours) ? maxWeeklyHours : 0,
                            }
                          : r,
                      ),
                    )
                  }}
                />
              </FormField>
              <FormField label="Default contracted" htmlFor={`visa-default-${index}`}>
                <Input
                  id={`visa-default-${index}`}
                  type="number"
                  min={0}
                  max={168}
                  step={0.5}
                  placeholder="Optional"
                  value={row.defaultContractedHours ?? ''}
                  disabled={!canUpdate}
                  onChange={e => {
                    const defaultContractedHours = parseOptionalHours(e.target.value)
                    setDraft(d =>
                      d.map((r, i) => (i === index ? { ...r, defaultContractedHours } : r)),
                    )
                  }}
                />
              </FormField>
              <div className="flex items-end justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!canUpdate || draft.length <= 1 || isBuiltInVisaTypeId(row.id)}
                  aria-label="Remove immigration status"
                  onClick={() => setDraft(d => d.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canUpdate}
            onClick={() => setDraft(d => [...d, newVisaType(d.length)])}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add custom status
          </Button>
        </div>

        <SettingsRow label="">
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void onSave()} disabled={!canUpdate || saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={onReset} disabled={!canUpdate || saving}>
              Reset
            </Button>
          </div>
        </SettingsRow>
      </GeneralSettingsCard>
    </div>
  )
}
