import * as React from 'react'
import { Clock, ListChecks, Pencil } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { VisitTaskPriorityPicker } from '@/features/service-users/visit-tasks/VisitTaskPriorityPicker'
import { VisitTaskBodyMapRequiredField } from '@/features/service-users/visit-tasks/VisitTaskBodyMapRequiredField'
import { VisitTaskSchedulePanel } from '@/features/service-users/visit-tasks/VisitTaskSchedulePanel'
import {
  DEFAULT_VISIT_TASK_PRIORITY,
  type VisitTaskPriorityCode,
} from '@/features/service-users/visit-tasks/visit-task-priority.util'
import {
  formatVisitTaskScheduleSummary,
  mergeVisitTaskSchedule,
  type VisitTaskSchedule,
} from '@/features/service-users/visit-tasks/visit-task-schedule.util'

export type VisitTaskEditValues = {
  carerInstructions: string
  priority: VisitTaskPriorityCode
  schedule: VisitTaskSchedule
  bodyMapRequired: boolean
  /** HH:mm — the task shows on the visit whose time covers this (like medicine due times). */
  dueTime: string
}

type Props = {
  open: boolean
  taskName: string
  categoryName?: string
  initial: VisitTaskEditValues
  /** Hidden for the eMAR "Medication prompt", which follows medicine due times. */
  showDueTime?: boolean
  onOpenChange: (open: boolean) => void
  onSave: (values: VisitTaskEditValues) => void
}

/** Edit priority, carer instructions, and schedule for one planned visit task. */
export function VisitTaskEditDialog({
  open,
  taskName,
  categoryName,
  initial,
  showDueTime = true,
  onOpenChange,
  onSave,
}: Props) {
  const [dueTime, setDueTime] = React.useState(initial.dueTime ?? '')
  const [priority, setPriority] = React.useState<VisitTaskPriorityCode>(
    initial.priority ?? DEFAULT_VISIT_TASK_PRIORITY,
  )
  const [carerInstructions, setCarerInstructions] = React.useState(
    initial.carerInstructions ?? '',
  )
  const [schedule, setSchedule] = React.useState<VisitTaskSchedule>(() =>
    mergeVisitTaskSchedule(initial.schedule),
  )
  const [bodyMapRequired, setBodyMapRequired] = React.useState(
    Boolean(initial.bodyMapRequired),
  )

  React.useEffect(() => {
    if (!open) return
    setPriority(initial.priority ?? DEFAULT_VISIT_TASK_PRIORITY)
    setCarerInstructions(initial.carerInstructions ?? '')
    setSchedule(mergeVisitTaskSchedule(initial.schedule))
    setBodyMapRequired(Boolean(initial.bodyMapRequired))
    setDueTime(initial.dueTime ?? '')
  }, [open, initial])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="flex max-h-[min(88vh,780px)] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 rounded-t-xl border-b border-border bg-card px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <Pencil className="h-5 w-5 text-primary" aria-hidden />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold">Edit task</DialogTitle>
              <p className="mt-0.5 truncate text-sm font-medium text-foreground">{taskName}</p>
              {categoryName ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{categoryName}</p>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/20 px-5 py-4">
          {showDueTime ? (
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" aria-hidden />
                Due time
              </h3>
              <input
                id="edit-task-due-time"
                type="time"
                value={dueTime}
                onChange={(event) => setDueTime(event.target.value)}
                className="h-9 w-36 rounded-lg border border-input bg-muted/40 px-2.5 text-sm tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                The task shows on the visit whose time covers this, the same way medicine due
                times work.
              </p>
            </section>
          ) : null}

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Priority
            </h3>
            <VisitTaskPriorityPicker value={priority} onChange={setPriority} />
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5 text-primary" aria-hidden />
              Instructions for the carer
            </h3>
            <textarea
              rows={4}
              value={carerInstructions}
              placeholder="What should the carer do? Put each step on its own line."
              className="w-full resize-y rounded-lg border border-input bg-muted/40 px-2.5 py-2 text-xs leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setCarerInstructions(event.target.value)}
            />
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Body map
            </h3>
            <VisitTaskBodyMapRequiredField
              id="edit-body-map-required"
              checked={bodyMapRequired}
              onCheckedChange={setBodyMapRequired}
            />
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Schedule
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {formatVisitTaskScheduleSummary(schedule)}
              </p>
            </div>
            <VisitTaskSchedulePanel
              compact
              scheduleKey={`edit-${taskName}`}
              schedule={schedule}
              onChange={(patch) =>
                setSchedule((prev) => mergeVisitTaskSchedule({ ...prev, ...patch }))
              }
            />
          </section>
        </DialogBody>

        <DialogFooter className="shrink-0 rounded-b-xl border-t border-border bg-card px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => {
              onSave({
                priority,
                carerInstructions: carerInstructions.trim(),
                schedule: mergeVisitTaskSchedule(schedule),
                bodyMapRequired,
                dueTime: dueTime.trim(),
              })
              onOpenChange(false)
            }}
          >
            Save task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** @deprecated Use VisitTaskEditDialog — kept as alias for existing imports */
export const VisitTaskScheduleEditDialog = VisitTaskEditDialog
