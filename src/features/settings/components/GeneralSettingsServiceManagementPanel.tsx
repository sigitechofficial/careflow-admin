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
import { NoYesToggle } from '@/components/ui/no-yes-toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GeneralSettingsCard, SettingsRow } from '@/features/settings/components/GeneralSettingsCard'
import { useAuthStore } from '@/store/auth.store'

const ROLE_NOTE = 'For roles: Senior Carer/Nurse, Carer/Domestic, Inspector'

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

const SERVICE_DEFAULTS: ServiceManagementDraft = {
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

const ALLOCATE_LABELS: Record<AllocateEmployeeBy, string> = {
  FLOOR: 'Floor',
  WARD: 'Ward',
  UNIT: 'Unit',
  TEAM: 'Team',
  ZONE: 'Zone',
}

function toServiceDraft(s: OrganisationGeneralSettings): ServiceManagementDraft {
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

export function GeneralSettingsServiceManagementPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState<ServiceManagementDraft | null>(null)
  const [draft, setDraft] = React.useState<ServiceManagementDraft>(SERVICE_DEFAULTS)

  const apply = React.useCallback((s: OrganisationGeneralSettings) => {
    const d = toServiceDraft(s)
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
      const updated = await updateGeneralSettings(draft)
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
    else setDraft(SERVICE_DEFAULTS)
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
            hint="If set to yes, the enhanced functionality for the regular action Alert times, activation periods etc. will be enabled."
          >
            <NoYesToggle
              value={draft.enhancedRegularActionChecks}
              onChange={v => setDraft(d => ({ ...d, enhancedRegularActionChecks: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow label="Show regular actions in daily list">
            <NoYesToggle
              value={draft.showRegularActionsInDailyList}
              onChange={v => setDraft(d => ({ ...d, showRegularActionsInDailyList: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow
            label="Allow Fast Action"
            hint="Setting to allow action complete automatically when long press on action"
          >
            <NoYesToggle
              value={draft.allowFastAction}
              onChange={v => setDraft(d => ({ ...d, allowFastAction: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow label="Actions Default View">
            <NoYesToggle
              value={draft.actionsDefaultView === 'ACTIONS_LIST'}
              onChange={v =>
                setDraft(d => ({
                  ...d,
                  actionsDefaultView: v ? 'ACTIONS_LIST' : 'TASK_LIST',
                }))
              }
              labelOff="Task List"
              labelOn="Actions List"
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow
            label="On app default to observations tab"
            hint="If it is set to yes, on the app when a Service user is selected - go to the obs tab first as a default. If No then go to the actions list tab first as a default."
          >
            <NoYesToggle
              value={draft.appDefaultToObservationsTab}
              onChange={v => setDraft(d => ({ ...d, appDefaultToObservationsTab: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
        </GeneralSettingsCard>

        <GeneralSettingsCard title="Shift & Allocation Settings">
          <p className="text-xs text-muted-foreground -mt-2 mb-2">
            These settings only apply to care home and supported living modules (Not Dom care)
          </p>
          <SettingsRow label="Allocate Employee by" required>
            <Select
              value={draft.allocateEmployeeBy}
              onValueChange={v =>
                setDraft(d => ({ ...d, allocateEmployeeBy: v as AllocateEmployeeBy }))
              }
              disabled={!canUpdate}
            >
              <SelectTrigger className="h-9 w-[8.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ALLOCATE_LABELS) as AllocateEmployeeBy[]).map(key => (
                  <SelectItem key={key} value={key}>
                    {ALLOCATE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label="Restrict Carer and Senior carer RBAC roles to only see allocated Service User"
            hint="This will restrict Carer and Senior carer RBAC roles to only see Service Users that they have been allocated to on the shift For roles : Senior Carer/Nurse, Carer/Domestic, Inspector"
          >
            <NoYesToggle
              value={draft.restrictCarerToAllocatedServiceUsers}
              onChange={v => setDraft(d => ({ ...d, restrictCarerToAllocatedServiceUsers: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow
            label="Restrict login to shift times"
            hint="If set to YES, then L1 & L2 Employee will only be able to log in if they have an allocated shift"
            subtext={ROLE_NOTE}
          >
            <NoYesToggle
              value={draft.restrictLoginToShiftTimes}
              onChange={v => setDraft(d => ({ ...d, restrictLoginToShiftTimes: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow
            label="Prevent Carer and Senior Carer RBAC roles from logging on to the web"
            hint="This will restrict the 2 RBAC roles from logging into the web system, so they can only log in on the APP"
          >
            <NoYesToggle
              value={draft.preventCarerWebLogin}
              onChange={v => setDraft(d => ({ ...d, preventCarerWebLogin: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <div className="space-y-2">
            <p className="text-sm text-foreground">Access Timing</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
              <span>Allow carers to access shift information</span>
              <Input
                type="number"
                min={0}
                max={120}
                className="h-8 w-16 text-center tabular-nums"
                value={draft.shiftAccessMinutesBefore}
                disabled={!canUpdate}
                onChange={e => {
                  const n = Number.parseInt(e.target.value, 10)
                  if (!Number.isNaN(n)) {
                    setDraft(d => ({
                      ...d,
                      shiftAccessMinutesBefore: Math.min(120, Math.max(0, n)),
                    }))
                  }
                }}
              />
              <span>minutes before a shift starts and</span>
              <Input
                type="number"
                min={0}
                max={120}
                className="h-8 w-16 text-center tabular-nums"
                value={draft.shiftAccessMinutesAfter}
                disabled={!canUpdate}
                onChange={e => {
                  const n = Number.parseInt(e.target.value, 10)
                  if (!Number.isNaN(n)) {
                    setDraft(d => ({
                      ...d,
                      shiftAccessMinutesAfter: Math.min(120, Math.max(0, n)),
                    }))
                  }
                }}
              />
              <span>minutes after the shift end</span>
            </div>
            <p className="text-xs text-muted-foreground">
              These settings define the times before and after the defined shift times that carers
              will be able to view the shift information. Max allowed is 2 hours — 120 minutes.
            </p>
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
