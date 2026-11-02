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
