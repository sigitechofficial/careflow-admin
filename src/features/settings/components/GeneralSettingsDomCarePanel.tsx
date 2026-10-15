import * as React from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import {
  type DomJobCancellationRule,
  type DomLateVisitZoneAlert,
  type MultiCarerFunderChargeMode,
  type OrganisationGeneralSettings,
  type RotaHorizonMode,
} from '@/features/settings/types'
import { type EmployeeListRow } from '@/features/employees/types'
import { useAllEmployees } from '@/features/employees/hooks/useEmployeeTabs'
import {
  useGeneralSettings,
  useUpdateGeneralSettings,
} from '@/features/settings/hooks/useGeneralSettings'
import { useScheduleAreas } from '@/features/scheduling/hooks/useScheduling'
import type { ScheduleAreaRow } from '@/features/scheduling/types/scheduling.types'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { createClientUuid } from '@/shared/lib/create-client-uuid'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { MultiSelect, type MultiSelectOption } from '@/shared/ui/multi-select'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  DEFAULT_DOM_JOB_CANCELLATION_RULES,
  defaultDomLateVisitZoneAlerts,
  domCareZoneKey,
  scheduleAreaDisplayLabel,
} from '@/features/settings/dom-care/dom-care-settings-defaults'
import {
  GeneralSettingsCard,
  SettingsHint,
  SettingsNoYesToggle,
  SettingsRow,
} from '@/features/settings/components/GeneralSettingsCard'
import { useAuthStore } from '@/features/auth/store'

const TOOLTIPS = {
  globalTolerance:
    'Tolerance in minutes applied when determining if a visit is late or outside the allowed window.',
  showAllZones:
    'When enabled, employees and visits from all zones are visible across the organisation.',
  emailTomorrow:
    'Automatically email tomorrow’s domiciliary schedule to configured recipients.',
  downloadAllSu: 'Allow the mobile app to download all service user records for offline use.',
  showBlockedCarersInSchedule:
    'When enabled, carers blocked by a service user still appear in schedule carer lists (marked as blocked and not assignable). When disabled, blocked carers are hidden from schedule pickers.',
  checkInNfc: 'Shows NFC on the carer clock-in sheet. Tag scanning is not shipped yet.',
  checkInQr: 'Shows QR on the carer clock-in sheet. Camera scanning is not shipped yet.',
  lateVisitRequired: 'Enable alerts when a carer is late checking in to a scheduled visit.',
  lateVisitMinutes: 'Number of minutes after the scheduled start time before a late visit alert is raised.',
  lateVisitNotification: 'Send late visit alerts as in-app notifications to selected staff per zone.',
  autoExtendRota:
    'Each day at the configured hour, generate rota for the day that keeps the rolling horizon full for all ready active visit plans.',
  rotaHorizonDays:
    'How many days ahead rota is maintained. For example, 30 means today plus the next 30 days are always scheduled.',
  rotaHorizonMode:
    'Fixed days uses the horizon below. Calendar month generates through the end of the month when To date is left blank.',
  autoExtendRotaRunHour: 'Hour (UK time) when the daily rolling rota extension runs. Default is 12 (noon).',
  multiCarerFunderCharge:
    'Controls how double-up / multi-carer visits are charged to the service-user funder. Carer pay is always calculated per carer.',
} as const

