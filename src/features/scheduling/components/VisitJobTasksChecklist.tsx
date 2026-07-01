import { AlertTriangle, CheckSquare, Flag, ListChecks, Loader2, X } from 'lucide-react'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import {
  visitTaskNeedsInputFields,
  sortVisitJobTasksForCarer,
  type VisitJobTaskRow,
} from '@/features/scheduling/types/visit-job-tasks.types'
import {
  normalizeVisitTaskPriority,
  visitTaskPriorityBadgeClass,
  visitTaskPriorityCardClass,
  visitTaskPriorityLabel,
} from '@/features/service-users/visit-tasks/visit-task-priority.util'
import { groupVisual, PlannerIconBadge } from '@/features/service-users/visit-tasks/visit-task-planner-visual.util'

type TaskPatch = {
  isCompleted?: boolean
  recordedValue?: string | null
  notes?: string | null
}

type Props = {
  tasks: VisitJobTaskRow[]
  disabled?: boolean
  loading?: boolean
  roundLabel?: string | null
  roundWindow?: string | null
  noRoundMessage?: string
  emptyMessage?: string
  onTaskChange: (assignmentId: string, patch: TaskPatch) => void
  onRemoveExtra?: (assignmentId: string) => void
  idPrefix?: string
  listMaxHeightClass?: string
}

function VisitJobTaskCarerGuidance({
  instructions,
  priority,
}: {
  instructions: string | null
  priority: string | null
}) {
  const normalizedPriority = normalizeVisitTaskPriority(priority)
  const trimmed = instructions?.trim() ?? ''

  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            visitTaskPriorityBadgeClass(normalizedPriority),
          )}
        >
          <Flag className="h-3 w-3" aria-hidden />
          {visitTaskPriorityLabel(normalizedPriority)} priority
        </span>
        {normalizedPriority === 'critical' ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 dark:text-red-300">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            Do this first
          </span>
        ) : null}
      </div>

      {trimmed.length > 0 ? (
        <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 dark:bg-primary/10">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <ListChecks className="h-3.5 w-3.5" aria-hidden />
            Instructions for the carer
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{trimmed}</p>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          No specific instructions on the plan — follow standard practice for this task.
        </p>
      )}
    </div>
  )
}

