import { CheckSquare, Loader2, X } from 'lucide-react'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import {
  visitTaskNeedsInputFields,
  type VisitJobTaskRow,
} from '@/features/scheduling/types/visit-job-tasks.types'

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

  const completedCount = tasks.filter((task) => task.isCompleted).length
  const remainingCount = tasks.length - completedCount

  return (
    <div className="space-y-3">
      {tasks.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {roundLabel ? <span className="font-medium text-foreground">{roundLabel}</span> : null}
          {roundWindow ? (
            <span>
              {roundLabel ? ' · ' : ''}
              {roundWindow}
            </span>
          ) : null}
          {tasks.length > 0 ? (
            <span>
              {' '}
              · {completedCount} done · {remainingCount} remaining
            </span>
          ) : null}
        </p>
      ) : null}

      <ul className={cn('space-y-2 overflow-y-auto pe-1', listMaxHeightClass)}>
        {tasks.map((task) => {
          const showInputs = task.isCompleted && visitTaskNeedsInputFields(task.completionInput)
          const valueId = `${idPrefix}-value-${task.assignmentId}`
          const noteId = `${idPrefix}-note-${task.assignmentId}`

          return (
            <li
              key={task.assignmentId}
              className={cn(
                'rounded-lg border px-3 py-2.5',
                task.isCompleted
                  ? 'border-teal-300 bg-teal-50/60 dark:border-teal-900 dark:bg-teal-950/20'
                  : 'border-border bg-card',
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`${idPrefix}-${task.assignmentId}`}
                  checked={task.isCompleted}
                  disabled={disabled}
                  className="mt-0.5"
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
                  <label
                    htmlFor={`${idPrefix}-${task.assignmentId}`}
                    className="flex cursor-pointer items-start justify-between gap-2"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{task.name}</span>
                        {task.isExtra ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            Extra
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-xs text-muted-foreground">{task.categoryName}</span>
                      {task.carerInstructions ? (
                        <span className="mt-1 block whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
                          {task.carerInstructions}
                        </span>
                      ) : null}
                      {visitTaskNeedsInputFields(task.completionInput) ? (
                        <span className="mt-0.5 block text-xs text-teal-700 dark:text-teal-300">
                          {task.completionInput.inputMode === 'value'
                            ? 'Requires a reading'
                            : task.completionInput.inputMode === 'note'
                              ? 'Requires a description'
                              : 'Requires a reading and description'}
                        </span>
                      ) : null}
                    </span>
                    {task.isCompleted ? (
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
                    ) : null}
                    {task.isExtra && onRemoveExtra ? (
                      <button
                        type="button"
                        className="mt-0.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        disabled={disabled}
                        aria-label={`Remove extra task ${task.name}`}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          onRemoveExtra(task.assignmentId)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </label>

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
