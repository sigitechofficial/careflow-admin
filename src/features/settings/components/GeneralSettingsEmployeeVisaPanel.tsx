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
  resolveEmployeeVisaTypes,
} from '@/features/settings/employee/employee-visa-defaults'

function newVisaType(index: number): EmployeeVisaType {
  return {
    id: `visa_${Date.now()}_${index}`,
    label: '',
    weeklyHours: 40,
  }
}

function normalizeVisaTypes(types: EmployeeVisaType[]): EmployeeVisaType[] {
  return types
    .map((t, index) => ({
      id: t.id.trim() || `visa_${index}`,
      label: t.label.trim(),
      weeklyHours:
        typeof t.weeklyHours === 'number' && Number.isFinite(t.weeklyHours)
          ? Math.min(168, Math.max(0, t.weeklyHours))
          : 0,
    }))
    .filter(t => t.label.length > 0)
}

function toDraft(s: OrganisationGeneralSettings): EmployeeVisaType[] {
  return resolveEmployeeVisaTypes(s.employeeVisaTypes).map(row => ({ ...row }))
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
        ? 'Could not load visa settings.'
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
      toastApiError(new Error('Add at least one visa type with a label.'), 'Save failed')
      return
    }
    try {
      const updated = await updateMutation.mutateAsync({ employeeVisaTypes: normalized })
      const d = toDraft(updated)
      setSaved(d)
      setDraft(d)
      toastSuccess('Saved', 'Visa and contracted hours settings updated.')
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

      <GeneralSettingsCard title="Visa types & contracted hours">
        <p className="text-sm text-muted-foreground">
          Define visa types and the default contracted hours per week used on the employee employment form.
        </p>
        <div className="space-y-4">
          {draft.map((row, index) => (
            <div
              key={row.id || `row-${index}`}
              className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-[1fr_1fr_8rem_auto]"
            >
              <FormField label="Visa type label" htmlFor={`visa-label-${index}`}>
                <Input
                  id={`visa-label-${index}`}
                  value={row.label}
                  disabled={!canUpdate}
                  onChange={e => {
                    const label = e.target.value
                    setDraft(d => d.map((r, i) => (i === index ? { ...r, label } : r)))
                  }}
                  placeholder="e.g. Full time visa"
                />
              </FormField>
              <FormField label="Type id" htmlFor={`visa-id-${index}`}>
                <Input
                  id={`visa-id-${index}`}
                  value={row.id}
                  disabled={!canUpdate || index < 2}
                  onChange={e => {
                    const id = e.target.value.replace(/\s+/g, '_')
                    setDraft(d => d.map((r, i) => (i === index ? { ...r, id } : r)))
                  }}
                  className="font-mono text-xs"
                />
              </FormField>
              <FormField label="Hours / week" htmlFor={`visa-hours-${index}`}>
                <Input
                  id={`visa-hours-${index}`}
                  type="number"
                  min={0}
                  max={168}
                  step={0.5}
                  value={row.weeklyHours}
                  disabled={!canUpdate}
                  onChange={e => {
                    const weeklyHours = Number(e.target.value)
                    setDraft(d =>
                      d.map((r, i) =>
                        i === index ? { ...r, weeklyHours: Number.isFinite(weeklyHours) ? weeklyHours : 0 } : r,
                      ),
                    )
                  }}
                />
              </FormField>
              <div className="flex items-end justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!canUpdate || draft.length <= 1}
                  aria-label="Remove visa type"
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
            Add visa type
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
