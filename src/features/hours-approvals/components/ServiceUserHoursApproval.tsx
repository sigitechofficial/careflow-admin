import * as React from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui/button'
import { Label, Textarea } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useRequestServiceUserHoursChange,
  useServiceUserHoursChangeApproval,
} from '@/features/hours-approvals/hooks'
import { serviceUserHoursChangeNeedsApproval } from '@/features/hours-approvals/service-user-hours-approval.util'
import type { PendingServiceUserHoursChange } from '@/features/hours-approvals/types'
import { formatHours } from '@/features/hours-approvals/components/ContractedHoursImpactSummary'
import { ServiceUserHoursDecreaseImpact } from '@/features/hours-approvals/components/ServiceUserHoursDecreaseImpact'

type ReviewDialogProps = {
  open: boolean
  serviceUserId: string
  /** Current weekly hours (as saved), shown as "from". */
  fromHours: string | null
  toHours: number
  onClose: () => void
}

/**
 * A service user's weekly contracted hours change goes to a manager on the Hours approvals page,
 * unless Settings → Dom Rules says this change doesn't need one (then it applies now). Used on
 * the visit plan and on the DOM Care tab.
 */
export function ServiceUserHoursReviewDialog({
  open,
  serviceUserId,
  fromHours,
  toHours,
  onClose,
}: ReviewDialogProps) {
  const [reason, setReason] = React.useState('')
  const requestMut = useRequestServiceUserHoursChange()
  const qc = useQueryClient()
  const ruleQuery = useServiceUserHoursChangeApproval(serviceUserId, open)
  const from = fromHours != null && fromHours.trim() !== '' ? Number.parseFloat(fromHours) : null
  const needsApproval = serviceUserHoursChangeNeedsApproval(
    ruleQuery.data ?? true,
    from != null && Number.isFinite(from) ? from : null,
    toHours,
  )

  React.useEffect(() => {
    if (open) setReason('')
  }, [open])

  const send = async () => {
    try {
      const result = await requestMut.mutateAsync({
        serviceUserId,
        weeklyContractedHours: toHours,
        reason: reason.trim() || undefined,
      })
      if (result.applied) {
        // DOM Care and every open visit plan changed: refresh what the screens show.
        void qc.invalidateQueries()
        // The message can add what happened to the visits (e.g. "3 visits over the new hours cancelled").
        const extra = result.message.includes('. ') ? ` ${result.message.slice(result.message.indexOf('. ') + 2)}.` : ''
        toastSuccess('Weekly hours changed', `Now ${formatHours(toHours)} in DOM Care and on the visit plan.${extra}`)
      } else {
        toastSuccess(
          'Sent for manager approval',
          `Weekly hours stay at ${formatHours(from)} until it is approved.`,
        )
      }
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not send for approval')
    }
  }

  const sending = requestMut.isPending
  return (
    <Dialog open={open} onOpenChange={next => (!next && !sending ? onClose() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
            {needsApproval ? 'Manager approval needed' : 'Change weekly hours?'}
          </DialogTitle>
          <DialogDescription>
            {needsApproval
              ? "Changing this service user's weekly contracted hours needs a manager's approval. Nothing changes until it is approved, and the hours can't be edited again while the request is pending."
              : 'This change does not need a manager (Settings → Dom Rules), so it applies straight away.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-foreground">
            Weekly contracted hours{' '}
            <span className="font-medium tabular-nums">
              {formatHours(from)} → {formatHours(toHours)}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {needsApproval ? 'Once approved, the' : 'The'} new hours apply to the DOM Care tab and the visit
            plan together.
            {from == null || toHours >= from
              ? ' Visits already on the rota are not changed; waiting visits that then fit are approved automatically.'
              : ''}
          </p>
          {open && from != null && toHours < from ? (
            <ServiceUserHoursDecreaseImpact serviceUserId={serviceUserId} weeklyHours={toHours} />
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="service-user-hours-reason">Reason (optional)</Label>
            <Textarea
              id="service-user-hours-reason"
              rows={2}
              maxLength={1000}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Package increased after review with the local authority"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void send()} disabled={sending || ruleQuery.isLoading}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {needsApproval ? 'Send for review' : 'Save hours'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type PendingNoticeProps = {
  pending: PendingServiceUserHoursChange
  /** Saved weekly hours that stay until the request is approved. */
  currentHours: string | null
}

/** "Xh pending approval" tag under the weekly hours field, with a link to the approvals page. */
export function ServiceUserHoursPendingNotice({ pending, currentHours }: PendingNoticeProps) {
  const navigate = useNavigate()
  const canViewHoursApprovals = useAuthStore(s => s.can('hours_approvals.read'))
  return (
    <div
      className="mt-2 space-y-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
      data-testid="service-user-hours-pending"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 font-semibold dark:border-amber-700 dark:bg-amber-900/60">
          {formatHours(pending.requestedWeeklyHours)} pending approval
        </span>
        {canViewHoursApprovals ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => void navigate({ to: '/hours-approvals' })}
          >
            Go to approval page
          </Button>
        ) : null}
      </div>
      <p>
        A manager needs to approve this on Hours approvals. Until then the weekly hours stay at{' '}
        {currentHours?.trim() ? `${currentHours.trim()}h` : '—'} and can&apos;t be changed.
      </p>
    </div>
  )
}
