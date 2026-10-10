import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import { useReferralMutations } from '@/features/service-users/referrals/useReferrals'
import type { ReferralDetail, ReferralStatus } from '@/features/service-users/referrals/referral-types'
import { REFERRAL_STATUS_LABEL } from '@/features/service-users/referrals/referral-labels'
import {
  ReferralFormFields,
  emptyReferralForm,
  referralFormFromRow,
  referralPayload,
  referralTextareaClass,
  validateReferralForm,
  type ReferralFormState,
} from '@/features/service-users/referrals/components/ReferralFormFields'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'

/** New referral, or edit an existing one (all fields). */
export function ReferralFormDialog({
  serviceUserId,
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  serviceUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: ReferralDetail | null
  onSaved?: (id: string) => void
}) {
  const m = useReferralMutations(serviceUserId)
  const [form, setForm] = React.useState<ReferralFormState>(emptyReferralForm)
  const [error, setError] = React.useState<string | null>(null)
  const saving = m.create.isPending || m.update.isPending

  React.useEffect(() => {
    if (!open) return
    setForm(editing ? referralFormFromRow(editing) : emptyReferralForm())
    setError(null)
  }, [open, editing])

  const onSave = async () => {
    const problem = validateReferralForm(form)
    if (problem) return setError(problem)
    setError(null)
    try {
      const saved = editing
        ? await m.update.mutateAsync({ id: editing.id, body: referralPayload(form) })
        : await m.create.mutateAsync(referralPayload(form))
      toastSuccess(editing ? 'Referral updated' : 'Referral recorded', saved.referenceNumber)
      onSaved?.(saved.id)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit referral ${editing.referenceNumber}` : 'New referral'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3" data-testid="referral-form-dialog">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <ReferralFormFields value={form} onChange={setForm} />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void onSave()} data-testid="referral-save">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Record referral'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Statuses offered from the current one (same rules as the server). */
export function nextReferralStatuses(current: ReferralStatus): ReferralStatus[] {
  const open: ReferralStatus[] = ['NEW', 'UNDER_REVIEW', 'ASSESSMENT_BOOKED', 'ON_HOLD']
  if (open.includes(current)) {
    return (['UNDER_REVIEW', 'ASSESSMENT_BOOKED', 'ON_HOLD', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'] as const).filter(
      s => s !== current,
    )
  }
  return ['UNDER_REVIEW']
}

export function ReferralStatusDialog({
  serviceUserId,
  referral,
  target,
  onOpenChange,
}: {
  serviceUserId: string
  referral: ReferralDetail
  target: ReferralStatus | null
  onOpenChange: (open: boolean) => void
}) {
  const m = useReferralMutations(serviceUserId)
  const [reason, setReason] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  React.useEffect(() => {
    setReason('')
    setError(null)
  }, [target])
  if (!target) return null
  const reopening = !['NEW', 'UNDER_REVIEW', 'ASSESSMENT_BOOKED', 'ON_HOLD'].includes(referral.status)
  const reasonRequired = target === 'DECLINED' || target === 'WITHDRAWN' || reopening

  const onSave = async () => {
    if (reasonRequired && !reason.trim()) return setError('Give a reason.')
    try {
      await m.status.mutateAsync({ id: referral.id, status: target, reason: reason.trim() || undefined })
      toastSuccess('Referral updated', `${referral.referenceNumber}: ${REFERRAL_STATUS_LABEL[target]}`)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed.')
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {reopening ? 'Reopen referral' : `Mark as ${REFERRAL_STATUS_LABEL[target].toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-2" data-testid="referral-status-dialog">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <label className="text-xs font-medium text-muted-foreground">
            {target === 'ACCEPTED' ? 'Decision notes' : 'Reason'}
            {reasonRequired ? ' *' : ''}
          </label>
          <textarea
            rows={3}
            className={referralTextareaClass}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={
              target === 'DECLINED'
                ? 'e.g. No carer capacity in the area for the requested call times'
                : target === 'ACCEPTED'
                  ? 'e.g. Package agreed with the social worker; start Monday'
                  : 'Optional'
            }
            data-testid="referral-status-reason"
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={m.status.isPending} onClick={() => void onSave()} data-testid="referral-status-save">
            {m.status.isPending ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ReferralFollowUpDialog({
  serviceUserId,
  referral,
  open,
  onOpenChange,
}: {
  serviceUserId: string
  referral: ReferralDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const m = useReferralMutations(serviceUserId)
  const [note, setNote] = React.useState('')
  const [next, setNext] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!open) return
    setNote('')
    setNext('')
    setError(null)
  }, [open])

  const onSave = async () => {
    if (!note.trim()) return setError('Say what was done or agreed.')
    try {
      await m.followUp.mutateAsync({
        id: referral.id,
        note: note.trim(),
        nextFollowUpAt: next ? orgDatetimeLocalToIso(next) : null,
      })
      toastSuccess('Follow-up recorded', referral.referenceNumber)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Record follow-up</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3" data-testid="referral-follow-up-dialog">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">What was done / agreed *</label>
            <textarea
              rows={3}
              className={referralTextareaClass}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Called the social worker; waiting for the support plan"
              data-testid="referral-follow-up-note"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Next follow-up</label>
            <Input type="datetime-local" value={next} onChange={e => setNext(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">Leave empty if no further follow-up is needed.</p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={m.followUp.isPending} onClick={() => void onSave()} data-testid="referral-follow-up-save">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
