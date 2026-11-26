import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { feedbackSelectClass } from '@/features/complaints/components/FeedbackFormDialog'
import { FieldWithInfo } from '@/features/cqc-mock-inspection/components/InfoTip'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { DateTimeInput } from '@/shared/ui/date-time-input'
import type { CqcNotificationType } from '../types'
import { useCqcBranchOptions, useCqcNotificationTypes, useCreateCqcNotification } from '../hooks'
import { fromLocalInput, toLocalInput } from '../labels'
import { HELP } from '../help'

/** Starting from an incident or safeguarding case: the rest is filled in from that record. */
export type NewNotificationPreset = {
  type?: CqcNotificationType
  incidentId?: string
  safeguardingCaseId?: string
  /** The record's branch, if it has one. */
  locationId?: string | null
  /** Shown in the dialog, e.g. "INC-2026-000047". */
  recordLabel?: string
}

/** Pick the type, branch and when the service became aware; the rest is filled in on the notification page. */
export function NewNotificationDialog({
  open,
  onOpenChange,
  onCreated,
  preset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
  preset?: NewNotificationPreset
}) {
  const types = useCqcNotificationTypes()
  const branches = useCqcBranchOptions(open)
  const mutation = useCreateCqcNotification()
  const [type, setType] = React.useState<CqcNotificationType | ''>('')
  const [locationId, setLocationId] = React.useState('')
  const [aware, setAware] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const fromRecord = Boolean(preset?.incidentId || preset?.safeguardingCaseId)

  React.useEffect(() => {
    if (!open) return
    setType(preset?.type ?? '')
    setLocationId(preset?.locationId ?? (branches.length === 1 ? (branches[0]?.id ?? '') : ''))
    setAware(toLocalInput(new Date().toISOString()))
    setError(null)
    // Only reset when the dialog opens (not when the branch list loads).
  }, [open])

  const spec = types.data?.types.find(t => t.type === type)

  const onSave = async () => {
    if (!type) return setError('Choose what you are notifying the CQC about.')
    if (!locationId) return setError('Choose the branch.')
    const becameAwareAt = fromRecord ? undefined : fromLocalInput(aware)
    if (!fromRecord && !becameAwareAt) return setError('Enter when the service became aware.')
    setError(null)
    try {
      const created = await mutation.mutateAsync({
        type,
        locationId,
        ...(becameAwareAt ? { becameAwareAt } : {}),
        ...(preset?.incidentId ? { incidentId: preset.incidentId } : {}),
        ...(preset?.safeguardingCaseId ? { safeguardingCaseId: preset.safeguardingCaseId } : {}),
      })
      toastSuccess(
        'Draft notification started',
        fromRecord
          ? `Reference ${created.referenceNumber}. Check the details filled in from the record.`
          : `Reference ${created.referenceNumber}.`,
      )
      onOpenChange(false)
      onCreated(created.id)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start the notification.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="cqc-notification-new-dialog">
        <DialogHeader>
          <DialogTitle>New CQC notification</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {fromRecord ? (
            <p className="text-sm text-muted-foreground">
              The person, dates, what happened and action taken are filled in from {preset?.recordLabel ?? 'the record'}.
              You can change them on the next page.
            </p>
          ) : null}
          <div className="space-y-1.5">
            <label htmlFor="cqcn-type" className="text-xs font-medium text-muted-foreground">
              What happened
            </label>
            <select
              id="cqcn-type"
              className={feedbackSelectClass}
              value={type}
              onChange={e => setType(e.target.value as CqcNotificationType | '')}
              data-testid="cqc-notification-type"
            >
              <option value="">Choose…</option>
              {(types.data?.types ?? []).map(t => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
            {spec ? (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{spec.regulation}.</span> {spec.whenToNotify}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cqcn-branch" className="text-xs font-medium text-muted-foreground">
              Branch
            </label>
            <select
              id="cqcn-branch"
              className={feedbackSelectClass}
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              data-testid="cqc-notification-branch"
            >
              <option value="">Choose…</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          {fromRecord ? null : (
            <FieldWithInfo id="cqcn-aware" label="When the service became aware" help={HELP.becameAware}>
              <DateTimeInput
                id="cqcn-aware"
                value={aware}
                onChange={e => setAware(e.target.value)}
                data-testid="cqc-notification-aware"
              />
            </FieldWithInfo>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onSave()} disabled={mutation.isPending} data-testid="cqc-notification-create">
            {mutation.isPending ? 'Starting…' : 'Start draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
