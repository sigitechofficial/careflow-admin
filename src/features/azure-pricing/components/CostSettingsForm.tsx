import * as React from 'react'
import { Plus, Save, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { Switch } from '@/shared/ui/toggle-controls'
import type { PlatformCostSettings, PlatformCostSettingsInput } from '@/features/azure-pricing/types'
import {
  buildSettingsPayload,
  isValidEmail,
  settingsToForm,
  type SettingsFieldErrors,
  type SettingsFormValues,
} from '@/features/azure-pricing/lib/azure-pricing-forms'
import { formatDateTimeGb } from '@/features/azure-pricing/lib/azure-pricing-format'

export interface CostSettingsFormProps {
  settings: PlatformCostSettings
  canManage: boolean
  saving?: boolean
  onSave: (payload: PlatformCostSettingsInput) => Promise<unknown> | void
}

export function CostSettingsForm({ settings, canManage, saving, onSave }: CostSettingsFormProps) {
  const [values, setValues] = React.useState<SettingsFormValues>(() => settingsToForm(settings))
  const [errors, setErrors] = React.useState<SettingsFieldErrors>({})
  const [draftEmail, setDraftEmail] = React.useState('')
  const [draftError, setDraftError] = React.useState<string | null>(null)

  // Re-sync when the server copy changes (e.g. after save or someone else's edit).
  const serverVersion = `${settings.updatedAt ?? ''}|${JSON.stringify(settingsToForm(settings))}`
  React.useEffect(() => {
    setValues(settingsToForm(settings))
    setErrors({})
  }, [serverVersion])

  const disabled = !canManage || saving

  const addRecipient = () => {
    const email = draftEmail.trim().toLowerCase()
    if (!email) return
    if (!isValidEmail(email)) {
      setDraftError('Enter a valid email address')
      return
    }
    if (values.monthlyReportRecipients.some(r => r.toLowerCase() === email)) {
      setDraftError('That address is already on the list')
      return
    }
    setValues(v => ({ ...v, monthlyReportRecipients: [...v.monthlyReportRecipients, email] }))
    setDraftEmail('')
    setDraftError(null)
    setErrors(e => ({ ...e, monthlyReportRecipients: undefined }))
  }

  const removeRecipient = (email: string) => {
    setValues(v => ({ ...v, monthlyReportRecipients: v.monthlyReportRecipients.filter(r => r !== email) }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canManage) return
    const built = buildSettingsPayload(values)
    if (!built.ok) {
      setErrors(built.errors)
      return
    }
    setErrors({})
    await onSave(built.payload)
  }

  return (
    <form onSubmit={e => void onSubmit(e)} className="space-y-5" noValidate aria-label="Azure cost settings">
      {!canManage ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          You can view these settings. Changing them needs the “Manage platform costs” permission.
        </p>
      ) : null}

      <fieldset className="grid gap-4 sm:grid-cols-2" disabled={disabled}>
        <legend className="mb-2 text-sm font-semibold text-foreground sm:col-span-2">Anomaly detection</legend>
        <div className="space-y-1.5">
          <Label htmlFor="azure-settings-threshold">Threshold above 7-day average (%)</Label>
          <Input
            id="azure-settings-threshold"
            type="number"
            inputMode="decimal"
            min={1}
            max={1000}
            step={1}
            value={values.anomalyThresholdPercent}
            onChange={e => setValues(v => ({ ...v, anomalyThresholdPercent: e.target.value }))}
            error={!!errors.anomalyThresholdPercent}
            aria-invalid={!!errors.anomalyThresholdPercent}
            aria-describedby="azure-settings-threshold-help"
          />
          <p id="azure-settings-threshold-help" className={errors.anomalyThresholdPercent ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
            {errors.anomalyThresholdPercent ?? 'e.g. 50 flags a day costing 1.5× the recent average.'}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="azure-settings-min-increase">Minimum daily increase (£)</Label>
          <Input
            id="azure-settings-min-increase"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            value={values.anomalyMinDailyIncrease}
            onChange={e => setValues(v => ({ ...v, anomalyMinDailyIncrease: e.target.value }))}
            error={!!errors.anomalyMinDailyIncrease}
            aria-invalid={!!errors.anomalyMinDailyIncrease}
            aria-describedby="azure-settings-min-increase-help"
          />
          <p id="azure-settings-min-increase-help" className={errors.anomalyMinDailyIncrease ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
            {errors.anomalyMinDailyIncrease ?? 'Ignore tiny jumps below this amount.'}
          </p>
        </div>
      </fieldset>

      <fieldset className="space-y-3" disabled={disabled}>
        <legend className="mb-2 text-sm font-semibold text-foreground">Monthly report</legend>
        <label className="flex items-center gap-2 text-sm" htmlFor="azure-settings-report-enabled">
          <Switch
            id="azure-settings-report-enabled"
            checked={values.monthlyReportEnabled}
            disabled={disabled}
            onCheckedChange={checked => setValues(v => ({ ...v, monthlyReportEnabled: checked }))}
          />
          Email a cost report on the 1st of each month (08:00 UK time)
        </label>

        <div className="space-y-1.5">
          <Label htmlFor="azure-settings-recipient">Recipients</Label>
          {canManage ? (
            <div className="flex gap-2">
              <Input
                id="azure-settings-recipient"
                type="email"
                placeholder="name@company.co.uk"
                value={draftEmail}
                onChange={e => {
                  setDraftEmail(e.target.value)
                  setDraftError(null)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addRecipient()
                  }
                }}
                error={!!draftError}
                aria-invalid={!!draftError}
                aria-describedby={draftError ? 'azure-settings-recipient-error' : undefined}
              />
              <Button type="button" variant="outline" onClick={addRecipient} leftIcon={<Plus className="h-4 w-4" aria-hidden />}>
                Add
              </Button>
            </div>
          ) : null}
          {draftError ? (
            <p id="azure-settings-recipient-error" className="text-xs text-destructive" role="alert">
              {draftError}
            </p>
          ) : null}
          {values.monthlyReportRecipients.length === 0 ? (
            <p className="text-xs text-muted-foreground">No recipients yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2" aria-label="Report recipients">
              {values.monthlyReportRecipients.map(email => (
                <li
                  key={email}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs"
                >
                  {email}
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Remove ${email}`}
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {errors.monthlyReportRecipients ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.monthlyReportRecipients}
            </p>
          ) : null}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          {settings.updatedAt
            ? `Last changed ${formatDateTimeGb(settings.updatedAt)}${settings.updatedBy ? ` by ${settings.updatedBy}` : ''}`
            : 'Using default settings'}
        </p>
        {canManage ? (
          <Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" aria-hidden />}>
            Save settings
          </Button>
        ) : null}
      </div>
    </form>
  )
}
