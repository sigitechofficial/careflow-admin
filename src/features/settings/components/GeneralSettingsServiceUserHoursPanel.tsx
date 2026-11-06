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
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'
import { GeneralSettingsCard, SettingsRow } from '@/features/settings/components/GeneralSettingsCard'
import { useAuthStore } from '@/features/auth/store'

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
          changeNeedsApproval: draft.changeNeedsApproval,
          visitsNeedApproval: draft.visitsNeedApproval,
          specialVisitsCount: draft.specialVisitsCount,
          useTimebank: draft.useTimebank,
          adjustOverCareNextWeek: draft.adjustOverCareNextWeek,
          chargeTimebankOnInvoice: draft.chargeTimebankOnInvoice,
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
        <p className="text-sm font-medium text-muted-foreground">Changing a service user&apos;s hours</p>
        <SettingsRow
          label="Changing weekly hours needs manager approval"
          hint={[
            'Yes: any increase or decrease needs a manager\'s approval. The service user\'s current hours stay until it is approved. Setting the hours for the first time needs no approval.',
            'No: changes take effect straight away.',
            '',
            'Either way:',
            '• Hours go up: waiting visits that now fit are approved automatically.',
            '• Hours go down: visits that no longer fit are cancelled, latest in each week first. Today\'s visits are never cancelled.',
            '• You see the list of visits to cancel and confirm before anything changes.',
          ].join('\n')}
        >
          <NoYesToggle
            value={draft.changeNeedsApproval}
            onChange={v => set('changeNeedsApproval', v)}
            disabled={disabled}
            labelOff="No"
            labelOn="Yes"
          />
        </SettingsRow>

        <p className="pt-2 text-sm font-medium text-muted-foreground">Visits over the weekly hours</p>
        <SettingsRow
          label="Visits over the weekly hours need manager approval"
          hint={[
            'Yes: manager approval is required.',
            '• Visits within the weekly hours are created on the rota straight away.',
            '• Visits over the weekly hours wait for a manager (Hours approvals). Approve adds them to the rota; reject means they are not created.',
            '',
            'No: every visit is added, even if it goes over the weekly hours. You only see a warning.',
          ].join('\n')}
        >
          <NoYesToggle
            value={draft.visitsNeedApproval}
            onChange={v => set('visitsNeedApproval', v)}
            disabled={disabled}
            labelOff="No"
            labelOn="Yes"
          />
        </SettingsRow>
        <SettingsRow
          label="Count special visits in the weekly hours"
          hint="Special visits (Workforce → Special visits) count towards the service user's weekly hours."
        >
          <NoYesToggle
            value={draft.specialVisitsCount}
            onChange={v => set('specialVisitsCount', v)}
            disabled={disabled}
            labelOff="No"
            labelOn="Yes"
          />
        </SettingsRow>

        <p className="pt-2 text-sm font-medium text-muted-foreground">Timebank</p>
        <SettingsRow
          label="Use timebank hours automatically"
          hint={[
            'Yes: when a new visit takes a week over the weekly hours, the hours over come from the service user\'s timebank.',
            '• Only when the timebank has all of the hours over; otherwise the setting above decides.',
            '• The hours are taken when the visit is put on the rota and shown on the visit.',
            '• Cancelled visits, and visits not delivered in full, give their hours back (a cancellation charged to the service user does not).',
            '',
            'No: the timebank is only shown (when it has hours).',
          ].join('\n')}
        >
          <NoYesToggle
            value={draft.useTimebank}
            onChange={v => set('useTimebank', v)}
            disabled={disabled}
            labelOff="No"
            labelOn="Yes"
          />
        </SettingsRow>

        <SettingsRow
          label="Reduce next week's visits after over care"
          hint={[
            'Yes: care given over the weekly hours in a finished week is taken back the next week.',
            '• Each night, last week\'s over care lowers this week\'s hours by the same amount: the latest visits from tomorrow are cancelled (no charge), with the reason on each visit.',
            '• Over care = visits delivered or done (not yet approved) above the weekly hours. Hours paid from the timebank and visits a manager approved over the hours are left out.',
            '• Only plan and special visits are cancelled, and only with an active plan. What the week cannot take back is shown, not carried on.',
            '• Managers are told, and Reports → Timebank shows the visits cancelled.',
            '',
            'No: over care is only shown.',
          ].join('\n')}
        >
          <NoYesToggle
            value={draft.adjustOverCareNextWeek}
            onChange={v => set('adjustOverCareNextWeek', v)}
            disabled={disabled}
            labelOff="No"
            labelOn="Yes"
          />
        </SettingsRow>

        <SettingsRow
          label="Charge timebank hours on the invoice"
          hint={[
            'Yes: the hours a finished week puts in the timebank are charged on that week\'s invoice.',
            '• Hours with a visit (missed, cancelled with no charge, shorter…) at that visit\'s rate; weekly hours never booked on the rota at the weekday rate.',
            '• Each week is charged once. If a charged week later has fewer timebank hours, the next invoice gives a credit.',
            '• Care later paid from these hours is not charged again (shown as "Paid from timebank").',
            '• Sleeping and waking nights never use the timebank (their rate is not hourly).',
            '• Only weeks from the day this is first on are charged.',
            '',
            'No: timebank hours are not on the invoice. Hours already charged are still credited if a charged week later has fewer, and are free when care is paid from them.',
          ].join('\n')}
        >
          <NoYesToggle
            value={draft.chargeTimebankOnInvoice}
            onChange={v => set('chargeTimebankOnInvoice', v)}
            disabled={disabled}
            labelOff="No"
            labelOn="Yes"
          />
        </SettingsRow>

        <p className="text-xs text-muted-foreground">
          Always applies: sleep-in nights count in full, double-up visits count each carer&apos;s time, draft plans
          are checked only once active, every rejection needs a reason, and managers are notified of every request.
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
