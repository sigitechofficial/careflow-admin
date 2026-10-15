import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import {
  type OrganisationGeneralSettings,
  type DateDisplayFormat,
  type TimeDisplayFormat,
} from '@/features/settings/types'
import {
  DEFAULT_ORGANISATION_TIMEZONE,
  organisationTimezoneOptions,
  type OrganisationTimezone,
} from '@/features/settings/organisation-timezone'
import {
  useGeneralSettings,
  useUpdateGeneralSettings,
} from '@/features/settings/hooks/useGeneralSettings'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { Combobox } from '@/shared/ui/combobox'
import { GeneralSettingsCard } from '@/features/settings/components/GeneralSettingsCard'
import { dateDisplayFormatLabel } from '@/shared/lib/display-format.util'
import { useAuthStore } from '@/features/auth/store'

const DEFAULTS = {
  reviewCarePlanAfterDays: 180,
  handoverReportLastHours: 12,
  incidentCandourOverdueDays: null as number | null,
  archiveServiceUserAfterMonths: 3,
  timeDisplayFormat: 'HH_MM' as TimeDisplayFormat,
  dateDisplayFormat: 'DD_MM_YYYY' as DateDisplayFormat,
  timezone: DEFAULT_ORGANISATION_TIMEZONE as OrganisationTimezone,
}

