import * as React from 'react'
import { Clock, Loader2, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import {
  type DomCareShiftDefinition,
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
  DEFAULT_DOM_CARE_SHIFT_DEFINITIONS,
  inferEndsNextDay,
  newDomCareShift,
} from '@/features/settings/dom-care/dom-care-shifts-defaults'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'

function normalizeShifts(shifts: DomCareShiftDefinition[]): DomCareShiftDefinition[] {
  return shifts.map((s, index) => {
    const fromTime = s.fromTime || '00:00'
    const toTime = s.toTime || '00:00'
    const endsNextDay = s.endsNextDay || inferEndsNextDay(fromTime, toTime)
    let colorHex = s.colorHex?.trim() || '#5DADE2'
    if (!/^#[0-9A-Fa-f]{6}$/.test(colorHex)) colorHex = '#5DADE2'
    return {
      ...s,
      name: s.name.trim(),
      fromTime,
      toTime,
      colorHex,
      endsNextDay,
      sortOrder: index,
    }
  })
}

function toDraft(s: OrganisationGeneralSettings): DomCareShiftDefinition[] {
  const rows =
    s.domCareShiftDefinitions?.length > 0
      ? s.domCareShiftDefinitions
      : DEFAULT_DOM_CARE_SHIFT_DEFINITIONS
  return normalizeShifts(rows.map(row => ({ ...row })))
}

const timeInputClassName = cn(
  'h-9 w-full shrink-0 tabular-nums pr-10',
  '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0',
  '[&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full',
  '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0',
)

function ShiftTimeField({
  value,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  'aria-label': string
}) {
  return (
    <div className="relative h-9 min-w-0 w-full">
      <Input
        type="time"
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={timeInputClassName}
      />
      <span
        className="pointer-events-none absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
        aria-hidden
      >
        <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    </div>
  )
}

export function GeneralSettingsDomCareShiftsPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const { data: settingsData, isLoading: loading, error: queryError } = useGeneralSettings()
  const updateMutation = useUpdateGeneralSettings()
  const [saved, setSaved] = React.useState<DomCareShiftDefinition[] | null>(null)
  const [shifts, setShifts] = React.useState<DomCareShiftDefinition[]>(DEFAULT_DOM_CARE_SHIFT_DEFINITIONS)
  const saving = updateMutation.isPending
  const error =
    queryError instanceof ApiError
      ? queryError.message
      : queryError
        ? 'Could not load dom care shift settings.'
        : null

  React.useEffect(() => {
    if (settingsData) {
      const d = toDraft(settingsData)
      setSaved(d)
      setShifts(d)
    }
  }, [settingsData])

  function updateShift(id: string, patch: Partial<DomCareShiftDefinition>) {
    setShifts(prev =>
      prev.map(s => {
        if (s.id !== id) return s
        const next = { ...s, ...patch }
        if (patch.fromTime !== undefined || patch.toTime !== undefined) {
          next.endsNextDay = inferEndsNextDay(next.fromTime, next.toTime)
        }
        return next
      }),
    )
  }

  function removeShift(id: string) {
    setShifts(prev => prev.filter(s => s.id !== id))
  }

  function addShift() {
    setShifts(prev => [...prev, newDomCareShift(prev.length)])
  }

  async function onSave() {
    if (!canUpdate) return
    const normalized = normalizeShifts(shifts).filter(s => s.name.length > 0)
    if (normalized.length === 0) {
      toastApiError(new Error('Add at least one shift with a name.'), 'Save failed')
      return
    }
    try {
      const updated = await updateMutation.mutateAsync({ domCareShiftDefinitions: normalized })
      const d = toDraft(updated)
      setSaved(d)
      setShifts(d)
      toastSuccess('Saved', 'Dom care shifts updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  function onReset() {
    if (saved) setShifts(saved.map(s => ({ ...s })))
    else setShifts(DEFAULT_DOM_CARE_SHIFT_DEFINITIONS.map(s => ({ ...s })))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-dom-care-shifts-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-primary">Define Shifts</h3>
          {canUpdate ? (
            <Button
              type="button"
              size="icon"
              className="h-7 w-7 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              aria-label="Add shift"
              onClick={addShift}
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <div className="space-y-3">
          {shifts.map((shift, index) => (
            <div
              key={shift.id}
              className="grid w-full grid-cols-[1fr_auto_1fr_auto_1fr_auto_auto] items-center gap-x-2 gap-y-2 rounded-lg border border-border/80 bg-muted/10 p-3"
            >
              <Input
                className="h-9 min-w-0 w-full"
                placeholder="Shift name"
                value={shift.name}
                disabled={!canUpdate}
                onChange={e => updateShift(shift.id, { name: e.target.value })}
                aria-label={`Shift ${index + 1} name`}
              />
              <span className="shrink-0 text-sm text-foreground">
                From <span className="text-destructive">*</span>
              </span>
              <ShiftTimeField
                value={shift.fromTime}
                disabled={!canUpdate}
                onChange={v => updateShift(shift.id, { fromTime: v })}
                aria-label={`Shift ${index + 1} from time`}
              />
              <span className="shrink-0 text-sm text-foreground">
                To <span className="text-destructive">*</span>
              </span>
              <ShiftTimeField
                value={shift.toTime}
                disabled={!canUpdate}
                onChange={v => updateShift(shift.id, { toTime: v })}
                aria-label={`Shift ${index + 1} to time`}
              />
              <label className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border">
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: shift.colorHex }}
                  aria-hidden
                />
                <input
                  type="color"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  value={shift.colorHex}
                  disabled={!canUpdate}
                  onChange={e => updateShift(shift.id, { colorHex: e.target.value })}
                  aria-label={`Shift ${index + 1} colour`}
                />
              </label>
              {index > 0 && canUpdate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-primary"
                  aria-label="Remove shift"
                  onClick={() => removeShift(shift.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>

        {shifts.length === 0 && canUpdate ? (
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addShift}>
            <Plus className="h-4 w-4" />
            Add shift
          </Button>
        ) : null}
      </section>

      <p className="text-xs text-muted-foreground">
        Shift colours are used on domiciliary schedules and rota views.
      </p>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
          Reset
        </Button>
        <Button
          type="button"
          onClick={() => void onSave()}
          disabled={!canUpdate || saving}
          className={cn(!canUpdate && 'pointer-events-none')}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </div>
  )
}
