import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { feedbackSelectClass, feedbackTextareaClass } from '@/features/complaints/components/FeedbackFormDialog'
import { FieldWithInfo } from '@/features/cqc-mock-inspection/components/InfoTip'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { DateTimeInput } from '@/shared/ui/date-time-input'
import type { CqcNotificationDetail, CqcSubmissionMethod } from '../types'
import { useAcknowledgeCqcNotification, useCloseCqcNotification, useSubmitCqcNotification } from '../hooks'
import { METHOD_LABEL, fromLocalInput, toLocalInput } from '../labels'
import { HELP } from '../help'

type DialogProps = { notification: CqcNotificationDetail; open: boolean; onOpenChange: (open: boolean) => void }

function useErrorText() {
  const [error, setError] = React.useState<string | null>(null)
  const fail = (e: unknown, fallback: string) => setError(e instanceof ApiError ? e.message : fallback)
  return { error, setError, fail }
}

/** Record that the notification was sent to the CQC (after sending it on the portal). */
export function SubmitDialog({ notification, open, onOpenChange }: DialogProps) {
  const mutation = useSubmitCqcNotification(notification.id)
  const [when, setWhen] = React.useState('')
  const [method, setMethod] = React.useState<CqcSubmissionMethod>('PROVIDER_PORTAL')
  const [reference, setReference] = React.useState('')
  const { error, setError, fail } = useErrorText()

  React.useEffect(() => {
    if (!open) return
    setWhen(toLocalInput(new Date().toISOString()))
    setMethod('PROVIDER_PORTAL')
    setReference('')
    setError(null)
  }, [open])

  const onSave = async () => {
    const submittedAt = fromLocalInput(when)
    if (!submittedAt) return setError('Enter when it was sent.')
    try {
      await mutation.mutateAsync({ submittedAt, method, cqcReference: reference.trim() || undefined })
      toastSuccess('Submission recorded', 'What was sent is now kept as it was.')
      onOpenChange(false)
    } catch (e) {
      fail(e, 'Could not record the submission.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="cqcn-submit-dialog">
        <DialogHeader>
          <DialogTitle>Record submission to the CQC</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-muted-foreground">{HELP.submit}</p>
          <div className="space-y-1.5">
            <label htmlFor="cqcn-sent-at" className="text-xs font-medium text-muted-foreground">
              When it was sent
            </label>
            <DateTimeInput id="cqcn-sent-at" value={when} onChange={e => setWhen(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cqcn-method" className="text-xs font-medium text-muted-foreground">
              How it was sent
            </label>
            <select
              id="cqcn-method"
              className={feedbackSelectClass}
              value={method}
              onChange={e => setMethod(e.target.value as CqcSubmissionMethod)}
            >
              {(Object.keys(METHOD_LABEL) as CqcSubmissionMethod[]).map(m => (
                <option key={m} value={m}>
                  {METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cqcn-sent-ref" className="text-xs font-medium text-muted-foreground">
              CQC reference (optional)
            </label>
            <Input id="cqcn-sent-ref" value={reference} onChange={e => setReference(e.target.value)} data-testid="cqcn-submit-reference" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Go back
          </Button>
          <Button onClick={() => void onSave()} disabled={mutation.isPending} data-testid="cqcn-submit-save">
            {mutation.isPending ? 'Saving…' : 'Record submission'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Record that the CQC confirmed the notification. */
export function AcknowledgeDialog({ notification, open, onOpenChange }: DialogProps) {
  const mutation = useAcknowledgeCqcNotification(notification.id)
  const [when, setWhen] = React.useState('')
  const [reference, setReference] = React.useState('')
  const { error, setError, fail } = useErrorText()

  React.useEffect(() => {
    if (!open) return
    setWhen(toLocalInput(new Date().toISOString()))
    setReference(notification.cqcReference ?? '')
    setError(null)
  }, [open])

  const onSave = async () => {
    const acknowledgedAt = fromLocalInput(when) ?? undefined
    if (!reference.trim()) return setError('Enter the CQC reference.')
    try {
      await mutation.mutateAsync({ acknowledgedAt, cqcReference: reference.trim() })
      toastSuccess('Acknowledgement recorded')
      onOpenChange(false)
    } catch (e) {
      fail(e, 'Could not record the acknowledgement.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="cqcn-ack-dialog">
        <DialogHeader>
          <DialogTitle>Record CQC acknowledgement</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="cqcn-ack-at" className="text-xs font-medium text-muted-foreground">
              When the CQC acknowledged it
            </label>
            <DateTimeInput id="cqcn-ack-at" value={when} onChange={e => setWhen(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cqcn-ack-ref" className="text-xs font-medium text-muted-foreground">
              CQC reference
            </label>
            <Input id="cqcn-ack-ref" value={reference} onChange={e => setReference(e.target.value)} data-testid="cqcn-ack-reference" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Go back
          </Button>
          <Button onClick={() => void onSave()} disabled={mutation.isPending} data-testid="cqcn-ack-save">
            {mutation.isPending ? 'Saving…' : 'Record acknowledgement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Not required, or cancelled; both keep the reason. */
export function CloseDialog({ notification, open, onOpenChange, as }: DialogProps & { as: 'NOT_REQUIRED' | 'CANCELLED' }) {
  const mutation = useCloseCqcNotification(notification.id)
  const [reason, setReason] = React.useState('')
  const { error, setError, fail } = useErrorText()
  const notRequired = as === 'NOT_REQUIRED'

  React.useEffect(() => {
    if (!open) return
    setReason('')
    setError(null)
  }, [open])

  const onSave = async () => {
    if (reason.trim().length < 3) return setError('Give the reason.')
    try {
      await mutation.mutateAsync({ as, reason: reason.trim() })
      toastSuccess(notRequired ? 'Marked not required' : 'Notification cancelled')
      onOpenChange(false)
    } catch (e) {
      fail(e, 'Could not save.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="cqcn-close-dialog">
        <DialogHeader>
          <DialogTitle>{notRequired ? 'No notification needed?' : 'Cancel this notification?'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {notRequired
              ? 'Record why the CQC does not need to be told, for example the death was not connected with the care provided. The reason is kept, and you can move it back to draft later.'
              : 'Use this for a notification started by mistake. It stays in the list as cancelled.'}
          </p>
          <FieldWithInfo
            id="cqcn-close-reason"
            label="Reason"
            help={notRequired ? 'An inspector may ask why a notification was not sent.' : 'Why it was started by mistake.'}
          >
            <textarea
              id="cqcn-close-reason"
              className={feedbackTextareaClass}
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              data-testid="cqcn-close-reason"
            />
          </FieldWithInfo>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Go back
          </Button>
          <Button onClick={() => void onSave()} disabled={mutation.isPending} data-testid="cqcn-close-save">
            {mutation.isPending ? 'Saving…' : notRequired ? 'Mark not required' : 'Cancel notification'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
