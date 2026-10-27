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
  { value: 'ALWAYS', label: 'Always (up or down)' },
  { value: 'INCREASE_ONLY', label: 'Only when hours go up' },
  { value: 'DECREASE_ONLY', label: 'Only when hours go down' },
  { value: 'NEVER', label: 'Never — the change applies straight away' },
]

const DECREASE_OPTIONS: Option<ServiceUserWeeklyHoursSettings['decreaseAction']>[] = [
  { value: 'KEEP_WARN', label: 'Keep the visits and show a warning' },
  { value: 'CANCEL_LATEST', label: 'Cancel the last visits of each week until it fits' },
]

const PLAN_OVER_OPTIONS: Option<ServiceUserWeeklyHoursSettings['planOverLimit']>[] = [
  { value: 'BLOCK', label: "Don't allow saving" },
  { value: 'WARN', label: 'Allow, show a warning only' },
]

const DRAFT_OVER_OPTIONS: Option<ServiceUserWeeklyHoursSettings['draftOverLimit']>[] = [
  { value: 'BLOCK', label: "Don't allow saving" },
  { value: 'MANAGER_APPROVAL', label: 'Save it, but a manager must approve before activating' },
  { value: 'WARN', label: 'Allow, show a warning only' },
]

const EXTRA_OVER_OPTIONS: Option<ServiceUserWeeklyHoursSettings['extraOverLimit']>[] = [
  { value: 'MANAGER_APPROVAL', label: 'Send to a manager to approve' },
  { value: 'BLOCK', label: "Don't add it" },
  { value: 'WARN', label: 'Add it, show a warning only' },
]

const EXTRA_EDIT_OPTIONS: Option<ServiceUserWeeklyHoursSettings['extraEditOverLimit']>[] = [
  { value: 'BLOCK', label: "Don't allow saving" },
  { value: 'WARN', label: 'Allow, show a warning only' },
]

const BULK_OPTIONS: Option<ServiceUserWeeklyHoursSettings['bulkOverLimit']>[] = [
  { value: 'WARN', label: 'Make the visits and show a warning' },
  { value: 'SKIP_MANUAL', label: 'Skip the plan when a person runs it (the nightly rolling rota still makes visits)' },
  {
    value: 'SKIP_ALL',
    label: 'Always skip the plan, including the nightly rolling rota (no new visits until the plan or hours are fixed)',
  },
]

const SPECIAL_OVER_OPTIONS: Option<ServiceUserWeeklyHoursSettings['specialVisitOverLimit']>[] = [
  { value: 'WARN', label: 'Add it, show a warning only' },
  { value: 'BLOCK', label: "Don't add it" },
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
          label="Manager approval to change weekly hours"
          hint="Applies when weekly hours are changed in DOM Care or on the visit plan. The first hours entered never need approval."
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
          label="Hours reduced, but visits still go over"
          hint="What happens to visits already on the rota when weekly hours are lowered (after approval, if needed). Only rota visits are cancelled; the weekly plan stays the same."
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
          label="Draft plan goes over the weekly hours"
          hint="A new plan stays a draft until it's activated. With manager approval, the draft is saved and a request goes to Hours approvals. The plan can be activated only after approval; if it's rejected, it can't be activated."
        >
          <OptionSelect
            value={draft.draftOverLimit ?? 'BLOCK'}
            options={DRAFT_OVER_OPTIONS}
            onChange={v => set('draftOverLimit', v)}
            disabled={disabled}
            label="Draft visit plan over the hours"
          />
        </SettingsRow>

        <SettingsRow
          label="Active or suspended plan goes over the weekly hours"
          hint="When a change to a live plan makes any week go over the hours."
        >
          <OptionSelect
            value={draft.planOverLimit}
            options={PLAN_OVER_OPTIONS}
            onChange={v => set('planOverLimit', v)}
            disabled={disabled}
            label="Visit plan over the hours"
          />
        </SettingsRow>

        <SettingsRow
          label="Extra visit goes over the weekly hours"
          hint="An extra visit added for one date (Changes for specific dates)."
        >
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
              label="Re-check the week when a manager approves"
              hint="If more visits were added to that week after the request, the approval is blocked."
            >
              <Switch
                checked={draft.extraApproveRecheck}
                onCheckedChange={v => set('extraApproveRecheck', v)}
                disabled={disabled}
                aria-label="Check the week again on approve"
              />
            </SettingsRow>
            <SettingsRow label="Reason required to reject an extra visit">
              <Switch
                checked={draft.extraRejectReasonRequired}
                onCheckedChange={v => set('extraRejectReasonRequired', v)}
                disabled={disabled}
                aria-label="Reason needed to reject"
              />
            </SettingsRow>
          </>
        ) : null}

        <SettingsRow label="Edited extra visit goes over the weekly hours">
          <OptionSelect
            value={draft.extraEditOverLimit}
            options={EXTRA_EDIT_OPTIONS}
            onChange={v => set('extraEditOverLimit', v)}
            disabled={disabled}
            label="Extra visit edit over the hours"
          />
        </SettingsRow>

        <SettingsRow
          label="Making rota visits from a plan that's over the hours"
          hint="Covers Bulk generate, Regenerate rota, Generate visits, visits after an absence ends, and the nightly rolling rota. Extra visits a manager approved and past dates are not counted."
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
          label="Count special visits in the weekly hours"
          hint="Special visits (Workforce → Special visits) for this service user. Cancelled ones don't count; called-off ones do."
        >
          <Switch
            checked={draft.specialVisitsCount ?? true}
            onCheckedChange={v => set('specialVisitsCount', v)}
            disabled={disabled}
            aria-label="Special visits count towards the weekly hours"
          />
        </SettingsRow>

        {draft.specialVisitsCount ?? true ? (
          <SettingsRow label="Special visit goes over the weekly hours">
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
          label="How many weeks ahead to check"
          hint="Counted from this week (1–26). Choose enough weeks for fortnightly and monthly visits to show up."
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
          Always applies: sleep-in nights count in full, double-up visits count each carer&apos;s time, and managers
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