function NumericField({
  id,
  label,
  suffix,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  suffix: string
  value: number
  onChange: (n: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Label htmlFor={id} className="text-sm font-normal text-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          min={1}
          className="h-9 w-20 text-center tabular-nums"
          value={value}
          disabled={disabled}
          onChange={e => {
            const n = Number.parseInt(e.target.value, 10)
            if (!Number.isNaN(n)) onChange(n)
          }}
        />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
    </div>
  )
}

function settingsToDraft(s: OrganisationGeneralSettings) {
  const options = organisationTimezoneOptions()
  const tz = options.some(o => o.value === s.timezone)
    ? (s.timezone as OrganisationTimezone)
    : DEFAULT_ORGANISATION_TIMEZONE
  return {
    reviewCarePlanAfterDays: s.reviewCarePlanAfterDays,
    handoverReportLastHours: s.handoverReportLastHours,
    incidentCandourOverdueDays: s.incidentCandourOverdueDays ?? null,
    archiveServiceUserAfterMonths: s.archiveServiceUserAfterMonths,
    timeDisplayFormat: s.timeDisplayFormat,
    dateDisplayFormat: s.dateDisplayFormat ?? 'DD_MM_YYYY',
    timezone: tz,
  }
}

export function GeneralSettingsGeneralPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const { data: saved, isLoading, error: loadError } = useGeneralSettings()
  const updateMutation = useUpdateGeneralSettings()
  const [draft, setDraft] = React.useState(DEFAULTS)

  React.useEffect(() => {
    if (saved) setDraft(settingsToDraft(saved))
  }, [saved])

  async function onSave() {
    if (!canUpdate) return
    try {
      const updated = await updateMutation.mutateAsync(draft)
      setDraft(settingsToDraft(updated))
      toastSuccess('Saved', 'General settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  function onReset() {
    if (saved) setDraft(settingsToDraft(saved))
    else setDraft(DEFAULTS)
  }

  const timezoneOptions = React.useMemo(() => organisationTimezoneOptions(), [])

  const error =
    loadError instanceof ApiError
      ? loadError.message
      : loadError
        ? 'Could not load general settings.'
        : null

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-general-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <GeneralSettingsCard title="Care Information">
          <NumericField
            id="review-care-plan-days"
            label="Review care plan after"
            suffix="Days"
            value={draft.reviewCarePlanAfterDays}
            disabled={!canUpdate}
            onChange={n => setDraft(d => ({ ...d, reviewCarePlanAfterDays: n }))}
          />
          <NumericField
            id="handover-hours"
            label="Handover report last"
            suffix="Hours"
            value={draft.handoverReportLastHours}
            disabled={!canUpdate}
            onChange={n => setDraft(d => ({ ...d, handoverReportLastHours: n }))}
          />
          <NumericField
            id="archive-months"
            label="Archive service user after"
            suffix="Months"
            value={draft.archiveServiceUserAfterMonths}
            disabled={!canUpdate}
            onChange={n => setDraft(d => ({ ...d, archiveServiceUserAfterMonths: n }))}
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label htmlFor="candour-overdue-days" className="text-sm font-normal text-foreground">
                Flag Duty of Candour overdue after
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="candour-overdue-days"
                  type="number"
                  min={1}
                  max={90}
                  placeholder="Off"
                  className="h-9 w-20 text-center tabular-nums"
                  value={draft.incidentCandourOverdueDays ?? ''}
                  disabled={!canUpdate}
                  onChange={e => {
                    const raw = e.target.value.trim()
                    const n = Number.parseInt(raw, 10)
                    setDraft(d => ({
                      ...d,
                      incidentCandourOverdueDays: raw === '' ? null : Number.isNaN(n) ? d.incidentCandourOverdueDays : Math.min(90, Math.max(1, n)),
                    }))
                  }}
                />
                <span className="text-sm text-muted-foreground">Days</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Days from the incident report without telling the person in person. Leave empty to turn off — the law says
              &ldquo;as soon as reasonably practicable&rdquo; and sets no number.
            </p>
          </div>
        </GeneralSettingsCard>

        <GeneralSettingsCard title="Time zone & formats">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Organisation time zone</p>
            <p className="text-xs text-muted-foreground">
              Pakistan (Karachi) is the default base. Other zones show hours relative to
              Karachi, then the true UTC offset (for example London −4h · UTC+1). Used for
              operational calendar days — schedules, visit “today”, ECM reporting, and rota
              horizons. Does not convert stored UTC timestamps.
            </p>
            <Combobox
              options={timezoneOptions}
              value={draft.timezone}
              disabled={!canUpdate}
              allowDeselect={false}
              placeholder="Select time zone"
              searchPlaceholder="Search country, city, or UTC…"
              emptyText="No matching time zone."
              aria-label="Organisation time zone"
              data-testid="organisation-timezone-combobox"
              onChange={v => {
                if (!v) return
                setDraft(d => ({ ...d, timezone: v as OrganisationTimezone }))
              }}
            />
          </div>

          <p className="pt-2 text-sm font-medium text-foreground">Time format</p>
          <p className="text-xs text-muted-foreground">Default is 24-hour clock.</p>
          <RadioGroup
            value={draft.timeDisplayFormat}
            disabled={!canUpdate}
            onValueChange={v => setDraft(d => ({ ...d, timeDisplayFormat: v as TimeDisplayFormat }))}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="HH_MM" id="time-hh-mm" />
              <Label htmlFor="time-hh-mm" className="font-normal">
                24-hour with minutes (14:30)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="HH_XX" id="time-hh-xx" />
              <Label htmlFor="time-hh-xx" className="font-normal">
                24-hour without minutes (14)
              </Label>
            </div>
          </RadioGroup>

          <p className="pt-2 text-sm font-medium text-foreground">Date format</p>
          <p className="text-xs text-muted-foreground">Default is DD/MM/YYYY.</p>
          <RadioGroup
            value={draft.dateDisplayFormat}
            disabled={!canUpdate}
            onValueChange={v => setDraft(d => ({ ...d, dateDisplayFormat: v as DateDisplayFormat }))}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="DD_MM_YYYY" id="date-dd-mm-yyyy" />
              <Label htmlFor="date-dd-mm-yyyy" className="font-normal">
                {dateDisplayFormatLabel('DD_MM_YYYY')} (15/06/2026)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="MM_DD_YYYY" id="date-mm-dd-yyyy" />
              <Label htmlFor="date-mm-dd-yyyy" className="font-normal">
                {dateDisplayFormatLabel('MM_DD_YYYY')} (06/15/2026)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="YYYY_MM_DD" id="date-yyyy-mm-dd" />
              <Label htmlFor="date-yyyy-mm-dd" className="font-normal">
                {dateDisplayFormatLabel('YYYY_MM_DD')} (2026-06-15)
              </Label>
            </div>
          </RadioGroup>
        </GeneralSettingsCard>
      </div>

      {canUpdate && (
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => void onSave()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" onClick={onReset} disabled={updateMutation.isPending}>
            Reset
          </Button>
        </div>
      )}
    </div>
  )
}