type DomCareDraft = {
  multiCarerFunderChargeMode: MultiCarerFunderChargeMode
  domJobCancellationRules: DomJobCancellationRule[]
  domGlobalToleranceMinutes: number
  domGeofenceDistanceMeters: number
  domWorkPatternCycles: number
  domShowAllEmployeesAcrossZones: boolean
  domEmailTomorrowsSchedule: boolean
  domAppShowHoursBefore: number
  domRestrictJobOutsideGeofence: boolean
  domCheckInGpsEnabled: boolean
  domCheckInManualEnabled: boolean
  domCheckInNfcEnabled: boolean
  domCheckInQrEnabled: boolean
  domGeofenceToleranceMeters: number
  domDownloadAllServiceUsers: boolean
  domFutureVisitsDays: number
  domAutoExtendRotaEnabled: boolean
  domCancellationHospitalExemption: boolean
  domRotaHorizonDays: number
  domRotaHorizonMode: RotaHorizonMode
  domAutoExtendRotaRunHour: number
  domShowWeeklyHours: boolean
  domShowServiceUserName: boolean
  domShowBlockedCarersInSchedule: boolean
  domLateVisitAlertRequired: boolean
  domLateVisitAlertMinutes: number
  domLateVisitAlertEmail: boolean
  domLateVisitAlertText: boolean
  domLateVisitAlertNotification: boolean
  domTextAlertsSentThisMonth: number
  domTextAlertsSentLastMonth: number
  domLateVisitZoneAlerts: DomLateVisitZoneAlert[]
}

const DEFAULTS: DomCareDraft = {
  multiCarerFunderChargeMode: 'COMBINED',
  domJobCancellationRules: DEFAULT_DOM_JOB_CANCELLATION_RULES,
  domGlobalToleranceMinutes: 30,
  domGeofenceDistanceMeters: 100,
  domWorkPatternCycles: 2,
  domShowAllEmployeesAcrossZones: true,
  domEmailTomorrowsSchedule: false,
  domAppShowHoursBefore: 48,
  domRestrictJobOutsideGeofence: true,
  domCheckInGpsEnabled: true,
  domCheckInManualEnabled: false,
  domCheckInNfcEnabled: false,
  domCheckInQrEnabled: false,
  domGeofenceToleranceMeters: 150,
  domDownloadAllServiceUsers: false,
  domFutureVisitsDays: 14,
  domAutoExtendRotaEnabled: true,
  domCancellationHospitalExemption: true,
  domRotaHorizonDays: 28,
  domRotaHorizonMode: 'FIXED_DAYS',
  domAutoExtendRotaRunHour: 12,
  domShowWeeklyHours: true,
  domShowServiceUserName: true,
  domShowBlockedCarersInSchedule: false,
  domLateVisitAlertRequired: true,
  domLateVisitAlertMinutes: 20,
  domLateVisitAlertEmail: true,
  domLateVisitAlertText: false,
  domLateVisitAlertNotification: true,
  domTextAlertsSentThisMonth: 0,
  domTextAlertsSentLastMonth: 0,
  domLateVisitZoneAlerts: defaultDomLateVisitZoneAlerts(),
}

function employeeLabel(row: EmployeeListRow): string {
  const name =
    row.fullName?.trim() ||
    [row.firstName, row.lastName].filter(Boolean).join(' ').trim()
  return name || 'Unnamed employee'
}

function mergeZoneAlerts(
  saved: DomLateVisitZoneAlert[],
  scheduleAreas: ScheduleAreaRow[],
): DomLateVisitZoneAlert[] {
  const byKey = new Map<string, DomLateVisitZoneAlert>()
  for (const zone of saved) byKey.set(zone.zoneKey, { ...zone })
  for (const area of scheduleAreas) {
    const label = scheduleAreaDisplayLabel(area)
    const zoneKey = domCareZoneKey(label)
    const existing = byKey.get(zoneKey)
    byKey.set(zoneKey, {
      zoneKey,
      label,
      scheduleAreaId: area.id,
      emailEmployeeIds: existing?.emailEmployeeIds ?? [],
      notificationEmployeeIds: existing?.notificationEmployeeIds ?? [],
    })
  }
  for (const zone of defaultDomLateVisitZoneAlerts()) {
    if (!byKey.has(zone.zoneKey)) byKey.set(zone.zoneKey, zone)
  }
  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label))
}

