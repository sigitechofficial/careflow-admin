import * as React from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import type { CarePlanDraftApproval } from '@/features/service-users/care-plans/types'

type Props = {
  approval: CarePlanDraftApproval | null | undefined
  /** Version number of the plan carers currently see, if one is published. */
  publishedVersionNumber?: number | null
  canApprove: boolean
  actorId?: string | null
  busy?: boolean
  onApprove: () => void
  onRequestChanges: (reason: string) => void
}

const STATUS_TEXT: Record<CarePlanDraftApproval['status'], string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending approval',
  APPROVED: 'Approved',
}

function when(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : ''
}

/** Approval state of the working draft, with the manager's Approve / Request changes actions. */
export function CarePlanApprovalPanel({
  approval,
  publishedVersionNumber,
  canApprove,
  actorId,
  busy,
  onApprove,
  onRequestChanges,
}: Props) {
  const [changesOpen, setChangesOpen] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const status = approval?.status ?? 'DRAFT'
  const pending = status === 'PENDING_APPROVAL'
  const ownSubmission = pending && Boolean(actorId) && approval?.submittedById === actorId

  return (
    <div
      className="rounded-md border border-border bg-card px-4 py-3 text-sm"
      data-testid="care-plan-approval-panel"
      role="status"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium">
            Approval: <span data-testid="care-plan-approval-status">{STATUS_TEXT[status]}</span>
          </p>
          {pending ? (
            <p className="text-xs text-muted-foreground">
              Submitted {when(approval?.submittedAt)}. Editing is locked until a manager approves it or
              requests changes.
            </p>
          ) : null}
          {status === 'APPROVED' ? (
            <p className="text-xs text-muted-foreground">
              Approved {when(approval?.decidedAt)}. Publish it as it is — any change needs a new approval.
            </p>
          ) : null}
          {status === 'DRAFT' && approval?.reason ? (
            <p className="text-xs text-amber-800 dark:text-amber-200" data-testid="care-plan-changes-requested">
              Changes requested: {approval.reason}
            </p>
          ) : null}
          {publishedVersionNumber ? (
            <p className="text-xs text-muted-foreground">
              Version {publishedVersionNumber} stays the live plan until this revision is published.
            </p>
          ) : null}
          {ownSubmission && canApprove ? (
            <p className="text-xs text-muted-foreground">You submitted this plan, so another manager must approve it.</p>
          ) : null}
        </div>
        {pending && canApprove && !ownSubmission ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setChangesOpen(true)}>
              Request Changes
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={onApprove}>
              Approve
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={changesOpen} onOpenChange={setChangesOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-2">
            <label htmlFor="care-plan-changes-reason" className="text-sm font-medium">
              What needs to change? (required)
            </label>
            <textarea
              id="care-plan-changes-reason"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setChangesOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || reason.trim().length < 3}
              onClick={() => {
                onRequestChanges(reason.trim())
                setChangesOpen(false)
                setReason('')
              }}
            >
              Request Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
