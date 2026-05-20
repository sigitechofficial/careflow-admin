import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  fetchGeneralSettings,
  updateGeneralSettings,
  type ActionsDefaultView,
  type AllocateEmployeeBy,
  type OrganisationGeneralSettings,
} from '@/lib/general-settings-api'
import { toastApiError, toastSuccess } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useAuthStore } from '@/store/auth.store'

const SHIFT_ROLES_NOTE = 'For roles: Senior Carer/Nurse, Carer/Domestic, Inspector'

const TOOLTIPS = {
  enhancedRegularActionChecks:
    'If set to yes, the enhanced functionality for the regular action Alert times, activation periods etc. will be enabled.',
  allowFastAction:
    'Setting to allow action complete automatically when long press on action',
  appDefaultToObservationsTab:
    'If it is set to yes, on the app when a Service user is selected - go to the obs tab first as a default. If No then go to the actions list tab first as a default.',
  allocateEmployeeBy: 'How employees are allocated to service users on shifts (care home / supported living).',
  restrictCarerToAllocatedServiceUsers:
    'This will restrict Carer and Senior carer RBAC roles to only see Service Users that they have been allocated to on the shift For roles : Senior Carer/Nurse',
  restrictLoginToShiftTimes:
    'If set to YES, then L1 & L2 Employee will only be able to log in if they have an allocated shift',
  preventCarerWebLogin:
    'This will restrict the 2 RBAC roles from logging into the web system, so they can only log in on the APP',
  shiftAccess:
    'These settings define the times before and after the defined shift times that carers will be able to view the shift information. Max allowed is 2 hours - 120 minutes',
} as const

type ServiceManagementDraft = {
  enhancedRegularActionChecks: boolean
  showRegularActionsInDailyList: boolean
  allowFastAction: boolean
  actionsDefaultView: ActionsDefaultView
  appDefaultToObservationsTab: boolean
  allocateEmployeeBy: AllocateEmployeeBy
  restrictCarerToAllocatedServiceUsers: boolean
  restrictLoginToShiftTimes: boolean
  preventCarerWebLogin: boolean
  shiftAccessMinutesBefore: number
  shiftAccessMinutesAfter: number
}

const DEFAULTS: ServiceManagementDraft = {
  enhancedRegularActionChecks: true,
  showRegularActionsInDailyList: true,
  allowFastAction: true,
  actionsDefaultView: 'TASK_LIST',
  appDefaultToObservationsTab: true,
  allocateEmployeeBy: 'FLOOR',
  restrictCarerToAllocatedServiceUsers: true,
  restrictLoginToShiftTimes: true,
  preventCarerWebLogin: true,
  shiftAccessMinutesBefore: 60,
  shiftAccessMinutesAfter: 30,
}

function toDraft(s: OrganisationGeneralSettings): ServiceManagementDraft {
  return {
    enhancedRegularActionChecks: s.enhancedRegularActionChecks,
    showRegularActionsInDailyList: s.showRegularActionsInDailyList,
    allowFastAction: s.allowFastAction,
    actionsDefaultView: s.actionsDefaultView,
    appDefaultToObservationsTab: s.appDefaultToObservationsTab,
    allocateEmployeeBy: s.allocateEmployeeBy,
    restrictCarerToAllocatedServiceUsers: s.restrictCarerToAllocatedServiceUsers,
    restrictLoginToShiftTimes: s.restrictLoginToShiftTimes,
    preventCarerWebLogin: s.preventCarerWebLogin,
    shiftAccessMinutesBefore: s.shiftAccessMinutesBefore,
    shiftAccessMinutesAfter: s.shiftAccessMinutesAfter,
  }
}

function clampMinutes(n: number) {
  return Math.min(120, Math.max(0, Number.isFinite(n) ? Math.round(n) : 0))
}

export function GeneralSettingsServiceManagementPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState<ServiceManagementDraft | null>(null)
  const [draft, setDraft] = React.useState<ServiceManagementDraft>(DEFAULTS)

  const apply = React.useCallback((s: OrganisationGeneralSettings) => {
    const d = toDraft(s)
    setSaved(d)
    setDraft(d)
  }, [])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const s = await fetchGeneralSettings()
        if (!cancelled) apply(s)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Could not load service management settings.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apply])

  async function onSave() {
    if (!canUpdate) return
    setSaving(true)
    try {
      const updated = await updateGeneralSettings({
        ...draft,
        shiftAccessMinutesBefore: clampMinutes(draft.shiftAccessMinutesBefore),
        shiftAccessMinutesAfter: clampMinutes(draft.shiftAccessMinutesAfter),
      })
      apply(updated)
      toastSuccess('Saved', 'Service management settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function onReset() {
    if (saved) setDraft({ ...saved })
    else setDraft(DEFAULTS)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-service-management-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <GeneralSettingsCard title="Care Home Actions">
          <SettingsRow
            label="Enhanced Regular Action checks"
            hint={TOOLTIPS.enhancedRegularActionChecks}
          >
            <SettingsNoYesToggle
              value={draft.enhancedRegularActionChecks}
              onChange={v => setDraft(d => ({ ...d, enhancedRegularActionChecks: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow label="Show regular actions in daily list">
            <SettingsNoYesToggle
              value={draft.showRegularActionsInDailyList}
              onChange={v => setDraft(d => ({ ...d, showRegularActionsInDailyList: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow label="Allow Fast Action" hint={TOOLTIPS.allowFastAction}>
            <SettingsNoYesToggle
              value={draft.allowFastAction}
              onChange={v => setDraft(d => ({ ...d, allowFastAction: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow label="Actions Default View">
            <SettingsNoYesToggle
              value={draft.actionsDefaultView === 'TASK_LIST'}
              onChange={v =>
                setDraft(d => ({ ...d, actionsDefaultView: v ? 'TASK_LIST' : 'ACTIONS_LIST' }))
              }
              labelOff="Actions List"
              labelOn="Task List"
              className="min-w-[5.75rem]"
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow
            label="On app default to observations tab"
            hint={TOOLTIPS.appDefaultToObservationsTab}
          >
            <SettingsNoYesToggle
              value={draft.appDefaultToObservationsTab}
              onChange={v => setDraft(d => ({ ...d, appDefaultToObservationsTab: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
        </GeneralSettingsCard>

        <GeneralSettingsCard title="Shift & Allocation Settings">
          <p className="-mt-2 text-xs text-muted-foreground">
            These settings only apply to care home and supported living modules (Not Dom care)
          </p>
          <SettingsRow
            label={
              <>
                Allocate Employee by <span className="text-destructive">*</span>
              </>
            }
            hint={TOOLTIPS.allocateEmployeeBy}
          >
            <Select
              value={draft.allocateEmployeeBy}
              onValueChange={v => setDraft(d => ({ ...d, allocateEmployeeBy: v as AllocateEmployeeBy }))}
              disabled={!canUpdate}
            >
              <SelectTrigger className="h-9 w-[8.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FLOOR">Floor</SelectItem>
                <SelectItem value="WARD">Ward</SelectItem>
                <SelectItem value="ZONE">Zone</SelectItem>
                <SelectItem value="UNIT">Unit</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label="Restrict Carer and Senior carer RBAC roles to only see allocated Service User"
            hint={TOOLTIPS.restrictCarerToAllocatedServiceUsers}
          >
            <SettingsNoYesToggle
              value={draft.restrictCarerToAllocatedServiceUsers}
              onChange={v => setDraft(d => ({ ...d, restrictCarerToAllocatedServiceUsers: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow
            label="Restrict login to shift times"
            hint={TOOLTIPS.restrictLoginToShiftTimes}
            helperText={SHIFT_ROLES_NOTE}
          >
            <SettingsNoYesToggle
              value={draft.restrictLoginToShiftTimes}
              onChange={v => setDraft(d => ({ ...d, restrictLoginToShiftTimes: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow
            label="Prevent Carer and Senior Carer RBAC roles from logging on to the web"
            hint={TOOLTIPS.preventCarerWebLogin}
          >
            <SettingsNoYesToggle
              value={draft.preventCarerWebLogin}
              onChange={v => setDraft(d => ({ ...d, preventCarerWebLogin: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            <span>Allow carers to access shift information</span>
            <Input
              type="number"
              min={0}
              max={120}
              className="h-9 w-16 text-center tabular-nums"
              value={draft.shiftAccessMinutesBefore}
              disabled={!canUpdate}
              onChange={e =>
                setDraft(d => ({
                  ...d,
                  shiftAccessMinutesBefore: clampMinutes(Number.parseInt(e.target.value, 10) || 0),
                }))
              }
            />
            <span>minutes before a shift starts and</span>
            <Input
              type="number"
              min={0}
              max={120}
              className="h-9 w-16 text-center tabular-nums"
              value={draft.shiftAccessMinutesAfter}
              disabled={!canUpdate}
              onChange={e =>
                setDraft(d => ({
                  ...d,
                  shiftAccessMinutesAfter: clampMinutes(Number.parseInt(e.target.value, 10) || 0),
                }))
              }
            />
            <span>minutes after the shift end</span>
            <SettingsHint text={TOOLTIPS.shiftAccess} />
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