export function VisitJobTasksChecklist({
  tasks,
  disabled,
  loading,
  roundLabel,
  roundWindow,
  noRoundMessage,
  emptyMessage,
  onTaskChange,
  onRemoveExtra,
  idPrefix = 'visit-job-task',
  listMaxHeightClass = 'max-h-[min(24rem,50vh)]',
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading visit tasks…
      </div>
    )
  }

  if (noRoundMessage) {
    return <p className="text-sm text-muted-foreground">{noRoundMessage}</p>
  }

  if (tasks.length === 0 && emptyMessage) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  const sortedTasks = sortVisitJobTasksForCarer(tasks)
  const completedCount = sortedTasks.filter((task) => task.isCompleted).length
  const remainingCount = sortedTasks.length - completedCount
  const criticalCount = sortedTasks.filter(
    (task) => !task.isExtra && normalizeVisitTaskPriority(task.priority) === 'critical',
  ).length

  return (
    <div className="space-y-3">
      {sortedTasks.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {roundLabel ? <span className="font-medium text-foreground">{roundLabel}</span> : null}
            {roundWindow ? (
              <span>
                {roundLabel ? ' · ' : ''}
                {roundWindow}
              </span>
            ) : null}
            <span>
              {' '}
              · {completedCount} done · {remainingCount} remaining
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Tasks are ordered by priority. Read each instruction before ticking complete.
            {criticalCount > 0 ? (
              <span className="font-medium text-red-700 dark:text-red-300">
                {' '}
                {criticalCount} critical task{criticalCount === 1 ? '' : 's'} on this visit.
              </span>
            ) : null}
          </p>
        </div>
      ) : null}

      <ul className={cn('space-y-3 overflow-y-auto pe-1', listMaxHeightClass)}>
        {sortedTasks.map((task) => {
          const showInputs = task.isCompleted && visitTaskNeedsInputFields(task.completionInput)
          const valueId = `${idPrefix}-value-${task.assignmentId}`
          const noteId = `${idPrefix}-note-${task.assignmentId}`
          const priority = normalizeVisitTaskPriority(task.priority)
          const taskVisual = groupVisual(task.groupCode)

          return (
            <li
              key={task.assignmentId}
              className={cn(
                'overflow-hidden rounded-xl border bg-card shadow-sm',
                visitTaskPriorityCardClass(priority),
                task.isCompleted
                  ? 'border-teal-300/80 bg-teal-50/40 dark:border-teal-900 dark:bg-teal-950/20'
                  : 'border-border',
              )}
            >
              <div className="flex items-start gap-3 px-3 py-3">
                {!task.isExtra ? (
                  <PlannerIconBadge visual={taskVisual} size="sm" className="mt-0.5 shrink-0" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`${idPrefix}-${task.assignmentId}`}
                      checked={task.isCompleted}
                      disabled={disabled}
                      className="mt-1 shrink-0"
                      onCheckedChange={(value) => {
                        const checked = value === true
                        onTaskChange(task.assignmentId, {
                          isCompleted: checked,
                          recordedValue: checked ? task.recordedValue : null,
                          notes: checked ? task.notes : null,
                        })
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <label
                          htmlFor={`${idPrefix}-${task.assignmentId}`}
                          className="min-w-0 cursor-pointer"
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{task.name}</span>
                            {task.isExtra ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                                Extra
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {task.categoryName}
                          </span>
                        </label>
                        <div className="flex shrink-0 items-center gap-1">
                          {task.isCompleted ? (
                            <CheckSquare className="h-4 w-4 text-teal-600" aria-hidden />
                          ) : null}
                          {task.isExtra && onRemoveExtra ? (
                            <button
                              type="button"
                              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              disabled={disabled}
                              aria-label={`Remove extra task ${task.name}`}
                              onClick={() => onRemoveExtra(task.assignmentId)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {!task.isExtra ? (
                        <VisitJobTaskCarerGuidance
                          instructions={task.carerInstructions}
                          priority={task.priority}
                        />
                      ) : null}

                      {visitTaskNeedsInputFields(task.completionInput) ? (
                        <p className="mt-2 text-xs font-medium text-teal-700 dark:text-teal-300">
                          {task.completionInput.inputMode === 'value'
                            ? 'When complete, record a reading below.'
                            : task.completionInput.inputMode === 'note'
                              ? 'When complete, add a description below.'
                              : 'When complete, record a reading and description below.'}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {showInputs ? (
                    <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
                      {task.completionInput.inputMode === 'value' ||
                      task.completionInput.inputMode === 'value_and_note' ? (
                        <div className="space-y-1">
                          <Label htmlFor={valueId} className="text-xs text-muted-foreground">
                            {task.completionInput.valueLabel ?? 'Recorded value'}
                          </Label>
                          <Input
                            id={valueId}
                            type="text"
                            disabled={disabled}
                            value={task.recordedValue ?? ''}
                            placeholder={task.completionInput.valuePlaceholder}
                            onChange={(event) =>
                              onTaskChange(task.assignmentId, {
                                recordedValue: event.target.value,
                              })
                            }
                          />
                        </div>
                      ) : null}
                      {task.completionInput.inputMode === 'note' ||
                      task.completionInput.inputMode === 'value_and_note' ? (
                        <div className="space-y-1">
                          <Label htmlFor={noteId} className="text-xs text-muted-foreground">
                            {task.completionInput.noteLabel ?? 'Notes'}
                          </Label>
                          <textarea
                            id={noteId}
                            rows={2}
                            disabled={disabled}
                            value={task.notes ?? ''}
                            placeholder={task.completionInput.notePlaceholder}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            onChange={(event) =>
                              onTaskChange(task.assignmentId, {
                                notes: event.target.value,
                              })
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
