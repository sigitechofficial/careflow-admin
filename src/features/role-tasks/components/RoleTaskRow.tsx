import * as React from 'react'
import { useRouter } from '@tanstack/react-router'
import { CheckCircle2, ExternalLink, PlayCircle, RotateCcw } from 'lucide-react'
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
  const pageLabel = rolePageLabel(task.link)
  // Survey alerts are closed on their follow-up, which asks what was done.
  const closedOnPage = Boolean(task.link?.startsWith('/surveys/follow-ups'))

  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('text-sm font-medium text-foreground', done && 'line-through opacity-70')}>
            {task.title}
          </p>
          {task.status === 'IN_PROGRESS' ? (
            <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200">
              In progress
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          <span className={cn('font-medium', task.dueState ? DUE_TONE[task.dueState] : undefined)}>
            {task.dueState === 'overdue'
              ? `Overdue · was due ${formatDate(task.dueDate)}`
              : task.dueState === 'today'
                ? 'Due today'
                : `Due ${formatDate(task.dueDate)}`}
          </span>
          {showRole ? <span>· {task.role.name}</span> : null}
          <span>· {task.location?.name ?? 'All branches'}</span>
        </p>
        {task.description ? (
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>
        ) : null}
        {done ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Done{task.completedByName ? ` by ${task.completedByName}` : ''}
            {task.completedAt ? ` · ${formatInstant(task.completedAt)}` : ''}
            {task.note ? ` — ${task.note}` : ''}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {task.link ? (
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
        {done ? (
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
