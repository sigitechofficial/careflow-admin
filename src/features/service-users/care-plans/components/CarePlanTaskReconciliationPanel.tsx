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
import type {
  CarePlanTaskReconciliation,
  CarePlanTaskReconciliationState,
} from '@/features/service-users/care-plans/types'

export type ReconciliationActionInput =
  | { action: 'link'; visitTaskAssignmentId: string; requirementKey?: string }
  | { action: 'unlink'; linkId: string; reason?: string }
  | { action: 'review'; linkId: string }
  | { action: 'not_applicable'; requirementKey: string; reason: string }

type Props = {
  data: CarePlanTaskReconciliation | null | undefined
  canManage: boolean
  busy?: boolean
  onAction: (input: ReconciliationActionInput) => void
}

export const NO_STRUCTURED_REQUIREMENTS_TEXT =
  'No automatically verifiable task requirements. Review the Care Plan against assigned Visit Tasks manually.'

const STATE_TEXT: Record<CarePlanTaskReconciliationState, string> = {
  LINKED: 'Linked',
  UNLINKED: 'Not linked',
  REVIEW_REQUIRED: 'Needs review',
  NOT_APPLICABLE: 'Not applicable',
}

const STATE_CLASS: Record<CarePlanTaskReconciliationState, string> = {
  LINKED: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  UNLINKED: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300',
  REVIEW_REQUIRED: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  NOT_APPLICABLE: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

function StateBadge({ state }: { state: CarePlanTaskReconciliationState }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_CLASS[state]}`} data-state={state}>
      {STATE_TEXT[state]}
    </span>
  )
}

const selectClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

/**
 * Visit Task Reconciliation: links between the published care plan and the service user's
 * existing visit tasks. Never says "all covered" — requirements are matched by a manager.
 */
export function CarePlanTaskReconciliationPanel({ data, canManage, busy, onAction }: Props) {
  const [linkFor, setLinkFor] = React.useState<string | null>(null) // requirement key, '' = whole plan
  const [taskId, setTaskId] = React.useState('')
  const [naFor, setNaFor] = React.useState<string | null>(null)
  const [reason, setReason] = React.useState('')

  if (!data) return null
  const linksByKey = (key: string) => data.links.filter((l) => l.requirementKey === key)
  const planLevel = data.links.filter((l) => l.requirementKey === '')
  const closeLink = () => {
    setLinkFor(null)
    setTaskId('')
  }
  const closeNa = () => {
    setNaFor(null)
    setReason('')
  }

  const linkRow = (link: CarePlanTaskReconciliation['links'][number]) => (
    <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5" data-testid="task-link-row">
      <div className="min-w-0 space-y-0.5">
        <p className="flex flex-wrap items-center gap-2">
          <span>{link.task ? link.task.name : 'No visit task'}</span>
          <StateBadge state={link.state} />
          {link.task ? <span className="text-xs text-muted-foreground">{link.task.medicationRoundCode}</span> : null}
        </p>
        {link.reason ? <p className="text-xs text-muted-foreground">Reason: {link.reason}</p> : null}
        {link.state === 'REVIEW_REQUIRED' ? (
          <p className="text-xs text-amber-800 dark:text-amber-200">
            {link.requirementGone
              ? 'This requirement is no longer in the published plan — unlink it.'
              : link.assignmentInactive
                ? 'The visit task is no longer active — unlink it.'
                : link.suggestedReuse
                  ? `Unchanged since version ${link.confirmedForVersionNumber ?? '?'} — confirm it still applies.`
                  : `Confirmed against version ${link.confirmedForVersionNumber ?? '?'} — check it against the current plan.`}
          </p>
        ) : null}
      </div>
      {canManage ? (
        <div className="flex gap-2">
          {link.state === 'REVIEW_REQUIRED' && !link.requirementGone && !link.assignmentInactive ? (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onAction({ action: 'review', linkId: link.id })}>
              Mark Reviewed
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onAction({ action: 'unlink', linkId: link.id })}>
            Unlink
          </Button>
        </div>
      ) : null}
    </li>
  )

  return (
    <section className="rounded-md border border-border bg-card px-4 py-3 text-sm" data-testid="care-plan-task-reconciliation">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Visit Task Reconciliation</h2>
          <p className="text-xs text-muted-foreground">
            {data.formName} · published version {data.publishedVersion.versionNumber} · {data.counts.linked} linked ·{' '}
            {data.counts.reviewRequired} need review · {data.counts.notApplicable} not applicable
          </p>
        </div>
        {canManage ? (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setLinkFor('')}>
            Link Existing Task
          </Button>
        ) : null}
      </div>

      {!data.hasStructuredRequirements ? (
        <p className="mt-3 text-sm text-muted-foreground" data-testid="task-reconciliation-manual">
          {NO_STRUCTURED_REQUIREMENTS_TEXT}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {data.requirements.map((req) => (
            <li key={req.key} className="py-2" data-testid="task-requirement-row">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{req.label}</span>
                  <span className="text-xs text-muted-foreground">{req.expectedDisplay}</span>
                  <StateBadge state={req.state} />
                </p>
                {canManage && req.state === 'UNLINKED' ? (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setLinkFor(req.key)}>
                      Link Existing Task
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setNaFor(req.key)}>
                      Mark Not Applicable
                    </Button>
                  </div>
                ) : null}
              </div>
              {linksByKey(req.key).length > 0 ? <ul className="ml-3">{linksByKey(req.key).map(linkRow)}</ul> : null}
            </li>
          ))}
        </ul>
      )}

      {planLevel.length > 0 || data.links.some((l) => l.requirementGone) ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">Linked to the plan as a whole, or to removed requirements</p>
          <ul>{data.links.filter((l) => l.requirementKey === '' || l.requirementGone).map(linkRow)}</ul>
        </div>
      ) : null}

      {data.unlinkedAssignments.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Visit tasks not linked to this plan: {data.unlinkedAssignments.map((a) => a.taskName).join(', ')}
        </p>
      ) : null}

      <Dialog open={linkFor != null} onOpenChange={(o) => (o ? null : closeLink())}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Link existing visit task</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <label htmlFor="task-link-requirement" className="text-sm font-medium">
                Care plan requirement
              </label>
              <select
                id="task-link-requirement"
                className={selectClass}
                value={linkFor ?? ''}
                onChange={(e) => setLinkFor(e.target.value)}
              >
                <option value="">The care plan as a whole</option>
                {data.requirements.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-link-assignment" className="text-sm font-medium">
                Visit task
              </label>
              <select id="task-link-assignment" className={selectClass} value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">Choose a visit task…</option>
                {data.activeAssignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.taskName} ({a.medicationRoundCode}
                    {a.dueTime ? ` ${a.dueTime}` : ''})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">Linking does not change the visit task or its schedule.</p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeLink}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || !taskId}
              onClick={() => {
                onAction({ action: 'link', visitTaskAssignmentId: taskId, ...(linkFor ? { requirementKey: linkFor } : {}) })
                closeLink()
              }}
            >
              Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={naFor != null} onOpenChange={(o) => (o ? null : closeNa())}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Mark not applicable</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {data.requirements.find((r) => r.key === naFor)?.label}: no visit task is needed.
            </p>
            <label htmlFor="task-na-reason" className="text-sm font-medium">
              Reason (required)
            </label>
            <textarea id="task-na-reason" rows={3} className={selectClass} value={reason} onChange={(e) => setReason(e.target.value)} />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeNa}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || reason.trim().length < 3}
              onClick={() => {
                if (naFor) onAction({ action: 'not_applicable', requirementKey: naFor, reason: reason.trim() })
                closeNa()
              }}
            >
              Mark Not Applicable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
