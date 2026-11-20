import * as React from 'react'
import { useRouter } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, PlayCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import { useUpdateRoleTaskStatus } from '@/features/role-tasks/hooks'
import { rolePageLabel } from '@/features/role-tasks/role-task-format'
import type { RoleTask } from '@/features/role-tasks/types'
import { roleTaskTags } from '@/features/role-tasks/role-task-tags'

const DUE_TONE: Record<NonNullable<RoleTask['dueState']>, string> = {
  overdue: 'text-destructive',
  today: 'text-warning',
  upcoming: 'text-muted-foreground',
}

export function RoleTaskRow({ task, showRole = true }: { task: RoleTask; showRole?: boolean }) {
  const router = useRouter()
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const formatInstant = (iso: string) => {
    const day = dayKeyFromInstant(iso)
    return day ? `${formatDate(day)} ${formatTime(iso)}` : ''
  }
  const mutation = useUpdateRoleTaskStatus()
  const [doneOpen, setDoneOpen] = React.useState(false)
  const [note, setNote] = React.useState('')

  const setStatus = async (status: 'OPEN' | 'IN_PROGRESS' | 'DONE', withNote?: string) => {
    try {
      await mutation.mutateAsync({
        taskId: task.id,
        status,
        ...(withNote !== undefined ? { note: withNote.trim() || null } : {}),
      })
      toastSuccess(
        status === 'DONE' ? 'Task completed' : status === 'IN_PROGRESS' ? 'Task started' : 'Task reopened',
      )
      setDoneOpen(false)
    } catch (err) {
      toastApiError(err, 'Could not update the task.')
    }
  }

  const done = task.status === 'DONE'
  const overdue = !done && task.dueState === 'overdue'
  /** Finished on a later day than it was due: kept visible on Done for compliance (19 Nov 2026). */
  const doneLate = done && Boolean(task.completedLate)
  const tags = roleTaskTags(task)
  const pageLabel = rolePageLabel(task.link)
  // Survey alerts are closed on their follow-up, which asks what was done. Learning tasks close
  // themselves when the work is done in Learning (18 Nov 2026).
  const learningTask = Boolean(task.link?.startsWith('/learning/'))
  // Care app sign-ups and delete requests are decided (Approve / Decline) on the carer's record, never
  // closed here: "Mark done" would close the task and leave the request waiting unseen (20 Nov 2026).
  const carerRequestTask = task.sourceType === 'CARER_SIGNUP' || task.sourceType === 'CARER_DELETION_REQUEST'
  const closedOnPage = Boolean(task.link?.startsWith('/surveys/follow-ups')) || learningTask || carerRequestTask
  /** The office's decision on a carer request; PENDING on a closed task = closed without deciding (old tasks). */
  const decision = carerRequestTask ? (task.decision ?? null) : null
  const reviewLabel = task.sourceType === 'CARER_SIGNUP' ? 'Review sign-up' : 'Review delete request'
  // The review page opens for every review role (older tasks linked to the staff edit page).
  const reviewHref = task.link ? task.link.replace(/\/edit(\?.*)?$/, '/review') : null

  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('text-sm font-medium', done ? 'text-muted-foreground' : 'text-foreground')}>
            {task.title}
          </p>
          {done && carerRequestTask ? (
            decision === 'APPROVED' ? (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                data-testid="role-task-decision-badge"
              >
                Approved
              </Badge>
            ) : decision === 'DECLINED' ? (
              <Badge variant="outline" className="text-muted-foreground" data-testid="role-task-decision-badge">
                Declined
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                data-testid="role-task-decision-badge"
              >
                Not decided yet
              </Badge>
            )
          ) : done ? (
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              data-testid="role-task-done-badge"
            >
              Done
            </Badge>
          ) : null}
          {overdue ? (
            <Badge
              variant="outline"
              className="gap-1 border-destructive/40 bg-destructive/10 text-destructive"
              data-testid="role-task-overdue-badge"
            >
              <AlertTriangle className="h-3 w-3" aria-hidden />
              Overdue
            </Badge>
          ) : null}
          {doneLate ? (
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
              data-testid="role-task-done-late-badge"
              title="Done after its due date"
            >
              <AlertTriangle className="h-3 w-3" aria-hidden />
              Done late
            </Badge>
          ) : null}
          {task.status === 'IN_PROGRESS' ? (
            <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200">
              In progress
            </Badge>
          ) : null}
        </div>
        {/* Every detail as "Label: value", like "Branch: …" (19 Nov 2026). */}
        <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground" data-testid="role-task-details">
          {tags.type ? <Detail label="Type" value={tags.type} /> : null}
          {tags.about ? <Detail label="About" value={tags.about} /> : null}
          {tags.course ? <Detail label="Course" value={tags.course} /> : null}
          {tags.requestedBy ? <Detail label="Requested by" value={tags.requestedBy} /> : null}
          {!done && task.futureVisits != null ? (
            <Detail
              label="Future visits"
              value={
                task.futureVisits
                  ? `${task.futureVisits} will be unassigned if approved`
                  : 'None assigned'
              }
              valueClassName={task.futureVisits ? 'font-medium text-destructive' : undefined}
            />
          ) : null}
          {/* Open tasks: when it is due (red when overdue). Done tasks show it only when done late. */}
          {!done || doneLate ? (
            <Detail
              label="Due"
              value={!done && task.dueState === 'today' ? 'Today' : formatDate(task.dueDate)}
              valueClassName={cn(
                'font-medium',
                doneLate ? 'text-amber-700 dark:text-amber-300' : task.dueState ? DUE_TONE[task.dueState] : undefined,
              )}
            />
          ) : null}
          {showRole ? <Detail label="Role" value={task.role.name} /> : null}
          <Detail
            label="Branch"
            value={task.location ? (task.location.label ?? task.location.name) : 'All branches'}
          />
        </dl>
        {task.description ? (
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>
        ) : null}
        {done && carerRequestTask && decision !== 'APPROVED' && decision !== 'DECLINED' ? (
          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300" data-testid="role-task-undecided">
            This task was closed without a decision. The request is still waiting: approve or decline it on the carer’s record.
          </p>
        ) : done ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            {decision === 'APPROVED' ? 'Approved' : decision === 'DECLINED' ? 'Declined' : 'Done'}
            {task.completedByName ? ` by ${task.completedByName}` : ''}
            {task.completedAt ? ` · ${formatInstant(task.completedAt)}` : ''}
            {/* Carer requests: the note "Approved" / "Declined" is the decision itself, already shown. */}
            {task.note && !(carerRequestTask && (task.note === 'Approved' || task.note === 'Declined')) ? ` — ${task.note}` : ''}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {carerRequestTask && reviewHref ? (
          // One button that names the job: the decision is made on the carer's record.
          <div className="flex flex-col items-end gap-0.5">
            <Button
              type="button"
              size="sm"
              variant={done ? 'outline' : 'default'}
              className="gap-1"
              onClick={() => router.history.push(reviewHref)}
              data-testid="role-task-review"
            >
              {done ? 'View record' : reviewLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
            {done ? null : (
              <span className="text-[11px] text-muted-foreground">Approve or decline on the carer’s record</span>
            )}
          </div>
        ) : task.link ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1"
            onClick={() => router.history.push(task.link as string)}
            title={pageLabel ?? undefined}
          >
            Open page <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Button>
        ) : null}
        {carerRequestTask || (done && learningTask) ? null : done ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            disabled={mutation.isPending}
            onClick={() => void setStatus('OPEN')}
          >
            Reopen
          </Button>
        ) : (
          <>
            {task.status === 'OPEN' ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                leftIcon={<PlayCircle className="h-3.5 w-3.5" />}
                disabled={mutation.isPending}
                onClick={() => void setStatus('IN_PROGRESS')}
              >
                Start
              </Button>
            ) : null}
            {closedOnPage ? null : (
              <Button
                type="button"
                size="sm"
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                disabled={mutation.isPending}
                onClick={() => {
                  setNote(task.note ?? '')
                  setDoneOpen(true)
                }}
              >
                Mark done
              </Button>
            )}
          </>
        )}
      </div>

      <Dialog open={doneOpen} onOpenChange={setDoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as done</DialogTitle>
            <DialogDescription>{task.title}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`note-${task.id}`}>
              Note (optional)
            </label>
            <textarea
              id={`note-${task.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="e.g. October salaries calculated and sent for approval"
              className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDoneOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={mutation.isPending} onClick={() => void setStatus('DONE', note)}>
              Mark done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  )
}

function Detail({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex gap-1">
      <dt className="font-medium text-foreground/80">{label}:</dt>
      <dd className={valueClassName}>{value}</dd>
    </div>
  )
}
