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
import type { CarePlanLifecycle } from '@/features/service-users/care-plans/types'

export type CarePlanLifecycleAction = 'suspend' | 'resume' | 'archive'

type Props = {
  lifecycle: CarePlanLifecycle | null | undefined
  /** The plan has a published version (only then can it be suspended or resumed). */
  published: boolean
  canManage: boolean
  busy?: boolean
  onAction: (action: CarePlanLifecycleAction, input: { reason: string; reviewConfirmed?: boolean }) => void
}

const STATUS_TEXT: Record<CarePlanLifecycle['status'], string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  ARCHIVED: 'Archived',
}

const DIALOG: Record<CarePlanLifecycleAction, { title: string; button: string; hint: string }> = {
  suspend: {
    title: 'Suspend care plan',
    button: 'Suspend',
    hint: 'Carers stop seeing this plan as current instructions. Its versions are kept.',
  },
  resume: {
    title: 'Resume care plan',
    button: 'Resume',
    hint: 'Carers will see the published version again.',
  },
  archive: {
    title: 'Archive care plan',
    button: 'Archive',
    hint: 'The plan is retired: hidden from carers, kept in history, and can no longer be edited or published.',
  },
}

/** Operational status of a care plan (active / suspended / archived) with the manager's actions. */
export function CarePlanLifecyclePanel({ lifecycle, published, canManage, busy, onAction }: Props) {
  const [open, setOpen] = React.useState<CarePlanLifecycleAction | null>(null)
  const [reason, setReason] = React.useState('')
  const [confirmed, setConfirmed] = React.useState(false)
  const status = lifecycle?.status ?? 'ACTIVE'
  const actions: CarePlanLifecycleAction[] = !canManage
    ? []
    : status === 'ACTIVE'
      ? [...(published ? (['suspend'] as const) : []), 'archive']
      : status === 'SUSPENDED'
        ? ['resume', 'archive']
        : []

  if (status === 'ACTIVE' && actions.length === 0) return null

  const close = () => {
    setOpen(null)
    setReason('')
    setConfirmed(false)
  }
  const valid = reason.trim().length >= 3 && (open !== 'resume' || confirmed)

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm"
      data-testid="care-plan-lifecycle-panel"
    >
      <div className="space-y-1">
        <p className="font-medium">
          Status:{' '}
          <span data-testid="care-plan-lifecycle-status">
            {published && status === 'ACTIVE' ? 'Published' : STATUS_TEXT[status]}
          </span>
        </p>
        {status !== 'ACTIVE' && lifecycle?.reason ? (
          <p className="text-xs text-muted-foreground" data-testid="care-plan-lifecycle-reason">
            {STATUS_TEXT[status]}: {lifecycle.reason}
          </p>
        ) : null}
        {status !== 'ACTIVE' ? (
          <p className="text-xs text-muted-foreground">Not shown to carers. Version history is kept below.</p>
        ) : null}
      </div>
      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action}
              type="button"
              size="sm"
              variant={action === 'resume' ? 'default' : 'outline'}
              disabled={busy}
              onClick={() => setOpen(action)}
            >
              {DIALOG[action].button}
            </Button>
          ))}
        </div>
      ) : null}

      <Dialog open={open != null} onOpenChange={(o) => (o ? null : close())}>
        <DialogContent size="sm">
          {open ? (
            <>
              <DialogHeader>
                <DialogTitle>{DIALOG[open].title}</DialogTitle>
              </DialogHeader>
              <DialogBody className="space-y-3">
                <p className="text-sm text-muted-foreground">{DIALOG[open].hint}</p>
                <div>
                  <label htmlFor="care-plan-lifecycle-reason" className="text-sm font-medium">
                    Reason (required)
                  </label>
                  <textarea
                    id="care-plan-lifecycle-reason"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                {open === 'resume' ? (
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    I have reviewed the published plan and it is still appropriate.
                  </label>
                ) : null}
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={busy || !valid}
                  onClick={() => {
                    onAction(open, { reason: reason.trim(), ...(open === 'resume' ? { reviewConfirmed: confirmed } : {}) })
                    close()
                  }}
                >
                  {DIALOG[open].button}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