function toDraft(s: OrganisationGeneralSettings, scheduleAreas: ScheduleAreaRow[]): DomCareDraft {
  return {
    multiCarerFunderChargeMode: s.multiCarerFunderChargeMode ?? 'COMBINED',
    domJobCancellationRules:
      s.domJobCancellationRules.length > 0 ? s.domJobCancellationRules : DEFAULT_DOM_JOB_CANCELLATION_RULES,
    domGlobalToleranceMinutes: s.domGlobalToleranceMinutes,
    domGeofenceDistanceMeters: s.domGeofenceDistanceMeters,
    domWorkPatternCycles: s.domWorkPatternCycles,
    domShowAllEmployeesAcrossZones: s.domShowAllEmployeesAcrossZones,
    domEmailTomorrowsSchedule: s.domEmailTomorrowsSchedule,
    domAppShowHoursBefore: s.domAppShowHoursBefore,
    domRestrictJobOutsideGeofence: s.domRestrictJobOutsideGeofence,
    domCheckInGpsEnabled: s.domCheckInGpsEnabled ?? true,
    domCheckInManualEnabled: s.domCheckInManualEnabled ?? false,
    domCheckInNfcEnabled: s.domCheckInNfcEnabled ?? false,
    domCheckInQrEnabled: s.domCheckInQrEnabled ?? false,
    domGeofenceToleranceMeters: s.domGeofenceToleranceMeters,
    domDownloadAllServiceUsers: s.domDownloadAllServiceUsers,
    domFutureVisitsDays: s.domFutureVisitsDays,
    domAutoExtendRotaEnabled: s.domAutoExtendRotaEnabled ?? true,
    domCancellationHospitalExemption: s.domCancellationHospitalExemption ?? true,
    domRotaHorizonDays: s.domRotaHorizonDays ?? 28,
    domRotaHorizonMode: s.domRotaHorizonMode ?? 'FIXED_DAYS',
    domAutoExtendRotaRunHour: s.domAutoExtendRotaRunHour ?? 12,
    domShowWeeklyHours: s.domShowWeeklyHours,
    domShowServiceUserName: s.domShowServiceUserName,
    domShowBlockedCarersInSchedule: s.domShowBlockedCarersInSchedule ?? false,
    domLateVisitAlertRequired: s.domLateVisitAlertRequired,
    domLateVisitAlertMinutes: s.domLateVisitAlertMinutes,
    domLateVisitAlertEmail: s.domLateVisitAlertEmail,
    domLateVisitAlertText: s.domLateVisitAlertText,
    domLateVisitAlertNotification: s.domLateVisitAlertNotification,
    domTextAlertsSentThisMonth: s.domTextAlertsSentThisMonth,
    domTextAlertsSentLastMonth: s.domTextAlertsSentLastMonth,
    domLateVisitZoneAlerts: mergeZoneAlerts(s.domLateVisitZoneAlerts, scheduleAreas),
  }
}

function clampPercent(n: number) {
  return Math.min(100, Math.max(0, Number.isFinite(n) ? Math.round(n) : 0))
}

function clampInt(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? Math.round(n) : min))
}

function newCancellationRule(): DomJobCancellationRule {
  return {
    id: createClientUuid(),
    hoursFrom: 0,
    hoursTo: 0,
    chargeServiceUserPercent: 0,
    payEmployeePercent: 0,
  }
}

function ZoneAlertBlock({
  zone,
  employeeOptions,
  disabled,
  onChange,
}: {
  zone: DomLateVisitZoneAlert
  employeeOptions: MultiSelectOption[]
  disabled: boolean
  onChange: (patch: Partial<DomLateVisitZoneAlert>) => void
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/80 bg-muted/10 p-4">
      <p className="text-sm font-semibold text-foreground">{zone.label} :</p>
      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">Alert By Email</p>
        <MultiSelect
          options={employeeOptions}
          value={zone.emailEmployeeIds}
          onChange={ids => onChange({ emailEmployeeIds: ids })}
          placeholder="Select Employee"
          disabled={disabled}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">Alert By Notification</p>
        <MultiSelect
          options={employeeOptions}
          value={zone.notificationEmployeeIds}
          onChange={ids => onChange({ notificationEmployeeIds: ids })}
          placeholder="Select Employee"
          disabled={disabled}
        />
      </div>
    </div>
  )
}

export function GeneralSettingsDomCarePanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const settingsQuery = useGeneralSettings()
  const areasQuery = useScheduleAreas()
  const employeesQuery = useAllEmployees()
  const updateMutation = useUpdateGeneralSettings()
  const [saved, setSaved] = React.useState<DomCareDraft | null>(null)
  const [draft, setDraft] = React.useState<DomCareDraft>(DEFAULTS)
  const [employeeOptions, setEmployeeOptions] = React.useState<MultiSelectOption[]>([])
  const loading = settingsQuery.isLoading || areasQuery.isLoading || employeesQuery.isLoading
  const saving = updateMutation.isPending
  const error =
    settingsQuery.error instanceof ApiError
      ? settingsQuery.error.message
      : settingsQuery.error
        ? 'Could not load dom care settings.'
        : null

  const apply = React.useCallback(
    (s: OrganisationGeneralSettings, scheduleAreas: ScheduleAreaRow[]) => {
      const d = toDraft(s, scheduleAreas)
      setSaved(d)
      setDraft(d)
    },
    [],
  )

  React.useEffect(() => {
    if (settingsQuery.data) {
      apply(settingsQuery.data, areasQuery.data ?? [])
    }
  }, [settingsQuery.data, apply])

  React.useEffect(() => {
    if (!settingsQuery.data || areasQuery.data === undefined) return
    setDraft((d) => ({
      ...d,
      domLateVisitZoneAlerts: mergeZoneAlerts(settingsQuery.data!.domLateVisitZoneAlerts, areasQuery.data),
    }))
    setSaved((s) =>
      s
        ? {
            ...s,
            domLateVisitZoneAlerts: mergeZoneAlerts(
              settingsQuery.data!.domLateVisitZoneAlerts,
              areasQuery.data,
            ),
          }
        : s,
    )
  }, [areasQuery.data, settingsQuery.data])

  React.useEffect(() => {
    if (employeesQuery.data) {
      setEmployeeOptions(
        employeesQuery.data.map(e => ({ value: e.id, label: employeeLabel(e) })),
      )
    }
  }, [employeesQuery.data])

  function updateZone(zoneKey: string, patch: Partial<DomLateVisitZoneAlert>) {
    setDraft(d => ({
      ...d,
      domLateVisitZoneAlerts: d.domLateVisitZoneAlerts.map(z =>
        z.zoneKey === zoneKey ? { ...z, ...patch } : z,
      ),
    }))
  }

  function updateRule(id: string, patch: Partial<DomJobCancellationRule>) {
    setDraft(d => ({
      ...d,
      domJobCancellationRules: d.domJobCancellationRules.map(r =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    }))
  }

  function removeRule(id: string) {
    setDraft(d => ({
      ...d,
      domJobCancellationRules: d.domJobCancellationRules.filter(r => r.id !== id),
    }))
  }

  function addRule() {
    setDraft(d => ({
      ...d,
      domJobCancellationRules: [...d.domJobCancellationRules, newCancellationRule()],
    }))
  }

  async function onSave() {
    if (!canUpdate) return
    if (
      !draft.domCheckInGpsEnabled &&
      !draft.domCheckInManualEnabled &&
      !draft.domCheckInNfcEnabled &&
      !draft.domCheckInQrEnabled
    ) {
      toastError('Leave at least one check-in method on')
      return
    }
    try {
      const {
        domTextAlertsSentThisMonth: _thisMonth,
        domTextAlertsSentLastMonth: _lastMonth,
        ...editable
      } = draft
      const updated = await updateMutation.mutateAsync({
        ...editable,
        domShowBlockedCarersInSchedule: draft.domShowBlockedCarersInSchedule,
        domGlobalToleranceMinutes: clampInt(draft.domGlobalToleranceMinutes, 0, 1440),
        domGeofenceDistanceMeters: clampInt(draft.domGeofenceDistanceMeters, 0, 50000),
        domWorkPatternCycles: clampInt(draft.domWorkPatternCycles, 1, 52),
        domAppShowHoursBefore: clampInt(draft.domAppShowHoursBefore, 0, 168),
        domGeofenceToleranceMeters: clampInt(draft.domGeofenceToleranceMeters, 0, 50000),
        domFutureVisitsDays: clampInt(draft.domFutureVisitsDays, 0, 365),
        domRotaHorizonDays: clampInt(draft.domRotaHorizonDays, 1, 90),
        domAutoExtendRotaRunHour: clampInt(draft.domAutoExtendRotaRunHour, 0, 23),
        domLateVisitAlertMinutes: clampInt(draft.domLateVisitAlertMinutes, 1, 240),
        domJobCancellationRules: draft.domJobCancellationRules.map(r => ({
          ...r,
          chargeServiceUserPercent: clampPercent(r.chargeServiceUserPercent),
          payEmployeePercent: clampPercent(r.payEmployeePercent),
        })),
      })
      const scheduleAreas = areasQuery.data ?? []
      apply(updated, scheduleAreas)
      toastSuccess('Saved', 'Dom care settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
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
    <div className="space-y-6" data-testid="general-settings-dom-care-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <GeneralSettingsCard title="Multi-carer funder charging">
        <div className="space-y-3">
          <SettingsHint text={TOOLTIPS.multiCarerFunderCharge} />
          <RadioGroup
            value={draft.multiCarerFunderChargeMode}
            onValueChange={v =>
              setDraft(d => ({
                ...d,
                multiCarerFunderChargeMode: v as MultiCarerFunderChargeMode,
              }))
            }
            disabled={!canUpdate}
            className="space-y-3"
            data-testid="multi-carer-funder-charge-mode"
          >
            <label className="flex cursor-pointer items-start gap-2">
              <RadioGroupItem value="COMBINED" className="mt-0.5" />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">
                  Combined visit pay
                </span>
                <span className="block text-xs text-muted-foreground">
                  Charge the funder for each carer’s hours (e.g. 2h + 2h = 4h). Default.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <RadioGroupItem value="FIXED" className="mt-0.5" />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">Fixed visit pay</span>
                <span className="block text-xs text-muted-foreground">
                  Charge the funder once for the visit window (e.g. 07:00–10:00 = 3h), even when
                  carers overlap.
                </span>
              </span>
            </label>
          </RadioGroup>
        </div>
      </GeneralSettingsCard>

      <GeneralSettingsCard title="Job Cancellation">
        <div className="space-y-4">
          {draft.domJobCancellationRules.map((rule, index) => (
            <div
              key={rule.id}
              className="flex flex-wrap items-center gap-2 text-sm text-foreground"
            >
              <span>If cancelled between</span>
              <Input
                type="number"
                min={0}
                className="h-9 w-16 text-center tabular-nums"
                value={rule.hoursFrom}
                disabled={!canUpdate}
                onChange={e =>
                  updateRule(rule.id, {
                    hoursFrom: Number.parseInt(e.target.value, 10) || 0,
                  })
                }
              />
              <span>and</span>
              <Input
                type="number"
                min={0}
                className="h-9 w-16 text-center tabular-nums"
                value={rule.hoursTo}
                disabled={!canUpdate}
                onChange={e =>
                  updateRule(rule.id, { hoursTo: Number.parseInt(e.target.value, 10) || 0 })
                }
              />
              <span>Hours</span>
              <span className="hidden sm:inline text-muted-foreground">|</span>
              <span>Charge Service User</span>
              <Input
                type="number"
                min={0}
                max={100}
                className="h-9 w-16 text-center tabular-nums"
                value={rule.chargeServiceUserPercent}
                disabled={!canUpdate}
                onChange={e =>
                  updateRule(rule.id, {
                    chargeServiceUserPercent: Number.parseInt(e.target.value, 10) || 0,
                  })
                }
              />
              <span>% percent of fee*</span>
              <span>Pay Employee</span>
              <Input
                type="number"
                min={0}
                max={100}
                className="h-9 w-16 text-center tabular-nums"
                value={rule.payEmployeePercent}
                disabled={!canUpdate}
                onChange={e =>
                  updateRule(rule.id, {
                    payEmployeePercent: Number.parseInt(e.target.value, 10) || 0,
                  })
                }
              />
              <span>% percent</span>
              {index > 0 && canUpdate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive"
                  aria-label="Remove cancellation rule"
                  onClick={() => removeRule(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
          {canUpdate ? (
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addRule}>
              <Plus className="h-4 w-4" />
              Add rule
            </Button>
          ) : null}
        </div>
        <SettingsRow
          label="No charge for hospital admission"
          hint="When a visit is cancelled because the service user was admitted to hospital, the cancellation policy suggests no charge, whatever the notice."
        >
          <SettingsNoYesToggle
            value={draft.domCancellationHospitalExemption}
            onChange={v => setDraft(d => ({ ...d, domCancellationHospitalExemption: v }))}
            disabled={!canUpdate}
          />
        </SettingsRow>
      </GeneralSettingsCard>

      <GeneralSettingsCard title="Automatic rota extension">
        <SettingsRow label="Extend rota automatically" hint={TOOLTIPS.autoExtendRota}>
          <SettingsNoYesToggle
            value={draft.domAutoExtendRotaEnabled}
            onChange={v => setDraft(d => ({ ...d, domAutoExtendRotaEnabled: v }))}
            disabled={!canUpdate}
          />
        </SettingsRow>
        <SettingsRow label="Default horizon mode" hint={TOOLTIPS.rotaHorizonMode}>
          <Select
            value={draft.domRotaHorizonMode}
            onValueChange={v =>
              setDraft(d => ({ ...d, domRotaHorizonMode: v as RotaHorizonMode }))
            }
            disabled={!canUpdate}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FIXED_DAYS">Fixed days ahead</SelectItem>
              <SelectItem value="CALENDAR_MONTH">Through calendar month</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        {draft.domRotaHorizonMode === 'CALENDAR_MONTH' ? (
          <p className="text-sm text-muted-foreground">
            When To date is left blank on generate rota, visits are created through the end of the
            selected month.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
          <span>Maintain rolling rota</span>
          <Input
            type="number"
            min={1}
            max={90}
            className="h-9 w-16 text-center tabular-nums"
            value={draft.domRotaHorizonDays}
            disabled={!canUpdate}
            onChange={e =>
              setDraft(d => ({
                ...d,
                domRotaHorizonDays: Number.parseInt(e.target.value, 10) || 1,
              }))
            }
          />
          <span>days ahead</span>
          <SettingsHint text={TOOLTIPS.rotaHorizonDays} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
          <span>Run daily extension at</span>
          <Input
            type="number"
            min={0}
            max={23}
            className="h-9 w-16 text-center tabular-nums"
            value={draft.domAutoExtendRotaRunHour}
            disabled={!canUpdate || !draft.domAutoExtendRotaEnabled}
            onChange={e =>
              setDraft(d => ({
                ...d,
                domAutoExtendRotaRunHour: Number.parseInt(e.target.value, 10) || 0,
              }))
            }
          />
          <span>:00 UK time</span>
          <SettingsHint text={TOOLTIPS.autoExtendRotaRunHour} />
        </div>
      </GeneralSettingsCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GeneralSettingsCard title="Global Settings">
          <SettingsRow label="Global Tolerance Setting (minutes)" hint={TOOLTIPS.globalTolerance}>
            <Input
              type="number"
              min={0}
              max={1440}
              className="h-9 w-20 text-center tabular-nums"
              value={draft.domGlobalToleranceMinutes}
              disabled={!canUpdate}
              onChange={e =>
                setDraft(d => ({
                  ...d,
                  domGlobalToleranceMinutes: Number.parseInt(e.target.value, 10) || 0,
                }))
              }
            />
          </SettingsRow>
          <SettingsRow label="Geofence Distance Setting (meters)">
            <Input
              type="number"
              min={0}
              className="h-9 w-24 text-center tabular-nums"
              value={draft.domGeofenceDistanceMeters}
              disabled={!canUpdate}
              onChange={e =>
                setDraft(d => ({
                  ...d,
                  domGeofenceDistanceMeters: Number.parseInt(e.target.value, 10) || 0,
                }))
              }
            />
          </SettingsRow>
          <SettingsRow label="Work pattern cycles">
            <Select
              value={String(draft.domWorkPatternCycles)}
              onValueChange={v =>
                setDraft(d => ({ ...d, domWorkPatternCycles: Number.parseInt(v, 10) || 1 }))
              }
              disabled={!canUpdate}
            >
              <SelectTrigger className="h-9 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label="Show all employee and visits from across all zones"
            hint={TOOLTIPS.showAllZones}
          >
            <SettingsNoYesToggle
              value={draft.domShowAllEmployeesAcrossZones}
              onChange={v => setDraft(d => ({ ...d, domShowAllEmployeesAcrossZones: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
        </GeneralSettingsCard>

        <div className="space-y-6">
          <GeneralSettingsCard title="Email Dom Schedule">
            <SettingsRow label="Email tomorrows schedule?" hint={TOOLTIPS.emailTomorrow}>
              <SettingsNoYesToggle
                value={draft.domEmailTomorrowsSchedule}
                onChange={v => setDraft(d => ({ ...d, domEmailTomorrowsSchedule: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
          </GeneralSettingsCard>

          <GeneralSettingsCard title="App Settings">
            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
              <span>Show</span>
              <Input
                type="number"
                min={0}
                max={168}
                className="h-9 w-16 text-center tabular-nums"
                value={draft.domAppShowHoursBefore}
                disabled={!canUpdate}
                onChange={e =>
                  setDraft(d => ({
                    ...d,
                    domAppShowHoursBefore: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
              <span>hours before current time</span>
            </div>
            <SettingsRow label="Restrict Job Starting Outside Geofence">
              <SettingsNoYesToggle
                value={draft.domRestrictJobOutsideGeofence}
                onChange={v => setDraft(d => ({ ...d, domRestrictJobOutsideGeofence: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <p className="text-sm font-medium text-primary">Carer app check-in methods</p>
            <SettingsRow label="GPS check-in">
              <SettingsNoYesToggle
                value={draft.domCheckInGpsEnabled}
                onChange={v => setDraft(d => ({ ...d, domCheckInGpsEnabled: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <SettingsRow label="Manual check-in">
              <SettingsNoYesToggle
                value={draft.domCheckInManualEnabled}
                onChange={v => setDraft(d => ({ ...d, domCheckInManualEnabled: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <SettingsRow label="NFC tag check-in" hint={TOOLTIPS.checkInNfc}>
              <SettingsNoYesToggle
                value={draft.domCheckInNfcEnabled}
                onChange={v => setDraft(d => ({ ...d, domCheckInNfcEnabled: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <SettingsRow label="QR scan check-in" hint={TOOLTIPS.checkInQr}>
              <SettingsNoYesToggle
                value={draft.domCheckInQrEnabled}
                onChange={v => setDraft(d => ({ ...d, domCheckInQrEnabled: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
              <span>Geofence tolerance Distance*</span>
              <Input
                type="number"
                min={0}
                className="h-9 w-20 text-center tabular-nums"
                value={draft.domGeofenceToleranceMeters}
                disabled={!canUpdate}
                onChange={e =>
                  setDraft(d => ({
                    ...d,
                    domGeofenceToleranceMeters: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
              <span className="text-muted-foreground">Meters</span>
            </div>
            <SettingsRow label="Download all Service User" hint={TOOLTIPS.downloadAllSu}>
              <SettingsNoYesToggle
                value={draft.domDownloadAllServiceUsers}
                onChange={v => setDraft(d => ({ ...d, domDownloadAllServiceUsers: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <p className="text-sm font-medium text-primary">Future visit on app setting</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
              <span>Show</span>
              <Input
                type="number"
                min={0}
                max={365}
                className="h-9 w-16 text-center tabular-nums"
                value={draft.domFutureVisitsDays}
                disabled={!canUpdate}
                onChange={e =>
                  setDraft(d => ({
                    ...d,
                    domFutureVisitsDays: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
              <span>days future visits</span>
            </div>
            <SettingsRow label="Show weekly hours">
              <SettingsNoYesToggle
                value={draft.domShowWeeklyHours}
                onChange={v => setDraft(d => ({ ...d, domShowWeeklyHours: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <SettingsRow label="Show Service User name">
              <SettingsNoYesToggle
                value={draft.domShowServiceUserName}
                onChange={v => setDraft(d => ({ ...d, domShowServiceUserName: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <SettingsRow
              label="Show blocked carers in schedule"
              hint={TOOLTIPS.showBlockedCarersInSchedule}
            >
              <SettingsNoYesToggle
                value={draft.domShowBlockedCarersInSchedule}
                onChange={v => setDraft(d => ({ ...d, domShowBlockedCarersInSchedule: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
          </GeneralSettingsCard>
        </div>
      </div>

      <GeneralSettingsCard title="Late Visit Alert Settings">
        <SettingsRow label="Is late visit alerting required?" hint={TOOLTIPS.lateVisitRequired}>
          <SettingsNoYesToggle
            value={draft.domLateVisitAlertRequired}
            onChange={v => setDraft(d => ({ ...d, domLateVisitAlertRequired: v }))}
            disabled={!canUpdate}
          />
        </SettingsRow>
        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
          <span>Alert for late visit attendance by</span>
          <Input
            type="number"
            min={1}
            max={240}
            className="h-9 w-16 text-center tabular-nums"
            value={draft.domLateVisitAlertMinutes}
            disabled={!canUpdate}
            onChange={e =>
              setDraft(d => ({
                ...d,
                domLateVisitAlertMinutes: Number.parseInt(e.target.value, 10) || 1,
              }))
            }
          />
          <span>Minutes</span>
          <SettingsHint text={TOOLTIPS.lateVisitMinutes} />
        </div>
        <p className="text-sm font-medium text-foreground">How do you want the alerts?</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <SettingsRow label="Email">
            <SettingsNoYesToggle
              value={draft.domLateVisitAlertEmail}
              onChange={v => setDraft(d => ({ ...d, domLateVisitAlertEmail: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow label="Text">
            <SettingsNoYesToggle
              value={draft.domLateVisitAlertText}
              onChange={v => setDraft(d => ({ ...d, domLateVisitAlertText: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow label="Notification" hint={TOOLTIPS.lateVisitNotification}>
            <SettingsNoYesToggle
              value={draft.domLateVisitAlertNotification}
              onChange={v => setDraft(d => ({ ...d, domLateVisitAlertNotification: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <p className="text-sm text-muted-foreground">
            Text alert sent this month :{' '}
            <span className="font-medium text-foreground tabular-nums">
              {draft.domTextAlertsSentThisMonth}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Text alert sent last month :{' '}
            <span className="font-medium text-foreground tabular-nums">
              {draft.domTextAlertsSentLastMonth}
            </span>
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {draft.domLateVisitZoneAlerts.map(zone => (
            <ZoneAlertBlock
              key={zone.zoneKey}
              zone={zone}
              employeeOptions={employeeOptions}
              disabled={!canUpdate}
              onChange={patch => updateZone(zone.zoneKey, patch)}
            />
          ))}
        </div>
      </GeneralSettingsCard>

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
