import { AlertTriangle, CheckSquare, Flag, ListChecks, Loader2, Users, X } from 'lucide-react'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import {
  displayVisitTaskRecordedValue,
  inferVisitJobTaskOutcome,
  sortVisitJobTasksForCarer,
  visitTaskNeedsInputFields,
  VISIT_JOB_TASK_OUTCOMES,
  type VisitJobTaskOutcome,
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
  outcome?: VisitJobTaskOutcome | null
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
  /** When true, fills parent height and scrolls the task list inside. */
  fillHeight?: boolean
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
      ) : null}
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
  fillHeight = false,
  listMaxHeightClass = 'max-h-[min(24rem,50vh)]',
}: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 py-4 text-sm text-muted-foreground',
          fillHeight && 'min-h-0 flex-1',
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading visit tasks…
      </div>
    )
  }

  if (noRoundMessage) {
    return (
      <p className={cn('text-sm text-muted-foreground', fillHeight && 'min-h-0 flex-1')}>
        {noRoundMessage}
      </p>
    )
  }

  if (tasks.length === 0 && emptyMessage) {
    return (
      <p className={cn('text-sm text-muted-foreground', fillHeight && 'min-h-0 flex-1')}>
        {emptyMessage}
      </p>
    )
  }

  const sortedTasks = sortVisitJobTasksForCarer(tasks)
  const completedCount = sortedTasks.filter((task) => task.isCompleted).length
  const remainingCount = sortedTasks.length - completedCount
  const criticalCount = sortedTasks.filter(
    (task) => !task.isExtra && normalizeVisitTaskPriority(task.priority) === 'critical',
  ).length
  const multiCarerCount = sortedTasks.filter((task) => task.requiresMultipleCarers).length

  return (
    <div className={cn(fillHeight ? 'flex min-h-0 flex-1 flex-col gap-3' : 'space-y-3')}>
      {sortedTasks.length > 0 ? (
        <div className="shrink-0 space-y-1">
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
            Tasks are ordered by priority. Choose Completed, Partial, or Declined when addressing each task.
            {criticalCount > 0 ? (
              <span className="font-medium text-red-700 dark:text-red-300">
                {' '}
                {criticalCount} critical task{criticalCount === 1 ? '' : 's'} on this visit.
              </span>
            ) : null}
            {multiCarerCount > 0 ? (
              <span className="font-medium text-sky-700 dark:text-sky-300">
                {' '}
                {multiCarerCount} task{multiCarerCount === 1 ? '' : 's'} need{multiCarerCount === 1 ? 's' : ''} more
                than 1 carer.
              </span>
            ) : null}
          </p>
        </div>
      ) : null}

      <ul
        className={cn(
          'space-y-3 overflow-y-auto pe-1',
          fillHeight ? 'min-h-0 flex-1' : listMaxHeightClass,
        )}
      >
        {sortedTasks.map((task) => {
          const outcome = inferVisitJobTaskOutcome(task)
          const showOutcomeFields = Boolean(task.isCompleted)
          const showClinicalInputs =
            showOutcomeFields &&
            outcome === 'completed' &&
            visitTaskNeedsInputFields(task.completionInput)
          const showOutcomeNotes =
            showOutcomeFields && (outcome === 'partial' || outcome === 'declined')
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
                outcome === 'completed'
                  ? 'border-teal-300/80 bg-teal-50/40 dark:border-teal-900 dark:bg-teal-950/20'
                  : outcome === 'partial'
                    ? 'border-amber-300/80 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20'
                    : outcome === 'declined'
                      ? 'border-rose-300/80 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20'
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
                          outcome: checked ? (outcome ?? 'completed') : null,
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
                            {task.observationTypeCode ? (
                              <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
                                Records observation
                              </span>
                            ) : null}
                            {task.requiresMultipleCarers ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                                title="This task requires more than one carer"
                              >
                                <Users className="h-3 w-3" aria-hidden />
                                2+ carers
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {task.categoryName}
                          </span>
                        </label>
                        <div className="flex shrink-0 items-center gap-1">
                          {outcome === 'completed' ? (
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

                      {visitTaskNeedsInputFields(task.completionInput) && !showOutcomeFields ? (
                        <p className="mt-2 text-xs font-medium text-teal-700 dark:text-teal-300">
                          {task.observationTypeCode
                            ? 'When marked complete, enter the observation reading — it is saved to Observations.'
                            : task.completionInput.inputMode === 'value'
                              ? 'When marked complete, record a reading below.'
                              : task.completionInput.inputMode === 'note'
                                ? 'When marked complete, add a description below.'
                                : 'When marked complete, record a reading and description below.'}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {showOutcomeFields ? (
                    <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Outcome</p>
                        <div
                          className="flex flex-wrap gap-2"
                          role="radiogroup"
                          aria-label={`Outcome for ${task.name}`}
                        >
                          {VISIT_JOB_TASK_OUTCOMES.map((option) => {
                            const selected = (outcome ?? 'completed') === option.value
                            return (
                              <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                disabled={disabled}
                                title={option.description}
                                onClick={() =>
                                  onTaskChange(task.assignmentId, {
                                    isCompleted: true,
                                    outcome: option.value,
                                  })
                                }
                                className={cn(
                                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                                  'disabled:cursor-not-allowed disabled:opacity-50',
                                  !selected &&
                                    'border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                                  selected &&
                                    option.value === 'completed' &&
                                    'border-teal-500 bg-teal-100 text-teal-900 dark:border-teal-600 dark:bg-teal-950 dark:text-teal-100',
                                  selected &&
                                    option.value === 'partial' &&
                                    'border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-100',
                                  selected &&
                                    option.value === 'declined' &&
                                    'border-rose-500 bg-rose-100 text-rose-900 dark:border-rose-600 dark:bg-rose-950 dark:text-rose-100',
                                )}
                              >
                                {option.label}
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {
                            VISIT_JOB_TASK_OUTCOMES.find((o) => o.value === (outcome ?? 'completed'))
                              ?.description
                          }
                        </p>
                      </div>

                      {showClinicalInputs ? (
                        <>
                          {task.completionInput.inputMode === 'value' ||
                          task.completionInput.inputMode === 'value_and_note' ? (
                            <div className="space-y-1">
                              <Label htmlFor={valueId} className="text-xs text-muted-foreground">
                                {task.observationTypeCode
                                  ? (task.completionInput.valueLabel
                                      ? `Observation value (${task.completionInput.valueLabel})`
                                      : 'Observation value')
                                  : (task.completionInput.valueLabel ?? 'Recorded value')}
                              </Label>
                              <Input
                                id={valueId}
                                type="text"
                                disabled={disabled}
                                value={displayVisitTaskRecordedValue(task.recordedValue)}
                                placeholder={task.completionInput.valuePlaceholder}
                                onChange={(event) =>
                                  onTaskChange(task.assignmentId, {
                                    recordedValue: event.target.value,
                                  })
                                }
                              />
                              {task.observationTypeCode ? (
                                <p className="text-[11px] text-muted-foreground">
                                  Saved to the service user’s Observations record for this visit.
                                </p>
                              ) : null}
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
                        </>
                      ) : null}

                      {showOutcomeNotes ? (
                        <div className="space-y-1">
                          <Label htmlFor={noteId} className="text-xs text-muted-foreground">
                            {outcome === 'partial' ? 'Partial notes (required)' : 'Decline notes (required)'}
                          </Label>
                          <textarea
                            id={noteId}
                            rows={2}
                            disabled={disabled}
                            value={task.notes ?? ''}
                            placeholder={
                              outcome === 'partial'
                                ? 'What was completed and what remains…'
                                : 'Why was this task declined…'
                            }
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
