import * as React from 'react'
import { Loader2 } from 'lucide-react'
import type { ServiceUserWeeklyHoursSettings } from '@/features/settings/types'
import { DEFAULT_SERVICE_USER_WEEKLY_HOURS_SETTINGS } from '@/features/settings/dom-care/service-user-weekly-hours-defaults'
import {
  useGeneralSettings,
  useUpdateGeneralSettings,
} from '@/features/settings/hooks/useGeneralSettings'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Switch } from '@/shared/ui/toggle-controls'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { GeneralSettingsCard, SettingsRow } from '@/features/settings/components/GeneralSettingsCard'
import { useAuthStore } from '@/features/auth/store'

type Option<T extends string> = { value: T; label: string }

const CHANGE_APPROVAL_OPTIONS: Option<ServiceUserWeeklyHoursSettings['changeApproval']>[] = [
  { value: 'ALWAYS', label: 'Always (increase or decrease)' },
  { value: 'INCREASE_ONLY', label: 'Only when hours go up' },
  { value: 'DECREASE_ONLY', label: 'Only when hours go down' },
  { value: 'NEVER', label: 'Never — changes apply straight away' },
]

const DECREASE_OPTIONS: Option<ServiceUserWeeklyHoursSettings['decreaseAction']>[] = [
  { value: 'KEEP_WARN', label: 'Keep the visits — show a warning' },
  { value: 'CANCEL_LATEST', label: 'Cancel the latest visits in each week over the hours' },
]

const PLAN_OVER_OPTIONS: Option<ServiceUserWeeklyHoursSettings['planOverLimit']>[] = [
  { value: 'BLOCK', label: "Block — the plan can't be saved" },
  { value: 'WARN', label: 'Allow — show a warning only' },
]

const DRAFT_OVER_OPTIONS: Option<ServiceUserWeeklyHoursSettings['draftOverLimit']>[] = [
  { value: 'BLOCK', label: "Block — the draft can't be saved" },
  { value: 'MANAGER_APPROVAL', label: "Save it — a manager must approve before it's activated" },
  { value: 'WARN', label: 'Allow — show a warning only' },
]

const EXTRA_OVER_OPTIONS: Option<ServiceUserWeeklyHoursSettings['extraOverLimit']>[] = [
  { value: 'MANAGER_APPROVAL', label: 'Send to a manager for approval' },
  { value: 'BLOCK', label: "Block — the extra visit isn't added" },
  { value: 'WARN', label: 'Add it — show a warning only' },
]

const EXTRA_EDIT_OPTIONS: Option<ServiceUserWeeklyHoursSettings['extraEditOverLimit']>[] = [
  { value: 'BLOCK', label: "Block — the change can't be saved" },
  { value: 'WARN', label: 'Allow — show a warning only' },
]

const BULK_OPTIONS: Option<ServiceUserWeeklyHoursSettings['bulkOverLimit']>[] = [
  { value: 'WARN', label: 'Make the visits — show a warning' },
  { value: 'SKIP_MANUAL', label: 'Skip the plan when run by hand (hourly rolling rota still makes them)' },
  { value: 'SKIP_ALL', label: 'Skip the plan everywhere (also the hourly rolling rota)' },
]

const SPECIAL_OVER_OPTIONS: Option<ServiceUserWeeklyHoursSettings['specialVisitOverLimit']>[] = [
  { value: 'WARN', label: 'Add it — show a warning only' },
  { value: 'BLOCK', label: "Block — the special visit isn't added" },
]

function OptionSelect<T extends string>({
  value,
  options,
  onChange,
  disabled,
  label,
}: {
  value: T
  options: Option<T>[]
  onChange: (v: T) => void
  disabled: boolean
  label: string
}) {
  return (
    <Select value={value} onValueChange={v => onChange(v as T)} disabled={disabled}>
      <SelectTrigger className="h-9 w-[26rem] max-w-full" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Service user weekly contracted hours rules (Settings → Dom Rules). */
export function GeneralSettingsServiceUserHoursPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const { data: settingsData, isLoading } = useGeneralSettings()
  const updateMutation = useUpdateGeneralSettings()
  const savedValue = settingsData?.serviceUserWeeklyHoursSettings ?? DEFAULT_SERVICE_USER_WEEKLY_HOURS_SETTINGS
  const [draft, setDraft] = React.useState<ServiceUserWeeklyHoursSettings>(savedValue)
  const saving = updateMutation.isPending

  React.useEffect(() => {
    if (settingsData) setDraft(settingsData.serviceUserWeeklyHoursSettings ?? DEFAULT_SERVICE_USER_WEEKLY_HOURS_SETTINGS)
  }, [settingsData])

  const set = <K extends keyof ServiceUserWeeklyHoursSettings>(key: K, value: ServiceUserWeeklyHoursSettings[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }))

  async function onSave() {
    if (!canUpdate) return
    try {
      await updateMutation.mutateAsync({
        serviceUserWeeklyHoursSettings: {
          ...draft,
          checkWeeks: Math.max(1, Math.min(26, Math.round(draft.checkWeeks || 0))),
        },
      })
      toastSuccess('Saved', 'Service user weekly hours rules updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const disabled = !canUpdate || saving

  return (
    <div className="space-y-4" data-testid="general-settings-su-hours-panel">
      <GeneralSettingsCard title="Service user weekly hours">
        <SettingsRow
          label="Changing the weekly contracted hours needs a manager's approval"
          hint="In DOM Care and on the visit plan. The first value is always set directly."
        >
          <OptionSelect
            value={draft.changeApproval}
            options={CHANGE_APPROVAL_OPTIONS}
            onChange={v => set('changeApproval', v)}
            disabled={disabled}
            label="Weekly hours change approval"
          />
        </SettingsRow>

        <SettingsRow
          label="When the hours go down and visits are over the new hours"
          hint="Applies when the lower hours are saved (after approval, if one is needed). Cancelling only cancels rota visits; the call pattern stays the same."
        >
          <OptionSelect
            value={draft.decreaseAction}
            options={DECREASE_OPTIONS}
            onChange={v => set('decreaseAction', v)}
            disabled={disabled}
            label="Hours decrease"
          />
        </SettingsRow>

        <SettingsRow
          label="Draft visit plan saved with a week over the hours"
          hint="A new plan stays a draft until it's activated. With manager approval the request goes to Hours approvals; if it's rejected the draft stays as it is and can't be activated."
        >
          <OptionSelect
            value={draft.draftOverLimit ?? 'BLOCK'}
            options={DRAFT_OVER_OPTIONS}
            onChange={v => set('draftOverLimit', v)}
            disabled={disabled}
            label="Draft visit plan over the hours"
          />
        </SettingsRow>

        <SettingsRow label="Active or suspended visit plan saved with a week over the hours">
          <OptionSelect
            value={draft.planOverLimit}
            options={PLAN_OVER_OPTIONS}
            onChange={v => set('planOverLimit', v)}
            disabled={disabled}
            label="Visit plan over the hours"
          />
        </SettingsRow>

        <SettingsRow label="Extra visit that takes its week over the hours">
          <OptionSelect
            value={draft.extraOverLimit}
            options={EXTRA_OVER_OPTIONS}
            onChange={v => set('extraOverLimit', v)}
            disabled={disabled}
            label="Extra visit over the hours"
          />
        </SettingsRow>

        {draft.extraOverLimit === 'MANAGER_APPROVAL' ? (
          <>
            <SettingsRow
              label="Check the week again when a manager approves"
              hint="If the week has more visits than when the extra visit was asked for, Approve is refused."
            >
              <Switch
                checked={draft.extraApproveRecheck}
                onCheckedChange={v => set('extraApproveRecheck', v)}
                disabled={disabled}
                aria-label="Check the week again on approve"
              />
            </SettingsRow>
            <SettingsRow label="A reason is needed to reject an extra visit">
              <Switch
                checked={draft.extraRejectReasonRequired}
                onCheckedChange={v => set('extraRejectReasonRequired', v)}
                disabled={disabled}
                aria-label="Reason needed to reject"
              />
            </SettingsRow>
          </>
        ) : null}

        <SettingsRow label="Extra visit edited so its week goes over the hours">
          <OptionSelect
            value={draft.extraEditOverLimit}
            options={EXTRA_EDIT_OPTIONS}
            onChange={v => set('extraEditOverLimit', v)}
            disabled={disabled}
            label="Extra visit edit over the hours"
          />
        </SettingsRow>

        <SettingsRow
          label="Generating the rota with a plan over the hours"
          hint="Bulk generate (Scheduling), Regenerate rota and Generate visits on the visit plan, visits on return from absence, and the hourly rolling rota. 'By hand' is everything except the hourly rolling rota; there the plan is refused with a message. Extra visits a manager approved over the hours are not counted, nor are past days (backfill). Skipping everywhere means that client gets no new rota visits until the plan or the hours are fixed."
        >
          <OptionSelect
            value={draft.bulkOverLimit ?? 'WARN'}
            options={BULK_OPTIONS}
            onChange={v => set('bulkOverLimit', v)}
            disabled={disabled}
            label="Bulk generate over the hours"
          />
        </SettingsRow>

        <SettingsRow
          label="Special visits count towards the weekly hours"
          hint="Special visits (Workforce → Special visits) for this service user are added to their weekly hours. Cancelled ones don't count; called-off ones do."
        >
          <Switch
            checked={draft.specialVisitsCount ?? true}
            onCheckedChange={v => set('specialVisitsCount', v)}
            disabled={disabled}
            aria-label="Special visits count towards the weekly hours"
          />
        </SettingsRow>

        {draft.specialVisitsCount ?? true ? (
          <SettingsRow label="Special visit that takes the service user's week over the hours">
            <OptionSelect
              value={draft.specialVisitOverLimit ?? 'WARN'}
              options={SPECIAL_OVER_OPTIONS}
              onChange={v => set('specialVisitOverLimit', v)}
              disabled={disabled}
              label="Special visit over the hours"
            />
          </SettingsRow>
        ) : null}

        <SettingsRow
          label="Weeks ahead checked"
          hint="From this week. Every-2-weeks and monthly visits need enough weeks to show up (1–26)."
        >
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={1}
              max={26}
              className="h-8 w-16 tabular-nums"
              value={draft.checkWeeks}
              disabled={disabled}
              onChange={e => set('checkWeeks', Number.parseInt(e.target.value, 10) || 0)}
              aria-label="Weeks ahead checked"
            />
            <span className="text-sm text-muted-foreground">Weeks</span>
          </div>
        </SettingsRow>

        <p className="text-xs text-muted-foreground">
          Always: sleeping nights count their full hours, a double-up counts every carer&apos;s time, and managers
          are notified of every request.
        </p>
      </GeneralSettingsCard>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setDraft(savedValue)} disabled={saving}>
          Reset
        </Button>
        <Button type="button" onClick={() => void onSave()} disabled={disabled}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </div>
  )
}
